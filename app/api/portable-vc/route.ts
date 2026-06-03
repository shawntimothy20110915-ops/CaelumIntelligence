import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import type { PortableTrustVC } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const agentId = req.nextUrl.searchParams.get('agentId')
  const vcs = agentId
    ? [...store.portableVcs.values()].filter(v => v.agentId === agentId)
    : [...store.portableVcs.values()]
  return NextResponse.json({ vcs })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { agentId, scoreAbove = 700 } = await req.json()
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  const ts = store.trustScores.get(agentId)
  if (!ts || ts.score < scoreAbove) return NextResponse.json({ error: 'trust score too low', required: scoreAbove, actual: ts?.score ?? 0 }, { status: 422 })
  const vcId = generateShortId('vc')
  const proof = computeHmac(`${vcId}:${agentId}:score>${scoreAbove}`)
  const vc: PortableTrustVC = { vcId, agentId, scoreAbove, proof, issuedAt: Date.now(), expiresAt: Date.now() + 30 * 86400000 }
  store.portableVcs.set(vcId, vc)
  return NextResponse.json({ vc })
}

export async function PUT(req: NextRequest) {
  const store = getStore()
  const { vcId } = await req.json()
  const vc = store.portableVcs.get(vcId)
  if (!vc) return NextResponse.json({ valid: false, error: 'vc not found' })
  const ts = store.trustScores.get(vc.agentId)
  const valid = vc.expiresAt > Date.now() && (ts?.score ?? 0) >= vc.scoreAbove
  return NextResponse.json({ valid, vc, currentScore: ts?.score ?? 0 })
}
