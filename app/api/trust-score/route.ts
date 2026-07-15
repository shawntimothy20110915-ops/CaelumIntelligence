import { NextRequest, NextResponse } from 'next/server'
import { getStore, getOrInitTrustScore, getPassportsByOwner } from '@/lib/store'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId')
  const store = getStore()
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const ownAgentIds = new Set(getPassportsByOwner(store, session.uid).map(p => p.agentId))

  if (agentId) {
    if (!ownAgentIds.has(agentId)) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const passport = Array.from(store.passports.values()).find(p => p.agentId === agentId)
    if (!passport) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const score = getOrInitTrustScore(store, agentId, passport.id)
    return NextResponse.json({ score, passport: { id: passport.id, label: passport.label, agentId } })
  }
  const scores = Array.from(store.trustScores.values())
    .filter(s => ownAgentIds.has(s.agentId))
    .sort((a, b) => b.score - a.score)
  return NextResponse.json({ scores })
}
