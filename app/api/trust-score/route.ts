import { NextRequest, NextResponse } from 'next/server'
import { getStore, getOrInitTrustScore, getPassportByAgentId } from '@/lib/store'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId')
  const store = getStore()
  if (agentId) {
    const passport = getPassportByAgentId(store, agentId)
    if (!passport) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const score = getOrInitTrustScore(store, agentId, passport.id)
    return NextResponse.json({ score, passport: { id: passport.id, label: passport.label, agentId } })
  }
  return NextResponse.json({ scores: Array.from(store.trustScores.values()).sort((a, b) => b.score - a.score) })
}
