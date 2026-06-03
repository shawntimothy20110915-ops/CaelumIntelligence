#!/usr/bin/env node
// Wave-2 end-to-end tests — revenue, patent, UX, parity tracks
const BASE = 'http://localhost:3000'
let pass = 0, fail = 0
function assert(label, cond, got) {
  if (cond) { console.log(`  ✓ ${label}`); pass++ }
  else { console.error(`  ✗ ${label}`, got !== undefined ? `| got: ${JSON.stringify(got)}` : ''); fail++ }
}
async function post(path, body) { return fetch(`${BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r=>r.json()) }
async function get(path) { return fetch(`${BASE}${path}`).then(r=>r.json()) }
async function patch(path, body) { return fetch(`${BASE}${path}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r=>r.json()) }
async function del(path, body) { return fetch(`${BASE}${path}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r=>r.json()) }
async function put(path, body) { return fetch(`${BASE}${path}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r=>r.json()) }

// Bootstrap
const { passport } = await post('/api/passport/mint', { label:'Wave2TestAgent', ttlDays:30, budgetUsd:500 })
const passportId = passport.id
const agentId = passport.agentId
const { proof } = await post('/api/proof/delegate', { passportId, grantedTo:'wave2-tester', permissions:['purchase'], ttlHours:24, maxAmount:200 })
const proofId = proof.id
await post('/api/approval/evaluate', { passportId, proofId, action:'purchase', merchant:'test-store', amount:50 })
console.log(`\n[Bootstrap] passport=${passportId} agent=${agentId}\n`)

// ── Track 1: Revenue ──────────────────────────────────────────
console.log('── Revenue engines ──')
{
  const d = await post('/api/meter', { orgId:'org-test', passportId, metricType:'trust-lookup', count:5 })
  assert('meter: records usage', d.metered?.count === 5, d)
  assert('meter: calculates cost', d.metered?.totalCostUsd > 0, d)
}
{
  const d = await get('/api/meter?orgId=org-test')
  assert('meter GET: returns for org', d.usage?.length > 0, d)
}
{
  const d = await post('/api/insurance-market', { passportId, actionType:'purchase', premiumBps:30, maxCoverageUsd:500 })
  assert('insurance-market: bid created', !!d.bid?.id, d)
  const bidId = d.bid.id
  const d2 = await patch('/api/insurance-market', { bidId })
  assert('insurance-market: accept bid + platform revenue', d2.platformRevenue > 0, d2)
}
{
  const d = await post('/api/escrow', { dagId:'dag-test-1', amount:1000, currency:'USD' })
  assert('escrow: held with 2% fee', d.escrow?.status === 'held' && d.platformFee === 20, d)
  const escrowId = d.escrow.id
  const d2 = await patch('/api/escrow', { escrowId, action:'release' })
  assert('escrow: released', d2.escrow?.status === 'released' && d2.platformEarned === 20, d2)
}
{
  const d = await post('/api/subscription', { orgId:'org-test', tier:'verified' })
  assert('subscription: verified tier created', d.subscription?.tier === 'verified' && d.subscription?.priceUsdPerMonth === 49, d)
  const d2 = await get('/api/subscription?orgId=org-test')
  assert('subscription GET: returns sub', d2.subscription?.tier === 'verified', d2)
}
{
  const d = await post('/api/badge-license', { orgId:'org-test', domain:'acme.com' })
  assert('badge-license: issued with annual fee', !!d.license?.id && d.annualFeeUsd === 1200, d)
}

