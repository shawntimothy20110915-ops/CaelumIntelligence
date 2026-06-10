/**
 * The single, canonical authorization decision for an agent action.
 *
 * Pure function — no store, no I/O — so it is unit-tested in isolation and shared
 * by every enforcement surface (`/api/approval/evaluate`, `/api/eval`, the SDK).
 * Previously `/api/eval` re-implemented a weaker subset of this (it skipped the
 * merchant allowlist); routing both through here closes that gap.
 */

export type Decision = 'approved' | 'denied' | 'human_review'

export interface PolicyProof {
  status: 'active' | 'revoked' | 'expired'
  permissions: string[]
  constraints: { maxAmount?: number; allowedMerchants?: string[]; expiresAt: number }
}

export interface PolicyInput {
  passportStatus: 'active' | 'revoked' | 'suspended'
  proof: PolicyProof | null
  action: string
  amount?: number
  merchant?: string
  now: number
  budgetUsd: number | null
  spendUsd: number
}

export interface PolicyDecision {
  decision: Decision
  reason: string
  /** True when the proof should be marked expired as a side effect (caller mutates). */
  expireProof?: boolean
}

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const { passportStatus, proof, action, amount, merchant, now, budgetUsd, spendUsd } = input

  if (passportStatus !== 'active') return { decision: 'denied', reason: `passport is ${passportStatus}` }
  if (!proof) return { decision: 'denied', reason: `no active proof grants '${action}'` }
  if (proof.status !== 'active') return { decision: 'denied', reason: `proof is ${proof.status}` }
  if (proof.constraints.expiresAt < now) return { decision: 'denied', reason: 'proof expired', expireProof: true }
  if (!proof.permissions.includes(action)) return { decision: 'denied', reason: `action '${action}' not in granted permissions` }

  if (amount !== undefined && proof.constraints.maxAmount !== undefined && amount > proof.constraints.maxAmount) {
    return { decision: 'human_review', reason: `amount $${amount} exceeds proof limit $${proof.constraints.maxAmount} — queued for human review` }
  }
  if (merchant && proof.constraints.allowedMerchants && !proof.constraints.allowedMerchants.includes(merchant)) {
    return { decision: 'denied', reason: `merchant '${merchant}' not in allowed list` }
  }
  if (amount !== undefined && amount > 1000) {
    return { decision: 'human_review', reason: 'high-value transaction requires human approval' }
  }
  if (amount !== undefined && budgetUsd !== null && spendUsd + amount > budgetUsd) {
    return { decision: 'denied', reason: `budget exhausted — $${spendUsd.toFixed(2)} spent of $${budgetUsd} limit` }
  }

  return { decision: 'approved', reason: 'policy satisfied' }
}
