import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { VisualPolicy } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { name, passportId, blocks } = await req.json()
  if (!name || !passportId || !Array.isArray(blocks)) return NextResponse.json({ error: 'name+passportId+blocks required' }, { status: 400 })
  const store = getStore()
  const id = generateShortId('vpol')
  const vp: VisualPolicy = { id, name, passportId, blocks, createdAt: Date.now() }
  store.visualPolicies.set(id, vp)
  return NextResponse.json({ policy: vp })
}

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  const store = getStore()
  const arr = Array.from(store.visualPolicies.values())
  return NextResponse.json({ policies: passportId ? arr.filter(p => p.passportId === passportId) : arr })
}
