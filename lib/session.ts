import { hmacSign } from './crypto'
import type { PlanTier } from './types'

export const SESSION_COOKIE = 'ap_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  uid: string
  email: string
  plan: PlanTier
  iat: number
  exp: number
}

const enc = (s: string) => Buffer.from(s).toString('base64url')
const dec = (s: string) => Buffer.from(s, 'base64url').toString()

/** token = base64url(payload).base64url(hmac) — verifiable without a DB lookup. */
export function createSessionToken(user: { id: string; email: string; plan: PlanTier }): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = { uid: user.id, email: user.email, plan: user.plan, iat: now, exp: now + MAX_AGE }
  const body = enc(JSON.stringify(payload))
  return `${body}.${hmacSign(body)}`
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig || hmacSign(body) !== sig) return null
  try {
    const payload = JSON.parse(dec(body)) as SessionPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

const isProd = process.env.NODE_ENV === 'production'

export const sessionCookie = (token: string) => ({
  name: SESSION_COOKIE, value: token,
  httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', maxAge: MAX_AGE,
})

export const clearSessionCookie = () => ({
  name: SESSION_COOKIE, value: '',
  httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', maxAge: 0,
})

/** Read + verify the session from an incoming request (for route handlers). */
export function getSession(req: Request): SessionPayload | null {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`))
  return m ? verifySessionToken(decodeURIComponent(m[1])) : null
}
