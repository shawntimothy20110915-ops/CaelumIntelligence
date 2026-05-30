import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { ActionDag } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { passportId, proofId, steps } = await req.json()
  if (!passportId || !proofId || !Array.isArray(steps)) return NextResponse.json({ error: 'passportId+proofId+steps required' }, { status: 400 })
  const store = getStore()
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  const proof = store.proofs.get(proofId)
  if (!proof) return NextResponse.json({ error: 'proof not found' }, { status: 404 })
  // approve atomically against proof
  const approved = steps.every((s: { action: string; merchant?: string; amount?: number }) => {
    if (!proof.permissions.includes(s.action)) return false
    if (s.amount && proof.constraints.maxAmount && s.amount > proof.constraints.maxAmount) return false
    if (s.merchant && proof.constraints.allowedMerchants && !proof.constraints.allowedMerchants.includes(s.merchant)) return false
    return true
  })
  const id = generateShortId('dag')
  const dag: ActionDag = {
    id, passportId, proofId,
    steps: steps.map((s, i) => ({ id: `step-${i}`, action: s.action, merchant: s.merchant, amount: s.amount, dependsOn: s.dependsOn || [] })),
    approved, committedAt: Date.now(), executedSteps: [],
    status: approved ? 'committed' : 'aborted',
  }
  store.dags.set(id, dag)
  return NextResponse.json({ dag, approved })
}

export async function PATCH(req: NextRequest) {
  const { dagId, stepId } = await req.json()
  const store = getStore()
  const dag = store.dags.get(dagId)
  if (!dag) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!dag.approved) return NextResponse.json({ error: 'not approved' }, { status: 409 })
  const step = dag.steps.find(s => s.id === stepId)
  if (!step) return NextResponse.json({ error: 'step not found' }, { status: 404 })
  for (const dep of step.dependsOn) {
    if (!dag.executedSteps.includes(dep)) return NextResponse.json({ error: 'dependency not satisfied', missing: dep }, { status: 409 })
  }
  dag.executedSteps.push(stepId)
  dag.status = dag.executedSteps.length === dag.steps.length ? 'complete' : 'executing'
  return NextResponse.json({ dag })
}

export async function GET() {
  const store = getStore()
  return NextResponse.json({ dags: Array.from(store.dags.values()) })
}
