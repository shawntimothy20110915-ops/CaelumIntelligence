import {
  createHmac, createHash, randomBytes, scryptSync, timingSafeEqual,
  createPrivateKey, createPublicKey, sign as edSign, verify as edVerify,
  type KeyObject,
} from 'crypto'

/**
 * Secrets fail CLOSED in production. A missing HMAC_SECRET / signing seed in prod
 * is a hard boot error — never silently fall back to a public literal (which would
 * make every session token and receipt forgeable by anyone reading the source).
 */
const DEV_SECRET = 'agentpass-dev-secret-do-not-use-in-production'
function requireSecret(name: 'HMAC_SECRET' | 'RECEIPT_SIGNING_SEED'): string {
  const v = process.env[name]
  if (v) return v
  // Fail closed at runtime, but let `next build` (which sets NODE_ENV=production
  // while collecting page data) proceed — it never signs anything real.
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
  if (process.env.NODE_ENV === 'production' && !isBuild) {
    throw new Error(`${name} is required in production. Generate one: openssl rand -hex 32`)
  }
  return name === 'RECEIPT_SIGNING_SEED'
    ? createHash('sha256').update(DEV_SECRET).digest('hex') // deterministic 32-byte dev seed
    : DEV_SECRET
}

const HMAC_SECRET = requireSecret('HMAC_SECRET')

// ─── Asymmetric receipt/proof signing (Ed25519) ───────────────────────────
// The whole product is "anyone can verify a proof without trusting us". That
// requires asymmetric crypto: we sign with a private key; merchants verify with
// the published public key and cannot forge. Derived deterministically from a
// 32-byte seed so every instance signs with the same identity.
const ED_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
const ED_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function loadSigningKeys(): { priv: KeyObject; pubRaw: Buffer } {
  const seedHex = requireSecret('RECEIPT_SIGNING_SEED')
  const seed = createHash('sha256').update(seedHex).digest() // normalize any length → 32 bytes
  const priv = createPrivateKey({
    key: Buffer.concat([ED_PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8',
  })
  const spki = createPublicKey(priv).export({ format: 'der', type: 'spki' }) as Buffer
  return { priv, pubRaw: spki.subarray(ED_SPKI_PREFIX.length) }
}
const { priv: SIGNING_PRIV, pubRaw: SIGNING_PUB_RAW } = loadSigningKeys()

/** Ed25519 signature over `data`, base64url. Verifiable with the public key alone. */
export function signReceipt(data: string): string {
  return edSign(null, Buffer.from(data), SIGNING_PRIV).toString('base64url')
}

/** Verify an Ed25519 receipt/proof signature using the published public key. */
export function verifyReceiptSignature(data: string, signature: string): boolean {
  try {
    const pub = createPublicKey({
      key: Buffer.concat([ED_SPKI_PREFIX, SIGNING_PUB_RAW]), format: 'der', type: 'spki',
    })
    return edVerify(null, Buffer.from(data), pub, Buffer.from(signature, 'base64url'))
  } catch {
    return false
  }
}

/** The public verification key (hex), served at /.well-known so anyone can verify. */
export function signingPublicKeyHex(): string {
  return SIGNING_PUB_RAW.toString('hex')
}

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
