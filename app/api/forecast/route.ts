import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const billing = store.billing.get(passportId)
  if (!billing) return NextResponse.json({ error: 'no billing' }, { status: 404 })
  const daysElapsed = Math.max(1, (Date.now() - billing.billingPeriodStart) / 86400000)
  const dailyEvalRate = billing.evalsUsed / daysElapsed
  const dailySpendRate = billing.spendUsd / daysElapsed
  const quotaLeft = billing.budgetUsd === null ? null : Math.max(0, billing.budgetUsd - billing.spendUsd)
  const daysUntilBudget = (quotaLeft !== null && dailySpendRate > 0) ? quotaLeft / dailySpendRate : null
  return NextResponse.json({
    dailyEvalRate: +dailyEvalRate.toFixed(2),
    dailySpendRate: +dailySpendRate.toFixed(2),
    quotaLeft,
    daysUntilBudgetExhausted: daysUntilBudget,
    projectedBudgetExhaustion: daysUntilBudget ? new Date(Date.now() + daysUntilBudget * 86400000).toISOString() : null,
  })
}
