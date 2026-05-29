import type {
  AgentPassport, DelegationProof, LedgerEvent, SignedReceipt,
  BillingAccount, Organization, PromoCode, WebhookEvent,
} from './types'
import {
  PLAN_QUOTA, ACTION_CREDIT_COST, PROOF_TTL_CREDIT_COST,
  HUMAN_REVIEW_MULTIPLIER, WEBHOOK_CREDIT_COST, OVERAGE_COST_PER_EVAL,
} from './types'
import { generateShortId, generatePublicKey, computeHmac, hashLedgerEntry, generateSignature } from './crypto'

void HUMAN_REVIEW_MULTIPLIER // suppress lint

interface Store {
  passports:      Map<string, AgentPassport>
  proofs:         Map<string, DelegationProof>
  ledger:         LedgerEvent[]
  receipts:       Map<string, SignedReceipt>
  approvalQueue:  ApprovalQueueItem[]
  billing:        Map<string, BillingAccount>
  orgs:           Map<string, Organization>
  promoCodes:     Map<string, PromoCode>
  webhookEvents:  WebhookEvent[]
  seq:            number
  startTime:      number
  baseEventCount: number
  receiptCounter: number
}

export interface ApprovalQueueItem {
  id: string
  passportId: string
  proofId: string
  agentLabel: string
  action: string
  merchant?: string
  amount?: number
  queuedAt: number
  status: 'pending' | 'approved' | 'denied'
}

declare global {
  // eslint-disable-next-line no-var
  var __agentpassStore: Store | undefined
}

// ─── Billing helpers ─────────────────────────────────────────────────────

export function getBilling(store: Store, passportId: string): BillingAccount {
  if (!store.billing.has(passportId)) {
    store.billing.set(passportId, {
      passportId, plan: 'free', credits: 0, evalsUsed: 0, proofCount: 0,
      spendUsd: 0, budgetUsd: null, overageMode: 'hard',
      overageEvalsUsed: 0, overageCostUsd: 0,
      billingPeriodStart: Date.now(),
      webhookUrl: null, webhookAlertsSent: [], webhookEvalsCost: 0, orgId: null,
      rateWindow: { count: 0, windowStart: Date.now() },
      actionCosts: {},
    })
  }
  return store.billing.get(passportId)!
}

export function actionCreditCost(billing: BillingAccount, action: string): number {
  return billing.actionCosts[action] ?? ACTION_CREDIT_COST[action] ?? 1
}

export function proofTtlCreditCost(ttlHours: number): number {
  return PROOF_TTL_CREDIT_COST(ttlHours)
}

export function evalsRemainingInPlan(billing: BillingAccount): number {
  const quota = PLAN_QUOTA[billing.plan]
  if (quota === Infinity) return Infinity
  return Math.max(0, quota - billing.evalsUsed)
}

export function totalCreditsAvailable(billing: BillingAccount): number {
  const planLeft = evalsRemainingInPlan(billing)
  return billing.credits + (planLeft === Infinity ? 999999999 : planLeft)
}

export function checkRateLimit(billing: BillingAccount, limitPerMin: number): boolean {
  const now = Date.now()
  if (now - billing.rateWindow.windowStart > 60000) {
    billing.rateWindow = { count: 0, windowStart: now }
  }
  if (billing.rateWindow.count >= limitPerMin * 2) return false // burst = 2x for 30s window
  billing.rateWindow.count++
  return true
}

export function chargeCredits(
  billing: BillingAccount,
  cost: number
): { charged: number; from: 'credits' | 'quota' | 'overage' } | null {
  if (billing.credits >= cost) {
    billing.credits -= cost
    billing.evalsUsed += cost
    return { charged: cost, from: 'credits' }
  }
  const fromCredits = billing.credits
  billing.credits = 0
  const remaining = cost - fromCredits
  const planLeft = evalsRemainingInPlan(billing)
  if (planLeft === Infinity || planLeft >= remaining) {
    billing.evalsUsed += cost
    return { charged: cost, from: 'quota' }
  }
  if (billing.overageMode === 'hard') {
    billing.credits = fromCredits
    return null
  }
  billing.evalsUsed += cost
  const overCount = remaining - planLeft
  billing.overageEvalsUsed += overCount
  billing.overageCostUsd += overCount * OVERAGE_COST_PER_EVAL
  return { charged: cost, from: 'overage' }
}

