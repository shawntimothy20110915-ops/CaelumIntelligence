/**
 * Integration test for the impact features:
 *   - Human-in-the-loop approval links (sign → resolve → single-use)
 *   - Open verification (standalone module verifies a real server receipt)
 * Run against a live server: node --experimental-strip-types scripts/features-test.ts
 */
import { verifyReceipt } from '../lib/agentpass-verify.ts'

const BASE = process.env.BASE || 'http://localhost:3000'
let pass = 0, fail = 0
const ok = (l: string) => { console.log(`  ✓  ${l}`); pass++ }
const bad = (l: string, d?: unknown) => { console.error(`  ✗  ${l}${d !== undefined ? ` → ${JSON.stringify(d)}` : ''}`); fail++ }
const post = (p: string, b: unknown) => fetch(`${BASE}/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
const getJson = (p: string) => fetch(`${BASE}/api${p}`).then(r => r.json())

console.log('\n━━━  AgentPass Impact-Features Test  ━━━\n')

// ── Human-in-the-loop approval link ──────────────────────────────────────
console.log('1. Human-in-the-loop approval links')
const mint = await (await post('/passport/mint', { label: 'hil-bot' })).json()
const apiKey = mint.passport.apiKey
await post('/proof/delegate', { passportId: mint.passport.id, grantedTo: 'svc', permissions: ['purchase'], maxAmount: 100, allowedMerchants: ['amazon.com'], ttlHours: 2 })

// Over the $100 cap → human_review → an approval link comes back
const review = await (await post('/eval', { apiKey, action: 'purchase', merchant: 'amazon.com', amount: 500 })).json()
review.decision === 'human_review' ? ok('over-cap action → human_review') : bad('human_review', review)
const link: string | undefined = review.approvalLink
link && link.includes('/api/approval/resolve?token=') ? ok('signed approval link issued') : bad('approval link present', review)

const token = new URL(link!).searchParams.get('token')!
const resolved = await post('/approval/resolve', { token, decision: 'approved' })
resolved.status === 200 ? ok('owner approves via signed token → 200') : bad('resolve approved', resolved.status)

const replay = await post('/approval/resolve', { token, decision: 'approved' })
replay.status === 409 ? ok('link is single-use → second use 409') : bad('single-use', replay.status)

const forged = await post('/approval/resolve', { token: 'forged.token', decision: 'approved' })
forged.status === 401 ? ok('forged token → 401') : bad('forged token rejected', forged.status)

// ── Open verification of a real server receipt ───────────────────────────
console.log('\n2. Open verification (no trust in AgentPass)')
const dMint = await (await post('/passport/mint', { label: 'verify-bot' })).json()
const dProof = await (await post('/proof/delegate', { passportId: dMint.passport.id, grantedTo: 'svc', permissions: ['purchase'], maxAmount: 500, allowedMerchants: ['amazon.com'], ttlHours: 2 })).json()
const evld = await (await post('/approval/evaluate', { passportId: dMint.passport.id, proofId: dProof.proof.id, action: 'purchase', merchant: 'amazon.com', amount: 42 })).json()
const receipt = evld.receipt
const { publicKeyHex } = await getJson('/signing-key')

verifyReceipt(receipt, publicKeyHex) === true
  ? ok('standalone module verifies the real server receipt (canonical match)')
  : bad('open verify real receipt', { receipt, publicKeyHex })

verifyReceipt({ ...receipt, amount: 999999 }, publicKeyHex) === false
  ? ok('tampering the amount fails open verification')
  : bad('tamper detected', receipt)

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Passed: ${pass}   Failed: ${fail}   Total: ${pass + fail}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
if (fail > 0) process.exit(1)
