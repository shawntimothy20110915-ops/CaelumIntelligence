export interface AgentPassport {
  id: string
  agentId: string
  label: string
  publicKey: string
  mintedAt: number
  expiresAt: number | null
  status: 'active' | 'revoked' | 'suspended'
  killSwitchUrl: string | null
  metadata: Record<string, string>
}

export interface DelegationProof {
  id: string
  passportId: string
  grantedTo: string
  permissions: string[]
  constraints: {
    maxAmount?: number
    allowedMerchants?: string[]
    expiresAt: number
  }
  signature: string
  issuedAt: number
  status: 'active' | 'revoked' | 'expired'
  creditCost: number
}

export type LedgerEventType =
  | 'passport.minted'
  | 'proof.delegated'
  | 'action.approved'
  | 'action.denied'
  | 'action.human_review'
  | 'passport.revoked'
  | 'proof.revoked'
  | 'payment.completed'
  | 'billing.topup'
  | 'billing.quota_exceeded'
  | 'billing.budget_exhausted'
  | 'billing.rate_limited'

export interface LedgerEvent {
  id: string
  seq: number
  type: LedgerEventType
  agentId: string
  passportId?: string
  proofId?: string
  amount?: number
  merchant?: string
  status: 'completed' | 'denied' | 'pending_review'
  timestamp: number
  hash: string
  prevHash: string
  hmac: string
}

export interface ApprovalRequest {
  passportId: string
  proofId: string
  action: string
  merchant?: string
  amount?: number
  metadata?: Record<string, string>
}

export interface ApprovalResult {
  decision: 'approved' | 'denied' | 'human_review'
  reason: string
  latencyMs: number
  receiptId: string
  eventId: string
  creditsCharged?: number
  creditsRemaining?: number
}

export interface SignedReceipt {
  id: string
  receiptNumber: number
  passportId: string
  agentId: string
  action: string
  merchant?: string
  amount?: number
  decision: string
  trustChain: {
    passportHmac: string
    proofHmac: string
    approvalHmac: string
  }
  hmac: string
  issuedAt: number
  retainUntil: number
}

export type PlanTier = 'free' | 'pro' | 'enterprise'

export const PLAN_QUOTA: Record<PlanTier, number> = {
  free: 500,
  pro: 25000,
  enterprise: Infinity,
}

export const PLAN_MAX_PROOFS: Record<PlanTier, number> = {
  free: 3,
  pro: 50,
  enterprise: Infinity,
}

export const PLAN_RATE_LIMIT: Record<PlanTier, number> = {
  free: 10,
  pro: 200,
  enterprise: 2000,
}

export const PLAN_PRICE_USD: Record<PlanTier, number> = {
  free: 0,
  pro: 29,
  enterprise: 199,
}

export const ACTION_CREDIT_COST: Record<string, number> = {
  search:   1,
  purchase: 3,
  refund:   2,
  booking:  2,
  transfer: 5,
}

export const PROOF_TTL_CREDIT_COST = (ttlHours: number): number => {
  if (ttlHours <= 1)  return 1
  if (ttlHours <= 6)  return 3
  if (ttlHours <= 24) return 8
  return 40
}

export const HUMAN_REVIEW_MULTIPLIER = 10
export const OVERAGE_COST_PER_EVAL   = 0.002
export const WEBHOOK_CREDIT_COST     = 1

export interface BillingAccount {
  passportId: string
  plan: PlanTier
  credits: number
  evalsUsed: number
  proofCount: number
  spendUsd: number
  budgetUsd: number | null
  overageMode: 'hard' | 'soft'
  overageEvalsUsed: number
  overageCostUsd: number
  billingPeriodStart: number
  webhookUrl: string | null
  webhookAlertsSent: number[]
  webhookEvalsCost: number
  orgId: string | null
  rateWindow: { count: number; windowStart: number }
  actionCosts: Record<string, number>
}

export interface Organization {
  id: string
  name: string
  seats: number
  maxSeats: number
  agentIds: string[]
  plan: 'team' | 'enterprise'
  createdAt: number
}

export interface PromoCode {
  code: string
  type: 'upgrade' | 'credits' | 'extend'
  value: string | number
  used: boolean
  expiresAt: number
}

export interface WebhookEvent {
  id: string
  passportId: string
  event: string
  payload: Record<string, unknown>
  firedAt: number
  creditsCost: number
}

export interface SystemStatus {
  healthy: boolean
  uptime: number
  totalEvents: number
  activePassports: number
  activeProofs: number
  pendingApprovals: number
  p95LatencyMs: number
  revokeLatencyMs: number
  testsPassing: number
  testsTotal: number
}
