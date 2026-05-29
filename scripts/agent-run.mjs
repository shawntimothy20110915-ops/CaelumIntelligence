/**
 * AgentPass Agent Integration Test
 *
 * Simulates a real purchase-bot agent that:
 *  1. Boots up and registers itself (mints passport)
 *  2. Gets a scoped delegation proof (its "API key")
 *  3. Runs an autonomous task loop, checking every action with AgentPass before executing
 *  4. Hits the kill switch mid-run and proves all subsequent actions are denied
 */

const BASE = 'http://localhost:3000/api'

// ─── AgentPass SDK (minimal) ──────────────────────────────────────────────
class AgentPass {
  constructor({ passportId, proofId }) {
    this.passportId = passportId
    this.proofId = proofId
  }

  async check(action, { merchant, amount } = {}) {
    const r = await fetch(`${BASE}/approval/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passportId: this.passportId, proofId: this.proofId, action, merchant, amount }),
    })
    const { result, receipt } = await r.json()
    return { decision: result.decision, reason: result.reason, receipt }
  }

  async revoke() {
    const r = await fetch(`${BASE}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'passport', id: this.passportId, reason: 'kill switch triggered' }),
    })
    return r.json()
  }
}

// ─── Agent: PurchaseBot ───────────────────────────────────────────────────
class PurchaseBot {
  constructor(name, ap) {
    this.name = name
    this.ap = ap
    this.log = []
    this.totalSpent = 0
  }

  async act(description, action, opts = {}) {
    process.stdout.write(`  [${this.name}] ${description} … `)
    const { decision, reason, receipt } = await this.ap.check(action, opts)

    const icon = decision === 'approved' ? '✓' : decision === 'human_review' ? '⏸' : '✗'
    const color = decision === 'approved' ? '\x1b[32m' : decision === 'human_review' ? '\x1b[33m' : '\x1b[31m'
    console.log(`${color}${icon} ${decision.toUpperCase()}\x1b[0m`)

    if (decision !== 'approved' && decision !== 'human_review') {
      console.log(`         reason: ${reason}`)
    }
    if (decision === 'human_review') {
      console.log(`         queued: ${reason}`)
    }
    if (decision === 'approved' && opts.amount) {
      this.totalSpent += opts.amount
    }

    this.log.push({ description, action, decision, reason, receiptId: receipt?.id })
    return decision
  }
}

// ─── Bootstrap: provision agent credentials ───────────────────────────────
async function provision(label, permissions, opts = {}) {
  // 1. Mint passport
  const mintRes = await fetch(`${BASE}/passport/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label,
      ttlDays: 1,
      killSwitchUrl: `${BASE}/revoke`,
      metadata: { env: 'agent-test', runner: 'agent-run.mjs' },
    }),
  })
  const { passport } = await mintRes.json()

  // 2. Issue scoped delegation proof
  const proofRes = await fetch(`${BASE}/proof/delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passportId: passport.id,
      grantedTo: label,
      permissions,
      ttlHours: 1,
      ...opts,
    }),
  })
  const { proof } = await proofRes.json()

  return { passport, proof, ap: new AgentPass({ passportId: passport.id, proofId: proof.id }) }
}

// ─── Run ──────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m━━━  AgentPass Agent Run  ━━━\x1b[0m\n')

// ── Phase 1: Provision the agent ─────────────────────────────────────────
console.log('\x1b[2m[provision]\x1b[0m Minting passport + issuing scoped proof…')
const { passport, proof, ap } = await provision(
  'purchase-bot-v1',
  ['purchase', 'search'],
  { maxAmount: 300, allowedMerchants: ['amazon.com', 'bestbuy.com', 'newegg.com'] }
)
console.log(`  passportId : ${passport.id}`)
console.log(`  agentId    : ${passport.agentId}`)
console.log(`  proofId    : ${proof.id}`)
console.log(`  permissions: [${proof.permissions.join(', ')}]`)
console.log(`  maxAmount  : $${proof.constraints.maxAmount}`)
console.log(`  merchants  : ${proof.constraints.allowedMerchants.join(', ')}`)
console.log(`  expires    : ${new Date(proof.constraints.expiresAt).toLocaleTimeString()}\n`)

