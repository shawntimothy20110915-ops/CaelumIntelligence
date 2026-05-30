import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import type { QuorumRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { passportId, action, amount, signers, threshold, ttlMs } = body
  if (!passportId || !signers || !threshold) return NextResponse.json({ error: 'passportId+signers+threshold required' }, { status: 400 })
  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const id = generateShortId('quorum')
  const qr: QuorumRequest = {
    id, passportId, action, amount,
    threshold, required: signers.length, signers, signatures: [],
    status: 'pending', expiresAt: Date.now() + (ttlMs || 600000),
  }
  store.quorumRequests.set(id, qr)
  return NextResponse.json({ request: qr })
}

export async function PATCH(req: NextRequest) {
  const { requestId, signerPassportId } = await req.json()
  const store = getStore()
  const qr = store.quorumRequests.get(requestId)
  if (!qr) return NextResponse.json({ error: 'quorum request not found' }, { status: 404 })
  if (qr.status !== 'pending') return NextResponse.json({ error: `status=${qr.status}` }, { status: 409 })
  if (Date.now() > qr.expiresAt) { qr.status = 'expired'; return NextResponse.json({ error: 'expired' }, { status: 410 }) }
  if (!qr.signers.includes(signerPassportId)) return NextResponse.json({ error: 'not authorized signer' }, { status: 403 })
  if (qr.signatures.find(s => s.passportId === signerPassportId)) return NextResponse.json({ error: 'already signed' }, { status: 409 })
  qr.signatures.push({ passportId: signerPassportId, signature: computeHmac(requestId + signerPassportId), signedAt: Date.now() })
  if (qr.signatures.length >= qr.threshold) qr.status = 'approved'
  return NextResponse.json({ request: qr, satisfied: qr.status === 'approved' })
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  const store = getStore()
  if (id) {
    const qr = store.quorumRequests.get(id)
    if (!qr) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ request: qr })
  }
  return NextResponse.json({ requests: Array.from(store.quorumRequests.values()) })
}
