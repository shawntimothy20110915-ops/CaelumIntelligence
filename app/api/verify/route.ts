import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { computeHmac, verifyReceiptSignature } from '@/lib/crypto'
import { canonicalReceipt, canonicalProof } from '@/lib/types'

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const store = getStore()

  // Verify a delegation proof's Ed25519 signature (public, no auth — that's the point).
  const proofId = params.get('proofId')
  if (proofId) {
    const p = store.proofs.get(proofId)
    if (!p) return NextResponse.json({ verified: false, error: 'proof not found' }, { status: 404 })
    const signatureOk = !!p.signature && verifyReceiptSignature(canonicalProof(p), p.signature)
    const live = p.status === 'active' && p.constraints.expiresAt > Date.now()
    return NextResponse.json({ verified: signatureOk, signatureOk, live, status: p.status, proof: p })
  }

  const receiptId = params.get('receiptId')
  if (!receiptId) return NextResponse.json({ verified: false, error: 'receiptId or proofId required' }, { status: 400 })
  const r = store.receipts.get(receiptId)
  if (!r) return NextResponse.json({ verified: false, error: 'receipt not found' }, { status: 404 })

  // Authoritative check: Ed25519 signature over the canonical receipt. Anyone can
  // reproduce this with the published public key; only the holder of the private
  // key could have produced a valid signature. No symmetric escape hatches.
  const signatureOk = !!r.signature && verifyReceiptSignature(canonicalReceipt(r), r.signature)
  const passportHmacOk = computeHmac(r.passportId) === r.trustChain.passportHmac
  const anchor = store.merkleAnchors.find(a => a.receiptIds.includes(receiptId))
  return NextResponse.json({
    verified: signatureOk && passportHmacOk,
    signatureOk,
    passportHmacOk,
    receipt: r,
    anchored: !!anchor,
    anchor,
  })
}
