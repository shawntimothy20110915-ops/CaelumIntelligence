'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ActivityEntry } from '@/app/dashboard/types'

export function ActivityView({ entries, onClear }: { entries: ActivityEntry[]; onClear: () => void }) {
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
