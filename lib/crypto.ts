import { createHmac, createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const HMAC_SECRET = process.env.HMAC_SECRET || 'agentpass-dev-secret-do-not-use-in-production'

/** Full-length, URL-safe HMAC for session tokens (verified statelessly in proxy.ts). */
export function hmacSign(data: string): string {
  return createHmac('sha256', HMAC_SECRET).update(data).digest('base64url')
}

/** scrypt password hash, stored as `salt:hash`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function generateShortId(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex')}`
}

export function generatePublicKey(): string {
  return `pk_${randomBytes(16).toString('hex')}`
}

export function generateSignature(data: string): string {
  return `sig_${createHmac('sha256', HMAC_SECRET).update(data).digest('hex').slice(0, 32)}`
}

export function computeHmac(data: string): string {
  return createHmac('sha256', HMAC_SECRET).update(data).digest('hex').slice(0, 16)
}

export function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex').slice(0, 16)
}

export function hashLedgerEntry(data: object): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

export function verifyHmac(data: string, expected: string): boolean {
  const computed = computeHmac(data)
  return computed === expected
}
