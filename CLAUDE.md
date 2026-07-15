@AGENTS.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Architecture (from the knowledge graph)

> 643 nodes · 1429 edges · 37 communities. Query `graphify-out/` for detail; this is the spine.

**The one fact that matters:** `getStore()` (lib/store.ts) is a **202-edge god node** — a single
synchronous in-memory `Store` singleton (Maps + arrays) that nearly every one of the ~71 API routes
calls directly. Changing its shape or making it async ripples across the whole codebase. This is why
the Postgres/async migration is high-leverage AND high-risk — see `DB-MIGRATION-PLAN.md` (strangler-fig,
entity-by-entity, behind a backend flag).

**Other god nodes:** `generateShortId()` (IDs, 62), `computeHmac()` (signing, lib/crypto.ts, 29),
`getBilling()` + `appendLedgerEvent()` (billing/ledger, lib/store.ts), `brand` (UI tokens, lib/brand.ts).

**Subsystems (communities):**
- **Core Store & Types** — `lib/store.ts`, `lib/types.ts` (the spine; weak cohesion ~0.06, a split candidate).
- **Auth & Session** — `lib/session.ts` (HMAC-signed cookies), `proxy.ts` (Next 16 proxy; gates writes + `/dashboard`), `app/api/auth/*`.
- **Crypto & Signing** — `lib/crypto.ts` (scrypt hashing, HMAC).
- **Persistence Layer** — `lib/persistence.ts` (Postgres snapshot/hydrate, opt-in via `DATABASE_URL`; single-instance correct, multi-instance write-race caveat).
- **Billing & Ledger API**, **Core API Routes (getStore)**, **Dashboard UI** (`app/dashboard`), **Brand UI Shell** + components, **test scripts** (`scripts/*.mjs`).

**Per-tenant isolation:** passports carry `ownerUserId`; `/api/account/passports` is session-scoped; `revoke` enforces ownership; the public list excludes owned passports.

**Money path:** `app/api/checkout` (env-gated Stripe Checkout) → `app/api/stripe-webhook` (signature-verified) → flips `User.plan`. Strategy in `GO-TO-MARKET.md`.
