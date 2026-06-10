/**
 * AgentPass SDK integration test — proves enforcement sits IN the execution path.
 * Run against a live server:  node --experimental-strip-types scripts/sdk-test.ts
 */
import {
  createGuard, httpEvaluator, AgentPassDenied, AgentPassReviewRequired,
} from '../lib/agentpass-sdk.ts'

const BASE = process.env.BASE || 'http://localhost:3000'
let pass = 0, fail = 0
const ok = (l: string) => { console.log(`  ✓  ${l}`); pass++ }
const bad = (l: string, d?: unknown) => { console.error(`  ✗  ${l}${d !== undefined ? ` → ${JSON.stringify(d)}` : ''}`); fail++ }

const post = (p: string, b: unknown) =>
  fetch(`${BASE}/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json())

console.log('\n━━━  AgentPass SDK Enforcement Test  ━━━\n')

// Bootstrap: a passport + a scoped proof, then use the passport's API key.
const mint = await post('/passport/mint', { label: 'sdk-bot', budgetUsd: 10000 })
const apiKey: string = mint.passport.apiKey
await post('/proof/delegate', {
  passportId: mint.passport.id, grantedTo: 'checkout', permissions: ['purchase'],
  maxAmount: 500, allowedMerchants: ['amazon.com'], ttlHours: 2,
})

const guard = createGuard(httpEvaluator({ baseUrl: BASE, apiKey }))

// A "tool" that records whether it actually executed (i.e. real money moved).
let executed = 0
const charge = async () => { executed++; return 'charged' }

// 1. In-policy purchase → tool runs
executed = 0
const out = await guard({ action: 'purchase', merchant: 'amazon.com', amount: 50 }, charge)
out === 'charged' && executed === 1 ? ok('approved purchase executes the tool') : bad('approved executes', { out, executed })

// 2. Disallowed merchant → denied, tool MUST NOT run (the gap /api/eval had)
executed = 0
try {
  await guard({ action: 'purchase', merchant: 'sketchy.biz', amount: 50 }, charge)
  bad('blocked-merchant should have thrown')
} catch (e) {
  e instanceof AgentPassDenied && executed === 0
    ? ok('disallowed merchant → AgentPassDenied, tool never ran')
    : bad('blocked-merchant denied + no exec', { name: (e as Error).name, executed })
}

// 3. Over the proof's maxAmount → human_review, tool MUST NOT run
executed = 0
try {
  await guard({ action: 'purchase', merchant: 'amazon.com', amount: 750 }, charge)
  bad('over-limit should have thrown')
} catch (e) {
  e instanceof AgentPassReviewRequired && executed === 0
    ? ok('over-limit → AgentPassReviewRequired, tool never ran')
    : bad('over-limit review + no exec', { name: (e as Error).name, executed })
}

// 4. Action outside granted permissions → denied, tool MUST NOT run
executed = 0
try {
  await guard({ action: 'transfer', amount: 10 }, charge)
  bad('ungranted action should have thrown')
} catch (e) {
  e instanceof AgentPassDenied && executed === 0
    ? ok('ungranted action → AgentPassDenied, tool never ran')
    : bad('ungranted denied + no exec', { name: (e as Error).name, executed })
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Passed: ${pass}   Failed: ${fail}   Total: ${pass + fail}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
if (fail > 0) process.exit(1)
