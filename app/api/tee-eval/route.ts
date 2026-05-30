import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import { createHash } from 'crypto'
import type { TeeEvaluation } from '@/lib/types'

// Simulated TEE: evaluate inside a notional enclave; return attestation
export async function POST(req: NextRequest) {
  const { passportId, proofId, action, amount, merchant } = await req.json()
  if (!passportId || !proofId) return NextResponse.json({ error: 'passportId+proofId required' }, { status: 400 })
  const store = getStore()
  const passport = store.passports.get(passportId)
  const proof = store.proofs.get(proofId)
  if (!passport || !proof) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Inside the "enclave": evaluate policy without leaking secret to caller
  let decision: 'approved' | 'denied' | 'human_review' = 'approved'
  if (proof.status !== 'active') decision = 'denied'
  else if (!proof.permissions.includes(action)) decision = 'denied'
  else if (amount && proof.constraints.maxAmount && amount > proof.constraints.maxAmount) decision = 'human_review'
  else if (merchant && proof.constraints.allowedMerchants && !proof.constraints.allowedMerchants.includes(merchant)) decision = 'denied'

  const policyHash = createHash('sha256').update(JSON.stringify(proof.constraints)).digest('hex')
  const inputHash  = createHash('sha256').update(JSON.stringify({ action, amount, merchant })).digest('hex')
  const enclaveAttestation = computeHmac('enclave|' + policyHash + '|' + inputHash + '|' + decision)
  const measurementMrenclave = '0x' + 'd'.repeat(64)
  const tee: TeeEvaluation = {
    id: generateShortId('tee'),
    passportId, proofId, enclaveAttestation, policyHash, inputHash,
    decision, measurementMrenclave, evaluatedAt: Date.now(),
  }
  store.teeEvaluations.push(tee)
  return NextResponse.json({ evaluation: tee })
}

export async function GET() {
  const store = getStore()
  return NextResponse.json({ evaluations: store.teeEvaluations.slice(-100) })
}
