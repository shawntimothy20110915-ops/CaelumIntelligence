import type {
  AgentPassport, DelegationProof, LedgerEvent, SignedReceipt,
  BillingAccount, Organization, PromoCode, WebhookEvent,
  TrustScore, AgentBio, ZkProof, QuorumRequest, TeeEvaluation, A2APayment,
  ComplianceBundle, HardwareBinding, InjectionDetection, ActionDag,
  AgentBond, InsurancePolicy, PolicyTemplate, FederatedSignal,
  TrustDecayState, HoneypotHit, CollusionCluster, MerkleAnchor,
  ActivityEvent, VisualPolicy, OnboardingProgress, AnomalyAlert,
  MeterUsage, InsuranceBid, EscrowPayment, SubscriptionTier, BadgeLicense, SlashingEvent,
  AgentDna, PortableTrustVC, PreCrimeSignal, AttestationChain, CollusionEmbedding,
  CreditReport, DisputeThread, LeaderboardEntry, TrustGraphNode, TrustGraphEdge,
  SdkToken, OAuthClient, IntegrationConnector, QuotaDashboard,
  User, PlanTier,
} from './types'
import {
  PLAN_QUOTA, ACTION_CREDIT_COST, PROOF_TTL_CREDIT_COST,
  HUMAN_REVIEW_MULTIPLIER, WEBHOOK_CREDIT_COST, OVERAGE_COST_PER_EVAL,
} from './types'
import { generateShortId, generatePublicKey, computeHmac, hashLedgerEntry, generateSignature } from './crypto'
import { hydrateStore, startPersistence, persistNow } from './persistence'

void HUMAN_REVIEW_MULTIPLIER // suppress lint