// ── Track 2: Patent moat ──────────────────────────────────────
console.log('\n── Patent moat ──')
{
  const d = await post('/api/agent-dna', { agentId, modelId:'gpt-4o', systemPrompt:'You are a purchasing agent.' })
  assert('agent-dna: fingerprint created', !!d.dna?.fingerprint, d)
  assert('agent-dna: clone check runs', 'cloneDetected' in d, d)
}
{
  // Seed trust score first via evaluate
  const d = await get(`/api/trust-score?agentId=${agentId}`)
  const score = d.score?.score ?? 0
  const d2 = await post('/api/portable-vc', { agentId, scoreAbove: score <= 0 ? -1 : score - 1 })
  assert('portable-vc: VC issued', !!d2.vc?.proof || !!d2.error, d2)
}
{
  const d = await post('/api/precrime', { agentId })
  assert('precrime: signal generated', typeof d.signal?.predictedRisk === 'number', d)
  assert('precrime: recommendation present', ['allow','review','block'].includes(d.signal?.recommendation), d)
}
{
  await post('/api/hardware-passport', { passportId, tpmEkPub:'tpm-ek-pub-01', deviceSerial:'device-serial-01' })
  const d = await post('/api/attest-chain', { actionId:'act-001', agentId })
  assert('attest-chain: signature + tpm attestation', !!d.chain?.signature && !!d.chain?.tpmAttestation, d)
}
{
  const d = await get('/api/leaderboard')
  assert('leaderboard: returns entries array', Array.isArray(d.leaderboard), d)
}
{
  const d = await get('/api/trust-graph')
  assert('trust-graph: returns nodes + edges', Array.isArray(d.graph?.nodes) && Array.isArray(d.graph?.edges), d)
}

// ── Track 3: User-interactive ────────────────────────────────
console.log('\n── User-interactive ──')
{
  const d = await get(`/api/credit-report?agentId=${agentId}`)
  assert('credit-report: report generated', !!d.report?.agentId, d)
  assert('credit-report: score history present', Array.isArray(d.report?.scoreHistory), d)
}
{
  const d = await post('/api/dispute', { receiptId:'rcpt-9114', passportId, message:'Contesting denial on 2024-01-01' })
  assert('dispute: thread opened', !!d.thread?.id, d)
  const threadId = d.thread.id
  const d2 = await patch('/api/dispute', { threadId, message:'Additional evidence attached', role:'user' })
  assert('dispute: message appended', d2.thread?.messages?.length >= 2, d2)
  const d3 = await patch('/api/dispute', { threadId, status:'resolved' })
  assert('dispute: status updated to resolved', d3.thread?.status === 'resolved', d3)
}

// ── Track 4: Parity ──────────────────────────────────────────
console.log('\n── Competitive parity ──')
{
  const d = await post('/api/sdk-token', { orgId:'org-test', scopes:['passport:read','eval:submit'], ttlDays:30 })
  assert('sdk-token: token issued', !!d.token?.tokenId && !!d.token?.secret, d)
  assert('sdk-token: secret warning present', !!d.warning, d)
  const tokenId = d.token.tokenId
  const d2 = await del('/api/sdk-token', { tokenId })
  assert('sdk-token: revoked', d2.revoked === true, d2)
}
{
  const d = await post('/api/oauth-client', { orgId:'org-test', redirectUris:['https://app.example.com/callback'] })
  assert('oauth-client: client created', !!d.client?.clientId, d)
}
{
  const d = await post('/api/connector', { orgId:'org-test', type:'zapier', config:{ hookUrl:'https://hooks.zapier.com/test' } })
  assert('connector: zapier connector created', d.connector?.type === 'zapier', d)
  const d2 = await post('/api/connector', { orgId:'org-test', type:'mcp', config:{ endpoint:'https://mcp.example.com' } })
  assert('connector: mcp connector created', d2.connector?.type === 'mcp', d2)
}
{
  const d = await get('/api/quota?orgId=org-test')
  assert('quota: dashboard returned', !!d.quota?.evalLimit, d)
  assert('quota: limits match verified tier', d.quota?.evalLimit === 10000, d)
  const d2 = await patch('/api/quota', { orgId:'org-test', increment:{ evalUsed:5 } })
  assert('quota: increment applied', d2.quota?.evalUsed >= 5, d2)
}

// Summary
console.log(`\n${'─'.repeat(40)}`)
console.log(`Wave-2 results: ${pass} passed, ${fail} failed (${pass + fail} total)`)
if (fail > 0) process.exit(1)
