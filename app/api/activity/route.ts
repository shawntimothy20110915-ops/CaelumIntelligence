import { NextRequest, NextResponse } from 'next/server'
import { getStore, getPassportsByOwner } from '@/lib/store'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const limit = Number(new URL(req.url).searchParams.get('limit') || '50')
  const store = getStore()
  const ownIds = new Set(getPassportsByOwner(store, session.uid).map(p => p.id))
  const activity = store.activity.filter(a => ownIds.has(a.passportId)).slice(0, limit)
  return NextResponse.json({ activity })
}
