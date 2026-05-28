'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { AgentPassport } from '@/lib/types'

const MINT_STEPS = [
  { pct: 20, label: 'Generating keypair' },
  { pct: 45, label: 'Binding device identity' },
  { pct: 70, label: 'Registering passport' },
  { pct: 90, label: 'Appending to ledger' },
  { pct: 100, label: 'Passport minted' },
]

export default function PassportPage() {
  const [step, setStep] = useState<'form' | 'minting' | 'done'>('form')
  const [form, setForm] = useState({ label: '', killSwitchUrl: '', ttlDays: '365', metadata: '' })
  const [passport, setPassport] = useState<AgentPassport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStepLabel, setCurrentStepLabel] = useState('')

  async function mint(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep('minting')
    for (const s of MINT_STEPS) {
      await new Promise(r => setTimeout(r, 300))
      setProgress(s.pct)
      setCurrentStepLabel(s.label)
    }
    try {
      const res = await fetch('/api/passport/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          killSwitchUrl: form.killSwitchUrl || undefined,
          ttlDays: parseInt(form.ttlDays) || undefined,
          metadata: form.metadata
            ? Object.fromEntries(form.metadata.split(',').map(p => p.split(':').map(s => s.trim())))
            : undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'mint failed')
      }
      const { passport } = await res.json()
      setPassport(passport)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error')
      setStep('form')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        .pp-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 11px 14px; color: var(--ink); font-size: 13px; font-family: Inter, sans-serif; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s, box-shadow 0.15s; }
        .pp-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,163,90,0.1); }
        .pp-label { font-size: 11px; color: rgba(244,236,221,0.4); letter-spacing: 0.08em; text-transform: uppercase; display: block; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
        .pp-hint { font-size: 11px; color: rgba(244,236,221,0.25); margin-top: 5px; line-height: 1.5; }
        .pp-btn-primary { padding: 13px 0; width: 100%; background: var(--gold); border: none; border-radius: 8px; color: #0a0a0d; font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: opacity 0.15s; font-family: Inter, sans-serif; }
        .pp-btn-primary:hover { opacity: 0.88; }
        .pp-btn-outline { padding: 11px 0; width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(244,236,221,0.5); font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: Inter, sans-serif; }
        .pp-btn-outline:hover { border-color: rgba(255,255,255,0.2); color: rgba(244,236,221,0.8); }
      `}</style>

      {/* Background orbs */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,163,90,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(90,159,106,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025 }}>
          <defs>
            <pattern id="pp-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#d4a35a" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pp-grid)" />
        </svg>
      </div>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ color: 'var(--gold)', fontFamily: 'Instrument Serif, serif', fontSize: 17, textDecoration: 'none' }}>AgentPass</Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>›</span>
          <span style={{ color: 'rgba(244,236,221,0.35)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>mint passport</span>
        </div>
        <Link href="/dashboard" style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(244,236,221,0.5)', fontSize: 11, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>dashboard →</Link>
      </nav>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px 80px', position: 'relative' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>STEP 02 / IDENTITY</div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 40, fontWeight: 400, color: 'var(--ink)', margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Mint agent passport
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(244,236,221,0.45)', lineHeight: 1.7, maxWidth: 500 }}>
            A cryptographically signed identity for your AI agent. Cannot be forged, replayed, or transferred to a different device.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.form key="form" onSubmit={mint} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.25)', borderRadius: 8, fontSize: 13, color: '#e05c5c', fontFamily: 'JetBrains Mono, monospace' }}>
                  ✗ {error}
                </motion.div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="pp-label">Agent label <span style={{ color: '#e05c5c' }}>*</span></label>
                  <input className="pp-input" placeholder="e.g. Household Grocery Agent" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
                  <p className="pp-hint">Human-readable name. Appears in the ledger and receipts.</p>
                </div>

                <div>
                  <label className="pp-label">Kill-switch URL</label>
                  <input className="pp-input" placeholder="https://yourapp.com/agent/revoke/{id}" value={form.killSwitchUrl} onChange={e => setForm(f => ({ ...f, killSwitchUrl: e.target.value }))} />
                  <p className="pp-hint">AgentPass will POST to this URL when the passport is revoked.</p>
                </div>

                <div>
                  <label className="pp-label">TTL (days)</label>
                  <input className="pp-input" type="number" min="1" max="3650" placeholder="365" value={form.ttlDays} onChange={e => setForm(f => ({ ...f, ttlDays: e.target.value }))} />
                  <p className="pp-hint">Passport expires after this many days. Leave blank for no expiry.</p>
                </div>

                <div>
                  <label className="pp-label">Metadata (key:value, comma-separated)</label>
                  <input className="pp-input" placeholder="owner:household, tier:standard" value={form.metadata} onChange={e => setForm(f => ({ ...f, metadata: e.target.value }))} />
                </div>

                {/* Security features */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { icon: '⬡', label: 'Keypair', desc: 'Generated locally' },
                    { icon: '◈', label: 'Binding', desc: 'Device-scoped' },
                    { icon: '≡', label: 'Ledger', desc: 'Append-only' },
                  ].map(f => (
                    <div key={f.label} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                      <div style={{ color: 'var(--gold)', fontSize: 16, marginBottom: 6 }}>{f.icon}</div>
                      <div style={{ fontSize: 12, color: 'rgba(244,236,221,0.6)', fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.3)' }}>{f.desc}</div>
                    </div>
                  ))}
                </div>

                <button type="submit" className="pp-btn-primary">◈ Mint Passport</button>
              </div>
            </motion.form>
          )}

          {step === 'minting' && (
            <motion.div key="minting" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ padding: '60px 40px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, textAlign: 'center' }}>
                {/* Animated seal */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'inline-block', marginBottom: 32 }}
                >
                  <svg viewBox="0 0 60 60" width="60" height="60">
                    <polygon points="30,3 53,13 57,30 53,47 30,57 7,47 3,30 7,13" fill="none" stroke="rgba(212,163,90,0.3)" strokeWidth="1" />
                    <polygon points="30,10 47,18 52,30 47,42 30,50 13,42 8,30 13,18" fill="none" stroke="rgba(212,163,90,0.15)" strokeWidth="0.8" />
                    <circle cx="30" cy="30" r="8" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <circle cx="30" cy="30" r="3" fill="var(--gold)" />
                  </svg>
                </motion.div>

                <motion.div
                  key={currentStepLabel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 28, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  {currentStepLabel}…
                </motion.div>

                {/* Progress bar */}
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden', marginBottom: 12, maxWidth: 320, margin: '0 auto 12px' }}>
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'var(--gold)', borderRadius: 1 }}
                  />
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
                  {MINT_STEPS.map((s, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <motion.div
                        animate={{ background: progress >= s.pct ? 'var(--gold)' : 'rgba(255,255,255,0.1)', borderColor: progress >= s.pct ? 'var(--gold)' : 'rgba(255,255,255,0.1)' }}
                        style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <span style={{ fontSize: 9, color: progress >= s.pct ? 'rgba(244,236,221,0.5)' : 'rgba(244,236,221,0.15)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', maxWidth: 56, lineHeight: 1.3 }}>
                        {s.label.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'done' && passport && (
            <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
              {/* Success banner */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ padding: '16px 20px', background: 'rgba(90,159,106,0.08)', border: '1px solid rgba(90,159,106,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(90,159,106,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#5a9f6a', fontSize: 18 }}>✓</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#5a9f6a', fontSize: 14, marginBottom: 2 }}>Passport minted successfully</div>
                  <div style={{ fontSize: 12, color: 'rgba(90,159,106,0.7)' }}>Appended to the Action Ledger. Trust chain initialized.</div>
                </div>
              </motion.div>

              {/* Passport card */}
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '24px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: 0.4 }} />
                <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 18 }}>
                  PASSPORT · {passport.id}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { k: 'id', v: passport.id },
                    { k: 'agent id', v: passport.agentId },
                    { k: 'label', v: passport.label },
                    { k: 'public key', v: passport.publicKey },
                    { k: 'status', v: passport.status },
                    { k: 'minted', v: new Date(passport.mintedAt).toISOString() },
                    { k: 'expires', v: passport.expiresAt ? new Date(passport.expiresAt).toISOString() : 'never' },
                    { k: 'kill switch', v: passport.killSwitchUrl ?? 'not configured' },
                  ].map((row, i) => (
                    <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none', gap: 16 }}>
                      <span style={{ color: 'rgba(244,236,221,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{row.k}</span>
                      <span style={{ color: 'var(--ink)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, wordBreak: 'break-all', textAlign: 'right', maxWidth: '70%' }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Link href="/dashboard" style={{ display: 'block', padding: '12px 0', background: 'var(--gold)', borderRadius: 8, color: '#0a0a0d', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none' }}>
                  Go to Dashboard →
                </Link>
                <button
                  onClick={() => { setStep('form'); setPassport(null); setProgress(0); setCurrentStepLabel('') }}
                  className="pp-btn-outline"
                  style={{ padding: '12px 0' }}
                >
                  Mint another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
