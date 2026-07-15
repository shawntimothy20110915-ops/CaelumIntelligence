import { NextRequest, NextResponse } from 'next/server'
import { getStore, getPassportsByOwner } from '@/lib/store'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const store = getStore()
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const ownIds = new Set(getPassportsByOwner(store, session.uid).map(p => p.id))

  // No id → read-only list of the most recent receipts (for the dashboard).
  if (!id) {
    const limit = Math.min(Number(searchParams.get('limit') ?? '25'), 100)
    const receipts = Array.from(store.receipts.values())
      .filter(r => ownIds.has(r.passportId))
      .sort((a, b) => b.issuedAt - a.issuedAt)
      .slice(0, limit)
    return NextResponse.json({ receipts })
  }

  const receipt = store.receipts.get(id)
  if (!receipt || !ownIds.has(receipt.passportId)) {
    return NextResponse.json({ error: 'receipt not found' }, { status: 404 })
  }
  return NextResponse.json({ receipt })
}
