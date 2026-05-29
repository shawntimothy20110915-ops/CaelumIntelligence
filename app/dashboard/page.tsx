'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Session { token: string; email: string; name: string }
interface Passport { id: string; agentName: string; status: string; permissions: string[]; expiresAt: string }

const API = 'https://agentpassv22.vercel.app/api'
const ALL_PERMISSIONS = ['purchase', 'search', 'refund', 'booking', 'transfer']

const navItems = [
  { key: 'dashboard', label: 'Overview', icon: '◈' },
  { key: 'passports', label: 'Passports', icon: '⬡' },
] as const

type NavKey = typeof navItems[number]['key']

export default function Dashboard() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard')
  const [passports, setPassports] = useState<Passport[]>([])
  const [passportsLoading, setPassportsLoading] = useState(true)
  const [showMintForm, setShowMintForm] = useState(false)
  const [mintName, setMintName] = useState('')
  const [mintPerms, setMintPerms] = useState<Set<string>>(new Set())
  const [minting, setMinting] = useState(false)
  const [mintError, setMintError] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ap-session')
      if (!raw) { router.replace('/auth'); return }
      const parsed = JSON.parse(raw) as Session
      if (!parsed?.token) { router.replace('/auth'); return }
      setSession(parsed)
    } catch { router.replace('/auth') }
  }, [router])

  const fetchPassports = useCallback(async (token: string) => {
    try {
      const r = await fetch(`${API}/passport/list`, { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) return
      const data = await r.json()
      setPassports(data.passports ?? [])
    } catch {} finally { setPassportsLoading(false) }
  }, [])

  useEffect(() => {
    if (!session) return
    fetchPassports(session.token)
  }, [session, fetchPassports])

  async function mintPassport() {
    if (!session || !mintName.trim()) return
    setMinting(true); setMintError('')
    try {
      const r = await fetch(`${API}/passport/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ agentName: mintName.trim(), permissions: Array.from(mintPerms) }),
      })
      const data = await r.json()
      if (!r.ok) { setMintError(data?.error ?? 'Mint failed'); return }
      setShowMintForm(false); setMintName(''); setMintPerms(new Set())
      fetchPassports(session.token)
    } catch { setMintError('Network error') } finally { setMinting(false) }
  }

  if (!session) return null

  const showDash = activeNav === 'dashboard'
  const showPassports = activeNav === 'passports'

  const headerMap: Record<NavKey, { title: string; sub: string }> = {
    dashboard: { title: 'Overview', sub: 'Your agent passports' },
    passports: { title: 'Passports', sub: 'Manage agent identity certificates' },
  }

  const activeCount = passports.filter(p => p.status === 'active').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        .dash-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; padding: 9px 12px; color: var(--ink); font-size: 13px; font-family: 'JetBrains Mono', monospace; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; }
        .dash-input:focus { border-color: var(--gold); }
        .dash-btn-gold { padding: 9px 20px; background: var(--gold); border: none; border-radius: 7px; color: #0a0a0d; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: opacity 0.15s; }
        .dash-btn-gold:hover:not(:disabled) { opacity: 0.85; }
        .dash-btn-gold:disabled { opacity: 0.35; cursor: not-allowed; }
        .dash-btn-outline { padding: 9px 20px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; color: rgba(244,236,221,0.5); font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; }
        .dash-btn-outline:hover { border-color: var(--gold); color: var(--gold); }
        .panel { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden; }
        .panel-header { padding: 16px 22px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; }
        .perm-tag { padding: 5px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.12s; letter-spacing: 0.03em; font-family: 'JetBrains Mono', monospace; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 220, flexShrink: 0, background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 32 32" width="26" height="26">
            <polygon points="16,1 29,7 31,16 29,25 16,31 3,25 1,16 3,7" fill="none" stroke="rgba(212,163,90,0.4)" strokeWidth="0.8" />
            <polygon points="16,6 25,10 27,16 25,22 16,26 7,22 5,16 7,10" fill="rgba(212,163,90,0.1)" stroke="var(--gold)" strokeWidth="0.8" />
            <text x="16" y="20.5" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="10" fill="var(--gold)">A</text>
          </svg>
          <div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 16, color: 'var(--ink)', lineHeight: 1.1 }}>AgentPass</div>
            <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Control Tower</div>
          </div>
        </div>

        <nav style={{ padding: '14px 0', flex: 1 }}>
          {navItems.map(item => (
            <motion.button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              whileHover={{ x: 2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 18px', background: activeNav === item.key ? 'rgba(212,163,90,0.08)' : 'transparent', border: 'none', borderLeft: activeNav === item.key ? '2px solid var(--gold)' : '2px solid transparent', color: activeNav === item.key ? 'var(--gold)' : 'rgba(244,236,221,0.4)', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: activeNav === item.key ? 600 : 400, letterSpacing: '0.03em', cursor: 'pointer', transition: 'all 0.15s', borderRadius: '0 6px 6px 0' }}
            >
              <span style={{ fontSize: 12, opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </motion.button>
          ))}
        </nav>

        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 12, color: 'rgba(244,236,221,0.6)', marginBottom: 2, fontWeight: 500 }}>{session.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>{session.email}</div>
          <button
            onClick={() => { localStorage.removeItem('ap-session'); router.push('/auth') }}
            style={{ marginTop: 12, width: '100%', padding: '7px 0', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, color: 'rgba(244,236,221,0.25)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224,92,92,0.4)'; e.currentTarget.style.color = '#e05c5c' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(244,236,221,0.25)' }}
          >Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>
        <motion.div
          key={activeNav}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 32 }}
        >
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 30, fontWeight: 400, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {headerMap[activeNav].title}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.35)' }}>{headerMap[activeNav].sub}</div>
        </motion.div>

        <AnimatePresence mode="wait">
          {showDash && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {/* KPI strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32, maxWidth: 480 }}>
                {passportsLoading ? [0, 1].map(i => (
                  <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '22px 24px', minHeight: 90 }} />
                )) : ([
                  { label: 'Passports', val: passports.length, sub: 'total issued' },
                  { label: 'Active', val: activeCount, sub: 'currently active' },
                ]).map((kpi, i) => (
                  <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,163,90,0.3), transparent)' }} />
                    <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{kpi.label}</div>
                    <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 34, color: 'var(--ink)', lineHeight: 1 }}>{kpi.val}</div>
                    <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.25)', marginTop: 6 }}>{kpi.sub}</div>
                  </motion.div>
                ))}
              </div>

              <PassportSection
                passports={passports} loading={passportsLoading} showMintForm={showMintForm} mintName={mintName}
                mintPerms={mintPerms} minting={minting} mintError={mintError}
                onToggleMint={() => setShowMintForm(v => !v)} onMintNameChange={setMintName}
                onTogglePerm={p => setMintPerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
                onMint={mintPassport}
              />
            </motion.div>
          )}

          {showPassports && (
            <motion.div key="passports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <PassportSection
                passports={passports} loading={passportsLoading} showMintForm={showMintForm} mintName={mintName}
                mintPerms={mintPerms} minting={minting} mintError={mintError}
                onToggleMint={() => setShowMintForm(v => !v)} onMintNameChange={setMintName}
                onTogglePerm={p => setMintPerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
                onMint={mintPassport} standalone
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function PassportSection({ passports, loading, showMintForm, mintName, mintPerms, minting, mintError, onToggleMint, onMintNameChange, onTogglePerm, onMint, standalone }: {
  passports: Passport[]; loading: boolean; showMintForm: boolean; mintName: string; mintPerms: Set<string>; minting: boolean; mintError: string;
  onToggleMint: () => void; onMintNameChange: (v: string) => void; onTogglePerm: (p: string) => void; onMint: () => void; standalone?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {!standalone && <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(244,236,221,0.45)' }}>Passports</div>}
        <button onClick={onToggleMint} className={showMintForm ? 'dash-btn-outline' : 'dash-btn-gold'} style={{ marginLeft: 'auto' }}>
          {showMintForm ? 'Cancel' : '+ Mint Passport'}
        </button>
      </div>

      <AnimatePresence>
        {showMintForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 20 }}>
            <div className="panel" style={{ padding: '22px 26px' }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 18, fontFamily: 'Instrument Serif, serif', fontSize: 20 }}>New Agent Passport</div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Agent Name</label>
                <input type="text" value={mintName} onChange={e => onMintNameChange(e.target.value)} placeholder="e.g. purchase-agent-v2" className="dash-input" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>Permissions</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} onClick={() => onTogglePerm(p)} className="perm-tag"
                      style={{ background: mintPerms.has(p) ? 'rgba(212,163,90,0.1)' : 'transparent', border: `1px solid ${mintPerms.has(p) ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`, color: mintPerms.has(p) ? 'var(--gold)' : 'rgba(244,236,221,0.4)', fontWeight: mintPerms.has(p) ? 600 : 400 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {mintError && <div style={{ fontSize: 12, color: '#e05c5c', marginBottom: 14, fontFamily: 'JetBrains Mono, monospace' }}>✗ {mintError}</div>}
              <button onClick={onMint} disabled={minting || !mintName.trim()} className="dash-btn-gold">
                {minting ? 'Minting…' : 'Issue Passport'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ color: 'rgba(244,236,221,0.25)', fontSize: 12, padding: '16px 0', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>LOADING…</div>
      ) : passports.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.15em', marginBottom: 8 }}>NO PASSPORTS YET</div>
          <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>Mint your first passport to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          <AnimatePresence>
            {passports.map((pp, i) => (
              <motion.div key={pp.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: i * 0.04 }}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,163,90,0.2), transparent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{pp.agentName}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: pp.status === 'active' ? '#5a9f6a' : 'rgba(244,236,221,0.3)', background: pp.status === 'active' ? 'rgba(90,159,106,0.12)' : 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>{pp.status}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                  {(pp.permissions ?? []).map(p => (
                    <span key={p} style={{ fontSize: 10, color: 'rgba(244,236,221,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>{p}</span>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
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
