# Phase 3 — Per-entity Postgres + async: migration plan & recommendation

## TL;DR (read this first)
**Do not big-bang rewrite all ~70 routes to async SQL right now.** It is the single
highest-risk, highest-token change available, it would almost certainly leave the app
half-broken mid-flight, and **you have zero customers** — so the multi-instance write
concurrency it fixes is not yet a real problem.

What you have today is already correct on a **single Node instance** (Railway / Render /
Fly / a VM running `next start`), and signup + payment are explicitly flushed so they
survive restarts even on serverless. **Ship on a single instance, get your first 5–20
paying design partners, then execute this plan incrementally** — one route group at a
time, behind tests — when real concurrent load or per-tenant data volume demands it.

The rest of this file is the executable plan for that moment.

---

## Why incremental, not big-bang
- The store is a synchronous singleton with rich cross-entity logic (`chargeCredits`,
  `appendLedgerEvent`, `buildLeaderboard`, trust graph, decay, collusion, …). Converting
  to SQL is a re-architecture, not a find-and-replace.
- 70 routes × (signature change to async + query rewrite + re-test) is days of work and
  enormous token cost.
- A partial big-bang leaves some routes on the Map and some on SQL → data split-brain.

The safe pattern is the **strangler fig**: introduce a repository layer, migrate one
entity at a time, keep everything else on the existing store until its turn.

---

## Target architecture
```
lib/db/
  client.ts        # pg Pool (already have the dep); one pool per process
  migrations/      # plain .sql files, run by a tiny runner or `psql`
  repos/
    users.ts       # UserRepo: getById, findByEmail, create, update
    passports.ts   # PassportRepo: byId, byOwner, create, setStatus
    billing.ts     # BillingRepo
    ledger.ts      # LedgerRepo (append-only)
    ...
```
Each repo exposes the **same shape** the routes already use, so migrating a route =
swap `getStore().passports.get(id)` → `await passportRepo.byId(id)`.

### Repository interface (keep it boring)
```ts
export interface PassportRepo {
  byId(id: string): Promise<AgentPassport | null>
  byOwner(userId: string): Promise<AgentPassport[]>
  create(p: AgentPassport): Promise<void>
  setStatus(id: string, status: AgentPassport['status']): Promise<void>
}
```

---

## Migration order (by value × containment)
Do them in this order; each is independently shippable and testable.

1. **users** — already fully contained (only auth routes + webhook + `/me` read it).
   Lowest blast radius, highest security value. Good first slice / template.
2. **passports + apiKeys** — core object; already owner-tagged from Phase 1.
3. **billing + subscriptions** — money; pairs with the Stripe webhook.
4. **ledger** — append-only; trivial schema, high write volume (benefits most from SQL).
5. **proofs, receipts, orgs** — account-adjacent.
6. **Everything else (demo/showcase entities)** — last, or leave on the snapshot store
   indefinitely since it's the public demo, not customer data.

After step 3 you have true multi-instance correctness for **all revenue-critical data**,
which is the actual goal — steps 4–6 are optimization.

---

## Schemas (first three)
```sql
-- 001_users.sql
create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  plan text not null default 'free',
  org_id text,
  stripe_customer_id text,
  created_at bigint not null
);
create index if not exists users_stripe_customer_idx on users(stripe_customer_id);

-- 002_passports.sql
create table if not exists passports (
  id text primary key,
  owner_user_id text references users(id),
  agent_id text not null,
  label text not null,
  public_key text not null,
  api_key text unique not null,
  status text not null default 'active',
  kill_switch_url text,
  metadata jsonb not null default '{}',
  minted_at bigint not null,
  expires_at bigint
);
create index if not exists passports_owner_idx on passports(owner_user_id);

-- 003_billing.sql
create table if not exists billing (
  passport_id text primary key references passports(id),
  plan text not null,
  credits numeric not null default 0,
  spend_usd numeric not null default 0,
  budget_usd numeric,
  org_id text,
  data jsonb not null default '{}'  -- overflow for the long tail of fields
);
```

---

## Per-route migration recipe
1. Write the repo method + a unit test against a throwaway test DB (or `pg-mem`).
2. In the route, replace the store call with the repo call; make the handler `async`
   (route handlers already are).
3. Remove that entity from the snapshot `serialize()` allow-set so the two systems don't
   double-write (see `lib/persistence.ts`).
4. Run the route's smoke test (curl) + the existing `scripts/*-test.mjs`.
5. Ship. Repeat.

### Compatibility shim (so the app never breaks mid-migration)
Add a flag `process.env.USERS_BACKEND = 'sql' | 'store'`. The user accessor checks the
flag and routes to the repo or the Map. Flip it per entity once its repo is proven. This
lets you migrate and roll back one entity without redeploying the world.

---

## Testing & rollback
- Each repo gets unit tests; each migrated route keeps its curl smoke test.
- Keep `DATABASE_URL` pointed at a **branch DB** (Neon branching) during migration; merge
  when green.
- Rollback = flip the entity's backend flag back to `store`.

## Effort estimate
- Infra (client + migration runner + first `users` repo + tests): ~0.5 day.
- Each subsequent entity: ~0.5–1 day including tests.
- Revenue-critical set (users, passports, billing, subscriptions): ~3 days.
- Full set: ~1.5–2 weeks. **Only worth it once concurrency/scale is real.**

## When to actually start
Trigger any one of:
- You're deploying to multi-instance serverless **and** seeing concurrent writes, or
- A single instance can't hold the dataset in memory, or
- A customer contract requires per-record durability guarantees the snapshot can't make.

Until then, single-instance + the current snapshot store is the correct, cheapest choice.
Say **"start the DB migration"** and I'll build the infra + the `users` slice as the
template, then proceed entity by entity.
```
