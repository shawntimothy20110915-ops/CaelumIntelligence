import { NextRequest, NextResponse } from 'next/server'
import { getStore, updateTrustScore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { HoneypotHit } from '@/lib/types'

const CANARIES = ['admin_override', 'free_money', 'debug_drain', 'system_seed', 'bypass_2fa', 'root_action']

export async function POST(req: NextRequest) {
  const { passportId, action } = await req.json()
  if (!passportId || !action) return NextResponse.json({ error: 'passportId+action required' }, { status: 400 })
  const store = getStore()
  if (!CANARIES.includes(action)) return NextResponse.json({ tripped: false })
  const passport = store.passports.get(passportId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const hit: HoneypotHit = {
    id: generateShortId('hp'),
    passportId, canary: action, detectedAt: Date.now(), flagged: true,
  }
  store.honeypotHits.push(hit)
  // crash trust
  updateTrustScore(store, passport.agentId, passportId, { disputed: true })
  return NextResponse.json({ tripped: true, hit })
}

export async function GET() {
  const store = getStore()
  return NextResponse.json({ hits: store.honeypotHits, canaries: CANARIES })
}