export function fireWebhookAlert(
  store: Store,
  billing: BillingAccount,
  event: string,
  payload: Record<string, unknown>
): WebhookEvent | null {
  if (!billing.webhookUrl) return null
  if (billing.credits > 0) {
    billing.credits -= WEBHOOK_CREDIT_COST
  } else {
    billing.evalsUsed += WEBHOOK_CREDIT_COST
  }
  billing.webhookEvalsCost += WEBHOOK_CREDIT_COST
  const ev: WebhookEvent = {
    id: generateShortId('wh'),
    passportId: billing.passportId,
    event,
    payload: { ...payload, webhookUrl: billing.webhookUrl },
    firedAt: Date.now(),
    creditsCost: WEBHOOK_CREDIT_COST,
  }
  store.webhookEvents.push(ev)
  return ev
}

export function checkAndFireAlerts(store: Store, billing: BillingAccount) {
  const quota = PLAN_QUOTA[billing.plan]
  if (quota === Infinity || !billing.webhookUrl) return
  const pct = (billing.evalsUsed / quota) * 100
  for (const t of [50, 80, 100]) {
    if (pct >= t && !billing.webhookAlertsSent.includes(t)) {
      billing.webhookAlertsSent.push(t)
      fireWebhookAlert(store, billing, 'billing.threshold', {
        threshold: t, evalsUsed: billing.evalsUsed, evalsTotal: quota, overageMode: billing.overageMode,
      })
    }
  }
}

// ─── Seed ────────────────────────────────────────────────────────────────

function createGenesisEvent(): LedgerEvent {
  const prevHash = '0000000000000000'
  const data = { seq: 0, type: 'genesis', timestamp: Date.now() - 86400000 * 30 }
  const hash = hashLedgerEntry(data)
  return {
    id: 'evt-00000000', seq: 0, type: 'passport.minted', agentId: 'drift-7af2',
    passportId: 'pass-7af2ab1c', status: 'completed',
    timestamp: Date.now() - 86400000 * 30,
    hash, prevHash, hmac: computeHmac(hash + prevHash),
  }
}

