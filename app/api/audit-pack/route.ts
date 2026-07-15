import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const passport = store.passports.get(passportId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const proofs   = Array.from(store.proofs.values()).filter(p => p.passportId === passportId)
  const receipts = Array.from(store.receipts.values()).filter(r => r.passportId === passportId)
  const events   = store.ledger.filter(e => e.passportId === passportId)
  const compliance = Array.from(store.compliance.values())
  const anchors  = store.merkleAnchors.filter(a => a.receiptIds.some(id => receipts.find(r => r.id === id)))
  return NextResponse.json({
    pack: {
      generatedAt: Date.now(),
      passport,
      proofs,
      receipts,
      ledgerEvents: events,
      complianceBundles: compliance,
      merkleAnchors: anchors,
      summary: {
        totalEvents: events.length,
        totalReceipts: receipts.length,
        totalProofs: proofs.length,
        retainUntil: receipts[0]?.retainUntil ?? null,
      },
    },
  })
}
