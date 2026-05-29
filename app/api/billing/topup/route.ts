import { NextRequest, NextResponse } from 'next/server'
import { getStore, getBilling, appendLedgerEvent } from '@/lib/store'

const CREDIT_PACKS = [
  { id: 'pack-100',   credits: 100,   priceUsd: 1.00  },
  { id: 'pack-1000',  credits: 1000,  priceUsd: 8.00  },
  { id: 'pack-5000',  credits: 5000,  priceUsd: 35.00 },
  { id: 'pack-25000', credits: 25000, priceUsd: 150.00 },
]

export async function GET() {
  return NextResponse.json({ packs: CREDIT_PACKS })
}

export async function POST(req: NextRequest) {
  const { passportId, packId, credits } = await req.json()
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })

  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

  const billing = getBilling(store, passportId)
  const passport = store.passports.get(passportId)!

  let added = 0
  let priceUsd = 0

  if (packId) {
    const pack = CREDIT_PACKS.find(p => p.id === packId)
    if (!pack) return NextResponse.json({ error: 'invalid packId', available: CREDIT_PACKS.map(p => p.id) }, { status: 400 })
    added = pack.credits
    priceUsd = pack.priceUsd
  } else if (typeof credits === 'number' && credits > 0) {
    added = credits
    priceUsd = credits * 0.001
  } else {
    return NextResponse.json({ error: 'provide packId or credits amount' }, { status: 400 })
  }

  billing.credits += added

  appendLedgerEvent(store, {
    type: 'billing.topup', agentId: passport.agentId, passportId,
    amount: added, status: 'completed', timestamp: Date.now(),
  })

  return NextResponse.json({
    passportId,
    creditsAdded: added,
    creditsBalance: billing.credits,
    chargedUsd: priceUsd,
    message: `${added} credits added to ${passportId}`,
  })
}
