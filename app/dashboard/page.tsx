'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  token: string
  email: string
  name: string
}

interface Stats {
  totalDecisions: number
  approvalRate: number
  activePassports: number
  pendingApprovals: number
  ledgerEvents: number
  avgLatencyMs: number
}

interface ApprovalItem {
  id: string
  agentName: string
  action: string
  resource: string
  risk: 'high' | 'medium' | 'low'
  status: string
  requestedAt: string
}

interface LedgerEvent {
  id: string
  action: string
  actor: string
  agentName: string
  resource: string
  ts: string
  hash: string
}

interface Passport {
  id: string
  agentName: string
  status: string
  permissions: string[]
  expiresAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = 'https://agentpassv22.vercel.app/api'

const ALL_PERMISSIONS = ['purchase', 'search', 'refund', 'booking', 'transfer']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtTs(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch { return iso }
}

function riskColor(risk: string): string {
  if (risk === 'high') return 'var(--signal)'
  if (risk === 'medium') return 'var(--gold)'
  return 'var(--evergreen)'
}

function actionColor(action: string): string {
  const a = action.toLowerCase()
  if (a.includes('deny') || a.includes('reject') || a.includes('revoke')) return 'var(--signal)'
  if (a.includes('approve') || a.includes('mint') || a.includes('grant')) return 'var(--evergreen)'
  if (a.includes('request') || a.includes('pending')) return 'var(--gold)'
  return 'var(--ink-soft)'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Seal() {
  return (
    <svg viewBox="0 0 36 36" width="28" height="28" aria-hidden="true">
      <defs>
        <linearGradient id="dash-seal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--ink)" />
        </linearGradient>
      </defs>
      <polygon points="18,2 31,8 35,18 31,28 18,34 5,28 1,18 5,8" fill="none" stroke="var(--gold)" strokeWidth="1.1" opacity="0.6" />
      <polygon points="18,7 27,11 30,18 27,25 18,29 9,25 6,18 9,11" fill="url(#dash-seal)" />
      <text x="18" y="22.5" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="11" fill="var(--bg)">A</text>
    </svg>
  )
}

function NavLink({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '9px 16px',
        background: active ? 'rgba(212,163,90,0.10)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
        color: active ? 'var(--gold)' : 'var(--ink-mute)',
        fontSize: 13,
        fontFamily: 'Inter, sans-serif',
        fontWeight: active ? 600 : 400,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.15s',
        borderRadius: '0 4px 4px 0',
      }}
    >
      {label}
    </button>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--rule-2)',
      borderRadius: 10,
      padding: '20px 24px',
      flex: '1 1 0',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 36, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-fade)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [activeNav, setActiveNav] = useState<'dashboard' | 'passports' | 'approvals' | 'ledger'>('dashboard')

  // Stats
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Approvals
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(true)
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  // Ledger
  const [events, setEvents] = useState<LedgerEvent[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(true)

  // Passports
  const [passports, setPassports] = useState<Passport[]>([])
  const [passportsLoading, setPassportsLoading] = useState(true)
  const [showMintForm, setShowMintForm] = useState(false)
  const [mintName, setMintName] = useState('')
  const [mintPerms, setMintPerms] = useState<Set<string>>(new Set())
  const [minting, setMinting] = useState(false)
  const [mintError, setMintError] = useState('')

  // ── Session init ──────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ap-session')
      if (!raw) { router.replace('/auth'); return }
      const parsed = JSON.parse(raw) as Session
      if (!parsed?.token) { router.replace('/auth'); return }
      setSession(parsed)
    } catch {
      router.replace('/auth')
    }
  }, [router])

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/status`)
      if (!r.ok) return
      const data = await r.json()
      setStats(data.stats)
    } catch {} finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchApprovals = useCallback(async (token: string) => {
    try {
      const r = await fetch(`${API}/approval/queue?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) return
      const data = await r.json()
      setApprovals(data.items ?? [])
    } catch {} finally {
      setApprovalsLoading(false)
    }
  }, [])

  const fetchLedger = useCallback(async (token: string) => {
    try {
      const r = await fetch(`${API}/ledger/events?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) return
      const data = await r.json()
      setEvents(data.events ?? [])
    } catch {} finally {
      setLedgerLoading(false)
    }
  }, [])

  const fetchPassports = useCallback(async (token: string) => {
    try {
      const r = await fetch(`${API}/passport/list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) return
      const data = await r.json()
      setPassports(data.passports ?? [])
    } catch {} finally {
      setPassportsLoading(false)
    }
  }, [])

  // ── Poll on mount + interval ──────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    const { token } = session

    fetchStats()
    fetchApprovals(token)
    fetchLedger(token)
    fetchPassports(token)

    const t1 = setInterval(fetchStats, 30_000)
    const t2 = setInterval(() => fetchApprovals(token), 15_000)
    const t3 = setInterval(() => fetchLedger(token), 10_000)

    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3) }
  }, [session, fetchStats, fetchApprovals, fetchLedger, fetchPassports])

  // ── Approve / Deny ────────────────────────────────────────────────────────

  async function decide(id: string, decision: 'approve' | 'deny') {
    if (!session || decidingId) return
    setDecidingId(id)
    try {
      const r = await fetch(`${API}/approval/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ id, decision }),
      })
      if (r.ok) {
        setFadingIds(prev => new Set(prev).add(id))
        setTimeout(() => {
          setApprovals(prev => prev.filter(a => a.id !== id))
          setFadingIds(prev => { const n = new Set(prev); n.delete(id); return n })
        }, 400)
        fetchStats()
      }
    } catch {} finally {
      setDecidingId(null)
    }
  }

  // ── Mint Passport ─────────────────────────────────────────────────────────

  async function mintPassport() {
    if (!session || !mintName.trim()) return
    setMinting(true)
    setMintError('')
    try {
      const r = await fetch(`${API}/passport/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ agentName: mintName.trim(), permissions: Array.from(mintPerms) }),
      })
      const data = await r.json()
      if (!r.ok) { setMintError(data?.error ?? 'Mint failed'); return }
      setShowMintForm(false)
      setMintName('')
      setMintPerms(new Set())
      fetchPassports(session.token)
      fetchStats()
    } catch { setMintError('Network error') } finally {
      setMinting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!session) return null

  const showDash = activeNav === 'dashboard'
  const showPassports = activeNav === 'passports'
  const showApprovals = activeNav === 'approvals'
  const showLedger = activeNav === 'ledger'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--panel)',
        borderRight: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Seal />
          <div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 16, color: 'var(--ink)', lineHeight: 1.1 }}>AgentPass</div>
            <div style={{ fontSize: 10, color: 'var(--ink-fade)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Control Tower</div>
          </div>
        </div>

        <nav style={{ padding: '16px 0', flex: 1 }}>
          {(['dashboard', 'passports', 'approvals', 'ledger'] as const).map(k => (
            <NavLink key={k} label={k} active={activeNav === k} onClick={() => setActiveNav(k)} />
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--rule)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 2 }}>{session.name}</div>
          <div style={{ fontSize: 10, color: 'var(--ink-fade)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.email}</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
            {activeNav === 'dashboard' && 'Overview'}
            {activeNav === 'passports' && 'Passports'}
            {activeNav === 'approvals' && 'Approval Queue'}
            {activeNav === 'ledger' && 'Action Ledger'}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--ink-fade)', marginTop: 4 }}>
            {activeNav === 'dashboard' && 'Live trust metrics and pending decisions'}
            {activeNav === 'passports' && 'Manage agent identity certificates'}
            {activeNav === 'approvals' && 'Approve or deny pending agent actions'}
            {activeNav === 'ledger' && 'Immutable audit trail of every decision'}
          </div>
        </div>

        {/* ── KPI Strip ── */}
        {showDash && (
          <AnimatePresence>
            <motion.div
              key="kpi"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}
            >
              {statsLoading ? (
                [0,1,2,3].map(i => (
                  <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--rule-2)', borderRadius: 10, padding: '20px 24px', flex: '1 1 140px', minHeight: 90, opacity: 0.4 }} />
                ))
              ) : stats ? (
                <>
                  <StatCard label="Total Decisions" value={stats.totalDecisions.toLocaleString()} />
                  <StatCard label="Approval Rate" value={`${(stats.approvalRate * 100).toFixed(1)}%`} />
                  <StatCard label="p95 Latency" value={`${stats.avgLatencyMs}ms`} sub="avg response time" />
                  <StatCard label="Open Cases" value={stats.pendingApprovals} sub={`${stats.activePassports} active passports`} />
                </>
              ) : (
                <div style={{ color: 'var(--ink-fade)', fontSize: 13 }}>Failed to load stats</div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Dashboard: two-column panels ── */}
        {showDash && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            {/* Approvals panel */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--rule-2)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Pending Approvals</span>
                <span style={{ fontSize: 11, color: 'var(--ink-fade)' }}>Refreshes 15s</span>
              </div>
              <ApprovalsList approvals={approvals} loading={approvalsLoading} fadingIds={fadingIds} decidingId={decidingId} onDecide={decide} />
            </div>

            {/* Ledger panel */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--rule-2)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Recent Events</span>
                <span style={{ fontSize: 11, color: 'var(--ink-fade)' }}>Refreshes 10s</span>
              </div>
              <LedgerList events={events} loading={ledgerLoading} />
            </div>
          </div>
        )}

        {/* ── Dashboard: passports section ── */}
        {showDash && (
          <PassportSection
            passports={passports}
            loading={passportsLoading}
            showMintForm={showMintForm}
            mintName={mintName}
            mintPerms={mintPerms}
            minting={minting}
            mintError={mintError}
            onToggleMint={() => setShowMintForm(v => !v)}
            onMintNameChange={setMintName}
            onTogglePerm={p => setMintPerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
            onMint={mintPassport}
          />
        )}

        {/* ── Standalone: Approvals page ── */}
        {showApprovals && (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--rule-2)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Pending Approvals</span>
              <span style={{ fontSize: 11, color: 'var(--ink-fade)' }}>Auto-refresh 15s</span>
            </div>
            <ApprovalsList approvals={approvals} loading={approvalsLoading} fadingIds={fadingIds} decidingId={decidingId} onDecide={decide} />
          </div>
        )}

        {/* ── Standalone: Ledger page ── */}
        {showLedger && (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--rule-2)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Action Ledger</span>
              <span style={{ fontSize: 11, color: 'var(--ink-fade)' }}>Auto-refresh 10s</span>
            </div>
            <LedgerList events={events} loading={ledgerLoading} full />
          </div>
        )}

        {/* ── Standalone: Passports page ── */}
        {showPassports && (
          <PassportSection
            passports={passports}
            loading={passportsLoading}
            showMintForm={showMintForm}
            mintName={mintName}
            mintPerms={mintPerms}
            minting={minting}
            mintError={mintError}
            onToggleMint={() => setShowMintForm(v => !v)}
            onMintNameChange={setMintName}
            onTogglePerm={p => setMintPerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
            onMint={mintPassport}
            standalone
          />
        )}

      </main>
    </div>
  )
}

// ─── Approvals List ───────────────────────────────────────────────────────────

function ApprovalsList({
  approvals, loading, fadingIds, decidingId, onDecide,
}: {
  approvals: ApprovalItem[]
  loading: boolean
  fadingIds: Set<string>
  decidingId: string | null
  onDecide: (id: string, decision: 'approve' | 'deny') => void
}) {
  if (loading) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-fade)', fontSize: 13 }}>Loading…</div>
  )
  if (approvals.length === 0) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-fade)', fontSize: 13 }}>No pending approvals</div>
  )

  return (
    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
      <AnimatePresence initial={false}>
        {approvals.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: fadingIds.has(item.id) ? 0 : 1, x: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--rule)',
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{item.agentName}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{item.action} · <span style={{ color: 'var(--ink-mute)' }}>{item.resource}</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: riskColor(item.risk),
                  background: `${riskColor(item.risk)}18`,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: `1px solid ${riskColor(item.risk)}40`,
                }}>{item.risk}</span>
                <span style={{ fontSize: 10, color: 'var(--ink-fade)' }}>{timeAgo(item.requestedAt)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={!!decidingId}
                onClick={() => onDecide(item.id, 'approve')}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  background: decidingId === item.id ? 'var(--evergreen-deep)' : 'transparent',
                  border: '1px solid var(--evergreen)',
                  borderRadius: 6,
                  color: 'var(--evergreen)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: decidingId ? 'not-allowed' : 'pointer',
                  opacity: decidingId && decidingId !== item.id ? 0.4 : 1,
                  transition: 'all 0.15s',
                  letterSpacing: '0.04em',
                }}
              >Approve</button>
              <button
                disabled={!!decidingId}
                onClick={() => onDecide(item.id, 'deny')}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  background: 'transparent',
                  border: '1px solid var(--signal)',
                  borderRadius: 6,
                  color: 'var(--signal)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: decidingId ? 'not-allowed' : 'pointer',
                  opacity: decidingId && decidingId !== item.id ? 0.4 : 1,
                  transition: 'all 0.15s',
                  letterSpacing: '0.04em',
                }}
              >Deny</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Ledger List ──────────────────────────────────────────────────────────────

