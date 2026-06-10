import { createHmac } from 'crypto'

/**
 * Signed, expiring approval links for human-in-the-loop review.
 *
 * When an action is queued for `human_review`, the owner gets a one-tap link whose
 * authority IS the signed token — no session needed, works from a phone/SMS/Slack.
 * `token = base64url({q,exp}).hmac` — unforgeable without the server secret, and
 * self-expiring.
 *
 * The secret is read directly here (leaf module). Fail-closed is still guaranteed:
 * lib/crypto.ts throws at boot in production if HMAC_SECRET is unset, and every
 * route that reaches this code imports crypto first — so the app never serves
 * traffic with the dev fallback in production.
 */
const HMAC_SECRET = process.env.HMAC_SECRET || 'agentpass-dev-secret-do-not-use-in-production'
const hmacSign = (data: string) => createHmac('sha256', HMAC_SECRET).update(data).digest('base64url')

interface ApprovalPayload { q: string; exp: number }

const enc = (s: string) => Buffer.from(s).toString('base64url')
const dec = (s: string) => Buffer.from(s, 'base64url').toString()

export function signApprovalToken(queueId: string, ttlMs = 15 * 60 * 1000): string {
  const body = enc(JSON.stringify({ q: queueId, exp: Date.now() + ttlMs } satisfies ApprovalPayload))
  return `${body}.${hmacSign(body)}`
}

export function verifyApprovalToken(token: string | undefined | null): { queueId: string } | null {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig || hmacSign(body) !== sig) return null
  try {
    const payload = JSON.parse(dec(body)) as ApprovalPayload
    if (!payload.exp || payload.exp < Date.now() || typeof payload.q !== 'string') return null
    return { queueId: payload.q }
  } catch {
    return null
  }
}
