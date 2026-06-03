import { NextRequest, NextResponse } from 'next/server'
import { getStore, fingerprintAgent } from '@/lib/store'
import { computeHmac } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const store = getStore()
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ dnas: [...store.agentDnas.values()] })
  const dna = store.agentDnas.get(agentId)
  return NextResponse.json({ dna: dna ?? null })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { agentId, modelId, systemPrompt } = await req.json()
  if (!agentId || !modelId || !systemPrompt) return NextResponse.json({ error: 'agentId, modelId, systemPrompt required' }, { status: 400 })
  const systemPromptHash = computeHmac(systemPrompt).slice(0, 32)
  const dna = fingerprintAgent(store, agentId, modelId, systemPromptHash)
  const existing = [...store.agentDnas.values()].filter(d => d.fingerprint === dna.fingerprint && d.agentId !== agentId)
  return NextResponse.json({ dna, cloneDetected: existing.length > 0, cloneOf: existing[0]?.agentId ?? null })
}
