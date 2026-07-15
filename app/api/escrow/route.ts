import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { EscrowPayment } from '@/lib/types'

const TAKE_BPS = 200 // 2%

export async function GET(req: NextRequest) {
  const store = getStore()
  const dagId = req.nextUrl.searchParams.get('dagId')
  const escrows = dagId
    ? [...store.escrows.values()].filter(e => e.dagId === dagId)
    : [...store.escrows.values()]
  return NextResponse.json({ escrows })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { dagId, amount, currency = 'USD' } = await req.json()
  if (!dagId || !amount) return NextResponse.json({ error: 'dagId, amount required' }, { status: 400 })
  const escrow: EscrowPayment = {
    id: generateShortId('esc'), dagId, amount, currency,
    takeBps: TAKE_BPS, status: 'held', createdAt: Date.now(),
  }
  store.escrows.set(escrow.id, escrow)
  return NextResponse.json({ escrow, platformFee: amount * (TAKE_BPS / 10000) })
}

export async function PATCH(req: NextRequest) {
  const store = getStore()
  const { escrowId, action } = await req.json() as { escrowId: string; action: 'release' | 'claw-back' }
  const escrow = store.escrows.get(escrowId)
  if (!escrow) return NextResponse.json({ error: 'escrow not found' }, { status: 404 })
  escrow.status = action === 'release' ? 'released' : 'clawed-back'
  escrow.settledAt = Date.now()
  store.escrows.set(escrowId, escrow)
  const platformEarned = action === 'release' ? escrow.amount * (escrow.takeBps / 10000) : 0
  return NextResponse.json({ escrow, platformEarned })
}
