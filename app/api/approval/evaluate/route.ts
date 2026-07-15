import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent, getBilling, actionCreditCost, chargeCredits, checkRateLimit, checkAndFireAlerts, fireWebhookAlert, updateTrustScore, recordActivity, detectInjection, computeRiskScore } from '@/lib/store'
import { generateShortId, computeHmac, signReceipt } from '@/lib/crypto'
import { getSession } from '@/lib/session'
import { evaluatePolicy } from '@/lib/policy'
import { signApprovalToken } from '@/lib/approval-token'
import { notifyApproval } from '@/lib/notify'
import { PLAN_RATE_LIMIT, HUMAN_REVIEW_MULTIPLIER, canonicalReceipt } from '@/lib/types'
import type { ApprovalResult, SignedReceipt } from '@/lib/types'

export async function POST(req: NextRequest) {
  const start = Date.now()
  const body = await req.json()
  const { passportId, proofId, action, merchant, amount, metadata } = body

  if (!passportId || !proofId || !action) {
    return NextResponse.json({ error: 'passportId, proofId, and action are required' }, { status: 400 })
  }

  const store = getStore()
  const passport = store.passports.get(passportId)
  const proof = store.proofs.get(proofId)

  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  if (!proof)    return NextResponse.json({ error: 'proof not found'    }, { status: 404 })

  // A real tenant's passport can only be exercised by its owner. Ownerless demo
  // passports stay open so the logged-out showcase keeps working.
  if (passport.ownerUserId) {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    if (session.uid !== passport.ownerUserId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const billing = getBilling(store, passportId)
  const now = Date.now()

  // ── Feature 11: Rate limiting ──────────────────────────────────────────
  const rateLimit = PLAN_RATE_LIMIT[billing.plan]
  if (!checkRateLimit(billing, rateLimit)) {
    appendLedgerEvent(store, { type: 'billing.rate_limited', agentId: passport.agentId, passportId, status: 'denied', timestamp: now })
    return NextResponse.json(
      { error: 'rate_limit', message: `Exceeded ${rateLimit} evals/min for ${billing.plan} plan`, retryAfterMs: 60000 },
      { status: 429 }
    )
  }

  // ── Feature 6: Per-action credit cost ─────────────────────────────────
  const baseCost = actionCreditCost(billing, action)

  // ── Policy: the single shared decision (lib/policy.ts) ─────────────────
  const policy = evaluatePolicy({
    passportStatus: passport.status,
    proof: { status: proof.status, permissions: proof.permissions, constraints: proof.constraints },
    action, amount, merchant, now,
    budgetUsd: billing.budgetUsd, spendUsd: billing.spendUsd,
  })
  let decision: ApprovalResult['decision'] = policy.decision
  let reason = policy.reason
  if (policy.expireProof) proof.status = 'expired'
  if (decision === 'denied' && reason.startsWith('budget exhausted')) {
    appendLedgerEvent(store, { type: 'billing.budget_exhausted', agentId: passport.agentId, passportId, amount, status: 'denied', timestamp: now })
  }

  // ── Feature 9: Human review surcharge ─────────────────────────────────
  const creditCost = decision === 'human_review' ? baseCost * HUMAN_REVIEW_MULTIPLIER : baseCost

  // ── Feature 1 + 2 + 4: Charge credits (quota + purchased credits + overage) ──
  const charge = chargeCredits(billing, creditCost)
  if (!charge) {
    decision = 'denied'
    reason = 'quota_exceeded — upgrade plan or purchase credit pack'
    appendLedgerEvent(store, { type: 'billing.quota_exceeded', agentId: passport.agentId, passportId, status: 'denied', timestamp: now })
  }

  // ── Feature 3: Track spend ─────────────────────────────────────────────
  if (decision === 'approved' && amount !== undefined) {
    billing.spendUsd += amount
  }

  // ── Feature 12: Webhook billing alerts ────────────────────────────────
  checkAndFireAlerts(store, billing)

  // ── Ledger + receipt ───────────────────────────────────────────────────
  const receiptId = generateShortId('rcpt')
  const receiptNumber = store.receiptCounter++
  const latencyMs = Date.now() - start

  const eventType    = decision === 'approved' ? 'action.approved' : decision === 'denied' ? 'action.denied' : 'action.human_review'
  const eventStatus  = decision === 'approved' ? 'completed' : decision === 'denied' ? 'denied' : 'pending_review'

  const event = appendLedgerEvent(store, {
    type: eventType, agentId: passport.agentId, passportId, proofId,
    amount, merchant, status: eventStatus, timestamp: now,
  })

  const receipt: SignedReceipt = {
    id: receiptId, receiptNumber, passportId, agentId: passport.agentId,
    action, merchant, amount, decision,
    trustChain: {
      passportHmac: computeHmac(passportId),
      proofHmac:    computeHmac(proofId),
      approvalHmac: computeHmac(event.id),
    },
    hmac: computeHmac(`${receiptId}-${passportId}-${action}-${amount ?? 0}`),
    issuedAt: now, retainUntil: now + 86400000 * 365 * 7,
  }
  receipt.signature = signReceipt(canonicalReceipt(receipt))
  store.receipts.set(receiptId, receipt)

  let approvalLink: string | undefined
  if (decision === 'human_review') {
    const queueId = generateShortId('queue')
    store.approvalQueue.push({
      id: queueId, passportId, proofId,
      agentLabel: passport.label, action, merchant, amount,
      queuedAt: now, status: 'pending',
    })
    approvalLink = `${new URL(req.url).origin}/api/approval/resolve?token=${signApprovalToken(queueId)}`
    void notifyApproval({ link: approvalLink, agentLabel: passport.label, action, merchant, amount, reason })
  }

  // ── Feature 15: Metered webhook on every fired alert ──────────────────
  if (billing.webhookUrl && (decision === 'denied' || decision === 'human_review')) {
    fireWebhookAlert(store, billing, `action.${decision}`, { passportId, action, merchant, amount, reason })
  }

  // ── R&D: trust score, activity feed, risk, adversarial scan ──────────
  updateTrustScore(store, passport.agentId, passportId, {
    approved: decision === 'approved',
    denied:   decision === 'denied',
  })
  recordActivity(store, {
    passportId, agentLabel: passport.label, type: eventType,
    message: `${action}${merchant ? ' @ ' + merchant : ''}${amount ? ' $' + amount : ''}`,
    amount, merchant, decision,
  })
  const trustScore = store.trustScores.get(passport.agentId)
  const agentBio   = store.agentBios.get(passportId)
  const risk = computeRiskScore({ amount, merchant, agentBio, trustScore, allowedMerchants: proof.constraints.allowedMerchants })
  let injection = null
  if (metadata && typeof metadata === 'object' && typeof metadata.userInput === 'string') {
    injection = detectInjection(metadata.userInput)
  }

  const result: ApprovalResult = {
    decision, reason, latencyMs, receiptId, eventId: event.id,
    creditsCharged: charge?.charged ?? 0,
    creditsRemaining: billing.credits,
  }

  return NextResponse.json({ result, receipt, trustScore, riskScore: risk, injection, approvalLink })
}
