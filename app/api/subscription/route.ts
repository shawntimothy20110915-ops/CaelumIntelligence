import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import type { SubscriptionTier } from '@/lib/types'

const TIERS: Record<string, Omit<SubscriptionTier, 'orgId' | 'startedAt' | 'renewsAt'>> = {
  starter:    { tier: 'starter',    priceUsdPerMonth: 0,   features: ['100 evals/mo', 'basic trust score', 'community support'] },
  verified:   { tier: 'verified',   priceUsdPerMonth: 49,  features: ['10k evals/mo', 'gold badge', 'priority quorum', 'anomaly inbox', 'credit reports'] },
  enterprise: { tier: 'enterprise', priceUsdPerMonth: 499, features: ['unlimited evals', 'white-label badges', 'SLA 99.9%', 'SOC2 export', 'dedicated CSM'] },
}

export async function GET(req: NextRequest) {
  const store = getStore()
  const orgId = req.nextUrl.searchParams.get('orgId')
  if (orgId) {
    const sub = store.subscriptions.get(orgId)
    return NextResponse.json({ subscription: sub ?? null, tiers: TIERS })
  }
  return NextResponse.json({ tiers: TIERS })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { orgId, tier } = await req.json()
  if (!orgId || !tier) return NextResponse.json({ error: 'orgId, tier required' }, { status: 400 })
  const def = TIERS[tier]
  if (!def) return NextResponse.json({ error: 'unknown tier' }, { status: 400 })
  const now = Date.now()
  const sub: SubscriptionTier = { ...def, orgId, startedAt: now, renewsAt: now + 30 * 86400000 }
  store.subscriptions.set(orgId, sub)
  return NextResponse.json({ subscription: sub })
}
