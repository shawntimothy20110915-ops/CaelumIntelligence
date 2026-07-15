import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent } from '@/lib/store'
import { getSession } from '@/lib/session'

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

  const passport = store.passports.get(item.passportId)

  // A real tenant's approvals can only be decided by their owner. Ownerless demo
  // items stay open so the logged-out showcase keeps working.
  if (passport?.ownerUserId) {
    const session = getSession(req)
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    if (session.uid !== passport.ownerUserId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  item.status = decision
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
