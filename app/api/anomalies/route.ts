import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { AnomalyAlert } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, severity, message } = await req.json()
  if (!passportId || !message) return NextResponse.json({ error: 'passportId+message required' }, { status: 400 })
  const store = getStore()
  const a: AnomalyAlert = {
    id: generateShortId('anom'),
    passportId, severity: severity || 'med', message,
    ts: Date.now(), acknowledged: false,
  }
  store.anomalies.unshift(a)
  if (store.anomalies.length > 500) store.anomalies.pop()
  return NextResponse.json({ anomaly: a })
}

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  const store = getStore()
  const filtered = passportId ? store.anomalies.filter(a => a.passportId === passportId) : store.anomalies
  return NextResponse.json({ anomalies: filtered, unacknowledged: filtered.filter(a => !a.acknowledged).length })
}

export async function PATCH(req: NextRequest) {
  const { anomalyId } = await req.json()
  const store = getStore()
  const a = store.anomalies.find(x => x.id === anomalyId)
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 })
  a.acknowledged = true
  return NextResponse.json({ anomaly: a })
}
