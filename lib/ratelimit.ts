/**
 * Minimal fixed-window rate limiter (in-memory). Mitigates credential stuffing
 * and mint flooding on a single instance. For multi-instance prod, back this
 * with Redis/Upstash — the interface stays the same.
 */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

/** Returns true if the caller is within budget; false if the window is exhausted. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count++
  return true
}
