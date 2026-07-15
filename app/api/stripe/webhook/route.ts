import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

async function upsertSubscription(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  await supabaseAdmin.from('subscriptions').upsert({
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer as string,
    status: sub.status,
    plan: item?.price?.nickname ?? item?.price?.id ?? 'unknown',
    plan_id: item?.price?.id ?? null,
    current_period_start: new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000).toISOString(),
    current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    amount_cents: item?.price?.unit_amount ?? 0,
    currency: item?.price?.currency ?? 'usd',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' })
}

async function recordPayment(pi: Stripe.PaymentIntent | Stripe.Charge) {
  const isCharge = 'payment_intent' in pi
  const id = isCharge ? (pi as Stripe.Charge).id : (pi as Stripe.PaymentIntent).id
  const amount = pi.amount
  const currency = pi.currency
  const customerId = isCharge
    ? ((pi as Stripe.Charge).customer as string | null)
    : ((pi as Stripe.PaymentIntent).customer as string | null)

  await supabaseAdmin.from('payments').upsert({
    stripe_payment_id: id,
    stripe_customer_id: customerId,
    amount_cents: amount,
    currency,
    status: pi.status,
    created_at: new Date((pi as unknown as { created: number }).created * 1000).toISOString(),
  }, { onConflict: 'stripe_payment_id' })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await upsertSubscription(event.data.object as Stripe.Subscription)
        break
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        await recordPayment(event.data.object as Stripe.PaymentIntent)
        break
      case 'charge.succeeded':
        await recordPayment(event.data.object as Stripe.Charge)
        break
    }
  } catch (err) {
    console.error('Stripe webhook handler error', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
