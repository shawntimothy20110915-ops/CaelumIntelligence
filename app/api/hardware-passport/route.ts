import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { computeHmac } from '@/lib/crypto'
import { createHash } from 'crypto'
import type { HardwareBinding } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, tpmEkPub, deviceSerial } = await req.json()
  if (!passportId || !tpmEkPub) return NextResponse.json({ error: 'passportId+tpmEkPub required' }, { status: 400 })
  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const hardwareFingerprint = createHash('sha256').update(tpmEkPub + '|' + (deviceSerial || '')).digest('hex')
  const binding: HardwareBinding = {
    passportId, hardwareFingerprint, tpmEkPub,
    attestedAt: Date.now(),
    attestationChain: [computeHmac('tpm-root|' + hardwareFingerprint), computeHmac('aik|' + hardwareFingerprint)],
  }
  store.hardwareBindings.set(passportId, binding)
  return NextResponse.json({ binding })
}

export async function PUT(req: NextRequest) {
  // verify a binding against presented hardware
  const { passportId, tpmEkPub, deviceSerial } = await req.json()
  const store = getStore()
  const binding = store.hardwareBindings.get(passportId)
  if (!binding) return NextResponse.json({ verified: false, reason: 'no binding' }, { status: 404 })
  const presented = createHash('sha256').update(tpmEkPub + '|' + (deviceSerial || '')).digest('hex')
  const verified = presented === binding.hardwareFingerprint
  return NextResponse.json({ verified, fingerprint: presented, expected: binding.hardwareFingerprint })
}

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  const store = getStore()
  if (passportId) {
    const b = store.hardwareBindings.get(passportId)
    if (!b) return NextResponse.json({ error: 'not bound' }, { status: 404 })
    return NextResponse.json({ binding: b })
  }
  return NextResponse.json({ bindings: Array.from(store.hardwareBindings.values()) })
}
