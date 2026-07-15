import { NextRequest, NextResponse } from 'next/server'
import { getStore, predictPreCrime } from '@/lib/store'

export async function GET(req: NextRequest) {
  const store = getStore()
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (agentId) {
    const sig = store.precrime.get(agentId) ?? predictPreCrime(store, agentId)
    return NextResponse.json({ signal: sig })
  }
  const all = [...store.precrime.values()].filter(s => s.recommendation !== 'allow')
  return NextResponse.json({ signals: all, highRisk: all.filter(s => s.recommendation === 'block').length })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { agentId } = await req.json()
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  const signal = predictPreCrime(store, agentId)
  return NextResponse.json({ signal })
}