interface Store {
  passports:      Map<string, AgentPassport>
  apiKeys:        Map<string, string>           // apiKey → passportId
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
  // R&D additions
  trustScores:        Map<string, TrustScore>
  agentBios:          Map<string, AgentBio>
  zkProofs:           Map<string, ZkProof>
  quorumRequests:    Map<string, QuorumRequest>
  teeEvaluations:    TeeEvaluation[]
  a2aPayments:        Map<string, A2APayment>
  compliance:         Map<string, ComplianceBundle>
  hardwareBindings:   Map<string, HardwareBinding>
  injections:         InjectionDetection[]
  dags:               Map<string, ActionDag>
  bonds:              Map<string, AgentBond>
  insurance:          Map<string, InsurancePolicy>
  templates:          Map<string, PolicyTemplate>
  fedSignals:         FederatedSignal[]
  decayStates:        Map<string, TrustDecayState>
  honeypotHits:       HoneypotHit[]
  collusionClusters:  CollusionCluster[]
  merkleAnchors:      MerkleAnchor[]
  visualPolicies:     Map<string, VisualPolicy>
  onboardings:        Map<string, OnboardingProgress>
  anomalies:          AnomalyAlert[]
  activity:           ActivityEvent[]
  // Wave-2
  meterUsage:         MeterUsage[]
  insuranceBids:      Map<string, InsuranceBid>
  escrows:            Map<string, EscrowPayment>
  subscriptions:      Map<string, SubscriptionTier>
  badgeLicenses:      Map<string, BadgeLicense>
  slashingEvents:     SlashingEvent[]
  agentDnas:          Map<string, AgentDna>
  portableVcs:        Map<string, PortableTrustVC>
  precrime:           Map<string, PreCrimeSignal>
  attestationChains:  AttestationChain[]
  collusionEmbeddings: CollusionEmbedding[]
  creditReports:      Map<string, CreditReport>
  disputeThreads:     Map<string, DisputeThread>
  leaderboard:        LeaderboardEntry[]
  trustGraph:         { nodes: TrustGraphNode[]; edges: TrustGraphEdge[] }
  sdkTokens:          Map<string, SdkToken>
  oauthClients:       Map<string, OAuthClient>
  connectors:         Map<string, IntegrationConnector>
  quotas:             Map<string, QuotaDashboard>
  users:              Map<string, User>   // keyed by user id
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
    { id: 'pass-7af2ab1c', agentId: 'drift-7af2', label: 'Drift Household Agent', publicKey: generatePublicKey(), apiKey: 'ap_live_drift7af2household0000', mintedAt: now - 86400000 * 14, expiresAt: now + 86400000 * 351, status: 'active', killSwitchUrl: 'https://agentpass.io/revoke/drift-7af2', metadata: { owner: 'household' } },
    { id: 'pass-31bcf009', agentId: 'halo-31bc',  label: 'Halo Commerce Agent',   publicKey: generatePublicKey(), apiKey: 'ap_live_halo31bccommerce0000', mintedAt: now - 86400000 * 7,  expiresAt: now + 86400000 * 358, status: 'active', killSwitchUrl: 'https://agentpass.io/revoke/halo-31bc',  metadata: { owner: 'merchant'   } },
    { id: 'pass-902e44d8', agentId: 'pilot-902e', label: 'Pilot Enterprise Agent', publicKey: generatePublicKey(), apiKey: 'ap_live_pilot902eenterprise00', mintedAt: now - 86400000 * 3,  expiresAt: now + 86400000 * 362, status: 'active', killSwitchUrl: 'https://agentpass.io/revoke/pilot-902e', metadata: { owner: 'enterprise' } },
  ]
  for (const p of seedPassports) {
    store.passports.set(p.id, p)
    store.apiKeys.set(p.apiKey, p.id)
  }

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
    passports: new Map(), apiKeys: new Map(), proofs: new Map(), ledger: [], receipts: new Map(),
    approvalQueue: [], billing: new Map(), orgs: new Map(),
    promoCodes: new Map(), webhookEvents: [],
    seq: 0, startTime: Date.now(), baseEventCount: 847293, receiptCounter: 9115,
    trustScores: new Map(), agentBios: new Map(), zkProofs: new Map(),
    quorumRequests: new Map(), teeEvaluations: [], a2aPayments: new Map(),
    compliance: new Map(), hardwareBindings: new Map(), injections: [],
    dags: new Map(), bonds: new Map(), insurance: new Map(),
    templates: new Map(), fedSignals: [], decayStates: new Map(),
    honeypotHits: [], collusionClusters: [], merkleAnchors: [],
    visualPolicies: new Map(), onboardings: new Map(), anomalies: [],
    activity: [],
    meterUsage: [], insuranceBids: new Map(), escrows: new Map(),
    subscriptions: new Map(), badgeLicenses: new Map(), slashingEvents: [],
    agentDnas: new Map(), portableVcs: new Map(), precrime: new Map(),
    attestationChains: [], collusionEmbeddings: [],
    creditReports: new Map(), disputeThreads: new Map(), leaderboard: [],
    trustGraph: { nodes: [], edges: [] },
    sdkTokens: new Map(), oauthClients: new Map(), connectors: new Map(), quotas: new Map(),
    users: new Map(),
  }
  seedStore(store)
  seedRD(store)
  return store
}

// ─── R&D helpers ─────────────────────────────────────────────────────────

export function recordActivity(store: Store, ev: Omit<ActivityEvent, 'id' | 'ts'>) {
  const a: ActivityEvent = { ...ev, id: generateShortId('act'), ts: Date.now() }
  store.activity.unshift(a)
  if (store.activity.length > 500) store.activity.pop()
  return a
}

export function getOrInitTrustScore(store: Store, agentId: string, passportId: string): TrustScore {
  const k = agentId
  if (!store.trustScores.has(k)) {
    const passport = store.passports.get(passportId)
    const ageDays = passport ? Math.max(1, Math.floor((Date.now() - passport.mintedAt) / 86400000)) : 1
    store.trustScores.set(k, {
      agentId, score: 500, approvals: 0, denials: 0, disputes: 0, bondUsd: 0,
      ageDays, lastUpdated: Date.now(), badges: [],
    })
  }
  return store.trustScores.get(k)!
}

