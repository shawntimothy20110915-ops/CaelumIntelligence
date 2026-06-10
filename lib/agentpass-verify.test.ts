import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign as edSign } from 'node:crypto'
import { verifyReceipt, canonicalReceipt } from './agentpass-verify.ts'

// Generate a throwaway Ed25519 identity and sign a receipt the way the server does.
const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const pubHex = (publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(12).toString('hex')

const receipt = {
  id: 'rcpt-1', passportId: 'pass-1', agentId: 'bot-1',
  action: 'purchase', merchant: 'amazon.com', amount: 99, decision: 'approved', issuedAt: 1700000000000,
}
const sign = (r: typeof receipt) => edSign(null, Buffer.from(canonicalReceipt(r)), privateKey).toString('base64url')

test('a correctly signed receipt verifies with only the public key', () => {
  const signed = { ...receipt, signature: sign(receipt) }
  assert.equal(verifyReceipt(signed, pubHex), true)
})

test('tampering with the amount invalidates the signature', () => {
  const signed = { ...receipt, signature: sign(receipt) }
  assert.equal(verifyReceipt({ ...signed, amount: 9999 }, pubHex), false)
})

test('a different public key cannot validate the signature', () => {
  const other = generateKeyPairSync('ed25519')
  const otherHex = (other.publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(12).toString('hex')
  const signed = { ...receipt, signature: sign(receipt) }
  assert.equal(verifyReceipt(signed, otherHex), false)
})

test('a receipt with no signature does not verify', () => {
  assert.equal(verifyReceipt(receipt, pubHex), false)
})
