'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useScroll, useTransform, animate } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'
import { APP_VERSION } from '@/lib/version'

// ── types ────────────────────────────────────────────────────────────────────
type Passport = { id: string; agentId: string; label: string; status: string; expiresAt: number | null; ownerUserId?: string }
type Activity = { id: string; passportId: string; agentLabel: string; type: string; message?: string; amount?: number; merchant?: string; decision?: string; ts: number }
type Receipt = { id: string; receiptNumber?: number; passportId: string; agentId: string; action: string; merchant?: string; amount?: number; decision: string; issuedAt: number }
type Billing = { passportId: string; plan: string; credits: number; spendUsd: number; budgetUsd: number | null; evalsUsed: number }
type Score = { agentId: string; score: number; approvals: number; denials: number; disputes: number; bondUsd?: number; badges: string[]; ageDays: number }
type QueueItem = { id: string; passportId: string; agentLabel: string; action: string; merchant?: string; amount?: number; queuedAt: number; status: string }

const C = brand.colors
const F = brand.font

// ── helpers ──────────────────────────────────────────────────────────────────
function glyph(decision?: string): string {
  const d = (decision ?? '').toLowerCase()
  if (d.includes('appro') || d.includes('complet')) return '✓'
  if (d.includes('den') || d.includes('declin') || d.includes('reject')) return '✗'
  if (d.includes('review') || d.includes('pending')) return '⏸'
  return '⏸'
}
function age(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString()

// ── count-up ─────────────────────────────────────────────────────────────────
function CountUp({ to, decimals = 0, prefix = '', suffix = '' }: { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const mv = useMotionValue(0)
  const [txt, setTxt] = useState('0')
  useEffect(() => {
    const c = animate(mv, to, { duration: 0.9, ease: 'easeOut', onUpdate: v => setTxt(v.toFixed(decimals)) })
    return () => c.stop()
  }, [to, decimals, mv])
  return <>{prefix}{txt}{suffix}</>
}

// ── trust arc ────────────────────────────────────────────────────────────────
function Arc({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const off = circ * (1 - Math.min(score, 1000) / 1000)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,244,239,0.08)" strokeWidth={5} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.text} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: off }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}

// ── empty state ───────────────────────────────────────────────────────────────
function Empty({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: C.muted }}>
      <motion.span animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ width: 6, height: 6, borderRadius: 999, background: C.muted, display: 'inline-block' }} />
      <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

// ── live dot ─────────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 7, height: 7 }}>
      <motion.span animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ position: 'absolute', inset: 0, borderRadius: 999, background: C.text, display: 'block' }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: C.text, display: 'block' }} />
    </span>
  )
}

const sl: React.CSSProperties = { fontFamily: F.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }
const panel: React.CSSProperties = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }
const divider: React.CSSProperties = { borderBottom: `1px solid ${C.border}` }

