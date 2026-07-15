import { NextRequest, NextResponse } from 'next/server'

// Lightweight per-instance rate limiter + body-size guard for public routes.
// In-memory (per serverless instance) — good enough to blunt spam/abuse on an
// MVP; swap for a shared store (Upstash/Supabase) for strict global limits.
const buckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export type GuardOpts = { limit?: number; windowMs?: number; maxBytes?: number; bucket?: string }

// Returns a NextResponse to short-circuit on violation, or null to proceed.
export function guard(req: NextRequest, opts: GuardOpts = {}): NextResponse | null {
  const { limit = 20, windowMs = 60_000, maxBytes = 256 * 1024, bucket = 'default' } = opts

  const len = Number(req.headers.get('content-length') ?? '0')
  if (len && len > maxBytes) {
    return NextResponse.json({ error: `Payload too large (max ${Math.floor(maxBytes / 1024)}KB).` }, { status: 413 })
  }

  const key = `${bucket}:${clientIp(req)}`
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
  } else if (b.count >= limit) {
    const retry = Math.ceil((b.resetAt - now) / 1000)
    return NextResponse.json({ error: 'Rate limit exceeded. Slow down.' }, { status: 429, headers: { 'Retry-After': String(retry) } })
  } else {
    b.count++
  }

  // opportunistic cleanup
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k)
  return null
}

// Enforce a hard byte cap on the actual body (content-length can be spoofed/absent).
export async function readJsonCapped<T>(req: NextRequest, maxBytes = 256 * 1024): Promise<{ data?: T; tooLarge?: boolean }> {
  const text = await req.text()
  if (Buffer.byteLength(text, 'utf-8') > maxBytes) return { tooLarge: true }
  try { return { data: JSON.parse(text) as T } } catch { return { data: undefined } }
}
