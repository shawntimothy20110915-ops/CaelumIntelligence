import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createGuard, AgentPassDenied, AgentPassReviewRequired,
  type Evaluator,
} from './agentpass-sdk.ts'

const evaluatorReturning = (decision: 'approved' | 'denied' | 'human_review', receiptId = 'rcpt-1'): Evaluator =>
  async () => ({ decision, reason: `decision=${decision}`, receiptId })

test('approved action runs the wrapped tool and returns its result', async () => {
  const guard = createGuard(evaluatorReturning('approved'))
  let ran = false
  const out = await guard({ action: 'purchase', amount: 50 }, async () => { ran = true; return 'ok' })
  assert.equal(out, 'ok')
  assert.equal(ran, true)
})

test('denied action throws AgentPassDenied and never runs the tool', async () => {
  const guard = createGuard(evaluatorReturning('denied'))
  let ran = false
  await assert.rejects(
    () => guard({ action: 'transfer', amount: 50 }, async () => { ran = true; return 'ok' }),
    (e: unknown) => e instanceof AgentPassDenied && (e as AgentPassDenied).result.receiptId === 'rcpt-1',
  )
  assert.equal(ran, false)
})

test('human_review action throws AgentPassReviewRequired and never runs the tool', async () => {
  const guard = createGuard(evaluatorReturning('human_review'))
  let ran = false
  await assert.rejects(
    () => guard({ action: 'purchase', amount: 5000 }, async () => { ran = true; return 'ok' }),
    (e: unknown) => e instanceof AgentPassReviewRequired,
  )
  assert.equal(ran, false)
})

test('the evaluator receives the exact action descriptor it must authorize', async () => {
  let seen: unknown
  const guard = createGuard(async (a) => { seen = a; return { decision: 'approved', reason: 'ok' } })
  await guard({ action: 'purchase', merchant: 'amazon.com', amount: 99 }, async () => 'done')
  assert.deepEqual(seen, { action: 'purchase', merchant: 'amazon.com', amount: 99 })
})
