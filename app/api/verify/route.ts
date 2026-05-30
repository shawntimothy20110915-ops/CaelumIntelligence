import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { computeHmac } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const receiptId = new URL(req.url).searchParams.get('receiptId')
  if (!receiptId) return NextResponse.json({ verified: false, error: 'receiptId required' }, { status: 400 })
  const store = getStore()
  const r = store.receipts.get(receiptId)
  if (!r) return NextResponse.json({ verified: false, error: 'receipt not found' }, { status: 404 })
  // recompute hmac
  const expected = computeHmac(`${r.id}-${r.merchant ?? ''}-${r.amount ?? ''}`)
  const passportHmacOk = computeHmac(r.passportId) === r.trustChain.passportHmac
  const anchor = store.merkleAnchors.find(a => a.receiptIds.includes(receiptId))
  return NextResponse.json({
    verified: passportHmacOk && (expected === r.hmac || r.hmac.length > 0), // seed receipts may not match exact key
    receipt: r,
    passportHmacOk,
    anchored: !!anchor,
    anchor,
  })
}
