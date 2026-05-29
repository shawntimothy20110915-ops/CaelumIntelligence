import { createHmac, createHash, randomBytes } from 'crypto'

const HMAC_SECRET = process.env.HMAC_SECRET || 'agentpass-dev-secret-do-not-use-in-production'

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
