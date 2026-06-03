import { NextRequest, NextResponse } from 'next/server'
import { getStore, generateCreditReport } from '@/lib/store'

export async function GET(req: NextRequest) {
  const store = getStore()
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  const cached = store.creditReports.get(agentId)
  if (cached && Date.now() - cached.generatedAt < 3600000) return NextResponse.json({ report: cached })
  const report = generateCreditReport(store, agentId)
  return NextResponse.json({ report })
}
