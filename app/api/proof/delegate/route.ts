import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent, getBilling, chargeCredits, proofTtlCreditCost } from '@/lib/store'
import { generateShortId, signReceipt } from '@/lib/crypto'
import { getSession } from '@/lib/session'
import { PLAN_MAX_PROOFS, canonicalProof } from '@/lib/types'
import type { DelegationProof } from '@/lib/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { passportId, grantedTo, permissions, maxAmount, allowedMerchants, ttlHours } = body

  if (!passportId || !grantedTo || !Array.isArray(permissions)) {
    return NextResponse.json({ error: 'passportId, grantedTo, and permissions are required' }, { status: 400 })
  }

  const store = getStore()
  const passport = store.passports.get(passportId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  if (passport.status !== 'active') return NextResponse.json({ error: `passport is ${passport.status}` }, { status: 403 })

  // Only the owner may delegate authority from a real tenant's passport.
  if (passport.ownerUserId) {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    if (session.uid !== passport.ownerUserId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const billing = getBilling(store, passportId)

  // ── Feature 2: Proof count limit per plan ─────────────────────────────
  const maxProofs = PLAN_MAX_PROOFS[billing.plan]
  if (billing.proofCount >= maxProofs) {
    return NextResponse.json(
      { error: 'proof_limit_reached', limit: maxProofs, plan: billing.plan, upgrade: 'POST /api/billing/topup' },
      { status: 429 }
    )
  }

  // ── Feature 8: Proof TTL credit cost ─────────────────────────────────
  const resolvedTtl = ttlHours ?? 24
  const creditCost = proofTtlCreditCost(resolvedTtl)
  const charge = chargeCredits(billing, creditCost)
  if (!charge) {
    return NextResponse.json(
      { error: 'insufficient_credits', required: creditCost, available: billing.credits, message: `TTL of ${resolvedTtl}h costs ${creditCost} credits` },
      { status: 402 }
    )
  }

  billing.proofCount++

  const now = Date.now()
  const id = generateShortId('proof')

  const proof: DelegationProof = {
    id, passportId, grantedTo, permissions,
    constraints: {
      maxAmount: maxAmount ?? undefined,
      allowedMerchants: allowedMerchants ?? undefined,
      expiresAt: now + resolvedTtl * 3600000,
    },
    signature: '',
    issuedAt: now, status: 'active',
    creditCost,
  }
  proof.signature = signReceipt(canonicalProof(proof))
  store.proofs.set(id, proof)

  appendLedgerEvent(store, {
    type: 'proof.delegated', agentId: passport.agentId, passportId, proofId: id,
    status: 'completed', timestamp: now,
  })

  return NextResponse.json({ proof, creditCost, creditsRemaining: billing.credits }, { status: 201 })
}

// Public demo listing: only proofs on un-owned showcase passports. A tenant's own
// proofs are private (read them via session-scoped surfaces).
export async function GET() {
  const store = getStore()
  const proofs = Array.from(store.proofs.values()).filter(p => {
    const passport = store.passports.get(p.passportId)
    return !passport?.ownerUserId
  })
  return NextResponse.json({ proofs })
}
