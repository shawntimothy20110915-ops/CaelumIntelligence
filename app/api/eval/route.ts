import { NextRequest, NextResponse } from 'next/server'
import { getStore, resolveApiKey, appendLedgerEvent, getBilling, actionCreditCost, chargeCredits, checkRateLimit, updateTrustScore, recordActivity, detectInjection, computeRiskScore } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import { evaluatePolicy } from '@/lib/policy'
import { signApprovalToken } from '@/lib/approval-token'
import { notifyApproval } from '@/lib/notify'
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

  // Same shared decision as /api/approval/evaluate — including the merchant
  // allowlist, which this endpoint previously skipped.
  const policy = evaluatePolicy({
    passportStatus: passport.status,
    proof: proof ? { status: proof.status, permissions: proof.permissions, constraints: proof.constraints } : null,
    action, amount, merchant, now,
    budgetUsd: billing.budgetUsd, spendUsd: billing.spendUsd ?? 0,
  })
  const decision = policy.decision
  const reason = policy.reason
  if (policy.expireProof && proof) proof.status = 'expired'

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

  // Human review → a real, resolvable approval link (out-of-band, signed, expiring).
  let approvalLink: string | undefined
  if (decision === 'human_review' && proof) {
    const queueId = generateShortId('queue')
    store.approvalQueue.push({ id: queueId, passportId, proofId: proof.id, agentLabel: passport.label, action, merchant, amount, queuedAt: now, status: 'pending' })
    approvalLink = `${new URL(req.url).origin}/api/approval/resolve?token=${signApprovalToken(queueId)}`
    void notifyApproval({ link: approvalLink, agentLabel: passport.label, action, merchant, amount, reason })
  }

  return NextResponse.json({
    approved: decision === 'approved',
    decision,
    reason,
    receiptId,
    receiptHmac,
    riskScore: riskScore.score,
    riskRecommendation: riskScore.recommendation,
    injection: injCheck.flagged ? { detected: true, patterns: injCheck.patterns } : { detected: false },
    approvalLink,
    latencyMs: Date.now() - start,
  })
}
