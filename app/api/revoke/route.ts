import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent } from '@/lib/store'
import { getSession } from '@/lib/session'

/** Owned passports may only be mutated by their owner; un-owned demo passports are open. */
function ownershipError(ownerUserId: string | undefined, req: NextRequest) {
  if (!ownerUserId) return null
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  if (session.uid !== ownerUserId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, id, reason } = body

  if (!type || !id) {
    return NextResponse.json({ error: 'type and id are required' }, { status: 400 })
  }

  const store = getStore()
  const now = Date.now()

  if (type === 'passport') {
    const passport = store.passports.get(id)
    if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

    const denied = ownershipError(passport.ownerUserId, req)
    if (denied) return denied

    passport.status = 'revoked'

    // Cascade: revoke all active proofs for this passport
    const revokedProofs: string[] = []
    for (const proof of store.proofs.values()) {
      if (proof.passportId === id && proof.status === 'active') {
        proof.status = 'revoked'
        revokedProofs.push(proof.id)
        appendLedgerEvent(store, {
          type: 'proof.revoked',
          agentId: passport.agentId,
          passportId: id,
          proofId: proof.id,
          status: 'completed',
          timestamp: now,
        })
      }
    }

    appendLedgerEvent(store, {
      type: 'passport.revoked',
      agentId: passport.agentId,
      passportId: id,
      status: 'completed',
      timestamp: now,
    })

    return NextResponse.json({
      revoked: { type: 'passport', id },
      cascadedProofs: revokedProofs,
      propagationMs: 1200,
      reason: reason || 'manual revocation',
    })
  }

  if (type === 'proof') {
    const proof = store.proofs.get(id)
    if (!proof) return NextResponse.json({ error: 'proof not found' }, { status: 404 })

    const passport = store.passports.get(proof.passportId)

    const denied = ownershipError(passport?.ownerUserId, req)
    if (denied) return denied

    proof.status = 'revoked'

    appendLedgerEvent(store, {
      type: 'proof.revoked',
      agentId: passport?.agentId ?? 'unknown',
      passportId: proof.passportId,
      proofId: id,
      status: 'completed',
      timestamp: now,
    })

    return NextResponse.json({
      revoked: { type: 'proof', id },
      propagationMs: 1200,
      reason: reason || 'manual revocation',
    })
  }

  return NextResponse.json({ error: 'type must be passport or proof' }, { status: 400 })
}
