import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { OAuthClient } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const orgId = req.nextUrl.searchParams.get('orgId')
  const clients = orgId
    ? [...store.oauthClients.values()].filter(c => c.orgId === orgId)
    : [...store.oauthClients.values()]
  return NextResponse.json({ clients })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { orgId, redirectUris = [], scopes = ['passport:read', 'eval:submit'] } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  const client: OAuthClient = {
    clientId: generateShortId('oa2'), orgId, redirectUris, scopes, createdAt: Date.now(),
  }
  store.oauthClients.set(client.clientId, client)
  return NextResponse.json({ client })
}
