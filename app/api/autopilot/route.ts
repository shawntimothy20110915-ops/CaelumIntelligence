import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { ComplianceBundle } from '@/lib/types'

const FRAMEWORK_CONTROLS: Record<string, string[]> = {
  soc2: ['CC6.1', 'CC6.6', 'CC7.2', 'CC8.1'],
  pci: ['3.4', '6.5', '8.1', '10.1'],
  hipaa: ['164.308(a)(1)', '164.312(a)(2)', '164.312(b)'],
  gdpr: ['Art.5', 'Art.25', 'Art.32'],
  ccpa: ['1798.100', '1798.105', '1798.150'],
  iso27001: ['A.5.15', 'A.8.2', 'A.8.16'],
}

function generatePolicies(framework: string, industry: string) {
  const base = [
    { rule: 'audit_log_retention',  constraint: 'retention >= 7 years',  rationale: `${framework}: tamper-evident receipts required` },
    { rule: 'kill_switch',          constraint: 'time_to_revoke <= 60s', rationale: `${framework}: incident response window` },
    { rule: 'proof_ttl',             constraint: 'ttlHours <= 24',         rationale: `${framework}: minimize blast radius` },
    { rule: 'multi_factor_auth',    constraint: 'human_review for amount > $1000', rationale: `${framework}: high-value transactions require oversight` },
  ]
  if (industry === 'fintech') base.push({ rule: 'kyc_required', constraint: 'before any transfer', rationale: 'fintech AML' })
  if (industry === 'health')  base.push({ rule: 'phi_redaction', constraint: 'in all logs', rationale: 'HIPAA PHI' })
  return base
}

export async function POST(req: NextRequest) {
  const { framework, industry, passportId } = await req.json()
  if (!framework || !FRAMEWORK_CONTROLS[framework]) return NextResponse.json({ error: 'unknown framework', supported: Object.keys(FRAMEWORK_CONTROLS) }, { status: 400 })
  const store = getStore()
  const id = generateShortId('compl')
  const bundle: ComplianceBundle = {
    id, framework, industry: industry || 'generic',
    generatedPolicies: generatePolicies(framework, industry || 'generic'),
    controlsCovered: FRAMEWORK_CONTROLS[framework],
    generatedAt: Date.now(),
  }
  store.compliance.set(id, bundle)
  if (passportId) {
    const billing = store.billing.get(passportId)
    if (billing) billing.actionCosts = { ...billing.actionCosts, _complianceBundle: 1 }
  }
  return NextResponse.json({ bundle })
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  const store = getStore()
  if (id) {
    const b = store.compliance.get(id)
    if (!b) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ bundle: b })
  }
  return NextResponse.json({ bundles: Array.from(store.compliance.values()), frameworks: Object.keys(FRAMEWORK_CONTROLS) })
}
