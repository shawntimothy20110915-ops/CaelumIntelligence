'use client'

import React, { useState } from 'react'

export function CopyField({ value, onCopy }: { value: string; onCopy?: () => void }) {
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
