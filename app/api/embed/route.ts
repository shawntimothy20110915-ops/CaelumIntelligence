import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

// Verified-by-AgentPass embed badge
export async function GET(req: NextRequest) {
  const agentId = new URL(req.url).searchParams.get('agentId')
  if (!agentId) return new NextResponse('agentId required', { status: 400 })
  const store = getStore()
  const passport = Array.from(store.passports.values()).find(p => p.agentId === agentId)
  if (!passport) return new NextResponse('not found', { status: 404 })
  const ts = store.trustScores.get(agentId)
  const verified = passport.status === 'active'
  const color = verified ? '#0a0' : '#a00'
  const label = verified ? `✓ Verified — Trust ${ts?.score ?? '—'}` : '✗ Revoked'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="32" role="img" aria-label="AgentPass: ${label}"><rect width="220" height="32" fill="${color}" rx="4"/><text x="12" y="20" fill="white" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="600">AgentPass · ${label}</text></svg>`
  return new NextResponse(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=60' } })
}
