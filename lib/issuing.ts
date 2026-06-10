/**
 * Payment-rail enforcement via Stripe Issuing virtual cards.
 *
 * Software policy ("denied") is advisory — a misbehaving agent can pay anyway.
 * A single-use virtual card whose per-authorization limit equals the proof's
 * maxAmount is enforced by the card network itself: the agent *cannot* overspend,
 * regardless of whether it obeys AgentPass.
 *
 * `buildIssuingCardSpec` is the pure request builder (unit-tested). The HTTP call
 * to Stripe is env-gated in app/api/issuing/card and degrades gracefully when
 * STRIPE_SECRET_KEY is unset, exactly like checkout.
 *
 * Note: Stripe Issuing enforces *amount* caps at the rail; merchant-domain scoping
 * stays enforced in AgentPass policy (Issuing controls are MCC-based, not by domain).
 */
export interface IssuingCardSpec {
  cardholder: string
  currency: string
  type: 'virtual'
  spending_controls: {
    spending_limits: Array<{ amount: number; interval: 'per_authorization' }>
  }
}

export function buildIssuingCardSpec(input: {
  cardholder: string
  maxAmountUsd?: number
  currency?: string
}): IssuingCardSpec {
  const spending_limits = input.maxAmountUsd !== undefined
    ? [{ amount: Math.round(input.maxAmountUsd * 100), interval: 'per_authorization' as const }]
    : []
  return {
    cardholder: input.cardholder,
    currency: input.currency ?? 'usd',
    type: 'virtual',
    spending_controls: { spending_limits },
  }
}

/** Encode a spec as application/x-www-form-urlencoded for Stripe's REST API. */
export function encodeIssuingCardForm(spec: IssuingCardSpec): URLSearchParams {
  const form = new URLSearchParams()
  form.set('cardholder', spec.cardholder)
  form.set('currency', spec.currency)
  form.set('type', spec.type)
  spec.spending_controls.spending_limits.forEach((l, i) => {
    form.set(`spending_controls[spending_limits][${i}][amount]`, String(l.amount))
    form.set(`spending_controls[spending_limits][${i}][interval]`, l.interval)
  })
  return form
}
