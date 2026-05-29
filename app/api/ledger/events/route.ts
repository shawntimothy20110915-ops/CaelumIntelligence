import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const store = getStore()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const agentId = searchParams.get('agentId')
  const after = searchParams.get('after')

  let events = [...store.ledger].reverse()

  if (agentId) {
    events = events.filter((e) => e.agentId === agentId)
  }

  if (after) {
    const afterSeq = parseInt(after)
    events = events.filter((e) => e.seq > afterSeq)
  }

  events = events.slice(0, limit)

  return NextResponse.json({
    events,
    total: store.ledger.length + store.baseEventCount,
    seq: store.seq,
  })
}
