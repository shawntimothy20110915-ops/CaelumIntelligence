import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  const store = getStore()
  if (id) {
    const t = store.templates.get(id)
    if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ template: t })
  }
  return NextResponse.json({ templates: Array.from(store.templates.values()) })
}

export async function POST(req: NextRequest) {
  // install a template against a passport
  const { templateId, passportId } = await req.json()
  const store = getStore()
  const t = store.templates.get(templateId)
  if (!t) return NextResponse.json({ error: 'template not found' }, { status: 404 })
  if (!store.passports.has(passportId)) return NextResponse.json({ error: 'passport not found' }, { status: 404 })
  t.installs++
  const vendorShare = +(t.priceUsd * 0.7).toFixed(2)
  const platformShare = +(t.priceUsd * 0.3).toFixed(2)
  return NextResponse.json({ installed: true, template: t, vendorShareUsd: vendorShare, platformShareUsd: platformShare, rules: t.rules })
}
