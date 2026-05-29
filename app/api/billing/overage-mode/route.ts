import { NextRequest, NextResponse } from 'next/server'
import { getStore, getBilling } from '@/lib/store'

export async function POST(req: NextRequest) {
  const { passportId, mode, webhookUrl } = await req.json()
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  if (!['hard', 'soft'].includes(mode)) return NextResponse.json({ error: 'mode must be "hard" or "soft"' }, { status: 400 })

  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

  const billing = getBilling(store, passportId)
  billing.overageMode = mode
  if (webhookUrl !== undefined) billing.webhookUrl = webhookUrl

  return NextResponse.json({
    passportId, overageMode: billing.overageMode, webhookUrl: billing.webhookUrl,
    message: mode === 'soft' ? 'Overages billed at $0.002/eval after quota. Webhook fires at 50/80/100%.' : 'Hard cap: denied after quota. No overages.',
  })
}
