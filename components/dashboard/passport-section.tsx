'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Passport, DelegationLink, ALL_PERMISSIONS } from '@/app/dashboard/types'

export function PassportSection({ passports, delegations, loading, showMintForm, mintName, mintPerms, minting, mintError, search, statusFilter, onSearchChange, onStatusFilter, onToggleMint, onMintNameChange, onTogglePerm, onMint, onDelegate, onRevoke, onInspect, standalone }: {
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
