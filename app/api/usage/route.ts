import { NextRequest, NextResponse } from 'next/server'
import { getStore, getBilling, evalsRemainingInPlan, totalCreditsAvailable } from '@/lib/store'
import { PLAN_QUOTA, PLAN_RATE_LIMIT } from '@/lib/types'

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })

  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

  const billing = getBilling(store, passportId)
  const quota = PLAN_QUOTA[billing.plan]
  const planLeft = evalsRemainingInPlan(billing)
  const total = totalCreditsAvailable(billing)

  return NextResponse.json({
    passportId,
    plan: billing.plan,
    billing: {
      evalsUsed: billing.evalsUsed,
      evalsQuota: quota === Infinity ? 'unlimited' : quota,
      evalsRemaining: planLeft === Infinity ? 'unlimited' : planLeft,
      creditsBalance: billing.credits,
      totalAvailable: total === 999999999 ? 'unlimited' : total,
      spendUsd: billing.spendUsd,
      budgetUsd: billing.budgetUsd,
      budgetRemaining: billing.budgetUsd !== null ? Math.max(0, billing.budgetUsd - billing.spendUsd) : null,
      overageMode: billing.overageMode,
      overageEvalsUsed: billing.overageEvalsUsed,
      overageCostUsd: billing.overageCostUsd,
      proofCount: billing.proofCount,
      rateLimit: `${PLAN_RATE_LIMIT[billing.plan]}/min`,
      billingPeriodStart: new Date(billing.billingPeriodStart).toISOString(),
      webhookUrl: billing.webhookUrl,
      webhookEvalsCost: billing.webhookEvalsCost,
    },
  })
}
