import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import type { AgentBond } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, amountUsd } = await req.json()
  if (!passportId || !amountUsd) return NextResponse.json({ error: 'passportId+amountUsd required' }, { status: 400 })
  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  let bond = store.bonds.get(passportId)
  if (!bond) {
    bond = { passportId, bondUsd: 0, slashed: 0, history: [] }
    store.bonds.set(passportId, bond)
  }
  bond.bondUsd += amountUsd
  bond.history.push({ ts: Date.now(), delta: amountUsd, reason: 'deposit' })
  return NextResponse.json({ bond })
}

export async function PATCH(req: NextRequest) {
  const { passportId, slashUsd, reason } = await req.json()
  const store = getStore()
  const bond = store.bonds.get(passportId)
  if (!bond) return NextResponse.json({ error: 'no bond' }, { status: 404 })
  const actual = Math.min(slashUsd, bond.bondUsd)
  bond.bondUsd -= actual
  bond.slashed += actual
  bond.history.push({ ts: Date.now(), delta: -actual, reason: reason || 'policy_violation' })
  return NextResponse.json({ bond, slashed: actual })
}

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  const store = getStore()
  if (passportId) {
    const b = store.bonds.get(passportId)
    if (!b) return NextResponse.json({ error: 'no bond' }, { status: 404 })
    return NextResponse.json({ bond: b })
  }
  const all = Array.from(store.bonds.values())
  return NextResponse.json({ bonds: all, totalLocked: all.reduce((s, b) => s + b.bondUsd, 0), totalSlashed: all.reduce((s, b) => s + b.slashed, 0) })
}