// ── scroll-linked panel entrance: eases in as it crosses into view,
// tracks scroll continuously rather than a one-shot threshold trigger. ─────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.7'] })
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const y = useTransform(scrollYProgress, [0, 1], [16, 0])
  return <motion.div ref={ref} style={{ ...panel, ...style, opacity, y }}>{children}</motion.div>
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email: string; plan: string } | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [passports, setPassports] = useState<Passport[]>([])
  const [ownPassports, setOwnPassports] = useState<Passport[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [billing, setBilling] = useState<Record<string, Billing>>({})
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [deciding, setDeciding] = useState<string | null>(null)
  const [mintLabel, setMintLabel] = useState('')
  const [minting, setMinting] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  async function decide(queueId: string, decision: 'approved' | 'denied') {
    setDeciding(queueId)
    try {
      const res = await fetch('/api/approval/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId, decision }),
      })
      if (res.ok) setQueue(q => q.filter(item => item.id !== queueId))
    } finally {
      setDeciding(null)
    }
  }

  async function mint() {
    if (!mintLabel.trim()) return
    setMinting(true)
    try {
      const res = await fetch('/api/passport/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: mintLabel.trim() }),
      })
      if (res.ok) {
        const d = await res.json()
        setOwnPassports(p => [d.passport, ...p])
        setPassports(p => [d.passport, ...p])
        setMintLabel('')
      }
    } finally {
      setMinting(false)
    }
  }

  useEffect(() => {
    fetch('/api/auth/me').then(x => x.json()).then(d => {
      if (!d.user) { router.push('/auth'); return }
      setUser(d.user)
    }).catch(() => router.push('/auth'))
  }, [router])

  useEffect(() => {
    if (!user) return
    let alive = true
    const tick = async () => {
      const [pub, own, a, r, t, q] = await Promise.all([
        fetch('/api/passport/mint').then(x => x.json()).catch(() => ({})),
        fetch('/api/account/passports').then(x => x.json()).catch(() => ({})),
        fetch('/api/activity?limit=30').then(x => x.json()).catch(() => ({})),
        fetch('/api/receipt?limit=25').then(x => x.json()).catch(() => ({})),
        fetch('/api/trust-score').then(x => x.json()).catch(() => ({})),
        fetch('/api/approval/queue').then(x => x.json()).catch(() => ({})),
      ])
      if (!alive) return
      const pubPs: Passport[] = pub.passports ?? []
      const ownPs: Passport[] = own.passports ?? []
      // Merge: own passports first, then public demo passports not already in own
      const ownIds = new Set(ownPs.map(p => p.id))
      const allPs = [...ownPs, ...pubPs.filter(p => !ownIds.has(p.id))]
      setPassports(allPs)
      setOwnPassports(ownPs)
      setActivity(a.activity ?? [])
      setReceipts(r.receipts ?? [])
      setScores(t.scores ?? [])
      setQueue(q.queue ?? [])

      // Billing for all passports (own first, they pass auth; pub passports are open)
      const entries = await Promise.all(allPs.slice(0, 12).map(async pp => {
        const b = await fetch(`/api/billing/report?passportId=${pp.id}`).then(x => x.json()).catch(() => null)
        if (!b || !b.passportId) return null
        const mapped: Billing = {
          passportId: b.passportId,
          plan: b.plan,
          credits: b.credits?.balance ?? 0,
          evalsUsed: b.usage?.evalsUsed ?? 0,
          spendUsd: b.spend?.totalUsd ?? 0,
          budgetUsd: b.spend?.budgetUsd ?? null,
        }
        return [pp.id, mapped] as const
      }))
      if (!alive) return
      setBilling(Object.fromEntries(entries.filter(Boolean) as [string, Billing][]))
    }
    tick()
    timer.current = setInterval(tick, 3000)
    return () => { alive = false; if (timer.current) clearInterval(timer.current) }
  }, [user])

  // derived stats
  const decided = activity.filter(a => a.decision)
  const approvals = decided.filter(a => glyph(a.decision) === '✓').length
  const denials = decided.filter(a => glyph(a.decision) === '✗').length
  const approvalRate = decided.length ? Math.round((approvals / decided.length) * 100) : 0
  const evalsToday = activity.filter(a => a.decision && isToday(a.ts)).length
  const totalSpend = Object.values(billing).reduce((s, b) => s + (b.spendUsd ?? 0), 0)
  const totalCredits = Object.values(billing).reduce((s, b) => s + (b.credits ?? 0), 0)
  const feed = decided.slice(0, 20)
  const pendingQueue = queue.filter(q => q.status === 'pending')
  const labelFor = (agentId: string) => passports.find(p => p.agentId === agentId)?.label ?? agentId

  return (
    <BrandFrame title="Dashboard" subtitle="Live view across all agents — evals, spend, receipts, trust" accent={C.text} particleCount={40}>

      {/* ── Top bar: live indicator + user menu ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LiveDot />
          <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted }}>Live · 3s</span>
          <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.2em', color: C.muted, opacity: 0.5 }}>v{APP_VERSION}</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input value={mintLabel} onChange={e => setMintLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') mint() }}
              placeholder="New agent label"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 20, padding: '8px 14px', fontFamily: F.mono, fontSize: 11, color: C.text, outline: 'none', width: 160 }} />
            <button onClick={mint} disabled={minting || !mintLabel.trim()}
              style={{ background: 'rgba(244,244,239,0.1)', border: `1px solid ${C.border}`, borderRadius: 20, padding: '8px 16px', fontFamily: F.mono, fontSize: 11, color: C.text, cursor: minting || !mintLabel.trim() ? 'default' : 'pointer', opacity: minting || !mintLabel.trim() ? 0.5 : 1 }}>
              {minting ? 'Minting…' : 'Mint passport'}
            </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 20, padding: '8px 16px', fontFamily: F.mono, fontSize: 11, color: C.muted, cursor: 'pointer', transition: 'border-color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = C.text)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
              {user.email} · {user.plan} ▼
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, minWidth: 200, zIndex: 1000, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', ...divider, fontFamily: F.mono, fontSize: 11, color: C.subdued }}>
                  {ownPassports.length} passport{ownPassports.length !== 1 ? 's' : ''} · {user.plan}
                </div>
                <button onClick={logout}
                  style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', textAlign: 'left', fontFamily: F.mono, fontSize: 11, color: C.muted, cursor: 'pointer', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                  Log out →
                </button>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Zone 1 · stat bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { k: 'Passports', v: <CountUp to={passports.length} /> },
            { k: 'Evals Today', v: <CountUp to={evalsToday} /> },
            { k: 'Approval Rate', v: <CountUp to={approvalRate} suffix="%" /> },
            { k: 'Pending Review', v: <CountUp to={pendingQueue.length} /> },
            { k: 'Total Spend', v: <CountUp to={totalSpend} decimals={2} prefix="$" /> },
            { k: 'Credits', v: <CountUp to={totalCredits} /> },
          ].map(s => (
            <div key={s.k} style={{ ...panel, padding: '16px 18px' }}>
              <div style={{ fontFamily: F.serif, fontSize: 30, lineHeight: 1, color: C.text, letterSpacing: '-0.02em' }}>{s.v}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginTop: 9 }}>{s.k}</div>
            </div>
          ))}
        </div>

        {/* ── Zone 2 · eval feed | budget ── */}
        <div className="dash-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: 16 }}>

          {/* eval feed */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={sl}>Live evals</span>
              {feed.length > 0 && (
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.muted, marginLeft: 'auto' }}>
                  {approvals}✓ · {denials}✗
                </span>
              )}
            </div>
            {feed.length === 0 ? <Empty label="awaiting evals" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 340, overflowY: 'auto' }}>
                <AnimatePresence initial={false}>
                  {feed.map(a => {
                    const g = glyph(a.decision)
                    return (
                      <motion.div key={a.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        style={{ display: 'grid', gridTemplateColumns: '3px 1fr auto auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ width: 3, height: 24, background: C.text, opacity: g === '✓' ? 0.9 : g === '✗' ? 0.3 : 0.55, borderRadius: 2, flexShrink: 0 }} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontFamily: F.sans, fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.agentLabel}</span>
                          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.muted }}>{a.merchant ?? a.type}{a.amount != null ? ` · $${a.amount}` : ''}</span>
                        </span>
                        <span title={a.decision ?? ''} style={{ fontFamily: F.mono, fontSize: 14, color: C.text, opacity: g === '✗' ? 0.45 : 1 }}>{g}</span>
                        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, width: 32, textAlign: 'right' }}>{age(a.ts)}</span>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </Panel>

          {/* budget bars */}
          <Panel>
            <div style={sl}>Budget per agent</div>
            {passports.length === 0 ? <Empty label="no agents yet" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {passports.slice(0, 8).map(p => {
                  const b = billing[p.id]
                  const hasB = !!(b && b.budgetUsd && b.budgetUsd > 0)
                  const pct = hasB ? Math.min(100, (b.spendUsd / b.budgetUsd!) * 100) : 0
                  const hot = pct > 80
                  return (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.subdued, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>{p.label}</span>
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: hasB ? (hot ? C.text : C.subdued) : C.muted, flexShrink: 0 }}>
                          {hasB ? `$${b.spendUsd.toFixed(0)} / $${b.budgetUsd}` : b ? `${b.credits} cr` : '—'}
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(244,244,239,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                        <motion.div
                          animate={hot ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
                          transition={hot ? { duration: 1.4, repeat: Infinity } : { duration: 0.3 }}
                          style={{ height: '100%', width: `${hasB ? pct : (b ? 100 : 0)}%`, background: C.text, opacity: hasB ? 1 : 0.15, borderRadius: 3 }} />
                      </div>
                      {b && (
                        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.muted, marginTop: 4, letterSpacing: '0.12em' }}>
                          {b.plan.toUpperCase()} · {b.evalsUsed} evals
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Zone 3 · approval queue ── */}
        {(queue.length > 0 || pendingQueue.length > 0) && (
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={sl}>Approval queue</span>
              {pendingQueue.length > 0 && (
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }}
                  style={{ fontFamily: F.mono, fontSize: 9, color: C.text, background: 'rgba(244,244,239,0.12)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.12em' }}>
                  {pendingQueue.length} PENDING
                </motion.span>
              )}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 60px 160px', gap: 12, padding: '0 4px 10px', color: C.muted, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', ...divider }}>
                <span>Agent · Action</span><span>Merchant</span><span style={{ textAlign: 'right' }}>Amount</span><span style={{ textAlign: 'right' }}>Age</span><span></span>
              </div>
              <AnimatePresence initial={false}>
                {queue.slice(0, 8).map(q => (
                  <motion.div key={q.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, padding: 0, marginBottom: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 60px 160px', gap: 12, alignItems: 'center', padding: '10px 4px', borderBottom: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.agentLabel}</span>
                      <span style={{ color: C.muted, fontSize: 10 }}>{q.action}</span>
                    </span>
                    <span style={{ color: C.subdued, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.merchant ?? '—'}</span>
                    <span style={{ textAlign: 'right', color: C.text }}>{q.amount != null ? `$${q.amount}` : '—'}</span>
                    <span style={{ textAlign: 'right', color: C.muted }}>{age(q.queuedAt)}</span>
                    <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => decide(q.id, 'approved')} disabled={deciding === q.id}
                        style={{ background: 'rgba(244,244,239,0.1)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', fontFamily: F.mono, fontSize: 10, color: C.text, cursor: deciding === q.id ? 'default' : 'pointer', opacity: deciding === q.id ? 0.5 : 1 }}>
                        Approve
                      </button>
                      <button onClick={() => decide(q.id, 'denied')} disabled={deciding === q.id}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', fontFamily: F.mono, fontSize: 10, color: C.muted, cursor: deciding === q.id ? 'default' : 'pointer', opacity: deciding === q.id ? 0.5 : 1 }}>
                        Deny
                      </button>
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Panel>
        )}

        {/* ── Zone 4 · trust grid ── */}
        <Panel>
          <div style={sl}>Trust scores</div>
          {scores.length === 0 ? <Empty label="no scores yet" /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              {scores.slice(0, 12).map(s => (
                <div key={s.agentId} style={{ background: 'rgba(244,244,239,0.02)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 14px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
                    <Arc score={s.score} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.serif, fontSize: 26, color: C.text }}>
                      <CountUp to={s.score} />
                    </div>
                  </div>
                  <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text, marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{labelFor(s.agentId)}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.muted, marginTop: 4, letterSpacing: '0.1em' }}>
                    {s.approvals}✓ {s.denials}✗ {s.disputes > 0 ? `${s.disputes}⚠` : ''}
                  </div>
                  {s.ageDays > 0 && (
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.muted, marginTop: 3, opacity: 0.6 }}>{s.ageDays}d old</div>
                  )}
                  {(s.badges ?? []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                      {s.badges.slice(0, 6).map((b, i) => (
                        <span key={i} title={b} style={{ fontFamily: F.mono, fontSize: 8, color: C.muted, background: 'rgba(244,244,239,0.08)', borderRadius: 3, padding: '1px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Zone 5 · receipts table ── */}
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={sl}>Recent receipts</span>
            {receipts.length > 0 && (
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.muted }}>{receipts.length} total</span>
            )}
          </div>
          {receipts.length === 0 ? <Empty label="no receipts yet" /> : (
            <div style={{ fontFamily: F.mono, fontSize: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 120px 80px 54px', gap: 12, padding: '0 4px 10px', color: C.muted, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', ...divider }}>
                <span>·</span><span>Action · Agent</span><span>Merchant</span><span style={{ textAlign: 'right' }}>Amount</span><span style={{ textAlign: 'right' }}>Age</span>
              </div>
              <AnimatePresence initial={false}>
                {receipts.slice(0, 12).map(r => (
                  <motion.div key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: '32px 1fr 120px 80px 54px', gap: 12, alignItems: 'center', padding: '10px 4px', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ textAlign: 'center', fontSize: 13, opacity: glyph(r.decision) === '✗' ? 0.4 : 0.9 }}>{glyph(r.decision)}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.action}</span>
                      <span style={{ color: C.muted, fontSize: 10 }}>{labelFor(r.agentId)}</span>
                    </span>
                    <span style={{ color: C.subdued, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.merchant ?? '—'}</span>
                    <span style={{ textAlign: 'right', color: C.text }}>{r.amount != null ? `$${r.amount}` : '—'}</span>
                    <span style={{ textAlign: 'right', color: C.muted }}>{age(r.issuedAt)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Panel>
      </div>

      <style>{`
        @media (max-width: 860px) { .dash-split { grid-template-columns: 1fr !important; } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(244,244,239,0.12); border-radius: 2px; }
      `}</style>
    </BrandFrame>
  )
}
