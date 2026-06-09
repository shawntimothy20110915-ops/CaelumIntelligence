import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

/**
 * Stripe Checkout — created via Stripe's REST API directly (no SDK dependency).
 *
 * To go live, set these environment variables (Vercel → Project → Settings → Env):
 *   STRIPE_SECRET_KEY            sk_live_... (or sk_test_... while testing)
 *   STRIPE_PRICE_PRO_MONTHLY     price_...  (a $29/mo recurring price in Stripe)
 *   STRIPE_PRICE_PRO_ANNUAL      price_...  (a $276/yr recurring price in Stripe)
 *   NEXT_PUBLIC_BASE_URL         https://yourdomain.com  (optional; auto-detected otherwise)
 *
 * Until STRIPE_SECRET_KEY is set, this returns a friendly "not configured" message
 * and the pricing page tells the visitor to come back shortly — nothing breaks.
 */

const PRICE_ENV: Record<string, Record<string, string>> = {
  pro: {
    monthly: 'STRIPE_PRICE_PRO_MONTHLY',
    annual: 'STRIPE_PRICE_PRO_ANNUAL',
  },
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    return NextResponse.json(
      { error: 'Payments are launching shortly — leave your email at sales@agentpass.dev and we’ll set you up.' },
      { status: 503 },
    )
  }

  let body: { tier?: string; cycle?: string }
  try { body = await req.json() } catch { body = {} }
  const tier = body.tier ?? 'pro'
  const cycle = body.cycle === 'annual' ? 'annual' : 'monthly'

  const priceEnvName = PRICE_ENV[tier]?.[cycle]
  const priceId = priceEnvName ? process.env[priceEnvName] : undefined
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for ${tier}/${cycle}. Set ${priceEnvName} in your environment.` },
      { status: 503 },
    )
  }

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    req.headers.get('origin') ||
    new URL(req.url).origin

  const form = new URLSearchParams()
  form.set('mode', 'subscription')
  form.set('line_items[0][price]', priceId)
  form.set('line_items[0][quantity]', '1')
  form.set('allow_promotion_codes', 'true')
  form.set('billing_address_collection', 'auto')
  form.set('success_url', `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`)
  form.set('cancel_url', `${origin}/pricing?checkout=cancelled`)
  form.set('subscription_data[metadata][tier]', tier)
  form.set('subscription_data[metadata][cycle]', cycle)

  // Link the checkout to the signed-in user so the webhook can auto-activate their plan.
  const session = getSession(req)
  if (session) {
    form.set('client_reference_id', session.uid)
    form.set('customer_email', session.email)
    form.set('subscription_data[metadata][uid]', session.uid)
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'Stripe rejected the checkout request.' },
        { status: 502 },
      )
    }
    return NextResponse.json({ url: data.url })
  } catch {
    return NextResponse.json({ error: 'Could not reach Stripe. Try again shortly.' }, { status: 502 })
  }
}
