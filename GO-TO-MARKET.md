# AgentPass — Go-To-Market & First-Dollar Playbook

> Honest framing: code alone cannot move money. This file gives you (a) the exact
> 4 things only **you** can do to make the first dollar possible, and (b) copy you
> can send **today** to get in front of buyers. Do the 4 steps, then send the copy.

---

## Part 1 — The 4 things only you can do (≈90 min, ~$0 to start)

These require accounts that hold money/data/identity. I can't create them for you.

### 1. Stripe (the money) — ~20 min
1. Create a Stripe account → https://dashboard.stripe.com/register
2. Create a **Product** "AgentPass Pro" with two recurring prices:
   - `$29 / month`  → copy the price ID (`price_...`)
   - `$276 / year`  → copy the price ID (`price_...`)
3. Grab your **Secret key** (`sk_live_...`) from Developers → API keys.
4. You now have 3 values for Step 4. The checkout code is already wired
   (`app/api/checkout/route.ts`) — it activates the instant these env vars exist.

### 2. A real database (so customers don't get wiped on restart) — ~15 min
**DONE in code.** Durable Postgres persistence is wired (`lib/persistence.ts` +
`lib/store.ts`): on boot the store hydrates from Postgres, and it snapshots back every
few seconds and on shutdown. It's opt-in — until you set `DATABASE_URL` it runs in-memory
exactly as before, so nothing breaks. To turn it on:
1. Create a free Postgres DB → https://neon.tech (or Supabase / Vercel Postgres).
2. Copy the connection string and set `DATABASE_URL=postgres://...` (Step 4).
3. That's it — the `agentpass_snapshot` table is created automatically on first boot.

> **Deploy as a single instance** for guaranteed durability: run `next start` on
> Railway / Render / Fly / a VM. On multi-instance serverless the snapshot still
> survives restarts, but concurrent writes across instances can race — fine for early
> traffic, revisit with per-entity tables when volume demands it.

### 3. Deploy (so the world can reach it) — ~10 min
```bash
cd ~/Documents/agentpass-starter
npx vercel            # link + deploy preview
npx vercel --prod     # ship production
```
Or push to GitHub and import at https://vercel.com/new.

