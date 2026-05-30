import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { CollusionCluster } from '@/lib/types'

// detect agents who transact with overlapping merchants in suspicious bursts
export async function GET() {
  const store = getStore()
  const merchantToAgents: Map<string, Set<string>> = new Map()
  for (const e of store.activity) {
    if (!e.merchant) continue
    if (!merchantToAgents.has(e.merchant)) merchantToAgents.set(e.merchant, new Set())
    merchantToAgents.get(e.merchant)!.add(e.passportId)
  }
  const clusters: CollusionCluster[] = []
  // build agent-pair → shared merchants map
  const pairKey = (a: string, b: string) => [a, b].sort().join('|')
  const pairs: Map<string, { agents: [string, string]; merchants: string[] }> = new Map()
  for (const [m, agents] of merchantToAgents) {
    const arr = Array.from(agents)
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const k = pairKey(arr[i], arr[j])
        if (!pairs.has(k)) pairs.set(k, { agents: [arr[i], arr[j]], merchants: [] })
        pairs.get(k)!.merchants.push(m)
      }
    }
  }
  for (const { agents, merchants } of pairs.values()) {
    if (merchants.length >= 2) {
      const suspicious = store.activity.filter(e => agents.includes(e.passportId) && merchants.includes(e.merchant || '')).length
      clusters.push({
        id: generateShortId('clu'),
        passportIds: agents, sharedMerchants: merchants,
        suspiciousActions: suspicious, detectedAt: Date.now(),
      })
    }
  }
  store.collusionClusters = clusters
  return NextResponse.json({ clusters, totalChecked: pairs.size })
}
