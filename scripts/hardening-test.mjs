/**
 * AgentPass Hardening Test — verifies the production-readiness fixes:
 *  - Ed25519 receipt verification (no symmetric escape hatch)
 *  - IDOR: tenant data requires a session
 *  - Per-tenant isolation: an owned passport rejects anonymous use
 *  - Session revocation via logout-all
 */
const BASE = 'http://localhost:3000/api'
let pass = 0, fail = 0
const ok = (l) => { console.log(`  ✓  ${l}`); pass++ }
const bad = (l, d) => { console.error(`  ✗  ${l}${d ? ` → ${d}` : ''}`); fail++ }

const j = (r) => r.json().then(d => ({ status: r.status, data: d, setCookie: r.headers.get('set-cookie') }))
const post = (p, b, cookie) => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b) }).then(j)
const get = (p, cookie) => fetch(`${BASE}${p}`, { headers: cookie ? { cookie } : {} }).then(j)
const jarOf = (setCookie) => (setCookie || '').split(';')[0]

console.log('\n━━━  AgentPass Hardening Test  ━━━\n')

// 1. Ed25519 receipt verification on a fresh approved receipt
console.log('1. Ed25519 receipt verification')
const mint = await post('/passport/mint', { label: 'hard-bot' })
const pid = mint.data.passport.id
const proof = await post('/proof/delegate', { passportId: pid, grantedTo: 'svc', permissions: ['purchase'], maxAmount: 500, allowedMerchants: ['amazon.com'], ttlHours: 2 })
const ev = await post('/approval/evaluate', { passportId: pid, proofId: proof.data.proof.id, action: 'purchase', merchant: 'amazon.com', amount: 50 })
const rid = ev.data.receipt?.id
const ver = await get(`/verify?receiptId=${rid}`)
ver.data.verified === true ? ok(`verify ${rid} → verified:true`) : bad('fresh receipt verifies', JSON.stringify(ver.data))
ver.data.signatureOk === true ? ok('signatureOk:true (Ed25519)') : bad('signatureOk true', JSON.stringify(ver.data))

// 2. Tampered receiptId must NOT verify (escape hatch gone)
console.log('\n2. No symmetric escape hatch')
const ghost = await get('/verify?receiptId=rcpt-doesnotexist')
ghost.status === 404 ? ok('unknown receipt → 404 (not "verified" by length)') : bad('unknown receipt → 404', ghost.status)

// 3. IDOR — ledger requires a session
console.log('\n3. IDOR — tenant data is gated')
const led = await get('/ledger/events')
led.status === 401 ? ok('GET /ledger/events without session → 401') : bad('ledger 401', led.status)

// 4. Per-tenant isolation + session revocation
console.log('\n4. Tenant isolation & session revocation')
const email = `hard-${Date.now()}@example.com`
const reg = await post('/auth/register', { email, password: 'supersecret1' })
const jar = jarOf(reg.setCookie)
jar ? ok('register issued session cookie') : bad('register cookie', JSON.stringify(reg.data))

const ownedMint = await post('/passport/mint', { label: 'owned-bot' }, jar)
const ownedId = ownedMint.data.passport.id
const ownedProof = await post('/proof/delegate', { passportId: ownedId, grantedTo: 'svc', permissions: ['purchase'], maxAmount: 100, allowedMerchants: ['amazon.com'], ttlHours: 2 }, jar)

// anonymous use of an OWNED passport must be rejected
const anon = await post('/approval/evaluate', { passportId: ownedId, proofId: ownedProof.data.proof?.id, action: 'purchase', merchant: 'amazon.com', amount: 10 })
anon.status === 401 || anon.status === 403 ? ok(`anonymous use of owned passport → ${anon.status}`) : bad('owned passport rejects anon', anon.status)

// owner can read their own ledger
const ownLedger = await get('/ledger/events', jar)
ownLedger.status === 200 ? ok('owner reads own ledger → 200') : bad('owner ledger 200', ownLedger.status)

// logout-all revokes the session
await post('/auth/logout-all', {}, jar)
const afterRevoke = await get('/ledger/events', jar)
afterRevoke.status === 401 ? ok('after logout-all, old cookie → 401 (revoked)') : bad('session revoked', afterRevoke.status)

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Passed: ${pass}   Failed: ${fail}   Total: ${pass + fail}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
if (fail > 0) process.exit(1)
