'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Passport, DelegationLink } from '@/app/dashboard/types'

export function TrustChainView({ passports, delegations, onClearChain }: {
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
