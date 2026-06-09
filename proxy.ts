import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next 16 "Proxy" (formerly Middleware). Optimistic auth gate for /api/*.
 *
 * Policy:
 *  - Reads (GET/HEAD) are allowed — the marketing + interactive demo pages need them,
 *    and the shared demo store holds no per-tenant PII yet.
 *  - Public endpoints (auth, checkout, Stripe webhook, status) are always allowed.
 *  - The interactive "try it" demo write endpoints are allowlisted so the showcase works
 *    logged-out.
 *  - Every OTHER mutating request (billing, org, subscription, credentials, connectors,
 *    insurance, bonds, escrow, …) requires a valid signed session cookie.
 *
 * The cookie is verified statelessly via HMAC (no DB lookup) per Next's guidance that
 * Proxy should do optimistic checks only. When real per-tenant data lands, GET routes
 * must also be scoped to the session — tracked as a follow-up.
 */

const HMAC_SECRET = process.env.HMAC_SECRET || 'agentpass-dev-secret-do-not-use-in-production'
const SESSION_COOKIE = 'ap_session'

// Always public (any method)
const PUBLIC_PREFIXES = ['/api/auth/', '/api/checkout', '/api/stripe-webhook', '/api/status']
// Public interactive-demo writes (used by logged-out showcase pages)
const DEMO_WRITE = new Set([
  '/api/passport/mint',
  '/api/proof/delegate',
  '/api/revoke',
  '/api/approval/decide',
  '/api/approval/evaluate',
  '/api/dispute',
  '/api/playground',
])

function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}
function bytesToB64url(buf: ArrayBuffer): string {
  let bin = ''
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !token.includes('.')) return false
  const [body, sig] = token.split('.')
  if (!body || !sig) return false
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(HMAC_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    )
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    if (bytesToB64url(mac) !== sig) return false
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)))
    return typeof payload.exp === 'number' && payload.exp >= Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method.toUpperCase()

  // Page gate: /dashboard requires a session, otherwise redirect to /auth.
  if (pathname.startsWith('/dashboard')) {
    if (await hasValidSession(req)) return NextResponse.next()
    const url = req.nextUrl.clone()
    url.pathname = '/auth'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return NextResponse.next()
  if (DEMO_WRITE.has(pathname)) return NextResponse.next()

  if (await hasValidSession(req)) return NextResponse.next()
  return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
}
