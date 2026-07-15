import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluatePolicy, type PolicyInput } from './policy.ts'

const base = (over: Partial<PolicyInput> = {}): PolicyInput => ({
  passportStatus: 'active',
  proof: { status: 'active', permissions: ['purchase'], constraints: { maxAmount: 500, allowedMerchants: ['amazon.com'], expiresAt: 2_000_000_000_000 } },
  action: 'purchase',
  amount: 50,
  merchant: 'amazon.com',
  now: 1_000_000_000_000,
  budgetUsd: null,
  spendUsd: 0,
  ...over,
})

test('within all constraints → approved', () => {
  assert.equal(evaluatePolicy(base()).decision, 'approved')
})

test('revoked passport → denied', () => {
  assert.equal(evaluatePolicy(base({ passportStatus: 'revoked' })).decision, 'denied')
})

test('no active proof → denied', () => {
  assert.equal(evaluatePolicy(base({ proof: null })).decision, 'denied')
})

test('action outside granted permissions → denied', () => {
  assert.equal(evaluatePolicy(base({ action: 'transfer' })).decision, 'denied')
})

test('amount above proof maxAmount → human_review', () => {
  assert.equal(evaluatePolicy(base({ amount: 750 })).decision, 'human_review')
})

test('merchant outside allowlist → denied (the gap /api/eval was missing)', () => {
  const d = evaluatePolicy(base({ merchant: 'sketchy.biz', amount: 50 }))
  assert.equal(d.decision, 'denied')
})

test('high-value over $1000 with no proof cap → human_review', () => {
  const d = evaluatePolicy(base({ proof: { status: 'active', permissions: ['purchase'], constraints: { expiresAt: 2_000_000_000_000 } }, amount: 5000, merchant: undefined }))
  assert.equal(d.decision, 'human_review')
})

test('expired proof → denied and flagged for expiry', () => {
  const d = evaluatePolicy(base({ proof: { status: 'active', permissions: ['purchase'], constraints: { maxAmount: 500, expiresAt: 1 } } }))
  assert.equal(d.decision, 'denied')
  assert.equal(d.expireProof, true)
})

test('approved spend that exceeds remaining budget → denied', () => {
  const d = evaluatePolicy(base({ amount: 100, budgetUsd: 120, spendUsd: 50 }))
  assert.equal(d.decision, 'denied')
})
