import { NextResponse } from 'next/server'
import { getStore, findUserByEmail } from '@/lib/store'
import { verifyPassword } from '@/lib/crypto'
import { createSessionToken, sessionCookie } from '@/lib/session'

export async function POST(req: Request) {
  let body: { email?: string; password?: string }
  try { body = await req.json() } catch { body = {} }
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  const user = findUserByEmail(getStore(), email)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const res = NextResponse.json({ user: { id: user.id, email: user.email, plan: user.plan } })
  res.cookies.set(sessionCookie(createSessionToken(user)))
  return res
}
