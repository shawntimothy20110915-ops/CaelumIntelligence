import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { IntegrationConnector } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const orgId = req.nextUrl.searchParams.get('orgId')
  const connectors = orgId
    ? [...store.connectors.values()].filter(c => c.orgId === orgId)
    : [...store.connectors.values()]
  return NextResponse.json({ connectors })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { orgId, type, config = {} } = await req.json()
  if (!orgId || !type) return NextResponse.json({ error: 'orgId, type required' }, { status: 400 })
  if (!['zapier', 'mcp', 'webhook'].includes(type)) return NextResponse.json({ error: 'type must be zapier, mcp, or webhook' }, { status: 400 })
  const connector: IntegrationConnector = {
    id: generateShortId('con'), type, orgId, config, createdAt: Date.now(),
  }
  store.connectors.set(connector.id, connector)
  return NextResponse.json({ connector })
}
