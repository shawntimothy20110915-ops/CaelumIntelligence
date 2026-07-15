import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function POST(req: NextRequest) {
  const { orgId, seats } = await req.json()
  if (!orgId || typeof seats !== 'number' || seats < 1) {
    return NextResponse.json({ error: 'orgId and seats (number >= 1) required' }, { status: 400 })
  }
  const store = getStore()
  const org = store.orgs.get(orgId)
  if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 })
  org.maxSeats += seats
  return NextResponse.json({ orgId, seatsAdded: seats, newMaxSeats: org.maxSeats, currentAgents: org.agentIds.length })
}
