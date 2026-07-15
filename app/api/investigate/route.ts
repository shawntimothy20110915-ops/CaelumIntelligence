import { NextRequest, NextResponse } from 'next/server'
import { getStore, computeRiskScore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const receiptId = new URL(req.url).searchParams.get('receiptId')
  if (!receiptId) return NextResponse.json({ error: 'receiptId required' }, { status: 400 })
  const store = getStore()
  const receipt = store.receipts.get(receiptId)
  if (!receipt) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const passport = store.passports.get(receipt.passportId)
  const trustScore = passport ? store.trustScores.get(passport.agentId) : undefined
  const bio = store.agentBios.get(receipt.passportId)
  const event = store.ledger.find(e => e.passportId === receipt.passportId && e.amount === receipt.amount)
  const risk = computeRiskScore({ amount: receipt.amount, merchant: receipt.merchant, agentBio: bio, trustScore })
  const anchor = store.merkleAnchors.find(a => a.receiptIds.includes(receiptId))
  return NextResponse.json({
    receipt, passport, trustScore, agentBio: bio, ledgerEvent: event,
    riskAnalysis: risk, merkleAnchor: anchor,
    chain: { passportHmac: receipt.trustChain.passportHmac, proofHmac: receipt.trustChain.proofHmac, approvalHmac: receipt.trustChain.approvalHmac },
  })
}
