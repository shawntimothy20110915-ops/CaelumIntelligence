import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const orgId = new URL(req.url).searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  const store = getStore()
  const org = store.orgs.get(orgId)
  if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 })
  return NextResponse.json({ org })
}

export async function POST(req: NextRequest) {
  const { name, maxSeats, plan } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const store = getStore()
  const id = generateShortId('org')
  const org = { id, name, seats: 0, maxSeats: maxSeats ?? 5, agentIds: [], plan: plan ?? 'team', createdAt: Date.now() }
  store.orgs.set(id, org)
  return NextResponse.json({ org }, { status: 201 })
}
