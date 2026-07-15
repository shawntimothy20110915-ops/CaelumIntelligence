import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import type { TrustDecayState } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, decayRate } = await req.json()
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const proofs = Array.from(store.proofs.values()).filter(p => p.passportId === passportId && p.status === 'active')
  const allPerms = Array.from(new Set(proofs.flatMap(p => p.permissions)))
  const state: TrustDecayState = {
    passportId, decayRate: decayRate ?? 0.1, lastActivity: Date.now(),
    effectivePermissions: allPerms,
  }
  store.decayStates.set(passportId, state)
  return NextResponse.json({ state })
}

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const state = store.decayStates.get(passportId)
  if (!state) return NextResponse.json({ error: 'no decay state' }, { status: 404 })

  // compute decay based on idle days
  const idleDays = Math.max(0, (Date.now() - state.lastActivity) / 86400000)
  const decay = Math.min(1, state.decayRate * idleDays)
  const proofs = Array.from(store.proofs.values()).filter(p => p.passportId === passportId && p.status === 'active')
  const allPerms = Array.from(new Set(proofs.flatMap(p => p.permissions)))
  // drop permissions proportionally
  const keep = Math.max(0, Math.floor(allPerms.length * (1 - decay)))
  state.effectivePermissions = allPerms.slice(0, keep)
  return NextResponse.json({ state, decay, idleDays })
}

export async function PATCH(req: NextRequest) {
  // renew on activity
  const { passportId } = await req.json()
  const store = getStore()
  const state = store.decayStates.get(passportId)
  if (!state) return NextResponse.json({ error: 'no decay state' }, { status: 404 })
  state.lastActivity = Date.now()
  return NextResponse.json({ state, renewed: true })
}
