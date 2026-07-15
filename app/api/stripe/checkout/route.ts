import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  growth: process.env.STRIPE_PRICE_GROWTH ?? '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? '',
}

export async function POST(req: NextRequest) {
  const { plan, successUrl, cancelUrl } = await req.json() as {
    plan: 'starter' | 'growth' | 'enterprise'
    successUrl: string
    cancelUrl: string
  }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json({ error: `Unknown plan or missing price ID for: ${plan}` }, { status: 400 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
