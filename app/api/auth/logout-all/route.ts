import { NextResponse } from 'next/server'
import { getStore, getUserById, flushStore } from '@/lib/store'
import { getSession, clearSessionCookie } from '@/lib/session'

/** Revoke every session for the current user by bumping their tokenVersion. */
export async function POST(req: Request) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const user = getUserById(getStore(), session.uid)
  if (user) {
    user.tokenVersion = (user.tokenVersion ?? 0) + 1
    await flushStore()
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearSessionCookie())
  return res
}