function seedStore(store: Store) {
  const now = Date.now()

  const seedPassports: AgentPassport[] = [
    { id: 'pass-7af2ab1c', agentId: 'drift-7af2', label: 'Drift Household Agent', publicKey: generatePublicKey(), mintedAt: now - 86400000 * 14, expiresAt: now + 86400000 * 351, status: 'active', killSwitchUrl: 'https://agentpass.io/revoke/drift-7af2', metadata: { owner: 'household' } },
    { id: 'pass-31bcf009', agentId: 'halo-31bc',  label: 'Halo Commerce Agent',   publicKey: generatePublicKey(), mintedAt: now - 86400000 * 7,  expiresAt: now + 86400000 * 358, status: 'active', killSwitchUrl: 'https://agentpass.io/revoke/halo-31bc',  metadata: { owner: 'merchant'   } },
    { id: 'pass-902e44d8', agentId: 'pilot-902e', label: 'Pilot Enterprise Agent', publicKey: generatePublicKey(), mintedAt: now - 86400000 * 3,  expiresAt: now + 86400000 * 362, status: 'active', killSwitchUrl: 'https://agentpass.io/revoke/pilot-902e', metadata: { owner: 'enterprise' } },
  ]
  for (const p of seedPassports) store.passports.set(p.id, p)

  store.billing.set('pass-7af2ab1c', { passportId: 'pass-7af2ab1c', plan: 'free',       credits: 50,  evalsUsed: 120,  proofCount: 1, spendUsd: 160.36,  budgetUsd: 500,  overageMode: 'hard', overageEvalsUsed: 0, overageCostUsd: 0, billingPeriodStart: now - 86400000 * 14, webhookUrl: null,                                    webhookAlertsSent: [], webhookEvalsCost: 0, orgId: null,       rateWindow: { count: 0, windowStart: now }, actionCosts: {} })
  store.billing.set('pass-31bcf009', { passportId: 'pass-31bcf009', plan: 'pro',        credits: 500, evalsUsed: 1240, proofCount: 1, spendUsd: 2062.50, budgetUsd: 5000, overageMode: 'soft', overageEvalsUsed: 0, overageCostUsd: 0, billingPeriodStart: now - 86400000 * 7,  webhookUrl: 'https://hooks.example.com/agentpass', webhookAlertsSent: [], webhookEvalsCost: 0, orgId: 'org-alpha', rateWindow: { count: 0, windowStart: now }, actionCosts: {} })
  store.billing.set('pass-902e44d8', { passportId: 'pass-902e44d8', plan: 'enterprise', credits: 0,   evalsUsed: 8300, proofCount: 0, spendUsd: 0,       budgetUsd: null, overageMode: 'soft', overageEvalsUsed: 0, overageCostUsd: 0, billingPeriodStart: now - 86400000 * 3,  webhookUrl: null,                                    webhookAlertsSent: [], webhookEvalsCost: 0, orgId: 'org-alpha', rateWindow: { count: 0, windowStart: now }, actionCosts: {} })

  store.orgs.set('org-alpha', { id: 'org-alpha', name: 'Alpha Corp', seats: 2, maxSeats: 10, agentIds: ['halo-31bc', 'pilot-902e'], plan: 'enterprise', createdAt: now - 86400000 * 30 })

  store.promoCodes.set('LAUNCH50',   { code: 'LAUNCH50',   type: 'credits', value: 500,   used: false, expiresAt: now + 86400000 * 30 })
  store.promoCodes.set('UPGRADEPRO', { code: 'UPGRADEPRO', type: 'upgrade', value: 'pro', used: false, expiresAt: now + 86400000 * 7  })
  store.promoCodes.set('EXTEND30',   { code: 'EXTEND30',   type: 'extend',  value: 30,    used: false, expiresAt: now + 86400000 * 60 })

  const seedProofs: DelegationProof[] = [
    { id: 'proof-a1b2c3d4', passportId: 'pass-7af2ab1c', grantedTo: 'drift-7af2', permissions: ['payment:execute','cart:read','order:create'], constraints: { maxAmount: 500, allowedMerchants: ['whole-foods','amazon-fresh','target'], expiresAt: now + 3600000 * 24 }, signature: generateSignature('proof-a1b2c3d4'), issuedAt: now - 3600000 * 2, status: 'active', creditCost: 8 },
    { id: 'proof-e5f6a7b8', passportId: 'pass-31bcf009', grantedTo: 'halo-31bc',  permissions: ['payment:execute','inventory:read'],           constraints: { maxAmount: 2000, allowedMerchants: ['stripe-merchant-001'], expiresAt: now + 3600000 * 48 }, signature: generateSignature('proof-e5f6a7b8'), issuedAt: now - 3600000 * 5, status: 'active', creditCost: 40 },
  ]
  for (const p of seedProofs) store.proofs.set(p.id, p)

  const eventTypes: Array<{ type: LedgerEvent['type']; agentId: string; amount?: number; merchant?: string; status: LedgerEvent['status'] }> = [
    { type: 'action.approved',     agentId: 'drift-7af2', amount: 47.23,  merchant: 'whole-foods',        status: 'completed'      },
    { type: 'action.approved',     agentId: 'halo-31bc',  amount: 312.50, merchant: 'amazon-fresh',        status: 'completed'      },
    { type: 'action.denied',       agentId: 'pilot-902e', amount: 8500,   merchant: 'unknown-vendor',       status: 'denied'         },
    { type: 'action.approved',     agentId: 'drift-7af2', amount: 89.99,  merchant: 'target',               status: 'completed'      },
    { type: 'action.human_review', agentId: 'halo-31bc',  amount: 1750,   merchant: 'stripe-merchant-001',  status: 'pending_review' },
    { type: 'action.approved',     agentId: 'drift-7af2', amount: 23.14,  merchant: 'whole-foods',          status: 'completed'      },
    { type: 'passport.minted',     agentId: 'pilot-902e',                                                   status: 'completed'      },
    { type: 'proof.delegated',     agentId: 'drift-7af2',                                                   status: 'completed'      },
  ]

  let prevHash = createGenesisEvent().hash
  store.ledger.push(createGenesisEvent())
  store.seq = 1

  for (let i = 0; i < eventTypes.length; i++) {
    const e = eventTypes[i]
    const id = generateShortId('evt')
    const timestamp = now - (eventTypes.length - i) * 300000
    const baseData = { seq: store.seq, type: e.type, agentId: e.agentId, timestamp }
    const hash = hashLedgerEntry(baseData)
    const event: LedgerEvent = {
      id, seq: store.seq++, type: e.type, agentId: e.agentId,
      amount: e.amount, merchant: e.merchant, status: e.status,
      timestamp, hash, prevHash, hmac: computeHmac(hash + prevHash),
    }
    store.ledger.push(event)
    prevHash = hash
  }

  store.receipts.set('rcpt-9114', {
    id: 'rcpt-9114', receiptNumber: 9114, passportId: 'pass-7af2ab1c', agentId: 'drift-7af2',
    action: 'payment:execute', merchant: 'whole-foods', amount: 47.23, decision: 'approved',
    trustChain: { passportHmac: computeHmac('pass-7af2ab1c'), proofHmac: computeHmac('proof-a1b2c3d4'), approvalHmac: computeHmac('approval-9114') },
    hmac: computeHmac('rcpt-9114-whole-foods-47.23'), issuedAt: now - 3600000, retainUntil: now + 86400000 * 365 * 7,
  })
  store.receiptCounter = 9115

  store.approvalQueue.push({
    id: 'queue-001', passportId: 'pass-31bcf009', proofId: 'proof-e5f6a7b8',
    agentLabel: 'Halo Commerce Agent', action: 'payment:execute',
    merchant: 'stripe-merchant-001', amount: 1750, queuedAt: now - 120000, status: 'pending',
  })
}

