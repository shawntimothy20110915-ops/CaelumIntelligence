import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent } from '@/lib/store'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { queueId, decision } = body

  if (!queueId || !['approved', 'denied'].includes(decision)) {
    return NextResponse.json({ error: 'queueId and decision (approved|denied) required' }, { status: 400 })
  }

  const store = getStore()
  const item = store.approvalQueue.find((q) => q.id === queueId)

  if (!item) return NextResponse.json({ error: 'queue item not found' }, { status: 404 })
  if (item.status !== 'pending') return NextResponse.json({ error: 'already decided' }, { status: 409 })

  item.status = decision
  const passport = store.passports.get(item.passportId)
  const now = Date.now()

  appendLedgerEvent(store, {
    type: decision === 'approved' ? 'action.approved' : 'action.denied',
    agentId: passport?.agentId ?? 'unknown',
    passportId: item.passportId,
    proofId: item.proofId,
    amount: item.amount,
    merchant: item.merchant,
    status: decision === 'approved' ? 'completed' : 'denied',
    timestamp: now,
  })

  return NextResponse.json({ item, decision, timestamp: now })
}
