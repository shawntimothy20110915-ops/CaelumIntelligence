'use client'

import React, { useState } from 'react'

export function ApiKeyReveal({ apiKey }: { apiKey: string }) {
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
