'use client'

import React from 'react'

export function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: 'rgba(244,236,221,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
      {children}
    </div>
  )
}
