import { NextRequest, NextResponse } from 'next/server'
import { getStore, resolveApiKey, appendLedgerEvent } from '@/lib/store'
import { buildIssuingCardSpec, encodeIssuingCardForm } from '@/lib/issuing'

/**
 * Issue a single-use virtual card scoped to a delegation proof's spend cap.
 * Authenticated by API key in-route (proxy-public). Env-gated on Stripe Issuing:
 *   STRIPE_SECRET_KEY            sk_live_… / sk_test_…
 *   STRIPE_ISSUING_CARDHOLDER    ich_…  (a Stripe Issuing cardholder id)
 * Until configured it returns a friendly 503 — nothing crashes.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY
  const cardholder = process.env.STRIPE_ISSUING_CARDHOLDER
  if (!secret || !cardholder) {
    return NextResponse.json(
      { error: 'Card issuing is launching shortly. Set STRIPE_SECRET_KEY and STRIPE_ISSUING_CARDHOLDER to enable rail-level enforcement.' },
      { status: 503 },
    )
  }

  let body: { apiKey?: string; proofId?: string; action?: string }
  try { body = await req.json() } catch { body = {} }
  if (!body.apiKey) return NextResponse.json({ error: 'apiKey required' }, { status: 400 })

  const store = getStore()
  const passport = resolveApiKey(store, body.apiKey)
  if (!passport) return NextResponse.json({ error: 'invalid api key' }, { status: 401 })
  if (passport.status !== 'active') return NextResponse.json({ error: `passport is ${passport.status}` }, { status: 403 })

  const now = Date.now()
  const proof = body.proofId
    ? store.proofs.get(body.proofId)
    : [...store.proofs.values()].find(p => p.passportId === passport.id && p.status === 'active' && p.constraints.expiresAt > now)
  if (!proof || proof.passportId !== passport.id) return NextResponse.json({ error: 'no matching active proof' }, { status: 404 })
  if (proof.status !== 'active' || proof.constraints.expiresAt <= now) return NextResponse.json({ error: 'proof not active' }, { status: 403 })

  const spec = buildIssuingCardSpec({ cardholder, maxAmountUsd: proof.constraints.maxAmount })

  const res = await fetch('https://api.stripe.com/v1/issuing/cards', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeIssuingCardForm(spec),
  })
  const card = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: 'stripe_issuing_failed', detail: card?.error?.message ?? 'unknown' }, { status: 502 })
  }

  appendLedgerEvent(store, {
    type: 'passport.minted', agentId: passport.agentId, passportId: passport.id,
    status: 'completed', timestamp: now,
  })

  return NextResponse.json({
    card: { id: card.id, last4: card.last4, brand: card.brand, status: card.status, spendingLimitUsd: proof.constraints.maxAmount ?? null },
    enforcedAt: 'payment_rail',
    proofId: proof.id,
  }, { status: 201 })
}
