import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { FederatedSignal } from '@/lib/types'

export async function GET() {
  const store = getStore()
  return NextResponse.json({ signals: store.fedSignals, contributors: 76 })
}

export async function POST(req: NextRequest) {
  const { pattern, observedCount } = await req.json()
  const store = getStore()
  const total = store.activity.length || 1
  const sig: FederatedSignal = {
    id: generateShortId('fed'),
    pattern: pattern || 'anonymous_pattern',
    prevalence: (observedCount || 1) / total,
    contributors: 1,
    publishedAt: Date.now(),
  }
  store.fedSignals.push(sig)
  return NextResponse.json({ signal: sig })
}
