import { NextRequest, NextResponse } from 'next/server'
import { getStore, resolveApiKey, appendLedgerEvent, getBilling, actionCreditCost, chargeCredits, checkRateLimit, updateTrustScore, recordActivity, detectInjection, computeRiskScore } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import { PLAN_RATE_LIMIT } from '@/lib/types'

// Simple API-key-driven eval — no passportId or proofId needed.
// Usage: POST /api/eval  { apiKey, action, merchant?, amount?, metadata? }
export async function POST(req: NextRequest) {
  const start = Date.now()
  const { apiKey, action, merchant, amount, metadata } = await req.json()

  if (!apiKey || !action) {
    return NextResponse.json({ error: 'apiKey and action are required' }, { status: 400 })
  }

  const store = getStore()
  const passport = resolveApiKey(store, apiKey)
  if (!passport) return NextResponse.json({ error: 'invalid api key' }, { status: 401 })
  if (passport.status !== 'active') return NextResponse.json({ error: `passport is ${passport.status}` }, { status: 403 })

  const passportId = passport.id
  const billing = getBilling(store, passportId)
  const now = Date.now()

  // Rate limit
  const rateLimit = PLAN_RATE_LIMIT[billing.plan]
  if (!checkRateLimit(billing, rateLimit)) {
    return NextResponse.json({ error: 'rate_limit', retryAfterMs: 60000 }, { status: 429 })
  }

  // Find the most permissive active proof for this passport + action
  const proof = [...store.proofs.values()].find(p =>
    p.passportId === passportId &&
    p.status === 'active' &&
    p.constraints.expiresAt > now &&
    p.permissions.includes(action)
  )

  let decision: 'approved' | 'denied' | 'human_review' = 'approved'
  let reason = 'policy satisfied'

  if (!proof) {
    decision = 'denied'
    reason = `no active proof grants '${action}'`
  } else if (amount !== undefined && proof.constraints.maxAmount !== undefined && amount > proof.constraints.maxAmount) {
    decision = 'human_review'
    reason = `amount $${amount} exceeds proof limit $${proof.constraints.maxAmount}`
  } else if (amount !== undefined && amount > 1000) {
    decision = 'human_review'
    reason = 'high-value transaction requires human approval'
  } else if (amount !== undefined && billing.budgetUsd !== null) {
    const spent = billing.spendUsd ?? 0
    if (spent + amount > billing.budgetUsd) {
      decision = 'denied'
      reason = `budget exhausted ($${spent.toFixed(2)} of $${billing.budgetUsd})`
    }
  }

  // Injection scan
  const injCheck = detectInjection(metadata?.userInput ?? '')

  // Charge credits
  const baseCost = actionCreditCost(billing, action)
  chargeCredits(billing, baseCost)
  if (decision === 'approved' && amount) billing.spendUsd = (billing.spendUsd ?? 0) + amount

  // Build receipt
  const receiptId = generateShortId('rcpt')
  const receiptHmac = computeHmac(JSON.stringify({ receiptId, passportId, action, merchant, amount, decision, issuedAt: now }))

  appendLedgerEvent(store, {
    type: decision === 'approved' ? 'action.approved' : 'action.denied',
    agentId: passport.agentId, passportId,
    status: decision === 'approved' ? 'completed' : 'denied',
    timestamp: now,
  })
  updateTrustScore(store, passport.agentId, passportId, { [decision === 'approved' ? 'approved' : decision === 'denied' ? 'denied' : 'approved']: true })
  recordActivity(store, { passportId, agentLabel: passport.label, type: `action.${decision}`, message: `${action}${merchant ? ` at ${merchant}` : ''}`, amount, merchant, decision })
  const riskScore = computeRiskScore({ amount, merchant, trustScore: store.trustScores.get(passport.agentId) })

  return NextResponse.json({
    approved: decision === 'approved',
    decision,
    reason,
    receiptId,
    receiptHmac,
    riskScore: riskScore.score,
    riskRecommendation: riskScore.recommendation,
    injection: injCheck.flagged ? { detected: true, patterns: injCheck.patterns } : { detected: false },
    latencyMs: Date.now() - start,
  })
}
