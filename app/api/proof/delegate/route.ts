import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent, getBilling, chargeCredits, proofTtlCreditCost } from '@/lib/store'
import { generateShortId, generateSignature } from '@/lib/crypto'
import { PLAN_MAX_PROOFS } from '@/lib/types'
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
    signature: generateSignature(id + passportId + JSON.stringify(permissions)),
    issuedAt: now, status: 'active',
    creditCost,
  }
  store.proofs.set(id, proof)

  appendLedgerEvent(store, {
    type: 'proof.delegated', agentId: passport.agentId, passportId, proofId: id,
    status: 'completed', timestamp: now,
  })

  return NextResponse.json({ proof, creditCost, creditsRemaining: billing.credits }, { status: 201 })
}

export async function GET() {
  const store = getStore()
  const proofs = Array.from(store.proofs.values())
  return NextResponse.json({ proofs })
}
