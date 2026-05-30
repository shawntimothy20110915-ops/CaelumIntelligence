import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const orgId = new URL(req.url).searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  const store = getStore()
  const org = store.orgs.get(orgId)
  if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 })
  const passports = Array.from(store.passports.values()).filter(p => org.agentIds.includes(p.agentId))
  const billings = passports.map(p => store.billing.get(p.id)).filter(Boolean)
  const trust = passports.map(p => store.trustScores.get(p.agentId)).filter(Boolean)
  return NextResponse.json({ org, passports, billings, trustScores: trust })
}
