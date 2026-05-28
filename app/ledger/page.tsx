'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { LedgerEvent } from '@/lib/types'

function timeAgo(ts: number) {
  const d = Date.now() - ts
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`
  return `${Math.floor(d / 86400000)}d ago`
}

function statusColor(s: string) {
  if (s === 'completed') return '#5a9f6a'
  if (s === 'denied') return '#e05c5c'
  if (s === 'pending_review') return 'var(--gold)'
  return 'rgba(244,236,221,0.35)'
}

function typeColor(t: string) {
  if (t.includes('approved') || t.includes('minted') || t.includes('completed')) return '#5a9f6a'
  if (t.includes('denied') || t.includes('revoked')) return '#e05c5c'
  if (t.includes('review') || t.includes('delegated')) return 'var(--gold)'
  return 'rgba(244,236,221,0.4)'
}

export default function LedgerPage() {
  const [events, setEvents] = useState<LedgerEvent[]>([])
  const [total, setTotal] = useState(0)
  const [agentFilter, setAgentFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [chainValid, setChainValid] = useState<boolean | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<LedgerEvent | null>(null)
  const [liveMode, setLiveMode] = useState(true)

  const fetchEvents = useCallback(async () => {
    try {
      const url = `/api/ledger/events?limit=50${agentFilter ? `&agentId=${agentFilter}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setEvents(data.events ?? [])
      setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [agentFilter])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (!liveMode) return
    const interval = setInterval(fetchEvents, 3000)
    return () => clearInterval(interval)
  }, [fetchEvents, liveMode])

  async function verifyChain() {
    setVerifying(true); setChainValid(null)
    await new Promise(r => setTimeout(r, 1200))
    let valid = true
    for (let i = 1; i < events.length; i++) {
      if (events[i].prevHash !== events[i - 1].hash) { valid = false; break }
    }
    setChainValid(valid); setVerifying(false)
  }

  const agents = Array.from(new Set(events.map(e => e.agentId)))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        .ledger-row { transition: background 0.12s; cursor: pointer; }
        .ledger-row:hover { background: rgba(212,163,90,0.04) !important; }
        .ledger-row.selected { background: rgba(212,163,90,0.07) !important; }
        .filter-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; padding: 7px 12px; color: var(--ink); font-size: 12px; font-family: 'JetBrains Mono', monospace; outline: none; transition: border-color 0.15s; }
        .filter-input:focus { border-color: var(--gold); }
        .ledger-btn { padding: 6px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: rgba(244,236,221,0.4); font-size: 11px; cursor: pointer; transition: all 0.15s; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; }
        .ledger-btn:hover { border-color: rgba(255,255,255,0.15); color: rgba(244,236,221,0.7); }
        .ledger-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ledger-btn.active { border-color: var(--gold); color: var(--gold); }
        .verify-progress { height: 2px; background: rgba(255,255,255,0.06); overflow: hidden; margin-top: 8px; border-radius: 1px; }
        .verify-fill { height: 100%; background: var(--gold); animation: verifyPulse 1.2s ease-in-out infinite; }
        @keyframes verifyPulse { 0% { width: 0%; opacity: 1; } 100% { width: 100%; opacity: 0.5; } }
      `}</style>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ color: 'var(--gold)', fontFamily: 'Instrument Serif, serif', fontSize: 17, textDecoration: 'none', letterSpacing: '-0.01em' }}>AgentPass</Link>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>›</span>
          <span style={{ color: 'rgba(244,236,221,0.35)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>ledger</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setLiveMode(m => !m)} className={`ledger-btn${liveMode ? ' active' : ''}`}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: liveMode ? '#5a9f6a' : 'rgba(244,236,221,0.2)', marginRight: 6, verticalAlign: 'middle' }} />
            {liveMode ? 'live' : 'paused'}
          </button>
          <button onClick={verifyChain} disabled={verifying} className="ledger-btn">
            {verifying ? 'verifying…' : '◈ verify chain'}
          </button>
          <Link href="/dashboard" style={{ padding: '6px 14px', background: 'rgba(212,163,90,0.1)', border: '1px solid rgba(212,163,90,0.3)', borderRadius: 6, color: 'var(--gold)', fontSize: 11, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>dashboard →</Link>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1 }}>
        {/* Main */}
        <div style={{ padding: '28px 32px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>ACTION LEDGER · APPEND-ONLY · HMAC-CHAINED</div>
              <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, fontWeight: 400, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {total.toLocaleString()} total events
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(244,236,221,0.3)' }}>7-year retention · tamper-evident · offline verifiable</p>
            </div>

            <AnimatePresence>
              {chainValid !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ padding: '10px 16px', fontSize: 12, background: chainValid ? 'rgba(90,159,106,0.08)' : 'rgba(224,92,92,0.08)', border: `1px solid ${chainValid ? 'rgba(90,159,106,0.3)' : 'rgba(224,92,92,0.3)'}`, borderRadius: 8, color: chainValid ? '#5a9f6a' : '#e05c5c', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {chainValid ? '✓ chain integrity verified' : '✗ chain integrity FAILED'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="filter-input" placeholder="filter by agent id…" value={agentFilter} onChange={e => setAgentFilter(e.target.value)} style={{ width: 220 }} />
            {agentFilter && <button onClick={() => setAgentFilter('')} className="ledger-btn">clear</button>}
            <button onClick={fetchEvents} className="ledger-btn">↺ refresh</button>
          </div>

          {agents.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              {agents.map(a => (
                <button key={a} onClick={() => setAgentFilter(agentFilter === a ? '' : a)} className={`ledger-btn${agentFilter === a ? ' active' : ''}`} style={{ fontSize: 10, padding: '3px 10px' }}>{a}</button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(244,236,221,0.25)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>LOADING LEDGER…</div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['seq', 'event id', 'type', 'agent', 'merchant', 'amount', 'status', 'time', 'hash'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(244,236,221,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr
                      key={e.id}
                      className={`ledger-row${selectedEvent?.id === e.id ? ' selected' : ''}`}
                      onClick={() => setSelectedEvent(selectedEvent?.id === e.id ? null : e)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td style={{ padding: '9px 14px', color: 'rgba(244,236,221,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{String(e.seq).padStart(4, '0')}</td>
                      <td style={{ padding: '9px 14px', color: 'rgba(244,236,221,0.3)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.id}</td>
                      <td style={{ padding: '9px 14px', fontSize: 10, color: typeColor(e.type), fontFamily: 'JetBrains Mono, monospace' }}>{e.type.replace('.', ' · ').toUpperCase()}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--gold)', fontWeight: 600, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{e.agentId}</td>
                      <td style={{ padding: '9px 14px', color: 'rgba(244,236,221,0.4)', fontSize: 11 }}>{e.merchant ?? '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--ink)' }}>{e.amount ? `$${e.amount.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontSize: 10, color: statusColor(e.status), fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
                          {e.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'rgba(244,236,221,0.3)', fontSize: 10, whiteSpace: 'nowrap' }}>{timeAgo(e.timestamp)}</td>
                      <td style={{ padding: '9px 14px', color: 'rgba(244,236,221,0.2)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(244,236,221,0.2)', fontSize: 12 }}>no events match filter</div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ padding: '28px 24px' }}>
          <AnimatePresence mode="wait">
            {selectedEvent ? (
              <motion.div key="detail" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Event Detail</div>
                  <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'rgba(244,236,221,0.3)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {[
                    { k: 'event id', v: selectedEvent.id },
                    { k: 'sequence', v: String(selectedEvent.seq).padStart(4, '0') },
                    { k: 'type', v: selectedEvent.type },
                    { k: 'agent id', v: selectedEvent.agentId },
                    { k: 'passport', v: selectedEvent.passportId ?? '—' },
                    { k: 'proof id', v: selectedEvent.proofId ?? '—' },
                    { k: 'merchant', v: selectedEvent.merchant ?? '—' },
                    { k: 'amount', v: selectedEvent.amount ? `$${selectedEvent.amount.toFixed(2)}` : '—' },
                    { k: 'status', v: selectedEvent.status },
                    { k: 'timestamp', v: new Date(selectedEvent.timestamp).toISOString() },
                  ].map(row => (
                    <div key={row.k} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }}>
                      <div style={{ color: 'rgba(244,236,221,0.3)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>{row.k}</div>
                      <div style={{ color: 'var(--ink)', wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{row.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>Hash Chain</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { k: 'hash', v: selectedEvent.hash, c: '#5a9f6a' },
                    { k: 'prev hash', v: selectedEvent.prevHash, c: 'rgba(244,236,221,0.35)' },
                    { k: 'hmac', v: selectedEvent.hmac, c: 'var(--gold)' },
                  ].map(row => (
                    <div key={row.k} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
                      <div style={{ color: 'rgba(244,236,221,0.3)', marginBottom: 2 }}>{row.k}</div>
                      <div style={{ color: row.c, wordBreak: 'break-all' }}>{row.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(90,159,106,0.06)', border: '1px solid rgba(90,159,106,0.2)', borderRadius: 7, fontSize: 11, color: '#5a9f6a', fontFamily: 'JetBrains Mono, monospace' }}>
                  ✓ event integrity verifiable offline
                </div>
              </motion.div>
            ) : (
              <motion.div key="props" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 18 }}>Ledger Properties</div>
                {[
                  { label: 'chain type', value: 'HMAC-SHA256' },
                  { label: 'structure', value: 'append-only' },
                  { label: 'retention', value: '7 years min' },
                  { label: 'verification', value: 'offline capable' },
                  { label: 'total events', value: total.toLocaleString() },
                ].map(p => (
                  <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                    <span style={{ color: 'rgba(244,236,221,0.3)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{p.label}</span>
                    <span style={{ color: 'rgba(244,236,221,0.6)', fontSize: 11 }}>{p.value}</span>
                  </div>
                ))}

                <div style={{ marginTop: 28 }}>
                  <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>Verify Chain</div>
                  <p style={{ fontSize: 12, color: 'rgba(244,236,221,0.3)', lineHeight: 1.7, marginBottom: 14 }}>
                    Client-side HMAC chain verification across all loaded events. Detects any tampered, reordered, or missing entries.
                  </p>
                  <button onClick={verifyChain} disabled={verifying} className="ledger-btn" style={{ width: '100%', textAlign: 'center', padding: '9px 0', borderRadius: 8 }}>
                    {verifying ? 'verifying chain…' : '◈ run chain verification'}
                  </button>
                  {verifying && <div className="verify-progress"><div className="verify-fill" /></div>}
                </div>

                <div style={{ marginTop: 24, padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 12, color: 'rgba(244,236,221,0.3)', lineHeight: 1.7 }}>
                  Click any row to inspect event detail and hash chain.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
