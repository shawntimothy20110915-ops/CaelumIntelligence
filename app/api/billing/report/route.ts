import { NextRequest, NextResponse } from 'next/server'
import { getStore, getBilling, evalsRemainingInPlan } from '@/lib/store'
import { getSession } from '@/lib/session'
import { PLAN_QUOTA, PLAN_PRICE_USD, ACTION_CREDIT_COST } from '@/lib/types'

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })

  const store = getStore()
  const passport = store.passports.get(passportId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

  // Owned billing data is readable only by its owner (ownerless demo passports are open).
  if (passport.ownerUserId) {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    if (session.uid !== passport.ownerUserId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const billing = getBilling(store, passportId)
  const quota = PLAN_QUOTA[billing.plan]
  const planLeft = evalsRemainingInPlan(billing)

  // Action breakdown from receipts
  const receipts = Array.from(store.receipts.values()).filter(r => r.passportId === passportId)
  const breakdown: Record<string, { count: number; credits: number }> = {}
  for (const r of receipts) {
    const cost = billing.actionCosts[r.action] ?? ACTION_CREDIT_COST[r.action] ?? 1
    if (!breakdown[r.decision]) breakdown[r.decision] = { count: 0, credits: 0 }
    breakdown[r.decision].count++
    breakdown[r.decision].credits += cost
  }

  const webhookEvents = store.webhookEvents.filter(w => w.passportId === passportId)

  return NextResponse.json({
    passportId,
    agentLabel: passport.label,
    plan: billing.plan,
    planPriceUsd: PLAN_PRICE_USD[billing.plan],
    period: {
      start: new Date(billing.billingPeriodStart).toISOString(),
      now: new Date().toISOString(),
    },
    usage: {
      evalsUsed: billing.evalsUsed,
      evalsQuota: quota === Infinity ? 'unlimited' : quota,
      evalsRemaining: planLeft === Infinity ? 'unlimited' : planLeft,
      utilizationPct: quota === Infinity ? 0 : Math.round((billing.evalsUsed / quota) * 100),
    },
    credits: {
      balance: billing.credits,
      used: billing.evalsUsed,
    },
    spend: {
      totalUsd: billing.spendUsd,
      budgetUsd: billing.budgetUsd,
      remainingUsd: billing.budgetUsd !== null ? Math.max(0, billing.budgetUsd - billing.spendUsd) : null,
    },
    overage: {
      mode: billing.overageMode,
      evalsUsed: billing.overageEvalsUsed,
      costUsd: billing.overageCostUsd,
    },
    breakdown,
    webhooks: {
      url: billing.webhookUrl,
      eventsFired: webhookEvents.length,
      creditsCost: billing.webhookEvalsCost,
      alertsSent: billing.webhookAlertsSent,
      recentEvents: webhookEvents.slice(-5),
    },
    receipts: receipts.slice(-10).map(r => ({ id: r.id, action: r.action, decision: r.decision, amount: r.amount, merchant: r.merchant, issuedAt: new Date(r.issuedAt).toISOString() })),
  })
}
