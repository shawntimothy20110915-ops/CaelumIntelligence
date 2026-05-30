import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { InsurancePolicy } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, coverageUsd } = await req.json()
  if (!passportId || !coverageUsd) return NextResponse.json({ error: 'passportId+coverageUsd required' }, { status: 400 })
  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const premium = +(coverageUsd * 0.02).toFixed(2)
  const id = generateShortId('ins')
  const p: InsurancePolicy = {
    id, passportId, premiumUsd: premium, coverageUsd, active: true, claims: [],
  }
  store.insurance.set(id, p)
  return NextResponse.json({ policy: p })
}

export async function PATCH(req: NextRequest) {
  const { policyId, claimAmount, reason } = await req.json()
  const store = getStore()
  const p = store.insurance.get(policyId)
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!p.active) return NextResponse.json({ error: 'inactive' }, { status: 409 })
  const claim = { id: generateShortId('clm'), amount: Math.min(claimAmount, p.coverageUsd), reason, status: 'pending' as const, ts: Date.now() }
  p.claims.push(claim)
  return NextResponse.json({ policy: p, claim })
}

export async function GET() {
  const store = getStore()
  return NextResponse.json({ policies: Array.from(store.insurance.values()) })
}
