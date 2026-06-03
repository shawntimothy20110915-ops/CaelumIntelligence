import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { generateShortId } from '@/lib/crypto'
import type { DisputeThread } from '@/lib/types'

export async function GET(req: NextRequest) {
  const store = getStore()
  const id = req.nextUrl.searchParams.get('id')
  const passportId = req.nextUrl.searchParams.get('passportId')
  if (id) return NextResponse.json({ thread: store.disputeThreads.get(id) ?? null })
  const threads = passportId
    ? [...store.disputeThreads.values()].filter(t => t.passportId === passportId)
    : [...store.disputeThreads.values()]
  return NextResponse.json({ threads })
}

export async function POST(req: NextRequest) {
  const store = getStore()
  const { receiptId, passportId, message } = await req.json()
  if (!receiptId || !passportId || !message) return NextResponse.json({ error: 'receiptId, passportId, message required' }, { status: 400 })
  const thread: DisputeThread = {
    id: generateShortId('dsp'),
    receiptId, passportId,
    messages: [{ role: 'user', text: message, ts: Date.now() }],
    status: 'open',
    createdAt: Date.now(),
  }
  store.disputeThreads.set(thread.id, thread)
  return NextResponse.json({ thread })
}

export async function PATCH(req: NextRequest) {
  const store = getStore()
  const { threadId, message, role = 'system', status } = await req.json()
  const thread = store.disputeThreads.get(threadId)
  if (!thread) return NextResponse.json({ error: 'thread not found' }, { status: 404 })
  if (message) thread.messages.push({ role, text: message, ts: Date.now() })
  if (status) thread.status = status
  store.disputeThreads.set(threadId, thread)
  return NextResponse.json({ thread })
}