function LedgerList({ events, loading, full }: { events: LedgerEvent[]; loading: boolean; full?: boolean }) {
  if (loading) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-fade)', fontSize: 13 }}>Loading…</div>
  )
  if (events.length === 0) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-fade)', fontSize: 13 }}>No events recorded</div>
  )

  const list = full ? events : events.slice(0, 8)

  return (
    <div style={{ maxHeight: full ? 'none' : 380, overflowY: full ? 'visible' : 'auto' }}>
      <AnimatePresence initial={false}>
        {list.map(ev => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ padding: '11px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-mute)', width: 60 }}>{fmtTs(ev.ts)}</div>
            <div style={{
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: actionColor(ev.action),
              background: `${actionColor(ev.action)}14`,
              padding: '2px 7px',
              borderRadius: 4,
              minWidth: 70,
              textAlign: 'center',
            }}>{ev.action}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{ev.agentName}</span>
                <span style={{ color: 'var(--ink-fade)' }}> · {ev.resource}</span>
              </div>
            </div>
            <div style={{ flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-fade)', letterSpacing: '0.02em' }}>
              {(ev.hash ?? '').slice(0, 8)}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Passport Section ─────────────────────────────────────────────────────────

function PassportSection({
  passports, loading, showMintForm, mintName, mintPerms, minting, mintError,
  onToggleMint, onMintNameChange, onTogglePerm, onMint, standalone,
}: {
  passports: Passport[]
  loading: boolean
  showMintForm: boolean
  mintName: string
  mintPerms: Set<string>
  minting: boolean
  mintError: string
  onToggleMint: () => void
  onMintNameChange: (v: string) => void
  onTogglePerm: (p: string) => void
  onMint: () => void
  standalone?: boolean
}) {
  return (
    <div style={standalone ? {} : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {!standalone && (
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Passports</div>
        )}
        <button
          onClick={onToggleMint}
          style={{
            marginLeft: 'auto',
            padding: '8px 18px',
            background: showMintForm ? 'transparent' : 'var(--gold)',
            border: '1px solid var(--gold)',
            borderRadius: 7,
            color: showMintForm ? 'var(--gold)' : 'var(--bg)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
        >{showMintForm ? 'Cancel' : 'Mint Passport'}</button>
      </div>

      {/* Mint Form */}
      <AnimatePresence>
        {showMintForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 20 }}
          >
            <div style={{
              background: 'var(--panel)',
              border: '1px solid var(--rule-2)',
              borderRadius: 10,
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 14, letterSpacing: '0.03em' }}>New Agent Passport</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Agent Name</label>
                <input
                  type="text"
                  value={mintName}
                  onChange={e => onMintNameChange(e.target.value)}
                  placeholder="e.g. purchase-agent-v2"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--rule-2)',
                    borderRadius: 6,
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Permissions</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_PERMISSIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => onTogglePerm(p)}
                      style={{
                        padding: '5px 14px',
                        background: mintPerms.has(p) ? 'rgba(212,163,90,0.12)' : 'transparent',
                        border: `1px solid ${mintPerms.has(p) ? 'var(--gold)' : 'var(--rule-2)'}`,
                        borderRadius: 6,
                        color: mintPerms.has(p) ? 'var(--gold)' : 'var(--ink-mute)',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: mintPerms.has(p) ? 600 : 400,
                        transition: 'all 0.12s',
                        letterSpacing: '0.03em',
                      }}
                    >{p}</button>
                  ))}
                </div>
              </div>
              {mintError && <div style={{ fontSize: 12, color: 'var(--signal)', marginBottom: 12 }}>{mintError}</div>}
              <button
                onClick={onMint}
                disabled={minting || !mintName.trim()}
                style={{
                  padding: '9px 24px',
                  background: minting || !mintName.trim() ? 'var(--rule-2)' : 'var(--gold)',
                  border: 'none',
                  borderRadius: 7,
                  color: minting || !mintName.trim() ? 'var(--ink-mute)' : 'var(--bg)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: minting || !mintName.trim() ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                }}
              >{minting ? 'Minting…' : 'Issue Passport'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passport list */}
      {loading ? (
        <div style={{ color: 'var(--ink-fade)', fontSize: 13, padding: '16px 0' }}>Loading passports…</div>
      ) : passports.length === 0 ? (
        <div style={{ color: 'var(--ink-fade)', fontSize: 13, padding: '16px 0' }}>No passports issued yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          <AnimatePresence>
            {passports.map(pp => (
              <motion.div
                key={pp.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--rule-2)',
                  borderRadius: 10,
                  padding: '16px 18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{pp.agentName}</div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: pp.status === 'active' ? 'var(--evergreen)' : 'var(--ink-fade)',
                    background: pp.status === 'active' ? 'rgba(90,125,99,0.15)' : 'var(--rule)',
                    padding: '2px 7px',
                    borderRadius: 4,
                  }}>{pp.status}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {(pp.permissions ?? []).map(p => (
                    <span key={p} style={{
                      fontSize: 10,
                      color: 'var(--ink-mute)',
                      background: 'var(--rule)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      letterSpacing: '0.03em',
                    }}>{p}</span>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-fade)', fontFamily: 'JetBrains Mono, monospace' }}>
                  Expires {pp.expiresAt ? new Date(pp.expiresAt).toLocaleDateString() : '—'}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