function initStore(): Store {
  const store: Store = {
    passports: new Map(), proofs: new Map(), ledger: [], receipts: new Map(),
    approvalQueue: [], billing: new Map(), orgs: new Map(),
    promoCodes: new Map(), webhookEvents: [],
    seq: 0, startTime: Date.now(), baseEventCount: 847293, receiptCounter: 9115,
  }
  seedStore(store)
  return store
}

export function getStore(): Store {
  if (!global.__agentpassStore) global.__agentpassStore = initStore()
  return global.__agentpassStore
}

export function appendLedgerEvent(
  store: Store,
  data: Omit<LedgerEvent, 'id' | 'seq' | 'hash' | 'prevHash' | 'hmac'>
): LedgerEvent {
  const prevEvent = store.ledger[store.ledger.length - 1]
  const prevHash = prevEvent?.hash ?? '0000000000000000'
  const id = generateShortId('evt')
  const baseData = { seq: store.seq, type: data.type, agentId: data.agentId, timestamp: data.timestamp }
  const hash = hashLedgerEntry(baseData)
  const event: LedgerEvent = {
    ...data, id, seq: store.seq++, hash, prevHash, hmac: computeHmac(hash + prevHash),
  }
  store.ledger.push(event)
  store.baseEventCount++
  return event
}

export {
  PLAN_QUOTA, ACTION_CREDIT_COST, PROOF_TTL_CREDIT_COST,
  WEBHOOK_CREDIT_COST, OVERAGE_COST_PER_EVAL,
}