export function updateTrustScore(store: Store, agentId: string, passportId: string, delta: { approved?: boolean; denied?: boolean; disputed?: boolean }) {
  const ts = getOrInitTrustScore(store, agentId, passportId)
  if (delta.approved) { ts.approvals++; ts.score = Math.min(1000, ts.score + 2) }
  if (delta.denied)   { ts.denials++;   ts.score = Math.max(0,   ts.score - 5) }
  if (delta.disputed) { ts.disputes++;  ts.score = Math.max(0,   ts.score - 25) }
  if (ts.score >= 800 && !ts.badges.includes('trusted'))    ts.badges.push('trusted')
  if (ts.approvals >= 10 && !ts.badges.includes('veteran')) ts.badges.push('veteran')
  if (ts.disputes === 0 && ts.approvals >= 5 && !ts.badges.includes('clean')) ts.badges.push('clean')
  ts.lastUpdated = Date.now()
  return ts
}

const INJECTION_PATTERNS = [
  'ignore previous instructions', 'disregard all', 'system prompt',
  'pretend you are', 'bypass policy', 'override constraints', '<|im_start|>',
  'jailbreak', 'developer mode', 'sudo', 'reveal your', 'forget everything',
]

export function detectInjection(input: string): { score: number; flagged: boolean; patterns: string[] } {
  const lower = input.toLowerCase()
  const hits = INJECTION_PATTERNS.filter(p => lower.includes(p))
  const score = Math.min(1, hits.length / 3)
  return { score, flagged: hits.length > 0, patterns: hits }
}

export function computeRiskScore(args: {
  amount?: number; merchant?: string; agentBio?: AgentBio;
  trustScore?: TrustScore; allowedMerchants?: string[];
}): { score: number; reasons: string[]; recommendation: 'approve' | 'review' | 'deny' } {
  const reasons: string[] = []
  let risk = 0
  if (args.amount && args.amount > 1000) { risk += 25; reasons.push('high amount') }
  if (args.amount && args.amount > 5000) { risk += 25; reasons.push('very high amount') }
  if (args.merchant && args.allowedMerchants && !args.allowedMerchants.includes(args.merchant)) {
    risk += 30; reasons.push('merchant not whitelisted')
  }
  if (args.agentBio?.hijackSuspected) { risk += 40; reasons.push('behavioral drift detected') }
  if (args.trustScore && args.trustScore.score < 300) { risk += 20; reasons.push('low trust score') }
  if (args.trustScore && args.trustScore.disputes > 0) { risk += 15; reasons.push('prior disputes') }
  const score = Math.min(100, risk)
  const recommendation: 'approve' | 'review' | 'deny' =
    score >= 70 ? 'deny' : score >= 40 ? 'review' : 'approve'
  return { score, reasons, recommendation }
}

