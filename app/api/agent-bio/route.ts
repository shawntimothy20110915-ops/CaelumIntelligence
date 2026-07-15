import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import type { AgentBio } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, action, amount, merchant, intervalMs } = await req.json()
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const passport = store.passports.get(passportId)
  if (!passport) return NextResponse.json({ error: 'passport not found' }, { status: 404 })

  let bio = store.agentBios.get(passportId)
  if (!bio) {
    bio = {
      passportId,
      baseline: { meanIntervalMs: intervalMs || 5000, medianAmount: amount || 0, merchantSet: merchant ? [merchant] : [], actionMix: { [action]: 1 } },
      recent:   { meanIntervalMs: intervalMs || 5000, medianAmount: amount || 0, merchantSet: merchant ? [merchant] : [], actionMix: { [action]: 1 } },
      drift: 0, hijackSuspected: false, samples: 1,
    }
    store.agentBios.set(passportId, bio)
    return NextResponse.json({ bio })
  }

  bio.samples++
  bio.recent.meanIntervalMs = (bio.recent.meanIntervalMs * 0.7) + ((intervalMs || 5000) * 0.3)
  bio.recent.medianAmount   = (bio.recent.medianAmount   * 0.7) + ((amount      || 0) * 0.3)
  if (merchant && !bio.recent.merchantSet.includes(merchant)) bio.recent.merchantSet.push(merchant)
  bio.recent.actionMix[action] = (bio.recent.actionMix[action] || 0) + 1

  const intervalDrift = Math.abs(bio.recent.meanIntervalMs - bio.baseline.meanIntervalMs) / (bio.baseline.meanIntervalMs || 1)
  const amountDrift   = Math.abs(bio.recent.medianAmount   - bio.baseline.medianAmount)   / Math.max(1, bio.baseline.medianAmount)
  const newMerchants  = bio.recent.merchantSet.filter(m => !bio.baseline.merchantSet.includes(m)).length
  const merchantDrift = newMerchants / Math.max(1, bio.baseline.merchantSet.length)
  bio.drift = Math.min(1, (intervalDrift * 0.3) + (amountDrift * 0.4) + (merchantDrift * 0.3))
  bio.hijackSuspected = bio.drift > 0.6 && bio.samples > 5
  return NextResponse.json({ bio })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const passportId = url.searchParams.get('passportId')
  const store = getStore()
  if (passportId) {
    const bio = store.agentBios.get(passportId)
    if (!bio) return NextResponse.json({ error: 'no bio yet' }, { status: 404 })
    return NextResponse.json({ bio })
  }
  const bios: AgentBio[] = Array.from(store.agentBios.values())
  return NextResponse.json({ bios, suspected: bios.filter(b => b.hijackSuspected) })
}
