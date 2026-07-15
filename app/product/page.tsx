'use client'

import Link from 'next/link'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

const C = brand.colors
const F = brand.font

const FEATURES = [
  { k: '01', name: 'Agent Passport', desc: 'A cryptographic identity bound to every agent instance.' },
  { k: '02', name: 'Delegation Proofs', desc: 'Signed authorization chains from human to agent.' },
  { k: '03', name: 'Approval Engine', desc: 'Policy evaluation on every action — p95 under 100ms.' },
  { k: '04', name: 'Action Ledger', desc: 'An append-only, verifiable record of every decision.' },
]

export default function Landing() {
  return (
    <BrandFrame showNav particleCount={40}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 100px' }}>

        {/* hero */}
        <section style={{ textAlign: 'center', padding: '60px 0 40px' }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.muted, marginBottom: 22 }}>
            AgentPass · Trust Infrastructure
          </div>
          <h1 style={{ fontFamily: F.serif, fontSize: 'clamp(2.8rem, 8vw, 6rem)', lineHeight: 0.95, letterSpacing: '-0.02em', color: C.text }}>
            Trust, for the<br />age of AI agents.
          </h1>
          <p style={{ fontFamily: F.sans, fontSize: 'clamp(1rem, 2.2vw, 1.35rem)', color: C.subdued, maxWidth: 540, margin: '24px auto 0', lineHeight: 1.5 }}>
            AgentPass verifies AI agents, enforces user permissions, and records every
            decision — one trusted, auditable path.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}>
            <Link href="/dashboard" className="btn btn-primary">Open dashboard →</Link>
            <Link href="/auth" className="btn btn-ghost">Sign in</Link>
          </div>
        </section>

        {/* features */}
        <section style={{ marginTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.muted }}>The stack</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.k} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, marginBottom: 16 }}>{f.k}</div>
                <div style={{ fontFamily: F.serif, fontSize: 22, color: C.text, letterSpacing: '-0.01em' }}>{f.name}</div>
                <p style={{ fontFamily: F.sans, fontSize: 13.5, color: C.subdued, lineHeight: 1.55, marginTop: 10 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* closing CTA */}
        <section style={{ textAlign: 'center', marginTop: 96 }}>
          <h2 style={{ fontFamily: F.serif, fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', letterSpacing: '-0.02em', color: C.text, lineHeight: 1 }}>
            See it live.
          </h2>
          <p style={{ fontFamily: F.sans, fontSize: '1rem', color: C.subdued, marginTop: 14 }}>
            One dashboard across every agent — evals, spend, receipts, trust.
          </p>
          <div style={{ marginTop: 28 }}>
            <Link href="/dashboard" className="btn btn-primary">Open dashboard →</Link>
          </div>
        </section>
      </div>
    </BrandFrame>
  )
}
