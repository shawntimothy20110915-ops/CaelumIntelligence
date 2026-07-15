import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getStore, getUserById, findUserByEmail, flushStore } from '@/lib/store'
import type { User } from '@/lib/types'

/**
 * Stripe webhook — auto-activates a user's Pro plan when payment succeeds, and
 * downgrades on cancellation. Signature is verified WITHOUT the Stripe SDK.
 *
 * Required env: STRIPE_WEBHOOK_SECRET (whsec_...). Create the endpoint in Stripe:
 *   Dashboard → Developers → Webhooks → Add endpoint
 *   URL: https://YOURDOMAIN/api/stripe-webhook
 *   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 *
 * IMPORTANT: this route reads the raw body for signature verification, so it must
 * not be pre-parsed. It is public (allowlisted in proxy.ts) but cryptographically
 * authenticated by the Stripe signature.
 */

const TOLERANCE_SEC = 300

function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false
  const parts: Record<string, string[]> = {}
  for (const item of header.split(',')) {
    const [k, v] = item.split('=')
    if (!k || !v) continue
    ;(parts[k] ||= []).push(v)
  }
  const t = parts['t']?.[0]
  const sigs = parts['v1'] || []
  if (!t || sigs.length === 0) return false
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SEC) return false
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')
  const expBuf = Buffer.from(expected)
  return sigs.some(s => {
    const sBuf = Buffer.from(s)
    return sBuf.length === expBuf.length && timingSafeEqual(sBuf, expBuf)
  })
}

function setPlan(user: User, plan: User['plan'], customerId?: string) {
  user.plan = plan
  if (customerId) user.stripeCustomerId = customerId
}

function findByCustomer(customerId: string): User | null {
  for (const u of getStore().users.values()) if (u.stripeCustomerId === customerId) return u
  return null
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured (set STRIPE_WEBHOOK_SECRET).' }, { status: 503 })
  }

  const payload = await req.text()
  if (!verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let event: { type: string; data: { object: Record<string, unknown> } }
  try { event = JSON.parse(payload) } catch { return NextResponse.json({ error: 'Bad payload.' }, { status: 400 }) }

  const store = getStore()
  const obj = event.data?.object || {}
  let changed = false

  if (event.type === 'checkout.session.completed') {
    const uid = obj.client_reference_id as string | undefined
    const email = (obj.customer_email || obj.customer_details && (obj.customer_details as Record<string, unknown>).email) as string | undefined
    const customerId = obj.customer as string | undefined
    const user = (uid && getUserById(store, uid)) || (email ? findUserByEmail(store, email) : null)
    if (user) { setPlan(user, 'pro', customerId); changed = true }
  } else if (event.type === 'customer.subscription.updated') {
    const customerId = obj.customer as string | undefined
    const status = obj.status as string | undefined
    const user = customerId ? findByCustomer(customerId) : null
    if (user) { setPlan(user, status === 'active' || status === 'trialing' ? 'pro' : 'free'); changed = true }
  } else if (event.type === 'customer.subscription.deleted') {
    const customerId = obj.customer as string | undefined
    const user = customerId ? findByCustomer(customerId) : null
    if (user) { setPlan(user, 'free'); changed = true }
  }

  if (changed) await flushStore() // a paid upgrade must survive a restart

  return NextResponse.json({ received: true })
}
