import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const passportId = new URL(req.url).searchParams.get('passportId')
  if (!passportId) return NextResponse.json({ error: 'passportId required' }, { status: 400 })
  const store = getStore()
  const p = store.passports.get(passportId)
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const ts = store.trustScores.get(p.agentId)
  return NextResponse.json({
    // Mock Apple/Google Wallet pass payload
    format: 'pkpass-mock',
    serialNumber: p.id,
    organizationName: 'AgentPass',
    description: p.label,
    primaryFields: [{ key: 'agent', label: 'AGENT', value: p.label }],
    secondaryFields: [
      { key: 'trust', label: 'TRUST', value: ts?.score ?? 500 },
      { key: 'status', label: 'STATUS', value: p.status.toUpperCase() },
    ],
    auxiliaryFields: [
      { key: 'minted', label: 'MINTED', value: new Date(p.mintedAt).toISOString().slice(0, 10) },
    ],
    barcode: { format: 'PKBarcodeFormatQR', message: p.id, messageEncoding: 'iso-8859-1' },
  })
}
