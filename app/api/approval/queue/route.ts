import { NextRequest, NextResponse } from 'next/server'
import { getStore, getPassportsByOwner } from '@/lib/store'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const store = getStore()
  const ownIds = new Set(getPassportsByOwner(store, session.uid).map(p => p.id))
  const queue = store.approvalQueue.filter((q) => q.status === 'pending' && ownIds.has(q.passportId))
  return NextResponse.json({ queue })
}
