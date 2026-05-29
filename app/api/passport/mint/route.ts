import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent, getBilling } from '@/lib/store'
import { generateShortId, generatePublicKey } from '@/lib/crypto'
import { PLAN_QUOTA, PLAN_MAX_PROOFS, PLAN_PRICE_USD } from '@/lib/types'
import type { AgentPassport, PlanTier } from '@/lib/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { label, killSwitchUrl, metadata, ttlDays, plan, budgetUsd, orgId, webhookUrl, actionCosts } = body

  if (!label || typeof label !== 'string') {
    return NextResponse.json({ error: 'label is required' }, { status: 400 })
  }

  const store = getStore()

  // ── Feature 10: Seat check ────────────────────────────────────────────
  if (orgId) {
    const org = store.orgs.get(orgId)
    if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 })
    if (org.agentIds.length >= org.maxSeats) {
      return NextResponse.json({ error: 'seat_limit_reached', max: org.maxSeats }, { status: 429 })
    }
  }

  const now = Date.now()
  const agentId = generateShortId(label.toLowerCase().slice(0, 4).replace(/[^a-z0-9]/g, 'x'))
  const id = generateShortId('pass')

  const passport: AgentPassport = {
    id, agentId, label, publicKey: generatePublicKey(),
    mintedAt: now, expiresAt: ttlDays ? now + ttlDays * 86400000 : null,
    status: 'active', killSwitchUrl: killSwitchUrl || null, metadata: metadata || {},
  }
  store.passports.set(id, passport)

  // Provision billing account
  const billing = getBilling(store, id)
  const resolvedPlan: PlanTier = (plan && ['free','pro','enterprise'].includes(plan)) ? plan : 'free'
  billing.plan = resolvedPlan
  if (budgetUsd !== undefined) billing.budgetUsd = budgetUsd
  if (webhookUrl) billing.webhookUrl = webhookUrl
  if (actionCosts && typeof actionCosts === 'object') billing.actionCosts = actionCosts
  if (orgId) {
    billing.orgId = orgId
    const org = store.orgs.get(orgId)
    if (org) org.agentIds.push(agentId)
  }

  appendLedgerEvent(store, {
    type: 'passport.minted', agentId: passport.agentId, passportId: id,
    status: 'completed', timestamp: now,
  })

  return NextResponse.json({
    passport,
    billing: {
      plan: resolvedPlan,
      quota: PLAN_QUOTA[resolvedPlan] === Infinity ? 'unlimited' : PLAN_QUOTA[resolvedPlan],
      maxProofs: PLAN_MAX_PROOFS[resolvedPlan] === Infinity ? 'unlimited' : PLAN_MAX_PROOFS[resolvedPlan],
      priceUsd: PLAN_PRICE_USD[resolvedPlan],
      budgetUsd: billing.budgetUsd,
    },
  }, { status: 201 })
}

export async function GET() {
  const store = getStore()
  const passports = Array.from(store.passports.values())
  return NextResponse.json({ passports })
}
