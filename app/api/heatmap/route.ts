import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  const store = getStore()
  const items = passportId
    ? store.activity.filter(a => a.passportId === passportId)
    : store.activity
  // group by day (last 30) and hour-of-day
  const byDay: Record<string, { spend: number; approvals: number; denials: number }> = {}
  const byHour: Record<number, number> = {}
  for (const a of items) {
    const d = new Date(a.ts)
    const dayKey = d.toISOString().slice(0, 10)
    byDay[dayKey] ??= { spend: 0, approvals: 0, denials: 0 }
    if (a.amount && a.decision === 'approved') byDay[dayKey].spend += a.amount
    if (a.decision === 'approved') byDay[dayKey].approvals++
    if (a.decision === 'denied')   byDay[dayKey].denials++
    byHour[d.getHours()] = (byHour[d.getHours()] || 0) + 1
  }
  return NextResponse.json({ byDay, byHour, total: items.length })
}
