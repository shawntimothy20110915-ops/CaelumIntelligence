import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIssuingCardSpec } from './issuing.ts'

test('a proof maxAmount becomes a per-authorization spending limit in cents', () => {
  const spec = buildIssuingCardSpec({ cardholder: 'ich_123', maxAmountUsd: 500 })
  assert.equal(spec.type, 'virtual')
  assert.equal(spec.currency, 'usd')
  assert.equal(spec.cardholder, 'ich_123')
  assert.deepEqual(spec.spending_controls.spending_limits, [
    { amount: 50000, interval: 'per_authorization' },
  ])
})

test('no maxAmount → no spending limit (card still scoped by AgentPass policy)', () => {
  const spec = buildIssuingCardSpec({ cardholder: 'ich_123' })
  assert.deepEqual(spec.spending_controls.spending_limits, [])
})

test('amounts are rounded to whole cents', () => {
  const spec = buildIssuingCardSpec({ cardholder: 'ich_123', maxAmountUsd: 19.999 })
  assert.equal(spec.spending_controls.spending_limits[0].amount, 2000)
})

test('currency is overridable', () => {
  const spec = buildIssuingCardSpec({ cardholder: 'ich_123', maxAmountUsd: 10, currency: 'eur' })
  assert.equal(spec.currency, 'eur')
})
