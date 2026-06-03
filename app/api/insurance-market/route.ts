import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { InsuranceBid } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const passportId = req.nextUrl.searchParams.get('passportId')
  const bids = passportId
    ? [...store.insuranceBids.values()].filter(b => b.passportId === passportId)
    : [...store.insuranceBids.values()]
  return NextResponse.json({ bids, count: bids.length })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { passportId, actionType, premiumBps, maxCoverageUsd, providerId } = await req.json()
  if (!passportId || !actionType) return NextResponse.json({ error: 'passportId, actionType required' }, { status: 400 })
  const bid: InsuranceBid = {
    id: generateShortId('bid'),
    providerId: providerId ?? 'provider-default',
    passportId,
    actionType,
    premiumBps: premiumBps ?? 25,
    maxCoverageUsd: maxCoverageUsd ?? 1000,
    expiresAt: Date.now() + 86400000 * 7,
  }
  store.insuranceBids.set(bid.id, bid)
  return NextResponse.json({ bid })
}

export async function PATCH(req: NextRequest) {
  const store = getStore()
  const { bidId } = await req.json()
  const bid = store.insuranceBids.get(bidId)
  if (!bid) return NextResponse.json({ error: 'bid not found' }, { status: 404 })
  bid.acceptedAt = Date.now()
  store.insuranceBids.set(bidId, bid)
  const platformCutBps = 50
  return NextResponse.json({ bid, platformRevenue: bid.maxCoverageUsd * (platformCutBps / 10000) })
}
