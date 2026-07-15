import { hmacSign } from './crypto'
import { getStore, getUserById } from './store'
import type { PlanTier } from './types'

export const SESSION_COOKIE = 'ap_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  uid: string
  email: string
  plan: PlanTier
  ver: number // token version — bumped to revoke all of a user's sessions
  iat: number
  exp: number
}

const enc = (s: string) => Buffer.from(s).toString('base64url')
const dec = (s: string) => Buffer.from(s, 'base64url').toString()

/** token = base64url(payload).base64url(hmac) — verifiable without a DB lookup. */
export function createSessionToken(user: { id: string; email: string; plan: PlanTier; tokenVersion?: number }): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    uid: user.id, email: user.email, plan: user.plan, ver: user.tokenVersion ?? 0,
    iat: now, exp: now + MAX_AGE,
  }
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
    // Authoritative revocation: a session is dead if the user's tokenVersion moved
    // past the one embedded in the token (logout-all, password change, plan change).
    const user = getUserById(getStore(), payload.uid)
    if (user && (user.tokenVersion ?? 0) !== payload.ver) return null
    return payload
  } catch {
    return null
  }
}

const isProd = process.env.NODE_ENV === 'production'
// Cookies are Secure in production. Opt-out ONLY for local testing of a prod
// build over http://localhost (set AGENTPASS_INSECURE_COOKIES=true) — never in
// a real deployment, or the browser drops the session cookie over HTTPS-less http.
const secureCookie = isProd && process.env.AGENTPASS_INSECURE_COOKIES !== 'true'

export const sessionCookie = (token: string) => ({
  name: SESSION_COOKIE, value: token,
  httpOnly: true, secure: secureCookie, sameSite: 'lax' as const, path: '/', maxAge: MAX_AGE,
})

export const clearSessionCookie = () => ({
  name: SESSION_COOKIE, value: '',
  httpOnly: true, secure: secureCookie, sameSite: 'lax' as const, path: '/', maxAge: 0,
})

/** Read + verify the session from an incoming request (for route handlers). */
export function getSession(req: Request): SessionPayload | null {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`))
  return m ? verifySessionToken(decodeURIComponent(m[1])) : null
}
