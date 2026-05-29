import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET() {
  const store = getStore()
  const queue = store.approvalQueue.filter((q) => q.status === 'pending')
  return NextResponse.json({ queue })
}
