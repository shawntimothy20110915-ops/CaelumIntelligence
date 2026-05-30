import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET(req: NextRequest) {
  const limit = Number(new URL(req.url).searchParams.get('limit') || '50')
  const store = getStore()
  return NextResponse.json({ activity: store.activity.slice(0, limit) })
}
