import { NextRequest, NextResponse } from 'next/server'
import { getStore, detectInjection } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { InjectionDetection } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, input } = await req.json()
  if (!input) return NextResponse.json({ error: 'input required' }, { status: 400 })
  const store = getStore()
  const r = detectInjection(input)
  const det: InjectionDetection = {
    id: generateShortId('inj'),
    passportId: passportId || 'anon',
    input: input.slice(0, 500), // truncate stored
    score: r.score, flagged: r.flagged, patterns: r.patterns,
    detectedAt: Date.now(),
  }
  store.injections.push(det)
  if (store.injections.length > 1000) store.injections.shift()
  return NextResponse.json({ detection: det, blocked: r.flagged })
}

export async function GET() {
  const store = getStore()
  const flagged = store.injections.filter(d => d.flagged)
  return NextResponse.json({ detections: store.injections.slice(-100), flaggedCount: flagged.length, totalScanned: store.injections.length })
}
