import { NextRequest, NextResponse } from 'next/server'
import { getStore, recordMeter } from '@/lib/store'
import type { MeterUsage } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const orgId = req.nextUrl.searchParams.get('orgId') ?? ''
  const usage = orgId ? store.meterUsage.filter(m => m.orgId === orgId) : store.meterUsage.slice(-100)
  const totalCost = usage.reduce((s, m) => s + m.totalCostUsd, 0)
  return NextResponse.json({ usage, totalCostUsd: totalCost, count: usage.length })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { orgId, passportId, metricType, count = 1 } = await req.json() as Partial<MeterUsage>
  if (!orgId || !passportId || !metricType) return NextResponse.json({ error: 'orgId, passportId, metricType required' }, { status: 400 })
  recordMeter(store, orgId, passportId, metricType as MeterUsage['metricType'], count)
  const latest = store.meterUsage[store.meterUsage.length - 1]
  return NextResponse.json({ metered: latest })
}
