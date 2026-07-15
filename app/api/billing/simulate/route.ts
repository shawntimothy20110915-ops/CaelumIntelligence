import { NextRequest, NextResponse } from 'next/server'
import { getStore, getBilling, actionCreditCost, evalsRemainingInPlan } from '@/lib/store'
import { HUMAN_REVIEW_MULTIPLIER } from '@/lib/types'

interface SimAction { action: string; amount?: number; merchant?: string }

export async function POST(req: NextRequest) {
  const { passportId, proofId, actions } = await req.json()
  if (!passportId || !proofId || !Array.isArray(actions)) {
    return NextResponse.json({ error: 'passportId, proofId, and actions[] required' }, { status: 400 })
  }

  const store = getStore()
  const passport = store.passports.get(passportId)
  const proof    = store.proofs.get(proofId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  if (!proof)    return NextResponse.json({ error: 'proof not found'    }, { status: 404 })

  const billing = getBilling(store, passportId)
  const planLeft = evalsRemainingInPlan(billing)
  let simulatedCredits = billing.credits
  let simulatedPlanLeft = planLeft === Infinity ? Infinity : planLeft
  let simulatedSpend = billing.spendUsd

  const results = (actions as SimAction[]).map((a) => {
    const baseCost = actionCreditCost(billing, a.action)
    let predictedDecision = 'approved'
    let predictedReason   = 'policy satisfied'

    if (!proof.permissions.includes(a.action)) {
      predictedDecision = 'denied'
      predictedReason   = `action '${a.action}' not in proof permissions`
    } else if (a.merchant && proof.constraints.allowedMerchants && !proof.constraints.allowedMerchants.includes(a.merchant)) {
      predictedDecision = 'denied'
      predictedReason   = `merchant '${a.merchant}' not in allowed list`
    } else if (a.amount !== undefined && proof.constraints.maxAmount !== undefined && a.amount > proof.constraints.maxAmount) {
      predictedDecision = 'human_review'
      predictedReason   = `amount $${a.amount} exceeds proof limit $${proof.constraints.maxAmount}`
    } else if (billing.budgetUsd !== null && a.amount !== undefined && simulatedSpend + a.amount > billing.budgetUsd) {
      predictedDecision = 'denied'
      predictedReason   = `would exhaust budget ($${simulatedSpend.toFixed(2)} + $${a.amount} > $${billing.budgetUsd})`
    }

    const cost = predictedDecision === 'human_review' ? baseCost * HUMAN_REVIEW_MULTIPLIER : baseCost

    let creditSource = 'quota'
    if (simulatedCredits >= cost) { simulatedCredits -= cost; creditSource = 'credits' }
    else if (simulatedPlanLeft === Infinity || simulatedPlanLeft >= cost) {
      simulatedPlanLeft = simulatedPlanLeft === Infinity ? Infinity : simulatedPlanLeft - cost
    } else {
      predictedDecision = 'denied'
      predictedReason   = billing.overageMode === 'hard' ? 'quota_exceeded (hard cap)' : 'would trigger overage billing'
      creditSource = billing.overageMode === 'soft' ? 'overage' : 'none'
    }

    if (predictedDecision === 'approved' && a.amount) simulatedSpend += a.amount

    return {
      action: a.action, merchant: a.merchant, amount: a.amount,
      predictedDecision, predictedReason, creditCost: cost, creditSource,
    }
  })

  const totalCost = results.reduce((s, r) => s + r.creditCost, 0)
  const wouldDeny = results.filter(r => r.predictedDecision === 'denied').length
  const wouldReview = results.filter(r => r.predictedDecision === 'human_review').length

  return NextResponse.json({
    passportId, proofId,
    simulation: {
      totalActions: results.length,
      totalCreditCost: totalCost,
      wouldApprove: results.length - wouldDeny - wouldReview,
      wouldDeny,
      wouldHumanReview: wouldReview,
      creditsAfter: Math.max(0, simulatedCredits),
      spendAfterUsd: simulatedSpend,
    },
    steps: results,
  })
}
