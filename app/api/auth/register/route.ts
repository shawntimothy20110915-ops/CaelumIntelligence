import { NextResponse } from 'next/server'
import { getStore, findUserByEmail, createUser, flushStore } from '@/lib/store'
import { hashPassword } from '@/lib/crypto'
import { createSessionToken, sessionCookie } from '@/lib/session'
import { rateLimit, clientIp } from '@/lib/ratelimit'

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 })
  }

  let body: { email?: string; password?: string }
  try { body = await req.json() } catch { body = {} }
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const store = getStore()
  if (findUserByEmail(store, email)) {
    return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
  }

  const user = createUser(store, email, hashPassword(password))
  await flushStore() // signup must survive a restart

  const res = NextResponse.json({ user: { id: user.id, email: user.email, plan: user.plan } })
  res.cookies.set(sessionCookie(createSessionToken(user)))
  return res
}
