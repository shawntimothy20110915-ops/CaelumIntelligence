import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

// "would this proposed policy have approved historical actions?"
export async function POST(req: NextRequest) {
  const { passportId, hypothesis } = await req.json()
  if (!passportId || !hypothesis) return NextResponse.json({ error: 'passportId+hypothesis required' }, { status: 400 })
  const store = getStore()
  const past = store.activity.filter(a => a.passportId === passportId)
  const results = past.map(a => {
    let approved = true
    let reason = 'ok'
    if (hypothesis.maxAmount !== undefined && a.amount && a.amount > hypothesis.maxAmount) { approved = false; reason = 'over maxAmount' }
    if (hypothesis.allowedMerchants && a.merchant && !hypothesis.allowedMerchants.includes(a.merchant)) { approved = false; reason = 'merchant not allowed' }
    return { activityId: a.id, action: a.type, amount: a.amount, merchant: a.merchant, originalDecision: a.decision, wouldApprove: approved, reason }
  })
  return NextResponse.json({
    total: results.length,
    wouldApprove: results.filter(r => r.wouldApprove).length,
    wouldDeny: results.filter(r => !r.wouldApprove).length,
    results,
  })
}
