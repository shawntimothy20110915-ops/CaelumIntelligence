'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Agent, ALL_MODELS, ALL_PERMISSIONS } from '@/app/dashboard/types'

export function AgentBuilderView({ agents, showForm, name, desc, model, caps, building, error, onToggleForm, onNameChange, onDescChange, onModelChange, onToggleCap, onBuild, onDeleteAgent }: {
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
