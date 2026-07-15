import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent } from '@/lib/store'
import { verifyApprovalToken } from '@/lib/approval-token'

/**
 * Resolve a queued human-review action via a signed, expiring link. The token IS
 * the authority — this is the out-of-band "tap to approve on your phone" surface,
 * so no session is required (the token is unforgeable and self-expiring). Single
 * use: once the item is decided, the link is inert.
 *
 *   GET  /api/approval/resolve?token=…&decision=approved   ← one-tap link
 *   POST /api/approval/resolve { token, decision }          ← programmatic
 */
function resolve(token: string | null, decision: string | null) {
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  if (decision !== 'approved' && decision !== 'denied') {
    return NextResponse.json({ error: 'decision must be approved or denied' }, { status: 400 })
  }

  const verified = verifyApprovalToken(token)
  if (!verified) return NextResponse.json({ error: 'invalid or expired approval link' }, { status: 401 })

  const store = getStore()
  const item = store.approvalQueue.find(q => q.id === verified.queueId)
  if (!item) return NextResponse.json({ error: 'queue item not found' }, { status: 404 })
  if (item.status !== 'pending') return NextResponse.json({ error: 'already decided', status: item.status }, { status: 409 })

  item.status = decision
  const passport = store.passports.get(item.passportId)
  const now = Date.now()
  appendLedgerEvent(store, {
    type: decision === 'approved' ? 'action.approved' : 'action.denied',
    agentId: passport?.agentId ?? 'unknown',
    passportId: item.passportId, proofId: item.proofId,
    amount: item.amount, merchant: item.merchant,
    status: decision === 'approved' ? 'completed' : 'denied',
    timestamp: now,
  })
  return NextResponse.json({ resolved: { queueId: item.id, decision }, timestamp: now })
}

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams
  return resolve(p.get('token'), p.get('decision') ?? 'approved')
}

export async function POST(req: NextRequest) {
  let body: { token?: string; decision?: string }
  try { body = await req.json() } catch { body = {} }
  return resolve(body.token ?? null, body.decision ?? null)
}
