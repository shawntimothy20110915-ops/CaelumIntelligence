import { NextRequest, NextResponse } from 'next/server'
import { getStore, computeRiskScore } from '@/lib/store'

export async function POST(req: NextRequest) {
  const { passportId, proofId, action, amount, merchant } = await req.json()
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const passport = store.passports.get(passportId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const proof = proofId ? store.proofs.get(proofId) : undefined
  const agentBio = store.agentBios.get(passportId)
  const trustScore = store.trustScores.get(passport.agentId)
  const result = computeRiskScore({
    amount, merchant, agentBio, trustScore,
    allowedMerchants: proof?.constraints.allowedMerchants,
  })
  return NextResponse.json({ action, ...result })
}
