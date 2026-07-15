import { NextRequest, NextResponse } from 'next/server'
import { getStore, getBilling } from '@/lib/store'
import type { PlanTier } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, code } = await req.json()
  if (!passportId || !code) return NextResponse.json({ error: 'passportId and code required' }, { status: 400 })

  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

  const promo = store.promoCodes.get(code.toUpperCase())
  if (!promo) return NextResponse.json({ error: 'invalid code' }, { status: 404 })
  if (promo.used) return NextResponse.json({ error: 'code already used' }, { status: 409 })
  if (promo.expiresAt < Date.now()) return NextResponse.json({ error: 'code expired' }, { status: 410 })

  const billing = getBilling(store, passportId)
  promo.used = true
  let applied = ''

  if (promo.type === 'credits') {
    billing.credits += promo.value as number
    applied = `${promo.value} credits added`
  } else if (promo.type === 'upgrade') {
    billing.plan = promo.value as PlanTier
    applied = `plan upgraded to ${promo.value}`
  } else if (promo.type === 'extend') {
    billing.billingPeriodStart = Date.now()
    applied = `billing period extended by ${promo.value} days`
  }

  return NextResponse.json({ passportId, code, applied, billing: { plan: billing.plan, credits: billing.credits } })
}
