import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const passport = store.passports.get(passportId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

  const ledgerEvents = store.ledger.filter(e => e.passportId === passportId || e.agentId === passport.agentId)
  const receipts = Array.from(store.receipts.values()).filter(r => r.passportId === passportId)
  const proofs = Array.from(store.proofs.values()).filter(p => p.passportId === passportId)
  const activity = store.activity.filter(a => a.passportId === passportId)

  return NextResponse.json({ passport, proofs, ledgerEvents, receipts, activity })
}
