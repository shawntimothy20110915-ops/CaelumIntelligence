import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { computeHmac } from '@/lib/crypto'
import type { AttestationChain } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const agentId = req.nextUrl.searchParams.get('agentId')
  const chains = agentId
    ? store.attestationChains.filter(a => a.agentId === agentId)
    : store.attestationChains.slice(-50)
  return NextResponse.json({ chains })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { actionId, agentId } = await req.json()
  if (!actionId || !agentId) return NextResponse.json({ error: 'actionId, agentId required' }, { status: 400 })
  const passport = store.agentToPassportId.has(agentId) ? store.passports.get(store.agentToPassportId.get(agentId)!) : undefined
  const hw = passport ? store.hardwareBindings.get(passport.id) : undefined
  if (!hw) return NextResponse.json({ error: 'no hardware binding for agent' }, { status: 422 })
  const signature = computeHmac(`action:${actionId}:agent:${agentId}`)
  const tpmAttestation = computeHmac(`tpm:${hw.hardwareFingerprint}:${actionId}`)
  const chain: AttestationChain = { actionId, agentId, hardwareBindingId: hw.hardwareFingerprint, signature, tpmAttestation, ts: Date.now() }
  store.attestationChains.push(chain)
  return NextResponse.json({ chain })
}
