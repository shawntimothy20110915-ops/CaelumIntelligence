import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import type { SdkToken } from '@/lib/types'

const ALL_SCOPES = ['passport:read', 'passport:write', 'proof:delegate', 'eval:submit', 'trust:read', 'audit:export']

export async function GET(req: NextRequest) {
  const store = getStore()
  const orgId = req.nextUrl.searchParams.get('orgId')
  const tokens = orgId
    ? [...store.sdkTokens.values()].filter(t => t.orgId === orgId).map(t => ({ ...t, secret: '***' }))
    : [...store.sdkTokens.values()].map(t => ({ ...t, secret: '***' }))
  return NextResponse.json({ tokens, scopes: ALL_SCOPES })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { orgId, scopes = ALL_SCOPES, ttlDays = 90 } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  const tokenId = generateShortId('sdk')
  const secret = computeHmac(`${orgId}:${tokenId}:${Date.now()}`).slice(0, 40)
  const token: SdkToken = {
    tokenId, orgId, scopes: scopes.filter((s: string) => ALL_SCOPES.includes(s)),
    issuedAt: Date.now(), expiresAt: Date.now() + ttlDays * 86400000, secret,
  }
  store.sdkTokens.set(tokenId, token)
  return NextResponse.json({ token, warning: 'Store this secret — it will not be shown again' })
}

export async function DELETE(req: NextRequest) {
  const store = getStore()
  const { tokenId } = await req.json()
  const existed = store.sdkTokens.delete(tokenId)
  return NextResponse.json({ revoked: existed })
}
