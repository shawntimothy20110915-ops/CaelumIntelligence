import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import type { OnboardingProgress } from '@/lib/types'

const DEFAULT_STEPS = ['profile', 'mint_passport', 'first_proof', 'install_template', 'first_action']

export async function POST(req: NextRequest) {
  const { passportId } = await req.json()
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const prog: OnboardingProgress = {
    passportId,
    steps: DEFAULT_STEPS.map(name => ({ name, completed: false })),
    startedAt: Date.now(),
  }
  store.onboardings.set(passportId, prog)
  return NextResponse.json({ progress: prog })
}

export async function PATCH(req: NextRequest) {
  const { passportId, step } = await req.json()
  const store = getStore()
  const prog = store.onboardings.get(passportId)
  if (!prog) return NextResponse.json({ error: 'no onboarding' }, { status: 404 })
  const s = prog.steps.find(x => x.name === step)
  if (!s) return NextResponse.json({ error: 'unknown step' }, { status: 400 })
  s.completed = true
  return NextResponse.json({ progress: prog })
}

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const prog = store.onboardings.get(passportId)
  if (!prog) return NextResponse.json({ error: 'no onboarding' }, { status: 404 })
  return NextResponse.json({ progress: prog, percentComplete: Math.round(prog.steps.filter(s => s.completed).length / prog.steps.length * 100) })
}
