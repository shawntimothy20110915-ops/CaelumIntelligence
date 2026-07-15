import { promises as fs } from 'fs'
import path from 'path'

// Dual-mode store for Caelum Labs.
// - Supabase when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
//   (production-durable, multi-instance safe) — tables created by the
//   `labs_core` migration (see supabase/migrations).
// - File-based JSON otherwise (zero-config local dev).
const USE_SUPABASE = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const DATA_DIR = path.join(process.cwd(), '.labs-data')

export function shortId(): string {
  return Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7)
}

// ── types ───────────────────────────────────────────────────────────────
export type RunStep = {
  i: number
  kind: 'thought' | 'tool' | 'edit' | 'result'
  label: string
  detail: string
  file?: string
}
export type Run = {
  id: string
  title: string
  model: string
  createdAt: number
  parentId?: string
  forkedAtStep?: number
  steps: RunStep[]
}
export type Receipt = {
  id: string
  subject: string
  claims: string[]
  issuedAt: number
  payload: string
  sig: string
}

// ── file helpers ──────────────────────────────────────────────────────────
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf-8')) as T
  } catch {
    return fallback
  }
}
async function writeJson(file: string, data: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8')
}

// ── supabase helpers ────────────────────────────────────────────────────--
async function sb() {
  const { supabaseAdmin } = await import('@/lib/supabase')
  return supabaseAdmin
}
type RunRow = { id: string; title: string; model: string; created_at: number; parent_id: string | null; forked_at_step: number | null; steps: RunStep[] }
const rowToRun = (r: RunRow): Run => ({
  id: r.id, title: r.title, model: r.model, createdAt: Number(r.created_at),
  parentId: r.parent_id ?? undefined, forkedAtStep: r.forked_at_step ?? undefined, steps: r.steps,
})

// ── Runs ────────────────────────────────────────────────────────────────--
export async function listRuns(): Promise<Run[]> {
  if (USE_SUPABASE) {
    const { data } = await (await sb()).from('labs_runs').select('*').order('created_at', { ascending: false }).limit(200)
    return (data as RunRow[] | null ?? []).map(rowToRun)
  }
  const runs = await readJson<Run[]>('runs.json', [])
  return runs.sort((a, b) => b.createdAt - a.createdAt)
}
export async function getRun(id: string): Promise<Run | null> {
  if (USE_SUPABASE) {
    const { data } = await (await sb()).from('labs_runs').select('*').eq('id', id).maybeSingle()
    return data ? rowToRun(data as RunRow) : null
  }
  const runs = await readJson<Run[]>('runs.json', [])
  return runs.find(r => r.id === id) ?? null
}
export async function saveRun(run: Run): Promise<Run> {
  if (USE_SUPABASE) {
    await (await sb()).from('labs_runs').insert({
      id: run.id, title: run.title, model: run.model, created_at: run.createdAt,
      parent_id: run.parentId ?? null, forked_at_step: run.forkedAtStep ?? null, steps: run.steps,
    })
    return run
  }
  const runs = await readJson<Run[]>('runs.json', [])
  runs.push(run)
  await writeJson('runs.json', runs)
  return run
}

// ── Receipts ──────────────────────────────────────────────────────────────
export async function getReceipt(id: string): Promise<Receipt | null> {
  if (USE_SUPABASE) {
    const { data } = await (await sb()).from('labs_receipts').select('*').eq('id', id).maybeSingle()
    if (!data) return null
    const r = data as { id: string; subject: string; claims: string[]; issued_at: number; payload: string; sig: string }
    return { id: r.id, subject: r.subject, claims: r.claims, issuedAt: Number(r.issued_at), payload: r.payload, sig: r.sig }
  }
  const list = await readJson<Receipt[]>('receipts.json', [])
  return list.find(r => r.id === id) ?? null
}
export async function saveReceipt(r: Receipt): Promise<Receipt> {
  if (USE_SUPABASE) {
    await (await sb()).from('labs_receipts').insert({
      id: r.id, subject: r.subject, claims: r.claims, issued_at: r.issuedAt, payload: r.payload, sig: r.sig,
    })
    return r
  }
  const list = await readJson<Receipt[]>('receipts.json', [])
  list.push(r)
  await writeJson('receipts.json', list)
  return r
}

// ── Waitlist ──────────────────────────────────────────────────────────────
export async function addWaitlist(product: string, email: string) {
  if (USE_SUPABASE) {
    await (await sb()).from('labs_waitlist').insert({ product, email, at: Date.now() })
    return
  }
  const list = await readJson<Array<{ product: string; email: string; at: number }>>('waitlist.json', [])
  list.push({ product, email, at: Date.now() })
  await writeJson('waitlist.json', list)
}
