export interface AgentPassport {
  id: string
  agentId: string
  label: string
  publicKey: string
  apiKey: string
  mintedAt: number
  expiresAt: number | null
  status: 'active' | 'revoked' | 'suspended'
  killSwitchUrl: string | null
  metadata: Record<string, string>
  ownerUserId?: string   // set when minted by an authenticated user; absent = public demo
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

export interface User {
  id: string
  email: string
  passwordHash: string
  plan: PlanTier
  orgId: string | null
  stripeCustomerId?: string
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

// ═══ R&D batch — 40 features ═════════════════════════════════════════════

// 1. TrustScore™
export interface TrustScore {
  agentId: string
  score: number              // 0..1000
  approvals: number
  denials: number
  disputes: number
  bondUsd: number
  ageDays: number
  lastUpdated: number
  badges: string[]
}

// 2. AgentBio™ — behavioral biometrics
export interface AgentBio {
  passportId: string
  baseline: { meanIntervalMs: number; medianAmount: number; merchantSet: string[]; actionMix: Record<string, number> }
  recent:   { meanIntervalMs: number; medianAmount: number; merchantSet: string[]; actionMix: Record<string, number> }
  drift: number              // 0..1
  hijackSuspected: boolean
  samples: number
}

// 3. ZK Compliance Proofs
export interface ZkProof {
  id: string
  passportId: string
  claim: 'budget_under' | 'spend_below' | 'plan_is'
  publicInput: Record<string, string | number>
  commitment: string
  proof: string
  verified: boolean
  createdAt: number
}

// 4. AgentQuorum™
export interface QuorumRequest {
  id: string
  passportId: string
  action: string
  amount?: number
  threshold: number          // M of N
  required: number           // N
  signers: string[]
  signatures: { passportId: string; signature: string; signedAt: number }[]
  status: 'pending' | 'approved' | 'denied' | 'expired'
  expiresAt: number
}

// 5. Confidential Policy TEE
export interface TeeEvaluation {
  id: string
  passportId: string
  proofId: string
  enclaveAttestation: string
  policyHash: string
  inputHash: string
  decision: 'approved' | 'denied' | 'human_review'
  measurementMrenclave: string
  evaluatedAt: number
}

// 6. A2A Payment Rails
export interface A2APayment {
  id: string
  fromPassport: string
  toPassport: string
  amountUsd: number
  feeUsd: number              // 1% take rate
  status: 'escrowed' | 'released' | 'disputed' | 'refunded'
  escrowedAt: number
  releasedAt: number | null
  disputeReason: string | null
}

// 7. PolicyAutoPilot
export interface ComplianceBundle {
  id: string
  framework: 'soc2' | 'pci' | 'hipaa' | 'gdpr' | 'ccpa' | 'iso27001'
  industry: string
  generatedPolicies: Array<{ rule: string; constraint: string; rationale: string }>
  controlsCovered: string[]
  generatedAt: number
}

// 8. HardwarePassport
export interface HardwareBinding {
  passportId: string
  hardwareFingerprint: string
  tpmEkPub: string
  attestedAt: number
  attestationChain: string[]
}

// 9. AdversarialShield™
export interface InjectionDetection {
  id: string
  passportId: string
  input: string
  score: number              // 0..1
  flagged: boolean
  patterns: string[]
  detectedAt: number
}

// 10. Action Choreography
export interface ActionDag {
  id: string
  passportId: string
  proofId: string
  steps: Array<{ id: string; action: string; merchant?: string; amount?: number; dependsOn: string[] }>
  approved: boolean
  committedAt: number
  executedSteps: string[]
  status: 'committed' | 'executing' | 'complete' | 'aborted'
}

// 11. Bonded Agents
export interface AgentBond {
  passportId: string
  bondUsd: number
  slashed: number
  history: Array<{ ts: number; delta: number; reason: string }>
}

// 12. AgentInsurance
export interface InsurancePolicy {
  id: string
  passportId: string
  premiumUsd: number
  coverageUsd: number
  active: boolean
  claims: Array<{ id: string; amount: number; reason: string; status: 'pending' | 'paid' | 'denied'; ts: number }>
}

// 13. Policy Marketplace
export interface PolicyTemplate {
  id: string
  name: string
  vendor: string
  category: string
  priceUsd: number
  installs: number
  rating: number
  rules: Array<{ permission: string; maxAmount?: number; allowedMerchants?: string[] }>
}

// 14. NL Policy Authoring
export interface NlPolicyResult {
  prompt: string
  compiled: { permissions: string[]; maxAmount?: number; allowedMerchants?: string[]; ttlHours: number }
  confidence: number
}

// 15. FedPolicyLearn
export interface FederatedSignal {
  id: string
  pattern: string
  prevalence: number
  contributors: number
  publishedAt: number
}

// 16. Time-Decay Trust
export interface TrustDecayState {
  passportId: string
  decayRate: number          // permissions lost per day idle
  lastActivity: number
  effectivePermissions: string[]
}

// 17. Honeypot Canaries
export interface HoneypotHit {
  id: string
  passportId: string
  canary: string
  detectedAt: number
  flagged: true
}

// 18. RiskScore 0-100
export interface RiskScore {
  score: number
  reasons: string[]
  recommendation: 'approve' | 'review' | 'deny'
}

// 19. Anti-Collusion Graph
export interface CollusionCluster {
  id: string
  passportIds: string[]
  sharedMerchants: string[]
  suspiciousActions: number
  detectedAt: number
}

// 20. Merkle Anchoring
export interface MerkleAnchor {
  id: string
  rootHash: string
  receiptIds: string[]
  anchoredAt: number
  txid: string                // simulated bitcoin/eth txid
  chain: 'bitcoin' | 'ethereum'
}

// ─── User-facing surfaces (21–40) ────────────────────────────────────────

export interface ActivityEvent {
  id: string
  passportId: string
  agentLabel: string
  type: string
  message: string
  amount?: number
  merchant?: string
  decision?: string
  ts: number
}

export interface PolicyBlock {
  id: string
  kind: 'if' | 'then' | 'when' | 'limit'
  config: Record<string, string | number | boolean>
}

export interface VisualPolicy {
  id: string
  name: string
  passportId: string
  blocks: PolicyBlock[]
  createdAt: number
}

export interface OnboardingProgress {
  passportId: string
  steps: { name: string; completed: boolean }[]
  startedAt: number
}

export interface AnomalyAlert {
  id: string
  passportId: string
  severity: 'low' | 'med' | 'high'
  message: string
  ts: number
  acknowledged: boolean
}

// ── Wave-2 types ───────────────────────────────────────────────────────────

export interface MeterUsage {
  orgId: string
  passportId: string
  metricType: 'trust-lookup' | 'zk-proof' | 'tee-eval' | 'bio-sample'
  count: number
  totalCostUsd: number
  billedAt: number
}

export interface InsuranceBid {
  id: string
  providerId: string
  passportId: string
  actionType: string
  premiumBps: number   // basis points of action amount
  maxCoverageUsd: number
  expiresAt: number
  acceptedAt?: number
}

export interface EscrowPayment {
  id: string
  dagId: string
  amount: number
  currency: string
  takeBps: number
  status: 'held' | 'released' | 'clawed-back'
  createdAt: number
  settledAt?: number
}

export interface SubscriptionTier {
  orgId: string
  tier: 'starter' | 'verified' | 'enterprise'
  priceUsdPerMonth: number
  features: string[]
  startedAt: number
  renewsAt: number
}

export interface BadgeLicense {
  id: string
  orgId: string
  domain: string
  logoUrl?: string
  issuedAt: number
  expiresAt: number
  callCount: number
}

export interface SlashingEvent {
  id: string
  bondId: string
  reason: string
  slashedUsd: number
  yieldEarnedUsd: number
  ts: number
}

export interface AgentDna {
  agentId: string
  modelId: string
  systemPromptHash: string
  weightsHash?: string
  fingerprint: string   // sha256 of above fields
  createdAt: number
}

export interface PortableTrustVC {
  vcId: string
  agentId: string
  scoreAbove: number
  proof: string        // ZK-style commitment
  issuedAt: number
  expiresAt: number
}

export interface PreCrimeSignal {
  agentId: string
  actionSequence: string[]
  predictedRisk: number   // 0-100
  confidence: number
  recommendation: 'allow' | 'review' | 'block'
  generatedAt: number
}

export interface AttestationChain {
  actionId: string
  agentId: string
  hardwareBindingId: string
  signature: string
  tpmAttestation: string
  ts: number
}

export interface CollusionEmbedding {
  clusterId: string
  agentIds: string[]
  edgeWeights: number[][]
  riskScore: number
  detectedAt: number
}

export interface CreditReport {
  agentId: string
  score: number
  scoreHistory: { date: string; score: number }[]
  badges: string[]
  approvals: number
  denials: number
  disputes: number
  topMerchants: string[]
  generatedAt: number
}

export interface DisputeThread {
  id: string
  receiptId: string
  passportId: string
  messages: { role: 'user' | 'system'; text: string; ts: number }[]
  status: 'open' | 'resolved' | 'escalated'
  createdAt: number
}

export interface LeaderboardEntry {
  rank: number
  agentId: string
  passportLabel: string
  score: number
  approvals: number
  badges: string[]
}

export interface TrustGraphNode {
  id: string
  type: 'agent' | 'org' | 'action'
  label: string
  trustScore?: number
}

export interface TrustGraphEdge {
  source: string
  target: string
  weight: number
  type: 'delegated' | 'evaluated' | 'paid'
}

export interface SdkToken {
  tokenId: string
  orgId: string
  scopes: string[]
  issuedAt: number
  expiresAt: number
  secret: string
}

export interface OAuthClient {
  clientId: string
  orgId: string
  redirectUris: string[]
  scopes: string[]
  createdAt: number
}

export interface IntegrationConnector {
  id: string
  type: 'zapier' | 'mcp' | 'webhook'
  orgId: string
  config: Record<string, string>
  createdAt: number
}

export interface QuotaDashboard {
  orgId: string
  evalLimit: number
  evalUsed: number
  proofLimit: number
  proofUsed: number
  apiCallsLimit: number
  apiCallsUsed: number
  resetAt: number
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
