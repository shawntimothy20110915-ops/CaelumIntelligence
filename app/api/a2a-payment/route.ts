import { NextRequest, NextResponse } from 'next/server'
import { getStore, recordActivity } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { A2APayment } from '@/lib/types'

const FEE_RATE = 0.01 // 1%

export async function POST(req: NextRequest) {
  const { fromPassport, toPassport, amountUsd } = await req.json()
  if (!fromPassport || !toPassport || !amountUsd) return NextResponse.json({ error: 'fromPassport+toPassport+amountUsd required' }, { status: 400 })
  const store = getStore()
  if (!store.passports.has(fromPassport)) return NextResponse.json({ error: 'fromPassport not found' }, { status: 404 })
  if (!store.passports.has(toPassport))   return NextResponse.json({ error: 'toPassport not found' },   { status: 404 })
  const id = generateShortId('a2a')
  const fee = +(amountUsd * FEE_RATE).toFixed(2)
  const pay: A2APayment = {
    id, fromPassport, toPassport, amountUsd, feeUsd: fee,
    status: 'escrowed', escrowedAt: Date.now(), releasedAt: null, disputeReason: null,
  }
  store.a2aPayments.set(id, pay)
  const fromP = store.passports.get(fromPassport)!
  recordActivity(store, {
    passportId: fromPassport, agentLabel: fromP.label,
    type: 'a2a.escrow', message: `Escrowed $${amountUsd} to ${toPassport}`, amount: amountUsd,
  })
  return NextResponse.json({ payment: pay })
}

export async function PATCH(req: NextRequest) {
  const { paymentId, action, disputeReason } = await req.json()
  const store = getStore()
  const pay = store.a2aPayments.get(paymentId)
  if (!pay) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (pay.status !== 'escrowed') return NextResponse.json({ error: `status=${pay.status}` }, { status: 409 })
  if (action === 'release') { pay.status = 'released'; pay.releasedAt = Date.now() }
  else if (action === 'dispute') { pay.status = 'disputed'; pay.disputeReason = disputeReason || 'unspecified' }
  else if (action === 'refund')  { pay.status = 'refunded'; pay.releasedAt = Date.now() }
  else return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  return NextResponse.json({ payment: pay })
}

export async function GET() {
  const store = getStore()
  const payments = Array.from(store.a2aPayments.values())
  const gmv = payments.filter(p => p.status === 'released').reduce((s, p) => s + p.amountUsd, 0)
  const revenue = payments.filter(p => p.status === 'released').reduce((s, p) => s + p.feeUsd, 0)
  return NextResponse.json({ payments, gmv, revenueUsd: revenue, feeRate: FEE_RATE })
}
