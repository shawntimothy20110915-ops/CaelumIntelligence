'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Session { token: string; email: string; name: string }
interface Passport { id: string; agentName: string; status: string; permissions: string[]; expiresAt: string }
interface DelegationLink { childId: string; parentId: string; ttl: string; createdAt: string }
interface Agent { id: string; name: string; description: string; model: string; capabilities: string[]; passportId: string; status: string; createdAt: string }
interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string }
interface ActivityEntry { id: string; action: string; detail: string; ts: string }

const API = '/api'
const ALL_PERMISSIONS = ['purchase', 'search', 'refund', 'booking', 'transfer']
const ALL_MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'gpt-4o', 'gpt-4o-mini', 'gemini-2.0-flash']
const TTL_OPTIONS = [
  { label: '15 minutes', value: '15m' },
  { label: '1 hour',     value: '1h'  },
  { label: '6 hours',    value: '6h'  },
  { label: '24 hours',   value: '24h' },
  { label: '7 days',     value: '7d'  },
]

function loadDelegations(): DelegationLink[] {
  try { return JSON.parse(localStorage.getItem('ap-delegations') ?? '[]') } catch { return [] }
}
function saveDelegations(links: DelegationLink[]) {
  localStorage.setItem('ap-delegations', JSON.stringify(links))
}
function loadAgents(): Agent[] {
  try { return JSON.parse(localStorage.getItem('ap-agents') ?? '[]') } catch { return [] }
}
function saveAgents(agents: Agent[]) {
  localStorage.setItem('ap-agents', JSON.stringify(agents))
}
function loadActivity(): ActivityEntry[] {
  try { return JSON.parse(localStorage.getItem('ap-activity') ?? '[]') } catch { return [] }
}
function saveActivity(entries: ActivityEntry[]) {
  localStorage.setItem('ap-activity', JSON.stringify(entries))
}

const navItems = [
  { key: 'dashboard',    label: 'Overview',     icon: '◈'   },
  { key: 'passports',    label: 'Passports',    icon: '⬡'   },
  { key: 'agents',       label: 'Agents',       icon: '⚙'   },
  { key: 'chains',       label: 'Trust Chains', icon: '⛓'   },
  { key: 'activity',     label: 'Activity',     icon: '≋'   },
  { key: 'integration',  label: 'Integrate',    icon: '</>'  },
] as const

type NavKey = typeof navItems[number]['key']

