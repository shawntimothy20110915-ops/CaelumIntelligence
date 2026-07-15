import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { BadgeLicense } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const orgId = req.nextUrl.searchParams.get('orgId')
  const licenses = orgId
    ? [...store.badgeLicenses.values()].filter(l => l.orgId === orgId)
    : [...store.badgeLicenses.values()]
  return NextResponse.json({ licenses })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { orgId, domain, logoUrl } = await req.json()
  if (!orgId || !domain) return NextResponse.json({ error: 'orgId, domain required' }, { status: 400 })
  const now = Date.now()
  const license: BadgeLicense = {
    id: generateShortId('lic'), orgId, domain, logoUrl,
    issuedAt: now, expiresAt: now + 365 * 86400000, callCount: 0,
  }
  store.badgeLicenses.set(license.id, license)
  const licenseUrl = `/api/embed?licenseId=${license.id}`
  return NextResponse.json({ license, licenseUrl, annualFeeUsd: 1200 })
}
