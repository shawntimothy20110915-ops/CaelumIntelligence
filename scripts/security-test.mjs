/**
 * AgentPass Security Test Suite
 * Tests the full trust chain: mint → delegate → evaluate → revoke → deny
 */

const BASE = 'http://localhost:3000/api'
let passed = 0
let failed = 0

function ok(label) {
  console.log(`  ✓  ${label}`)
  passed++
}

function fail(label, detail) {
  console.error(`  ✗  ${label}`)
  if (detail) console.error(`     → ${detail}`)
  failed++
}

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, data: await r.json() }
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`)
  return { status: r.status, data: await r.json() }
}

// ─────────────────────────────────────────────
console.log('\n━━━  AgentPass Security Test  ━━━\n')

// ── 1. MINT ──────────────────────────────────
console.log('1. Mint Passport')
const mintRes = await post('/passport/mint', {
  label: 'purchase-bot-v1',
  ttlDays: 7,
  killSwitchUrl: 'http://localhost:3000/api/revoke',
  metadata: { env: 'test', owner: 'security-suite' },
})

if (mintRes.status !== 201 || !mintRes.data.passport?.id) {
  fail('passport minted', `status=${mintRes.status} body=${JSON.stringify(mintRes.data)}`)
  process.exit(1)
}

const passport = mintRes.data.passport
ok(`passport minted: ${passport.id} (agent=${passport.agentId})`)
if (passport.status !== 'active') fail('status=active', `got ${passport.status}`)
else ok('status=active')
if (!passport.publicKey) fail('publicKey present')
else ok(`publicKey present: ${passport.publicKey.slice(0, 24)}…`)

// ── 2. VERIFY passport appears in GET ────────
console.log('\n2. Verify Passport in Registry')
const listRes = await get('/passport/mint')
const found = listRes.data.passports?.find(p => p.id === passport.id)
if (found) ok('passport visible in registry')
else fail('passport visible in registry', 'not found in list')

// ── 3. DELEGATE (create scoped proof) ────────
console.log('\n3. Delegate Proof (scoped permissions)')
const delegateRes = await post('/proof/delegate', {
  passportId: passport.id,
  grantedTo: 'checkout-microservice',
  permissions: ['purchase', 'search'],
  maxAmount: 500,
  allowedMerchants: ['amazon.com', 'stripe.com', 'shopify.com'],
  ttlHours: 2,
})

if (delegateRes.status !== 201 || !delegateRes.data.proof?.id) {
  fail('proof delegated', `status=${delegateRes.status} body=${JSON.stringify(delegateRes.data)}`)
  process.exit(1)
}

const proof = delegateRes.data.proof
ok(`proof issued: ${proof.id}`)
ok(`permissions: [${proof.permissions.join(', ')}]`)
ok(`maxAmount: $${proof.constraints.maxAmount}`)
ok(`allowedMerchants: ${proof.constraints.allowedMerchants.join(', ')}`)
ok(`expires: ${new Date(proof.constraints.expiresAt).toISOString()}`)

// ── 4. EVALUATE — approved ────────────────────
console.log('\n4. Evaluate Actions (happy path)')

const evalOk = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'purchase',
  merchant: 'amazon.com',
  amount: 99,
})

if (evalOk.data.result?.decision === 'approved') ok('purchase $99 amazon.com → approved')
else fail('purchase $99 amazon.com → approved', `got "${evalOk.data.result?.decision}": ${evalOk.data.result?.reason}`)

const evalSearch = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'search',
  merchant: 'shopify.com',
})

if (evalSearch.data.result?.decision === 'approved') ok('search shopify.com → approved')
else fail('search shopify.com → approved', `got "${evalSearch.data.result?.decision}"`)

// ── 5. EVALUATE — denied: wrong permission ────
console.log('\n5. Evaluate Actions (denied — wrong permission)')

const evalRefund = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'refund',
  merchant: 'amazon.com',
  amount: 50,
})

if (evalRefund.data.result?.decision === 'denied') ok(`refund → denied: "${evalRefund.data.result.reason}"`)
else fail('refund → denied', `got "${evalRefund.data.result?.decision}"`)

const evalTransfer = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'transfer',
  amount: 10,
})

if (evalTransfer.data.result?.decision === 'denied') ok(`transfer → denied: "${evalTransfer.data.result.reason}"`)
else fail('transfer → denied', `got "${evalTransfer.data.result?.decision}"`)

// ── 6. EVALUATE — denied: blocked merchant ────
console.log('\n6. Evaluate Actions (denied — blocked merchant)')

const evalBadMerchant = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'purchase',
  merchant: 'sketchy-store.biz',
  amount: 50,
})

if (evalBadMerchant.data.result?.decision === 'denied') ok(`purchase sketchy-store.biz → denied: "${evalBadMerchant.data.result.reason}"`)
else fail('purchase sketchy-store.biz → denied', `got "${evalBadMerchant.data.result?.decision}"`)

// ── 7. EVALUATE — human_review: over limit ────
console.log('\n7. Evaluate Actions (human_review — over maxAmount)')

const evalOver = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'purchase',
  merchant: 'amazon.com',
  amount: 750,
})

if (evalOver.data.result?.decision === 'human_review') ok(`purchase $750 → human_review: "${evalOver.data.result.reason}"`)
else fail('purchase $750 → human_review', `got "${evalOver.data.result?.decision}"`)

// check receipt was created
if (evalOver.data.receipt?.id) ok(`receipt issued: ${evalOver.data.receipt.id}`)
else fail('receipt issued', 'no receipt in response')

// ── 8. RECEIPT verification ───────────────────
console.log('\n8. Receipt Verification')

const rcptId = evalOk.data.receipt?.id
if (rcptId) {
  const rcptRes = await get(`/receipt?id=${rcptId}`)
  if (rcptRes.status === 200 && rcptRes.data.receipt?.decision === 'approved') {
    ok(`receipt ${rcptId} — decision=approved, hmac present=${!!rcptRes.data.receipt.hmac}`)
  } else {
    fail('receipt lookup', `status=${rcptRes.status}`)
  }
} else {
  fail('receipt id present in eval response', 'no receipt.id')
}

// ── 9. REVOKE passport (kill switch) ──────────
console.log('\n9. Kill Switch — Revoke Passport')

const revokeRes = await post('/revoke', {
  type: 'passport',
  id: passport.id,
  reason: 'security-test kill-switch trigger',
})

if (revokeRes.status === 200 && revokeRes.data.revoked?.id === passport.id) ok(`passport ${passport.id} revoked`)
else fail('passport revoked', `status=${revokeRes.status} body=${JSON.stringify(revokeRes.data)}`)

if (Array.isArray(revokeRes.data.cascadedProofs)) {
  ok(`cascade: ${revokeRes.data.cascadedProofs.length} proof(s) auto-revoked`)
} else {
  fail('cascade proofs present', JSON.stringify(revokeRes.data))
}

// ── 10. POST-REVOKE: all actions must deny ────
console.log('\n10. Post-Revoke Lockout (passport is dead)')

const postRevokeEval = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'purchase',
  merchant: 'amazon.com',
  amount: 1,
})

if (postRevokeEval.data.result?.decision === 'denied') {
  ok(`purchase after revoke → denied: "${postRevokeEval.data.result.reason}"`)
} else {
  fail('purchase after revoke → denied', `got "${postRevokeEval.data.result?.decision}" — SECURITY BREACH`)
}

// Try proof directly (cascade should have revoked it)
const postRevokeProofEval = await post('/approval/evaluate', {
  passportId: passport.id,
  proofId: proof.id,
  action: 'search',
})

if (postRevokeProofEval.data.result?.decision === 'denied') {
  ok(`search after revoke → denied (proof also cascaded)`)
} else {
  fail('search after revoke → denied', `got "${postRevokeProofEval.data.result?.decision}"`)
}

// ── 11. REVOKE non-existent ───────────────────
console.log('\n11. Edge Cases')

const badRevoke = await post('/revoke', {
  type: 'passport',
  id: 'pass-doesnotexist',
})
if (badRevoke.status === 404) ok('revoke non-existent → 404')
else fail('revoke non-existent → 404', `got ${badRevoke.status}`)

const badEval = await post('/approval/evaluate', {
  passportId: 'pass-ghost',
  proofId: 'proof-ghost',
  action: 'purchase',
})
if (badEval.status === 404) ok('evaluate ghost passport → 404')
else fail('evaluate ghost passport → 404', `got ${badEval.status}`)

// Delegate from revoked passport must fail
const badDelegate = await post('/proof/delegate', {
  passportId: passport.id,
  grantedTo: 'attacker',
  permissions: ['purchase', 'transfer', 'refund'],
  ttlHours: 999,
})
if (badDelegate.status === 403) ok(`delegate from revoked passport → 403: "${badDelegate.data.error}"`)
else fail('delegate from revoked passport → 403', `got ${badDelegate.status}: ${JSON.stringify(badDelegate.data)}`)

// ── SUMMARY ───────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Passed: ${passed}`)
console.log(`  Failed: ${failed}`)
console.log(`  Total:  ${passed + failed}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

if (failed > 0) process.exit(1)
