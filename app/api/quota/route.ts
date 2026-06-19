import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import type { QuotaDashboard } from '@/lib/types'

const TIER_LIMITS: Record<string, Partial<QuotaDashboard>> = {
  starter:    { evalLimit: 100, proofLimit: 10, apiCallsLimit: 500 },
  verified:   { evalLimit: 10000, proofLimit: 500, apiCallsLimit: 50000 },
  enterprise: { evalLimit: 999999, proofLimit: 99999, apiCallsLimit: 999999 },
}

export async function GET(req: NextRequest) {
  const store = getStore()
  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  let quota = store.quotas.get(orgId)
  if (!quota) {
    const sub = store.subscriptions.get(orgId)
    const limits = TIER_LIMITS[sub?.tier ?? 'starter']
    const evalUsed = store.meterUsage.filter(m => m.orgId === orgId && m.metricType === 'trust-lookup').reduce((s, m) => s + m.count, 0)
    const proofUsed = store.meterUsage.filter(m => m.orgId === orgId && m.metricType === 'zk-proof').reduce((s, m) => s + m.count, 0)
    quota = {
      orgId,
      evalLimit: limits.evalLimit!, evalUsed,
      proofLimit: limits.proofLimit!, proofUsed,
      apiCallsLimit: limits.apiCallsLimit!, apiCallsUsed: evalUsed + proofUsed,
      resetAt: Date.now() + 30 * 86400000,
    }
    store.quotas.set(orgId, quota)
  }
  return NextResponse.json({ quota })
}

export async function PATCH(req: NextRequest) {
  const store = getStore()
  const { orgId, increment } = await req.json() as { orgId: string; increment: Partial<Pick<QuotaDashboard, 'evalUsed' | 'proofUsed' | 'apiCallsUsed'>> }
  const quota = store.quotas.get(orgId)
  if (!quota) return NextResponse.json({ error: 'quota not found' }, { status: 404 })
  if (increment.evalUsed) quota.evalUsed += increment.evalUsed
  if (increment.proofUsed) quota.proofUsed += increment.proofUsed
  if (increment.apiCallsUsed) quota.apiCallsUsed += increment.apiCallsUsed
  store.quotas.set(orgId, quota)
  const exceeded = quota.evalUsed > quota.evalLimit || quota.proofUsed > quota.proofLimit
  return NextResponse.json({ quota, exceeded })
}
