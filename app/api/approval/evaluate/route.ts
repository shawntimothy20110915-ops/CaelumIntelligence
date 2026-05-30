import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent, getBilling, actionCreditCost, chargeCredits, checkRateLimit, checkAndFireAlerts, fireWebhookAlert, updateTrustScore, recordActivity, detectInjection, computeRiskScore } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import { PLAN_RATE_LIMIT, HUMAN_REVIEW_MULTIPLIER } from '@/lib/types'
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

  const billing = getBilling(store, passportId)
  const now = Date.now()

  let decision: ApprovalResult['decision'] = 'approved'
  let reason = 'policy satisfied'

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

  // ── Policy checks ──────────────────────────────────────────────────────
  if (passport.status !== 'active') {
    decision = 'denied'; reason = `passport is ${passport.status}`
  } else if (proof.status !== 'active') {
    decision = 'denied'; reason = `proof is ${proof.status}`
  } else if (proof.constraints.expiresAt < now) {
    decision = 'denied'; reason = 'proof expired'; proof.status = 'expired'
  } else if (!proof.permissions.includes(action)) {
    decision = 'denied'; reason = `action '${action}' not in granted permissions`
  } else if (amount !== undefined && proof.constraints.maxAmount !== undefined && amount > proof.constraints.maxAmount) {
    decision = 'human_review'; reason = `amount $${amount} exceeds proof limit $${proof.constraints.maxAmount} — queued for human review`
  } else if (merchant && proof.constraints.allowedMerchants && !proof.constraints.allowedMerchants.includes(merchant)) {
    decision = 'denied'; reason = `merchant '${merchant}' not in allowed list`
  } else if (amount !== undefined && amount > 1000) {
    decision = 'human_review'; reason = 'high-value transaction requires human approval'
  }

  // ── Feature 3: Per-agent spend budget ─────────────────────────────────
  if (decision === 'approved' && amount !== undefined && billing.budgetUsd !== null) {
    if (billing.spendUsd + amount > billing.budgetUsd) {
      decision = 'denied'
      reason = `budget exhausted — $${billing.spendUsd.toFixed(2)} spent of $${billing.budgetUsd} limit`
      appendLedgerEvent(store, { type: 'billing.budget_exhausted', agentId: passport.agentId, passportId, amount, status: 'denied', timestamp: now })
    }
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
  store.receipts.set(receiptId, receipt)

  if (decision === 'human_review') {
    store.approvalQueue.push({
      id: generateShortId('queue'), passportId, proofId,
      agentLabel: passport.label, action, merchant, amount,
      queuedAt: now, status: 'pending',
    })
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

  return NextResponse.json({ result, receipt, trustScore, riskScore: risk, injection })
}
