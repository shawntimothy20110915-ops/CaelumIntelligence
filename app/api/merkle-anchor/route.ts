import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import { createHash } from 'crypto'
import type { MerkleAnchor } from '@/lib/types'

function hashPair(a: string, b: string) {
  return createHash('sha256').update(a + b).digest('hex')
}
function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return '0'.repeat(64)
  let level = leaves.map(l => createHash('sha256').update(l).digest('hex'))
  while (level.length > 1) {
    const next: string[] = []
    for (let i = 0; i < level.length; i += 2) {
      next.push(hashPair(level[i], level[i + 1] ?? level[i]))
    }
    level = next
  }
  return level[0]
}

export async function POST(req: NextRequest) {
  const { chain } = await req.json().catch(() => ({}))
  const store = getStore()
  const receiptIds = Array.from(store.receipts.keys())
  const root = buildMerkleRoot(receiptIds)
  const anchor: MerkleAnchor = {
    id: generateShortId('anchor'),
    rootHash: '0x' + root,
    receiptIds,
    anchoredAt: Date.now(),
    txid: (chain === 'ethereum' ? 'eth-tx-' : 'btc-tx-') + createHash('sha256').update(root).digest('hex').slice(0, 40),
    chain: chain === 'ethereum' ? 'ethereum' : 'bitcoin',
  }
  store.merkleAnchors.push(anchor)
  return NextResponse.json({ anchor })
}

export async function GET(req: NextRequest) {
  const receiptId = new URL(req.url).searchParams.get('receiptId')
  const store = getStore()
  if (receiptId) {
    const anchor = store.merkleAnchors.find(a => a.receiptIds.includes(receiptId))
    if (!anchor) return NextResponse.json({ included: false })
    return NextResponse.json({ included: true, anchor })
  }
  return NextResponse.json({ anchors: store.merkleAnchors })
}