export default function Dashboard() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard')
  const [passports, setPassports] = useState<Passport[]>([])
  const [passportsLoading, setPassportsLoading] = useState(true)
  const [delegations, setDelegations] = useState<DelegationLink[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  // mint form
  const [showMintForm, setShowMintForm] = useState(false)
  const [mintName, setMintName] = useState('')
  const [mintPerms, setMintPerms] = useState<Set<string>>(new Set())
  const [minting, setMinting] = useState(false)
  const [mintError, setMintError] = useState('')
  // reveal-once API key — never persisted
  const [revealedKey, setRevealedKey] = useState<{ passportName: string; passportId: string; apiKey: string } | null>(null)

  // delegate form
  const [delegateTarget, setDelegateTarget] = useState<Passport | null>(null)
  const [delegateName, setDelegateName] = useState('')
  const [delegatePerms, setDelegatePerms] = useState<Set<string>>(new Set())
  const [delegateTtl, setDelegateTtl] = useState('1h')
  const [delegating, setDelegating] = useState(false)
  const [delegateError, setDelegateError] = useState('')

  // inspector
  const [inspecting, setInspecting] = useState<Passport | null>(null)

  // search + filter
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all')

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  // agent builder
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [agentDesc, setAgentDesc] = useState('')
  const [agentModel, setAgentModel] = useState(ALL_MODELS[0])
  const [agentCaps, setAgentCaps] = useState<Set<string>>(new Set())
  const [agentBuilding, setAgentBuilding] = useState(false)
  const [agentError, setAgentError] = useState('')

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `t${++toastIdRef.current}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  const logActivity = useCallback((action: string, detail: string) => {
    const entry: ActivityEntry = { id: `a${Date.now()}`, action, detail, ts: new Date().toISOString() }
    setActivity(prev => {
      const updated = [entry, ...prev].slice(0, 200)
      saveActivity(updated)
      return updated
    })
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ap-session')
      if (!raw) { router.replace('/auth'); return }
      const parsed = JSON.parse(raw) as Session
      if (!parsed?.token) { router.replace('/auth'); return }
      setSession(parsed)
      setDelegations(loadDelegations())
      setAgents(loadAgents())
      setActivity(loadActivity())
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
      const apiKey = data.passportToken ?? data.apiKey ?? data.token ?? data.secret ?? null
      const passportId = data.passport?.id ?? data.id ?? ''
      setShowMintForm(false); setMintName(''); setMintPerms(new Set())
      if (apiKey) setRevealedKey({ passportName: mintName.trim(), passportId, apiKey })
      addToast(`Passport "${mintName.trim()}" minted`)
      logActivity('passport.minted', `"${mintName.trim()}" — ${Array.from(mintPerms).join(', ') || 'no permissions'}`)
      fetchPassports(session.token)
    } catch { setMintError('Network error') } finally { setMinting(false) }
  }

  async function revokePassport(pp: Passport) {
    if (!session) return
    try {
      await fetch(`${API}/passport/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ passportId: pp.id }),
      })
      // Optimistically update — backend may or may not have this endpoint
      setPassports(prev => prev.map(p => p.id === pp.id ? { ...p, status: 'revoked' } : p))
      if (inspecting?.id === pp.id) setInspecting(prev => prev ? { ...prev, status: 'revoked' } : null)
      addToast(`"${pp.agentName}" revoked`, 'info')
      logActivity('passport.revoked', `"${pp.agentName}" id=${pp.id}`)
    } catch {
      addToast('Revoke failed — network error', 'error')
    }
  }

  async function delegatePassport() {
    if (!session || !delegateTarget || !delegateName.trim()) return
    setDelegating(true); setDelegateError('')
    try {
      const r = await fetch(`${API}/passport/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          agentName: delegateName.trim(),
          permissions: Array.from(delegatePerms),
          metadata: { parentPassportId: delegateTarget.id, ttl: delegateTtl, derived: true },
        }),
      })
      const data = await r.json()
      if (!r.ok) { setDelegateError(data?.error ?? 'Delegation failed'); return }
      const newLink: DelegationLink = {
        childId: data.passport?.id ?? data.id ?? `derived-${Date.now()}`,
        parentId: delegateTarget.id,
        ttl: delegateTtl,
        createdAt: new Date().toISOString(),
      }
      const updated = [...delegations, newLink]
      setDelegations(updated)
      saveDelegations(updated)
      addToast(`Delegation issued to "${delegateName.trim()}"`)
      logActivity('passport.delegated', `"${delegateName.trim()}" derived from "${delegateTarget.agentName}" ttl=${delegateTtl}`)
      setDelegateTarget(null); setDelegateName(''); setDelegatePerms(new Set()); setDelegateTtl('1h')
      fetchPassports(session.token)
    } catch { setDelegateError('Network error') } finally { setDelegating(false) }
  }

  async function buildAgent() {
    if (!session || !agentName.trim()) return
    setAgentBuilding(true); setAgentError('')
    try {
      // Mint a passport for this agent automatically
      const r = await fetch(`${API}/passport/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          agentName: agentName.trim(),
          permissions: Array.from(agentCaps),
          metadata: { description: agentDesc, model: agentModel, agentBuilderCreated: true },
        }),
      })
      const data = await r.json()
      if (!r.ok) { setAgentError(data?.error ?? 'Failed to issue passport for agent'); return }

      const passportId = data.passport?.id ?? data.id ?? `pp_${Date.now()}`
      const apiKey = data.passportToken ?? data.apiKey ?? data.token ?? data.secret ?? null

      const newAgent: Agent = {
        id: `ag_${Date.now()}`,
        name: agentName.trim(),
        description: agentDesc.trim(),
        model: agentModel,
        capabilities: Array.from(agentCaps),
        passportId,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      const updatedAgents = [newAgent, ...agents]
      setAgents(updatedAgents)
      saveAgents(updatedAgents)

      if (apiKey) setRevealedKey({ passportName: agentName.trim(), passportId, apiKey })
      addToast(`Agent "${agentName.trim()}" created`)
      logActivity('agent.created', `"${agentName.trim()}" model=${agentModel} passportId=${passportId}`)

      setShowAgentForm(false); setAgentName(''); setAgentDesc(''); setAgentModel(ALL_MODELS[0]); setAgentCaps(new Set())
      fetchPassports(session.token)
    } catch { setAgentError('Network error') } finally { setAgentBuilding(false) }
  }

  // ⚡ Bolt: memoize filtering to prevent recalculation on unrelated state changes
  const activeCount = useMemo(() => passports.filter(p => p.status === 'active').length, [passports])
  const chainCount  = delegations.length

  const filteredPassports = useMemo(() => {
    // ⚡ Bolt: lift string allocation out of the loop
    const searchLower = (search || '').toLowerCase()
    return passports.filter(pp => {
      const matchSearch = !searchLower || pp.agentName.toLowerCase().includes(searchLower) || pp.id.toLowerCase().includes(searchLower)
      const matchStatus = statusFilter === 'all' || pp.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [passports, search, statusFilter])

  if (!session) return null

  const headerMap: Record<NavKey, { title: string; sub: string }> = {
    dashboard:   { title: 'Overview',      sub: 'Your agent passports'                    },
    passports:   { title: 'Passports',     sub: 'Manage agent identity certificates'      },
    agents:      { title: 'Agents',        sub: 'Build and manage your AI agents'         },
    chains:      { title: 'Trust Chains',  sub: 'Delegation graph — who authorized what'  },
    activity:    { title: 'Activity Log',  sub: 'Reverse-chronological action history'    },
    integration: { title: 'Integrate',     sub: 'SDK, CLI, GitHub Actions, Webhooks'      },
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        .dash-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; padding: 9px 12px; color: var(--ink); font-size: 13px; font-family: 'JetBrains Mono', monospace; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; }
        .dash-input:focus { border-color: var(--gold); }
        .dash-select { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; padding: 9px 12px; color: var(--ink); font-size: 13px; font-family: 'JetBrains Mono', monospace; outline: none; width: 100%; box-sizing: border-box; appearance: none; cursor: pointer; }
        .dash-select:focus { border-color: var(--gold); }
        .dash-btn-gold { padding: 9px 20px; background: var(--gold); border: none; border-radius: 7px; color: #0a0a0d; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: opacity 0.15s; font-family: 'JetBrains Mono', monospace; }
        .dash-btn-gold:hover:not(:disabled) { opacity: 0.85; }
        .dash-btn-gold:disabled { opacity: 0.35; cursor: not-allowed; }
        .dash-btn-outline { padding: 9px 20px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; color: rgba(244,236,221,0.5); font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; font-family: 'JetBrains Mono', monospace; }
        .dash-btn-outline:hover { border-color: var(--gold); color: var(--gold); }
        .dash-btn-danger { padding: 7px 14px; background: transparent; border: 1px solid rgba(224,92,92,0.25); border-radius: 6px; color: rgba(224,92,92,0.6); font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; font-family: 'JetBrains Mono', monospace; }
        .dash-btn-danger:hover { border-color: #e05c5c; color: #e05c5c; background: rgba(224,92,92,0.06); }
        .panel { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden; }
        .panel-header { padding: 16px 22px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; }
        .perm-tag { padding: 5px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.12s; letter-spacing: 0.03em; font-family: 'JetBrains Mono', monospace; }
        .perm-tag:disabled { opacity: 0.25; cursor: not-allowed; }
        .chain-line { position: absolute; left: 16px; top: 0; bottom: 0; width: 1px; background: linear-gradient(to bottom, rgba(212,163,90,0.3), rgba(212,163,90,0.05)); }
        .chain-dot { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid var(--gold); background: rgba(212,163,90,0.15); }
        .pp-card { cursor: pointer; transition: border-color 0.15s, transform 0.15s; }
        .pp-card:hover { border-color: rgba(212,163,90,0.35) !important; transform: translateY(-1px); }
        .filter-btn { padding: 5px 14px; border-radius: 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: transparent; transition: all 0.12s; }
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
            <motion.button key={item.key} onClick={() => setActiveNav(item.key)} whileHover={{ x: 2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 18px', background: activeNav === item.key ? 'rgba(212,163,90,0.08)' : 'transparent', border: 'none', borderLeft: activeNav === item.key ? '2px solid var(--gold)' : '2px solid transparent', color: activeNav === item.key ? 'var(--gold)' : 'rgba(244,236,221,0.4)', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: activeNav === item.key ? 600 : 400, letterSpacing: '0.03em', cursor: 'pointer', transition: 'all 0.15s', borderRadius: '0 6px 6px 0' }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{item.icon}</span>
              {item.label}
              {item.key === 'chains' && chainCount > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(212,163,90,0.15)', color: 'var(--gold)', padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono, monospace' }}>{chainCount}</span>
              )}
              {item.key === 'agents' && agents.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(212,163,90,0.15)', color: 'var(--gold)', padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono, monospace' }}>{agents.length}</span>
              )}
              {item.key === 'activity' && activity.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(212,163,90,0.15)', color: 'var(--gold)', padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono, monospace' }}>{activity.length}</span>
              )}
            </motion.button>
          ))}
        </nav>

        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 12, color: 'rgba(244,236,221,0.6)', marginBottom: 2, fontWeight: 500 }}>{session.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>{session.email}</div>
          <button onClick={() => { localStorage.removeItem('ap-session'); router.push('/auth') }}
            style={{ marginTop: 12, width: '100%', padding: '7px 0', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, color: 'rgba(244,236,221,0.25)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224,92,92,0.4)'; e.currentTarget.style.color = '#e05c5c' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(244,236,221,0.25)' }}
          >Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>
        <motion.div key={activeNav} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 30, fontWeight: 400, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {headerMap[activeNav].title}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.35)' }}>{headerMap[activeNav].sub}</div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Overview ─────────────────────────── */}
          {activeNav === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32, maxWidth: 600 }}>
                {passportsLoading ? [0,1,2].map(i => (
                  <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '22px 24px', minHeight: 90 }} />
                )) : ([
                  { label: 'Passports',    val: passports.length, sub: 'total issued'       },
                  { label: 'Active',       val: activeCount,       sub: 'currently active'  },
                  { label: 'Agents',       val: agents.length,     sub: 'built by you'      },
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
                passports={filteredPassports} delegations={delegations} loading={passportsLoading}
                showMintForm={showMintForm} mintName={mintName} mintPerms={mintPerms} minting={minting} mintError={mintError}
                search={search} statusFilter={statusFilter}
                onSearchChange={setSearch} onStatusFilter={setStatusFilter}
                onToggleMint={() => setShowMintForm(v => !v)} onMintNameChange={setMintName}
                onTogglePerm={p => setMintPerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
                onMint={mintPassport} onDelegate={setDelegateTarget}
                onRevoke={revokePassport} onInspect={setInspecting}
              />
            </motion.div>
          )}

          {/* ── Passports ────────────────────────── */}
          {activeNav === 'passports' && (
            <motion.div key="passports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <PassportSection
                passports={filteredPassports} delegations={delegations} loading={passportsLoading}
                showMintForm={showMintForm} mintName={mintName} mintPerms={mintPerms} minting={minting} mintError={mintError}
                search={search} statusFilter={statusFilter}
                onSearchChange={setSearch} onStatusFilter={setStatusFilter}
                onToggleMint={() => setShowMintForm(v => !v)} onMintNameChange={setMintName}
                onTogglePerm={p => setMintPerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
                onMint={mintPassport} onDelegate={setDelegateTarget}
                onRevoke={revokePassport} onInspect={setInspecting}
                standalone
              />
            </motion.div>
          )}

          {/* ── Agents ───────────────────────────── */}
          {activeNav === 'agents' && (
            <motion.div key="agents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <AgentBuilderView
                agents={agents} showForm={showAgentForm} name={agentName} desc={agentDesc}
                model={agentModel} caps={agentCaps} building={agentBuilding} error={agentError}
                onToggleForm={() => setShowAgentForm(v => !v)}
                onNameChange={setAgentName} onDescChange={setAgentDesc} onModelChange={setAgentModel}
                onToggleCap={c => setAgentCaps(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })}
                onBuild={buildAgent}
                onDeleteAgent={id => {
                  const updated = agents.filter(a => a.id !== id)
                  setAgents(updated); saveAgents(updated)
                  addToast('Agent removed', 'info')
                  logActivity('agent.deleted', `id=${id}`)
                }}
              />
            </motion.div>
          )}

          {/* ── Trust Chains ─────────────────────── */}
          {activeNav === 'chains' && (
            <motion.div key="chains" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <TrustChainView passports={passports} delegations={delegations} onClearChain={id => {
                const updated = delegations.filter(d => d.childId !== id && d.parentId !== id)
                setDelegations(updated); saveDelegations(updated)
                addToast('Delegation link removed', 'info')
                logActivity('delegation.cleared', `childId=${id}`)
              }} />
            </motion.div>
          )}

          {/* ── Activity ─────────────────────────── */}
          {activeNav === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <ActivityView entries={activity} onClear={() => { setActivity([]); saveActivity([]) }} />
            </motion.div>
          )}

          {/* ── Integration ──────────────────────── */}
          {activeNav === 'integration' && (
            <motion.div key="integration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <IntegrationView sessionToken={session.token} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Passport Inspector Panel ─────────────── */}
      <AnimatePresence>
        {inspecting && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setInspecting(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#0d0e12', borderLeft: '1px solid rgba(212,163,90,0.2)', zIndex: 91, overflowY: 'auto', padding: '28px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>Passport Inspector</div>
                  <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: 'var(--ink)' }}>{inspecting.agentName}</div>
                </div>
                <button onClick={() => setInspecting(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(244,236,221,0.3)', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <InspectorRow label="Status">
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: inspecting.status === 'active' ? '#5a9f6a' : 'rgba(244,236,221,0.3)', background: inspecting.status === 'active' ? 'rgba(90,159,106,0.12)' : 'rgba(255,255,255,0.04)', padding: '2px 10px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>{inspecting.status}</span>
                </InspectorRow>

                <InspectorRow label="Passport ID">
                  <CopyField value={inspecting.id} onCopy={() => addToast('Passport ID copied', 'info')} />
                </InspectorRow>

                <InspectorRow label="Permissions">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(inspecting.permissions ?? []).map(p => (
                      <span key={p} style={{ fontSize: 11, color: 'rgba(212,163,90,0.75)', background: 'rgba(212,163,90,0.08)', padding: '2px 9px', borderRadius: 5, fontFamily: 'JetBrains Mono, monospace' }}>{p}</span>
                    ))}
                    {(inspecting.permissions ?? []).length === 0 && <span style={{ fontSize: 11, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>none</span>}
                  </div>
                </InspectorRow>

                <InspectorRow label="Expires">
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(244,236,221,0.5)' }}>
                    {inspecting.expiresAt ? new Date(inspecting.expiresAt).toLocaleString() : '—'}
                  </span>
                </InspectorRow>

                {(() => {
                  const children = delegations.filter(d => d.parentId === inspecting.id)
                  if (children.length === 0) return null
                  return (
                    <InspectorRow label={`Derived (${children.length})`}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {children.map(c => (
                          <div key={c.childId} style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(212,163,90,0.5)', background: 'rgba(212,163,90,0.04)', border: '1px solid rgba(212,163,90,0.12)', borderRadius: 5, padding: '4px 8px' }}>
                            {c.childId.slice(0, 20)}… · ttl {c.ttl}
                          </div>
                        ))}
                      </div>
                    </InspectorRow>
                  )
                })()}
              </div>

              {inspecting.status === 'active' && (
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
                  <button onClick={() => { setDelegateTarget(inspecting); setInspecting(null) }} className="dash-btn-gold" style={{ flex: 1 }}>⛓ Delegate</button>
                  <button onClick={() => revokePassport(inspecting)} className="dash-btn-danger">Revoke</button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── API Key Reveal Modal (once only) ─────── */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
              style={{ background: '#0e0f13', border: '1px solid rgba(212,163,90,0.3)', borderRadius: 18, padding: '32px 36px', width: '100%', maxWidth: 520, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '18px 18px 0 0', background: 'linear-gradient(90deg, transparent, rgba(212,163,90,0.6), transparent)' }} />

              <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.6)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                Passport Minted
              </div>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>
                {revealedKey.passportName}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.25)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 28 }}>
                {revealedKey.passportId}
              </div>

              <div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 22, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#e05c5c', fontSize: 14, flexShrink: 0 }}>⚠</span>
                <span style={{ fontSize: 12, color: 'rgba(224,92,92,0.8)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
                  Copy this key now. It will never be shown again.
                </span>
              </div>

              <ApiKeyReveal apiKey={revealedKey.apiKey} />

              <button onClick={() => setRevealedKey(null)}
                style={{ marginTop: 22, width: '100%', padding: '10px 0', background: 'rgba(212,163,90,0.1)', border: '1px solid rgba(212,163,90,0.25)', borderRadius: 8, color: 'var(--gold)', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,163,90,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,163,90,0.1)' }}
              >
                I've saved my key — close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delegate Modal ───────────────────────── */}
      <AnimatePresence>
        {delegateTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setDelegateTarget(null) }}
          >
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              style={{ background: '#111115', border: '1px solid rgba(212,163,90,0.18)', borderRadius: 18, padding: '28px 32px', width: '100%', maxWidth: 480 }}>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                  Delegating from
                </div>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: 'var(--ink)' }}>
                  {delegateTarget.agentName}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                  {delegateTarget.id}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  Derived Agent Name
                </label>
                <input type="text" value={delegateName} onChange={e => setDelegateName(e.target.value)}
                  placeholder={`${delegateTarget.agentName}-sub`} className="dash-input" />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                  Permissions <span style={{ color: 'rgba(244,236,221,0.2)', textTransform: 'none', letterSpacing: 0 }}>— subset of parent only</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {ALL_PERMISSIONS.map(p => {
                    const allowed = delegateTarget.permissions.includes(p)
                    const selected = delegatePerms.has(p)
                    return (
                      <button key={p} disabled={!allowed} onClick={() => {
                        if (!allowed) return
                        setDelegatePerms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })
                      }} className="perm-tag" style={{
                        background: selected ? 'rgba(212,163,90,0.1)' : 'transparent',
                        border: `1px solid ${!allowed ? 'rgba(255,255,255,0.04)' : selected ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                        color: !allowed ? 'rgba(244,236,221,0.15)' : selected ? 'var(--gold)' : 'rgba(244,236,221,0.4)',
                        fontWeight: selected ? 600 : 400,
                      }}>{p}</button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.2)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  Greyed = not in parent passport
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  Credential TTL
                </label>
                <select value={delegateTtl} onChange={e => setDelegateTtl(e.target.value)} className="dash-select">
                  {TTL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {delegateError && (
                <div style={{ fontSize: 12, color: '#e05c5c', marginBottom: 14, fontFamily: 'JetBrains Mono, monospace' }}>✗ {delegateError}</div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={delegatePassport} disabled={delegating || !delegateName.trim()} className="dash-btn-gold" style={{ flex: 1 }}>
                  {delegating ? 'Issuing…' : '⛓ Issue Derived Passport'}
                </button>
                <button onClick={() => setDelegateTarget(null)} className="dash-btn-outline">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast Stack ──────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ background: '#151619', border: `1px solid ${t.type === 'error' ? 'rgba(224,92,92,0.35)' : t.type === 'info' ? 'rgba(212,163,90,0.25)' : 'rgba(90,159,106,0.35)'}`, borderRadius: 10, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, maxWidth: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              <span style={{ fontSize: 13 }}>{t.type === 'error' ? '✗' : t.type === 'info' ? '◈' : '✓'}</span>
              <span style={{ fontSize: 13, color: 'rgba(244,236,221,0.75)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.4 }}>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── InspectorRow ────────────────────────────────────────── */
function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
      {children}
    </div>
  )
}

/* ─── CopyField ───────────────────────────────────────────── */
function CopyField({ value, onCopy }: { value: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); onCopy?.(); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '7px 10px' }}>
      <span style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(244,236,221,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      <button onClick={copy} style={{ background: copied ? 'rgba(90,159,106,0.12)' : 'transparent', border: `1px solid ${copied ? 'rgba(90,159,106,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 4, color: copied ? '#5a9f6a' : 'rgba(244,236,221,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>{copied ? '✓' : 'Copy'}</button>
    </div>
  )
}

/* ─── PassportSection ─────────────────────────────────────── */
function PassportSection({ passports, delegations, loading, showMintForm, mintName, mintPerms, minting, mintError, search, statusFilter, onSearchChange, onStatusFilter, onToggleMint, onMintNameChange, onTogglePerm, onMint, onDelegate, onRevoke, onInspect, standalone }: {
  passports: Passport[]; delegations: DelegationLink[]; loading: boolean
  showMintForm: boolean; mintName: string; mintPerms: Set<string>; minting: boolean; mintError: string
  search: string; statusFilter: 'all' | 'active' | 'revoked'
  onSearchChange: (v: string) => void; onStatusFilter: (v: 'all' | 'active' | 'revoked') => void
  onToggleMint: () => void; onMintNameChange: (v: string) => void; onTogglePerm: (p: string) => void
  onMint: () => void; onDelegate: (p: Passport) => void; onRevoke: (p: Passport) => void
  onInspect: (p: Passport) => void; standalone?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        {!standalone && <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(244,236,221,0.45)' }}>Passports</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: standalone ? 0 : 'auto', flex: standalone ? 1 : undefined }}>
          {/* Search */}
          <input type="text" value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search passports…"
            className="dash-input" style={{ width: 200 }} />
          {/* Status filter */}
          {(['all', 'active', 'revoked'] as const).map(f => (
            <button key={f} onClick={() => onStatusFilter(f)} className="filter-btn"
              style={{ color: statusFilter === f ? 'var(--gold)' : 'rgba(244,236,221,0.35)', borderColor: statusFilter === f ? 'rgba(212,163,90,0.4)' : 'rgba(255,255,255,0.08)', background: statusFilter === f ? 'rgba(212,163,90,0.07)' : 'transparent', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
          <button onClick={onToggleMint} className={showMintForm ? 'dash-btn-outline' : 'dash-btn-gold'} style={{ flexShrink: 0 }}>
            {showMintForm ? 'Cancel' : '+ Mint'}
          </button>
        </div>
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
          <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.15em', marginBottom: 8 }}>NO PASSPORTS</div>
          <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
            {search ? 'No results for your search' : 'Mint your first passport to get started'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          <AnimatePresence>
            {passports.map((pp, i) => {
              const isChild = delegations.some(d => d.childId === pp.id)
              const childCount = delegations.filter(d => d.parentId === pp.id).length
              const isRevoked = pp.status === 'revoked'
              return (
                <motion.div key={pp.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: i * 0.04 }}
                  onClick={() => onInspect(pp)} className="pp-card"
                  style={{ background: isRevoked ? 'rgba(255,255,255,0.01)' : isChild ? 'rgba(212,163,90,0.04)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isRevoked ? 'rgba(255,255,255,0.04)' : isChild ? 'rgba(212,163,90,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden', opacity: isRevoked ? 0.55 : 1 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${isRevoked ? 'rgba(224,92,92,0.15)' : isChild ? 'rgba(212,163,90,0.35)' : 'rgba(212,163,90,0.2)'}, transparent)` }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      {isChild && <div style={{ fontSize: 9, color: 'rgba(212,163,90,0.6)', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>⛓ DERIVED</div>}
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{pp.agentName}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: pp.status === 'active' ? '#5a9f6a' : 'rgba(244,236,221,0.3)', background: pp.status === 'active' ? 'rgba(90,159,106,0.12)' : 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>{pp.status}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                    {(pp.permissions ?? []).map(p => (
                      <span key={p} style={{ fontSize: 10, color: 'rgba(244,236,221,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>{p}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
                      Expires {pp.expiresAt ? new Date(pp.expiresAt).toLocaleDateString() : '—'}
                      {childCount > 0 && <span style={{ marginLeft: 10, color: 'rgba(212,163,90,0.5)' }}>{childCount} derived</span>}
                    </div>
                    {pp.status === 'active' && (
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onDelegate(pp)}
                          style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', color: 'rgba(212,163,90,0.6)', background: 'rgba(212,163,90,0.06)', border: '1px solid rgba(212,163,90,0.15)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,163,90,0.12)'; e.currentTarget.style.color = 'var(--gold)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,163,90,0.06)'; e.currentTarget.style.color = 'rgba(212,163,90,0.6)' }}
                        >⛓</button>
                        <button onClick={() => onRevoke(pp)}
                          style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', color: 'rgba(224,92,92,0.5)', background: 'transparent', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#e05c5c'; e.currentTarget.style.borderColor = 'rgba(224,92,92,0.4)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(224,92,92,0.5)'; e.currentTarget.style.borderColor = 'rgba(224,92,92,0.15)' }}
                        >✕</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/* ─── AgentBuilderView ────────────────────────────────────── */
function AgentBuilderView({ agents, showForm, name, desc, model, caps, building, error, onToggleForm, onNameChange, onDescChange, onModelChange, onToggleCap, onBuild, onDeleteAgent }: {
  agents: Agent[]; showForm: boolean; name: string; desc: string; model: string; caps: Set<string>; building: boolean; error: string
  onToggleForm: () => void; onNameChange: (v: string) => void; onDescChange: (v: string) => void; onModelChange: (v: string) => void
  onToggleCap: (c: string) => void; onBuild: () => void; onDeleteAgent: (id: string) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''} · each gets an AgentPass passport by default
        </div>
        <button onClick={onToggleForm} className={showForm ? 'dash-btn-outline' : 'dash-btn-gold'}>
          {showForm ? 'Cancel' : '+ Build Agent'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 24 }}>
            <div className="panel" style={{ padding: '24px 28px' }}>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: 'var(--ink)', marginBottom: 20 }}>New Agent</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Agent Name *</label>
                  <input type="text" value={name} onChange={e => onNameChange(e.target.value)} placeholder="e.g. research-assistant" className="dash-input" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Model</label>
                  <select value={model} onChange={e => onModelChange(e.target.value)} className="dash-select">
                    {ALL_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Description</label>
                <input type="text" value={desc} onChange={e => onDescChange(e.target.value)} placeholder="What does this agent do?" className="dash-input" />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                  Capabilities <span style={{ textTransform: 'none', letterSpacing: 0, color: 'rgba(244,236,221,0.2)' }}>— sets passport permissions</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} onClick={() => onToggleCap(p)} className="perm-tag"
                      style={{ background: caps.has(p) ? 'rgba(212,163,90,0.1)' : 'transparent', border: `1px solid ${caps.has(p) ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`, color: caps.has(p) ? 'var(--gold)' : 'rgba(244,236,221,0.4)', fontWeight: caps.has(p) ? 600 : 400 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(212,163,90,0.04)', border: '1px solid rgba(212,163,90,0.12)', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
                <span style={{ fontSize: 12, color: 'rgba(212,163,90,0.65)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ⚙ An AgentPass passport will be automatically minted for this agent. Save the API key when shown — it appears once.
                </span>
              </div>

              {error && <div style={{ fontSize: 12, color: '#e05c5c', marginBottom: 14, fontFamily: 'JetBrains Mono, monospace' }}>✗ {error}</div>}

              <button onClick={onBuild} disabled={building || !name.trim()} className="dash-btn-gold">
                {building ? 'Building…' : '⚙ Build Agent + Mint Passport'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {agents.length === 0 && !showForm ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 14, opacity: 0.25 }}>⚙</div>
          <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.15em', marginBottom: 8 }}>NO AGENTS YET</div>
          <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>Build your first agent to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          <AnimatePresence>
            {agents.map((ag, i) => (
              <motion.div key={ag.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: i * 0.04 }}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,163,90,0.25), transparent)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginBottom: 3 }}>{ag.name}</div>
                    {ag.description && <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.35)', marginBottom: 6, lineHeight: 1.5 }}>{ag.description}</div>}
                  </div>
                  <span style={{ fontSize: 10, color: '#5a9f6a', background: 'rgba(90,159,106,0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{ag.status}</span>
                </div>

                <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.55)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
                  {ag.model}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                  {ag.capabilities.map(c => (
                    <span key={c} style={{ fontSize: 10, color: 'rgba(244,236,221,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>{c}</span>
                  ))}
                  {ag.capabilities.length === 0 && <span style={{ fontSize: 10, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>no capabilities</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(ag.createdAt).toLocaleDateString()} · pp {ag.passportId.slice(0, 12)}…
                  </div>
                  <button onClick={() => onDeleteAgent(ag.id)}
                    style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(224,92,92,0.4)', background: 'transparent', border: '1px solid rgba(224,92,92,0.12)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#e05c5c'; e.currentTarget.style.borderColor = 'rgba(224,92,92,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(224,92,92,0.4)'; e.currentTarget.style.borderColor = 'rgba(224,92,92,0.12)' }}
                  >Remove</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/* ─── ActivityView ────────────────────────────────────────── */
function ActivityView({ entries, onClear }: { entries: ActivityEntry[]; onClear: () => void }) {
  const actionColor = (action: string) => {
    if (action.includes('revoked') || action.includes('deleted') || action.includes('cleared')) return '#e05c5c'
    if (action.includes('minted') || action.includes('created')) return '#5a9f6a'
    return 'rgba(212,163,90,0.7)'
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 14, opacity: 0.2 }}>≋</div>
        <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.15em', marginBottom: 8 }}>NO ACTIVITY YET</div>
        <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>Actions will appear here as you use AgentPass</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={onClear} style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(244,236,221,0.25)', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#e05c5c'; e.currentTarget.style.borderColor = 'rgba(224,92,92,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(244,236,221,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
        >Clear log</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {entries.map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 16px', borderRadius: 8, background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent', border: '1px solid transparent' }}>
            <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', marginTop: 1, minWidth: 130 }}>
              {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', color: actionColor(e.action), minWidth: 160, whiteSpace: 'nowrap' }}>
              {e.action}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(244,236,221,0.45)', fontFamily: 'JetBrains Mono, monospace', flex: 1, lineHeight: 1.5 }}>
              {e.detail}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── TrustChainView ──────────────────────────────────────── */
function TrustChainView({ passports, delegations, onClearChain }: {
  passports: Passport[]; delegations: DelegationLink[]; onClearChain: (id: string) => void
}) {
  const findPassport = (id: string) => passports.find(p => p.id === id)

  const roots = passports.filter(p => !delegations.some(d => d.childId === p.id))
  const orphanLinks = delegations.filter(d => !passports.some(p => p.id === d.childId))

  if (delegations.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>⛓</div>
        <div style={{ fontSize: 11, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.15em', marginBottom: 8 }}>NO DELEGATIONS YET</div>
        <div style={{ fontSize: 13, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace', maxWidth: 340, margin: '0 auto', lineHeight: 1.7 }}>
          Open a passport and click Delegate to create a derived credential with scoped permissions and a TTL.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {roots.map(root => {
        const children = delegations.filter(d => d.parentId === root.id)
        if (children.length === 0) return null
        return (
          <motion.div key={root.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 2 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212,163,90,0.12)', border: '1px solid rgba(212,163,90,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⬡</div>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{root.agentName}</div>
                <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>Root · {root.id.slice(0, 16)}…</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                {root.permissions.map(p => (
                  <span key={p} style={{ fontSize: 10, color: 'rgba(212,163,90,0.7)', background: 'rgba(212,163,90,0.08)', padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>{p}</span>
                ))}
              </div>
            </div>

            <div style={{ paddingLeft: 18, marginTop: 4 }}>
              {children.map((link, ci) => {
                const child = findPassport(link.childId)
                return (
                  <motion.div key={link.childId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.08 }}
                    style={{ position: 'relative', paddingLeft: 28, paddingTop: 14, paddingBottom: ci === children.length - 1 ? 0 : 14 }}>
                    <div className="chain-line" style={{ top: 0, bottom: ci === children.length - 1 ? '50%' : 0 }} />
                    <div className="chain-dot" />
                    <div style={{ background: 'rgba(212,163,90,0.04)', border: '1px solid rgba(212,163,90,0.15)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 9, color: 'rgba(212,163,90,0.6)', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>DERIVED</span>
                          <span style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{child?.agentName ?? link.childId.slice(0, 20)}</span>
                          {child && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: child.status === 'active' ? '#5a9f6a' : 'rgba(244,236,221,0.3)', background: child.status === 'active' ? 'rgba(90,159,106,0.12)' : 'transparent', padding: '1px 6px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              {child.status}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {(child?.permissions ?? []).map(p => (
                            <span key={p} style={{ fontSize: 10, color: 'rgba(244,236,221,0.35)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace' }}>{p}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.5)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>TTL {link.ttl}</div>
                        <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
                          {new Date(link.createdAt).toLocaleDateString()}
                        </div>
                        <button onClick={() => onClearChain(link.childId)}
                          style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(224,92,92,0.5)', background: 'transparent', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#e05c5c'; e.currentTarget.style.borderColor = '#e05c5c' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(224,92,92,0.5)'; e.currentTarget.style.borderColor = 'rgba(224,92,92,0.2)' }}
                        >revoke link</button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )
      })}

      {orphanLinks.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.2)', letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>ORPHANED LINKS</div>
          {orphanLinks.map(link => (
            <div key={link.childId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(244,236,221,0.25)', fontFamily: 'JetBrains Mono, monospace' }}>{link.childId.slice(0, 24)}… → {link.parentId.slice(0, 16)}…</span>
              <button onClick={() => onClearChain(link.childId)}
                style={{ fontSize: 10, color: 'rgba(224,92,92,0.5)', background: 'transparent', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── ApiKeyReveal ────────────────────────────────────────── */
function ApiKeyReveal({ apiKey }: { apiKey: string }) {
  const [masked, setMasked] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(null), 1800) })
  }

  const displayed = masked ? `${apiKey.slice(0, 8)}${'•'.repeat(Math.min(apiKey.length - 12, 24))}${apiKey.slice(-4)}` : apiKey

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>Passport API Key</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,163,90,0.2)', borderRadius: 8, padding: '10px 14px' }}>
          <span style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: masked ? 'rgba(244,236,221,0.4)' : 'rgba(212,163,90,0.9)', overflowX: 'auto', whiteSpace: 'nowrap' }}>{displayed}</span>
          <button onClick={() => setMasked(m => !m)} style={{ background: 'transparent', border: 'none', color: 'rgba(244,236,221,0.3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>{masked ? '👁' : '🙈'}</button>
          <button onClick={() => copy(apiKey, 'key')} style={{ background: copied === 'key' ? 'rgba(90,159,106,0.15)' : 'rgba(212,163,90,0.08)', border: `1px solid ${copied === 'key' ? 'rgba(90,159,106,0.4)' : 'rgba(212,163,90,0.2)'}`, borderRadius: 6, color: copied === 'key' ? '#5a9f6a' : 'rgba(212,163,90,0.7)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', padding: '4px 10px', cursor: 'pointer', transition: 'all 0.2s' }}>{copied === 'key' ? '✓ Copied' : 'Copy'}</button>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>.env</div>
        <div style={{ position: 'relative', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
          <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(244,236,221,0.5)', lineHeight: 1.7 }}>{`AGENTPASS_TOKEN=${masked ? `${apiKey.slice(0, 8)}••••••••` : apiKey}\nAGENTPASS_API_URL=https://agentpassv22.vercel.app/api`}</pre>
          <button onClick={() => copy(`AGENTPASS_TOKEN=${apiKey}\nAGENTPASS_API_URL=https://agentpassv22.vercel.app/api`, 'env')} style={{ position: 'absolute', top: 8, right: 10, background: copied === 'env' ? 'rgba(90,159,106,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied === 'env' ? 'rgba(90,159,106,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 5, color: copied === 'env' ? '#5a9f6a' : 'rgba(244,236,221,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '3px 8px', cursor: 'pointer', transition: 'all 0.2s' }}>{copied === 'env' ? '✓' : 'Copy'}</button>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>Quick start</div>
        <div style={{ position: 'relative', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
          <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(244,236,221,0.45)', lineHeight: 1.7 }}>{`import { AgentPass } from '@agentpass/sdk'\nconst ap = new AgentPass({\n  token: process.env.AGENTPASS_TOKEN\n})`}</pre>
          <button onClick={() => copy(`import { AgentPass } from '@agentpass/sdk'\nconst ap = new AgentPass({\n  token: process.env.AGENTPASS_TOKEN\n})`, 'sdk')} style={{ position: 'absolute', top: 8, right: 10, background: copied === 'sdk' ? 'rgba(90,159,106,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied === 'sdk' ? 'rgba(90,159,106,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 5, color: copied === 'sdk' ? '#5a9f6a' : 'rgba(244,236,221,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '3px 8px', cursor: 'pointer', transition: 'all 0.2s' }}>{copied === 'sdk' ? '✓' : 'Copy'}</button>
        </div>
      </div>
    </div>
  )
}

/* ─── IntegrationView ─────────────────────────────────────── */
function IntegrationView({ sessionToken: _sessionToken }: { sessionToken: string }) {
  const [activeTab, setActiveTab] = useState<'sdk' | 'cli' | 'actions' | 'webhooks'>('sdk')
  const [copied, setCopied] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSaved, setWebhookSaved] = useState(false)
  const [webhookTesting, setWebhookTesting] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [selectedEvents, setSelectedEvents] = useState(new Set(['passport.minted', 'passport.revoked']))

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(null), 1800) })
  }

  const testWebhook = async () => {
    if (!webhookUrl.trim()) return
    setWebhookTesting(true); setWebhookTestResult(null)
    try {
      const r = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test.ping', timestamp: Date.now(), passportId: 'pp_test', hmac: 'sha256=test' }) })
      setWebhookTestResult({ ok: r.ok, msg: `${r.status} ${r.statusText}` })
    } catch (e: unknown) {
      setWebhookTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Network error' })
    } finally { setWebhookTesting(false) }
  }

  const tabs = [
    { key: 'sdk' as const,      label: 'npm SDK'        },
    { key: 'cli' as const,      label: 'CLI'            },
    { key: 'actions' as const,  label: 'GitHub Actions' },
    { key: 'webhooks' as const, label: 'Webhooks'       },
  ]

  const CB = ({ code, label, lang = '' }: { code: string; label: string; lang?: string }) => (
    <div style={{ position: 'relative', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
      {lang && <div style={{ fontSize: 9, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.12em', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>{lang}</div>}
      <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(244,236,221,0.65)', lineHeight: 1.75, overflowX: 'auto' }}>{code}</pre>
      <button onClick={() => copy(code, label)} style={{ position: 'absolute', top: 10, right: 10, background: copied === label ? 'rgba(90,159,106,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied === label ? 'rgba(90,159,106,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 5, color: copied === label ? '#5a9f6a' : 'rgba(244,236,221,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '3px 8px', cursor: 'pointer', transition: 'all 0.2s' }}>{copied === label ? '✓' : 'Copy'}</button>
    </div>
  )

  const SL = ({ text }: { text: string }) => <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, marginTop: 20 }}>{text}</div>
  const Callout = ({ text }: { text: string }) => <div style={{ background: 'rgba(212,163,90,0.05)', borderLeft: '2px solid rgba(212,163,90,0.35)', borderRadius: '0 6px 6px 0', padding: '10px 14px', marginBottom: 16 }}><span style={{ fontSize: 12, color: 'rgba(212,163,90,0.7)', fontFamily: 'JetBrains Mono, monospace' }}>{text}</span></div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '9px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--gold)' : '2px solid transparent', color: activeTab === t.key ? 'var(--gold)' : 'rgba(244,236,221,0.35)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: activeTab === t.key ? 600 : 400, letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1 }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'sdk' && (
        <motion.div key="sdk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <SL text="Install" />
          <CB label="sdk-install" code={`npm install @agentpass/sdk`} />
          <SL text="Initialize" />
          <CB label="sdk-init" lang="TypeScript" code={`import { AgentPass } from '@agentpass/sdk'\n\nconst ap = new AgentPass({\n  token: process.env.AGENTPASS_TOKEN,\n})`} />
          <SL text="Mint a passport" />
          <CB label="sdk-mint" lang="TypeScript" code={`const passport = await ap.mint({\n  agentName: 'purchase-agent-v2',\n  permissions: ['purchase', 'search'],\n})\n\nconsole.log(passport.id)     // pp_01J...\nconsole.log(passport.token)  // authorize agent calls with this`} />
          <SL text="Verify at runtime" />
          <CB label="sdk-verify" lang="TypeScript" code={`const result = await ap.verify(req.headers.authorization)\nif (!result.valid) throw new Error('Unauthorized agent')`} />
          <Callout text="Set AGENTPASS_TOKEN in your environment — never hardcode it." />
        </motion.div>
      )}

      {activeTab === 'cli' && (
        <motion.div key="cli" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <SL text="Install" />
          <CB label="cli-install" lang="Shell" code={`npm install -g @agentpass/cli`} />
          <SL text="Authenticate" />
          <CB label="cli-auth" lang="Shell" code={`agentpass auth --token $AGENTPASS_TOKEN`} />
          <SL text="Mint a passport" />
          <CB label="cli-mint" lang="Shell" code={`agentpass mint \\\n  --name purchase-agent-v2 \\\n  --permissions purchase,search \\\n  --ttl 7d\n\n# → Passport ID: pp_01J...\n# → Token shown once`} />
          <SL text="Manage" />
          <CB label="cli-manage" lang="Shell" code={`agentpass list\nagentpass revoke pp_01J...`} />
          <button onClick={() => {
            const blob = new Blob([`AGENTPASS_TOKEN=your_token_here\nAGENTPASS_API_URL=https://agentpassv22.vercel.app/api\n`], { type: 'text/plain' })
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '.env.agentpass'; a.click(); URL.revokeObjectURL(url)
          }} className="dash-btn-outline">↓ Download .env template</button>
        </motion.div>
      )}

      {activeTab === 'actions' && (
        <motion.div key="actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Callout text="Add AGENTPASS_TOKEN to Settings → Secrets → Actions in your GitHub repo." />
          <SL text=".github/workflows/agent-deploy.yml" />
          <CB label="gha-yml" lang="YAML" code={`name: Deploy Agent\non:\n  push:\n    branches: [main]\n\njobs:\n  mint-passport:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: agentpass/mint-passport@v1\n        id: passport\n        with:\n          token: \${{ secrets.AGENTPASS_TOKEN }}\n          agent-name: purchase-agent-v2\n          permissions: purchase,search\n          ttl: 7d\n\n      - name: Deploy\n        env:\n          PASSPORT_ID: \${{ steps.passport.outputs.passport-id }}\n          PASSPORT_TOKEN: \${{ steps.passport.outputs.token }}\n        run: ./deploy.sh`} />
          <SL text="Revoke on rollback" />
          <CB label="gha-revoke" lang="YAML" code={`      - name: Revoke on failure\n        if: failure()\n        uses: agentpass/revoke-passport@v1\n        with:\n          token: \${{ secrets.AGENTPASS_TOKEN }}\n          passport-id: \${{ steps.passport.outputs.passport-id }}`} />
        </motion.div>
      )}

      {activeTab === 'webhooks' && (
        <motion.div key="webhooks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <SL text="Endpoint URL" />
              <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-api.com/agentpass-events" className="dash-input" style={{ marginBottom: 16 }} />
              <SL text="Events" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {['passport.minted', 'action.verified', 'action.denied', 'passport.revoked', 'proof.delegated'].map(ev => (
                  <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedEvents.has(ev)} onChange={() => setSelectedEvents(prev => { const n = new Set(prev); n.has(ev) ? n.delete(ev) : n.add(ev); return n })} style={{ accentColor: 'var(--gold)', width: 14, height: 14 }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: selectedEvents.has(ev) ? 'rgba(212,163,90,0.8)' : 'rgba(244,236,221,0.35)' }}>{ev}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setWebhookSaved(true)} disabled={!webhookUrl.trim()} className="dash-btn-gold">{webhookSaved ? '✓ Saved' : 'Save Webhook'}</button>
                <button onClick={testWebhook} disabled={!webhookUrl.trim() || webhookTesting} className="dash-btn-outline">{webhookTesting ? 'Testing…' : 'Test'}</button>
              </div>
              {webhookTestResult && <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: webhookTestResult.ok ? '#5a9f6a' : '#e05c5c' }}>{webhookTestResult.ok ? '✓ ' : '✗ '}{webhookTestResult.msg}</div>}
            </div>
            <div>
              <SL text="Event payload" />
              <CB label="webhook-payload" lang="JSON" code={`{\n  "event": "action.denied",\n  "passportId": "pp_01J...",\n  "agentId": "purchase-agent-v2",\n  "action": "purchase",\n  "reason": "exceeds_limit",\n  "timestamp": 1748476800000,\n  "hmac": "sha256=..."\n}`} />
              <Callout text="Verify the HMAC signature before processing any event." />
              <SL text="Verify HMAC" />
              <CB label="webhook-hmac" lang="TypeScript" code={`import { createHmac } from 'crypto'\n\nfunction verify(payload: string, sig: string, secret: string) {\n  const expected = createHmac('sha256', secret)\n    .update(payload).digest('hex')\n  return \`sha256=\${expected}\` === sig\n}`} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