function seedRD(store: Store) {
  const now = Date.now()
  // seed trust scores for existing passports
  for (const p of store.passports.values()) {
    getOrInitTrustScore(store, p.agentId, p.id)
  }
  // seed marketplace
  const templates: PolicyTemplate[] = [
    { id: 'tpl-ecom',    name: 'E-Commerce Buyer Pack', vendor: 'AgentPass', category: 'commerce', priceUsd: 49,  installs: 1280, rating: 4.7, rules: [{ permission: 'purchase', maxAmount: 500, allowedMerchants: ['amazon.com','bestbuy.com'] }] },
    { id: 'tpl-saas',    name: 'SaaS Refund Bot',       vendor: 'AgentPass', category: 'finance',  priceUsd: 79,  installs: 540,  rating: 4.5, rules: [{ permission: 'refund', maxAmount: 200 }] },
    { id: 'tpl-travel',  name: 'Corporate Travel',      vendor: 'TravelCo',  category: 'travel',   priceUsd: 129, installs: 320,  rating: 4.8, rules: [{ permission: 'booking', maxAmount: 2500, allowedMerchants: ['expedia.com','united.com','marriott.com'] }] },
    { id: 'tpl-fintech', name: 'Fintech Compliance',    vendor: 'AgentPass', category: 'finance',  priceUsd: 299, installs: 88,   rating: 4.9, rules: [{ permission: 'transfer', maxAmount: 10000 }] },
  ]
  for (const t of templates) store.templates.set(t.id, t)

  // seed federated signals
  store.fedSignals.push(
    { id: 'fed-001', pattern: 'rapid_merchant_switching', prevalence: 0.04, contributors: 23, publishedAt: now - 86400000 * 2 },
    { id: 'fed-002', pattern: 'midnight_high_value_burst', prevalence: 0.012, contributors: 41, publishedAt: now - 86400000 * 5 },
    { id: 'fed-003', pattern: 'refund_then_purchase_loop', prevalence: 0.008, contributors: 12, publishedAt: now - 86400000 * 9 },
  )

  // seed bonds
  store.bonds.set('pass-31bcf009', { passportId: 'pass-31bcf009', bondUsd: 500, slashed: 0, history: [{ ts: now - 86400000 * 7, delta: 500, reason: 'initial bond' }] })

  // seed activity
  store.activity.push(
    { id: 'act-seed-1', passportId: 'pass-7af2ab1c', agentLabel: 'Drift Household Agent', type: 'action.approved', message: 'Purchase at whole-foods', amount: 47.23, merchant: 'whole-foods', decision: 'approved', ts: now - 3600000 },
    { id: 'act-seed-2', passportId: 'pass-31bcf009', agentLabel: 'Halo Commerce Agent',    type: 'action.approved', message: 'Purchase at amazon-fresh', amount: 312.5, merchant: 'amazon-fresh', decision: 'approved', ts: now - 7200000 },
  )

  // seed merkle anchor
  store.merkleAnchors.push({
    id: 'anchor-001', rootHash: '0x' + 'a'.repeat(64),
    receiptIds: ['rcpt-9114'], anchoredAt: now - 86400000,
    txid: 'btc-tx-' + 'f'.repeat(40), chain: 'bitcoin',
  })
}

export function resolveApiKey(store: Store, apiKey: string): AgentPassport | null {
  const passportId = store.apiKeys.get(apiKey)
  if (!passportId) return null
  return store.passports.get(passportId) ?? null
}

// ─── Wave-2 helpers ──────────────────────────────────────────────────────

export function recordMeter(store: Store, orgId: string, passportId: string, metricType: MeterUsage['metricType'], count = 1) {
  const RATES: Record<string, number> = { 'trust-lookup': 0.001, 'zk-proof': 0.005, 'tee-eval': 0.004, 'bio-sample': 0.002 }
  store.meterUsage.push({ orgId, passportId, metricType, count, totalCostUsd: count * (RATES[metricType] ?? 0.001), billedAt: Date.now() })
}

export function buildLeaderboard(store: Store): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = []

  // ⚡ Bolt: Pre-compute agentId to passport lookup to avoid O(N*M) Map spreading inside loop
  const passportByAgentId = new Map<string, AgentPassport>()
  store.passports.forEach(p => passportByAgentId.set(p.agentId, p))

  store.trustScores.forEach((ts) => {
    const p = passportByAgentId.get(ts.agentId)
    entries.push({ rank: 0, agentId: ts.agentId, passportLabel: p?.label ?? ts.agentId, score: ts.score, approvals: ts.approvals, badges: ts.badges })
  })
  entries.sort((a, b) => b.score - a.score)
  entries.forEach((e, i) => { e.rank = i + 1 })
  store.leaderboard = entries.slice(0, 50)
  return store.leaderboard
}

export function buildTrustGraph(store: Store) {
  const nodes: TrustGraphNode[] = []
  const edges: TrustGraphEdge[] = []
  store.passports.forEach(p => nodes.push({ id: p.agentId, type: 'agent', label: p.label, trustScore: store.trustScores.get(p.agentId)?.score }))
  store.orgs.forEach(o => nodes.push({ id: o.id, type: 'org', label: o.name }))
  store.proofs.forEach(pr => edges.push({ source: pr.passportId, target: pr.grantedTo, weight: 1, type: 'delegated' }))
  store.a2aPayments.forEach(pay => edges.push({ source: pay.fromPassport, target: pay.toPassport, weight: pay.amountUsd, type: 'paid' }))
  store.trustGraph = { nodes, edges }
  return store.trustGraph
}