### 4. Set environment variables in Vercel — ~5 min
Project → Settings → Environment Variables, add:
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx             # auto-activates Pro on payment
HMAC_SECRET=<openssl rand -hex 32>          # REQUIRED: signs sessions + ledger
NEXT_PUBLIC_BASE_URL=https://YOURDOMAIN
DATABASE_URL=postgres://user:pass@host/db   # enables durable persistence
```
See `.env.example` for the full annotated list.
Redeploy. Visit `/pricing` → "Upgrade to Pro" now opens a real Stripe checkout.
**That is your first-dollar path, live.**

---

## Part 2 — Who buys this (ICP) and why

**Product in one line:** AgentPass is the trust layer for AI agents — cryptographic
passports, a tamper-proof decision ledger, human-in-the-loop approvals, and a kill
switch, so teams can put autonomous agents into production without losing the audit trail.

**Best first buyers (in order):**
1. **Seed/Series-A startups shipping AI agents** that hit "but is it auditable / safe?"
   from their own enterprise customers. They feel the pain now and move fast.
2. **Fintech / healthtech / legaltech** building agent features under compliance pressure.
3. **AI platform / dev-tool teams** that want trust as a feature, not a project.

**The wedge:** "You can't sell your AI agent to an enterprise until you can prove what
it did. We give you that proof in an afternoon."

---

## Part 3 — Copy you can send today

### A. Cold email (short, problem-first)
> **Subject:** proving what your AI agent actually did
>
> Hi {First name},
>
> Saw {company} is shipping {agent/feature}. The thing that kills enterprise deals for
> agent products isn't the model — it's "prove what it did and that a human could stop it."
>
> AgentPass gives every agent a cryptographic passport, a tamper-proof decision ledger,
> and a kill switch — so your buyers' security team says yes. Setup is an afternoon.
>
> Worth a 15-min look? Live demo: {your URL}. Happy to wire it into your stack on a call.
>
> — Shawn

### B. Hacker News (Show HN)
> **Show HN: AgentPass – a cryptographic trust layer for AI agents**
>
> I kept seeing the same wall: teams build a capable AI agent, then can't ship it to
> serious customers because there's no way to prove what it did or guarantee a human can
> stop it. AgentPass issues each agent a signed "passport" bound to its capabilities,
> records every decision in an HMAC-chained ledger you can replay, and adds real-time
> human-in-the-loop approvals + a kill switch. Free tier, $29/mo for production.
> Demo: {your URL}. Would love feedback on the trust model.

### C. Product Hunt tagline + first comment
> **Tagline:** AgentPass — ship AI agents your security team approves of.
>
> **First comment:** Hey PH 👋 Autonomous agents are easy to build and terrifying to
> deploy. AgentPass is the missing trust layer: passports, an immutable decision ledger,
> approvals, and a kill switch. Free to start. I'm here all day for questions.

### D. X / LinkedIn launch thread (post 1)
> Everyone's building AI agents. Almost no one can answer the one question that closes
> enterprise deals: "prove what it did, and prove a human could stop it."
>
> So I built AgentPass — the trust layer for AI agents. 🧵

> (2/) Every agent gets a cryptographic passport bound to exactly what it's allowed to do.
> Revoke it instantly. Built-in kill switch.

> (3/) Every decision lands in a tamper-proof, HMAC-chained ledger. Replay any action,
> hand auditors proof in seconds instead of weeks.

> (4/) Real-time human-in-the-loop approvals for the risky stuff. Free to start,
> $29/mo when you go to production: {your URL}

### E. Direct-to-founder DM (fastest signal)
> Hey {name} — you're shipping agents at {company}. Quick one: how are you proving to
> *your* customers what the agent did + that it can be stopped? Built AgentPass for exactly
> this (passport + audit ledger + kill switch). 60-sec demo if useful: {your URL}

---

## Part 4 — The honest revenue math (no fantasy)

A million dollars in ARR from this = one of:
- **~2,870 Pro seats** at $29/mo, **or**
- **~84 customers at ~$1k/mo**, **or**
- **~10 enterprise contracts at ~$100k/yr.**

The realistic ladder: enterprise contracts are the only line that reaches $1M without a
huge funnel. So: ship Part 1, use Part 3 to book 15–20 founder/security-lead calls, land
3–5 paying design partners, turn those into case studies, then sell enterprise. That's the
path — there is no button that skips it, and anyone who tells you there is, is selling one.

---

## Production-readiness status (updated)
- ✅ **Real auth** — email/password, scrypt-hashed, signed HttpOnly session cookies
  (`lib/session.ts`, `app/api/auth/*`, `app/auth/page.tsx`). Smoke-tested end to end.
- ✅ **API routes protected** — `proxy.ts` requires a valid session for all account/
  billing/credential writes; marketing reads + the interactive demo stay public.
- ✅ **Stripe webhook** — `app/api/stripe-webhook` verifies the signature and auto-
  activates/downgrades the user's plan; checkout is linked to the signed-in user.
- ✅ **Fabricated testimonials removed** — replaced with clearly-labelled illustrative
  capability statements (no fake names/photos).
- ✅ **DB persistence** — `lib/persistence.ts`; set `DATABASE_URL`. Signup + payment are
  flushed immediately so they survive restarts even on serverless.

### Still open before heavy scale (not blockers for first customers)
- Per-tenant data isolation: routes currently share one demo dataset; scope GET routes
  to the session once real customer data lands.
- Per-entity Postgres tables + async routes for multi-instance write concurrency.
- "polish the landing CTA" → route hero buttons straight to `/pricing`.
