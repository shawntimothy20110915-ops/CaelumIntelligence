/**
 * Durable persistence for the AgentPass store (opt-in).
 *
 * The store (lib/store.ts) is a synchronous in-memory singleton of Maps/arrays,
 * read+mutated by ~70 routes. Rewriting all of them to async SQL would be a massive
 * change. Instead this snapshots the ENTIRE store to a single Postgres JSONB row and
 * rehydrates it on boot — so customers, keys, billing and ledgers survive restarts.
 *
 * Enable by setting DATABASE_URL (Neon / Supabase / Vercel Postgres / any Postgres).
 * If DATABASE_URL is unset, or the `pg` driver isn't installed, everything falls back
 * to pure in-memory exactly as before — nothing breaks.
 *
 * Trade-off (be aware): this keeps the working set in memory and persists snapshots,
 * which is durable + correct on a SINGLE long-lived Node instance (Railway / Render /
 * Fly / a VM running `next start`). On multi-instance serverless, concurrent writes
 * across instances can race; fine for early traffic, revisit with per-entity tables
 * + async routes when volume demands it.
 */

type AnyStore = Record<string, unknown>

const TABLE = 'agentpass_snapshot'
let pool: { query: (q: string, p?: unknown[]) => Promise<{ rows: { data?: unknown }[] }> } | null = null
let poolTried = false
let lastJson = ''
let started = false

async function getPool() {
  if (pool) return pool
  if (poolTried) return null
  poolTried = true
  const url = process.env.DATABASE_URL
  if (!url) return null
  let pg: { Pool?: new (o: unknown) => unknown; default?: { Pool: new (o: unknown) => unknown } }
  try {
    pg = (await import('pg')) as unknown as typeof pg
  } catch {
    console.warn('[persistence] DATABASE_URL set but `pg` is not installed — run `npm install pg`. Running in-memory only.')
    return null
  }
  const Pool = pg.default?.Pool ?? pg.Pool
  if (!Pool) return null
  const needsSsl = /sslmode=require/.test(url) || /neon\.tech|supabase\.co|vercel|render\.com|railway/.test(url)
  // Verify the server certificate by default. Managed Postgres (Neon/Supabase/…)
  // present valid public CAs. Only disable for self-signed certs via explicit opt-in.
  const insecure = process.env.DATABASE_SSL_INSECURE === 'true'
  const ssl = needsSsl ? { rejectUnauthorized: !insecure } : undefined
  pool = new Pool({ connectionString: url, ssl, max: 2 }) as typeof pool
  return pool
}

function serialize(store: AnyStore) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(store)) {
    out[k] = v instanceof Map ? { __map: Array.from(v.entries()) } : v
  }
  return out
}

function restore(store: AnyStore, data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    const cur = store[k]
    if (v && typeof v === 'object' && '__map' in (v as object) && cur instanceof Map) {
      cur.clear()
      for (const [kk, vv] of (v as { __map: [unknown, unknown][] }).__map) cur.set(kk, vv)
    } else if (Array.isArray(v) && Array.isArray(cur)) {
      cur.length = 0
      cur.push(...v)
    } else if (v !== null && typeof v !== 'object') {
      store[k] = v // primitives: seq, receiptCounter, baseEventCount, startTime
    } else if (v && typeof v === 'object' && cur && typeof cur === 'object' && !(cur instanceof Map)) {
      Object.assign(cur as object, v) // plain objects e.g. trustGraph {nodes,edges}
    }
  }
}

/** Load the persisted snapshot over the freshly-seeded store. Safe to call once at boot. */
export async function hydrateStore(store: AnyStore) {
  const p = await getPool()
  if (!p) return
  try {
    await p.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (id int PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now())`)
    const r = await p.query(`SELECT data FROM ${TABLE} WHERE id = 1`)
    if (r.rows[0]?.data) {
      restore(store, r.rows[0].data as Record<string, unknown>)
      lastJson = JSON.stringify(serialize(store))
      console.log('[persistence] hydrated store from Postgres')
    } else {
      await persistNow(store)
      console.log('[persistence] seeded initial snapshot to Postgres')
    }
  } catch (e) {
    console.error('[persistence] hydrate failed — continuing in-memory:', (e as Error).message)
  }
}

/** Write the full store to Postgres if it changed since the last write. */
export async function persistNow(store: AnyStore) {
  const p = await getPool()
  if (!p) return
  const json = JSON.stringify(serialize(store))
  if (json === lastJson) return
  try {
    await p.query(
      `INSERT INTO ${TABLE} (id, data, updated_at) VALUES (1, $1::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [json],
    )
    lastJson = json
  } catch (e) {
    console.error('[persistence] snapshot failed:', (e as Error).message)
  }
}

/** Start periodic + on-exit snapshots. Idempotent. */
export function startPersistence(getStore: () => AnyStore) {
  if (started || !process.env.DATABASE_URL) return
  started = true
  const ms = Number(process.env.SNAPSHOT_INTERVAL_MS || 5000)
  const timer = setInterval(() => { void persistNow(getStore()) }, ms)
  if (typeof (timer as { unref?: () => void }).unref === 'function') (timer as { unref: () => void }).unref()
  const flush = () => { void persistNow(getStore()) }
  process.once('SIGTERM', flush)
  process.once('SIGINT', flush)
  process.once('beforeExit', flush)
}
