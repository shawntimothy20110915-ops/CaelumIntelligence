import { NextRequest, NextResponse } from 'next/server'
import { getStore, getBilling } from '@/lib/store'
import { generateShortId, computeHmac } from '@/lib/crypto'
import { createHash } from 'crypto'
import type { ZkProof } from '@/lib/types'

// Simulated ZK proof: commit-and-prove without revealing inputs
export async function POST(req: NextRequest) {
  const { passportId, claim, threshold } = await req.json()
  if (!passportId || !claim) return NextResponse.json({ error: 'passportId+claim required' }, { status: 400 })
  const store = getStore()
  const billing = getBilling(store, passportId)

  let secret = 0
  if (claim === 'budget_under') secret = billing.budgetUsd ?? 0
  else if (claim === 'spend_below') secret = billing.spendUsd
  else if (claim === 'plan_is')     secret = billing.plan === 'free' ? 0 : billing.plan === 'pro' ? 1 : 2
  else return NextResponse.json({ error: 'unknown claim' }, { status: 400 })

  // commit-and-prove: hash(secret + nonce) is committed; verifier checks predicate
  const nonce = generateShortId('nonce')
  const commitment = createHash('sha256').update(`${secret}|${nonce}`).digest('hex')
  let satisfied = false
  if (claim === 'budget_under')  satisfied = secret > 0 && secret <= (threshold ?? Number.MAX_SAFE_INTEGER)
  if (claim === 'spend_below')   satisfied = secret <= (threshold ?? Number.MAX_SAFE_INTEGER)
  if (claim === 'plan_is')       satisfied = secret === Number(threshold)
  // Simulated proof: HMAC over commitment+claim (real impl would be zk-SNARK)
  const proof = computeHmac(commitment + '|' + claim + '|' + (threshold ?? ''))
  const id = generateShortId('zk')
  const zk: ZkProof = {
    id, passportId, claim, publicInput: { threshold: threshold ?? '' },
    commitment, proof, verified: satisfied, createdAt: Date.now(),
  }
  store.zkProofs.set(id, zk)
  return NextResponse.json({ zkProof: zk, satisfied })
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  const store = getStore()
  if (id) {
    const zk = store.zkProofs.get(id)
    if (!zk) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ zkProof: zk })
  }
  return NextResponse.json({ proofs: Array.from(store.zkProofs.values()) })
}