const bot = new PurchaseBot('purchase-bot-v1', ap)

// ── Phase 2: Normal operating loop ───────────────────────────────────────
console.log('\x1b[2m[task-loop]\x1b[0m Running autonomous purchase task…\n')

await bot.act('Search for USB-C hubs',           'search',   {})
await bot.act('Buy USB-C hub $29',               'purchase', { merchant: 'amazon.com',  amount: 29  })
await bot.act('Buy mechanical keyboard $189',    'purchase', { merchant: 'bestbuy.com', amount: 189 })
await bot.act('Buy GPU $249',                    'purchase', { merchant: 'newegg.com',  amount: 249 })

// ── Phase 3: Policy violations (agent tries to exceed its mandate) ────────
console.log('\n\x1b[2m[policy-check]\x1b[0m Agent attempts out-of-scope actions…\n')

await bot.act('Issue refund for cancelled order',           'refund',   { merchant: 'amazon.com',   amount: 29 })
await bot.act('Wire funds to supplier',                     'transfer', { merchant: 'amazon.com',   amount: 50 })
await bot.act('Buy from non-approved vendor',               'purchase', { merchant: 'ali-deals.cn', amount: 15 })
await bot.act('Bulk buy $350 — over proof limit',           'purchase', { merchant: 'amazon.com',   amount: 350 })

// ── Phase 4: Kill switch ──────────────────────────────────────────────────
console.log('\n\x1b[2m[kill-switch]\x1b[0m Suspicious activity detected — revoking passport…\n')
const revokeResult = await ap.revoke()
console.log(`  revoked  : ${revokeResult.revoked?.id ?? 'unknown'}`)
console.log(`  cascaded : ${revokeResult.cascadedProofs?.length ?? 0} proof(s) killed`)
console.log(`  reason   : ${revokeResult.reason}\n`)

// ── Phase 5: Post-revoke — all actions must be denied ────────────────────
console.log('\x1b[2m[post-revoke]\x1b[0m Verifying all actions are now denied…\n')

await bot.act('Try purchase after kill switch',  'purchase', { merchant: 'amazon.com', amount: 1   })
await bot.act('Try search after kill switch',    'search',   {})
await bot.act('Try small transfer after revoke', 'transfer', { merchant: 'amazon.com', amount: 5   })

// ── Summary ───────────────────────────────────────────────────────────────
console.log('\n\x1b[1m━━━  Agent Run Summary  ━━━\x1b[0m\n')

const approved     = bot.log.filter(e => e.decision === 'approved').length
const denied       = bot.log.filter(e => e.decision === 'denied').length
const humanReview  = bot.log.filter(e => e.decision === 'human_review').length

console.log(`  Total actions    : ${bot.log.length}`)
console.log(`  Approved         : \x1b[32m${approved}\x1b[0m`)
console.log(`  Denied           : \x1b[31m${denied}\x1b[0m`)
console.log(`  Human review     : \x1b[33m${humanReview}\x1b[0m`)
console.log(`  Total spent      : $${bot.totalSpent}`)

// Verify kill switch worked — post-revoke actions must all be denied
const postRevoke = bot.log.slice(-3)
const allDenied = postRevoke.every(e => e.decision === 'denied')
console.log(`\n  Kill switch      : ${allDenied ? '\x1b[32m✓ WORKING — all post-revoke actions denied\x1b[0m' : '\x1b[31m✗ FAILED — post-revoke action was NOT denied\x1b[0m'}`)

// Print receipt IDs for audit trail
console.log('\n\x1b[2m[receipts]\x1b[0m')
bot.log.forEach(e => {
  if (e.receiptId) console.log(`  ${e.receiptId}  ${e.decision.padEnd(12)}  ${e.description}`)
})

console.log()
if (!allDenied) process.exit(1)
