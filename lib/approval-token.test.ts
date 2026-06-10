import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signApprovalToken, verifyApprovalToken } from './approval-token.ts'

test('a freshly signed token verifies back to its queue id', () => {
  const token = signApprovalToken('queue-abc', 60_000)
  assert.deepEqual(verifyApprovalToken(token), { queueId: 'queue-abc' })
})

test('a tampered payload fails verification', () => {
  const token = signApprovalToken('queue-abc', 60_000)
  const [body, sig] = token.split('.')
  const forged = Buffer.from(JSON.stringify({ q: 'queue-evil', exp: Date.now() + 60_000 })).toString('base64url')
  assert.equal(verifyApprovalToken(`${forged}.${sig}`), null)
  assert.equal(verifyApprovalToken(`${body}.deadbeef`), null)
})

test('an expired token fails verification', () => {
  const token = signApprovalToken('queue-abc', -1) // already expired
  assert.equal(verifyApprovalToken(token), null)
})

test('garbage input returns null, never throws', () => {
  assert.equal(verifyApprovalToken(''), null)
  assert.equal(verifyApprovalToken('not-a-token'), null)
  assert.equal(verifyApprovalToken(undefined), null)
})
