import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? 'rcpt-9114'

  const store = getStore()
  const receipt = store.receipts.get(id)

  if (!receipt) {
    return NextResponse.json({ error: 'receipt not found' }, { status: 404 })
  }

  return NextResponse.json({ receipt })
}