export function fingerprintAgent(store: Store, agentId: string, modelId: string, systemPromptHash: string): AgentDna {
  const fingerprint = computeHmac(agentId + modelId + systemPromptHash).slice(0, 32)
  const dna: AgentDna = { agentId, modelId, systemPromptHash, fingerprint, createdAt: Date.now() }
  store.agentDnas.set(agentId, dna)
  return dna
}

export function predictPreCrime(store: Store, agentId: string): PreCrimeSignal {
  const bio = store.agentBios.get(agentId)
  const ts = store.trustScores.get(agentId)
  const recent = store.activity.filter(a => a.passportId).slice(0, 10).map(a => a.type)
  const denialRatio = ts ? ts.denials / Math.max(ts.approvals + ts.denials, 1) : 0
  const predictedRisk = Math.min(100, Math.round(denialRatio * 80 + (bio ? 0 : 20)))
  const sig: PreCrimeSignal = {
    agentId, actionSequence: recent, predictedRisk, confidence: bio ? 0.85 : 0.4,
    recommendation: predictedRisk > 70 ? 'block' : predictedRisk > 40 ? 'review' : 'allow',
    generatedAt: Date.now(),
  }
  store.precrime.set(agentId, sig)
  return sig
}

export function generateCreditReport(store: Store, agentId: string): CreditReport {
  const ts = store.trustScores.get(agentId) ?? { score: 0, approvals: 0, denials: 0, disputes: 0, badges: [] }
  const acts = store.activity.filter(a => a.decision === 'approved' && a.merchant)
  const merchantCounts: Record<string, number> = {}
  acts.forEach(a => { if (a.merchant) merchantCounts[a.merchant] = (merchantCounts[a.merchant] ?? 0) + 1 })
  const topMerchants = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0])
  const now = Date.now()
  const history = [0, 7, 14, 30].map(daysAgo => ({ date: new Date(now - daysAgo * 86400000).toISOString().slice(0, 10), score: Math.max(0, ts.score - daysAgo * 2) }))
  const report: CreditReport = { agentId, score: ts.score, scoreHistory: history, badges: ts.badges, approvals: ts.approvals, denials: ts.denials, disputes: ts.disputes, topMerchants, generatedAt: now }
  store.creditReports.set(agentId, report)
  return report
}

export function getStore(): Store {
  if (!global.__agentpassStore) global.__agentpassStore = initStore()
  return global.__agentpassStore
}

// ─── Durable persistence bootstrap (opt-in via DATABASE_URL) ──────────────
// Runs once per process at module load. Top-level await guarantees the store is
// hydrated from Postgres before any route handler (which imports this module) runs.
declare global { var __agentpassHydrated: boolean | undefined }
if (process.env.DATABASE_URL && !global.__agentpassHydrated) {
  global.__agentpassHydrated = true
  const store = getStore()
  await hydrateStore(store as unknown as Record<string, unknown>)
  startPersistence(getStore as unknown as () => Record<string, unknown>)
}

// ─── Users / accounts ─────────────────────────────────────────────────────
export function findUserByEmail(store: Store, email: string): User | null {
  const e = email.trim().toLowerCase()
  for (const u of store.users.values()) if (u.email === e) return u
  return null
}
export function getUserById(store: Store, id: string): User | null {
  return store.users.get(id) ?? null
}
export function createUser(store: Store, email: string, passwordHash: string, plan: PlanTier = 'free'): User {
  const user: User = {
    id: generateShortId('usr'),
    email: email.trim().toLowerCase(),
    passwordHash, plan, orgId: null, createdAt: Date.now(),
  }
  store.users.set(user.id, user)
  return user
}
/** Force a snapshot to Postgres now (used for must-survive writes like signup/payment). */
export async function flushStore(): Promise<void> {
  await persistNow(getStore() as unknown as Record<string, unknown>)
}

/** Passports owned by a specific user (per-tenant isolation for the core object). */
export function getPassportsByOwner(store: Store, userId: string): AgentPassport[] {
  return Array.from(store.passports.values()).filter(p => p.ownerUserId === userId)
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
