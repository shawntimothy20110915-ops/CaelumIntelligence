import { NextRequest, NextResponse } from 'next/server'
import { getStore, getPassportsByOwner } from '@/lib/store'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const store = getStore()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const agentId = searchParams.get('agentId')
  const after = searchParams.get('after')

  // Scope to the caller's own agents — never expose other tenants' ledger.
  const ownedAgentIds = new Set(getPassportsByOwner(store, session.uid).map(p => p.agentId))
  let events = [...store.ledger].reverse().filter(e => ownedAgentIds.has(e.agentId))

  if (agentId) {
    events = events.filter((e) => e.agentId === agentId)
  }

  if (after) {
    const afterSeq = parseInt(after)
    events = events.filter((e) => e.seq > afterSeq)
  }

  const total = events.length
  events = events.slice(0, limit)

  return NextResponse.json({ events, total, seq: store.seq })
}
