'use client'

import { useState, useEffect } from 'react'

const PRODUCTS = [
  {
    id: 'agentpass',
    name: 'AgentPass',
    category: 'TRUST LAYER',
    tagline: 'Cryptographic identity for AI agents.',
    detail: 'Issue agent passports, evaluate delegation proofs, and maintain an append-only audit ledger. p95 verify under 100ms.',
    accent: '#00C8F0',
    href: process.env.NEXT_PUBLIC_AGENTPASS_URL ?? 'http://localhost:3001/auth',
    status: 'LIVE',
    metric: '27/27 tests',
    metricLabel: 'PASSING',
  },
  {
    id: 'intellume',
    name: 'Intellume',
    category: 'AI OS',
    tagline: 'Your AI personal operating system.',
    detail: 'Unified workspace with persistent memory, autonomous task execution, and a context engine that learns how you think.',
    accent: '#FF0088',
    href: '#',
    status: 'BETA',
    metric: '<1.2s',
    metricLabel: 'RESPONSE',
  },
  {
    id: 'pipeline',
    name: '[PIPELINE]',
    category: 'NEXT PRODUCT',
    tagline: 'Classified. Something big is coming.',
    detail: 'The third pillar of the Caelum stack. Building the infrastructure layer that connects everything together.',
    accent: '#5B21FF',
    href: '#',
    status: 'SOON',
    metric: 'Q3 2025',
    metricLabel: 'TARGET',
  },
]

export default function ProductCarousel() {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setActive(p => (p + 1) % PRODUCTS.length)
        setAnimating(false)
      }, 300)
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const go = (i: number) => {
    if (i === active) return
    setAnimating(true)
    setTimeout(() => {
      setActive(i)
      setAnimating(false)
    }, 300)
  }

  const p = PRODUCTS[active]

  return (
    <div className="relative">
      {/* Product display */}
      <div
        className="product-card p-8 md:p-12 min-h-[360px] flex flex-col justify-between"
        style={{
          boxShadow: `0 0 60px ${p.accent}18`,
          borderColor: `${p.accent}22`,
          transition: 'all .4s ease',
        }}
      >
        <div className="sweep" />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-500"
          style={{ background: p.accent }}
        />

        <div
          style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(12px)' : 'translateY(0)', transition: 'all .3s ease' }}
        >
          {/* Category + status */}
          <div className="flex items-center justify-between mb-6">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: p.accent, letterSpacing: '.12em' }}>
              {p.category}
            </span>
            <span className={`badge badge-${p.status.toLowerCase().replace('soon','soon')}`}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: p.status === 'LIVE' ? '#00C8F0' : p.status === 'BETA' ? '#FF0088' : '#AAFF00', display:'inline-block' }} />
              {p.status}
            </span>
          </div>

          {/* Name */}
          <h3
            className="mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(2.4rem, 5vw, 4rem)',
              color: 'var(--ink)',
              letterSpacing: '-.03em',
              lineHeight: 1,
            }}
          >
            {p.name}
          </h3>

          {/* Tagline */}
          <p
            className="mb-4"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', color: p.accent }}
          >
            {p.tagline}
          </p>

          {/* Detail */}
          <p
            className="mb-8 max-w-md"
            style={{ fontFamily: 'var(--font-dm)', fontSize: '.9rem', color: 'var(--ink)', opacity: .55, lineHeight: 1.7 }}
          >
            {p.detail}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{ opacity: animating ? 0 : 1, transition: 'opacity .3s ease' }}
        >
          <div className="flex items-end gap-2">
            <span
              className="stat-number"
              style={{ fontSize: '1.8rem', color: p.accent, fontFamily: 'var(--font-display)' }}
            >
              {p.metric}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink)', opacity:.4, marginBottom: 4, letterSpacing: '.1em' }}>
              {p.metricLabel}
            </span>
          </div>

          {p.href !== '#' ? (
            <a href={p.href} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ background: p.accent, boxShadow: `0 0 24px ${p.accent}40` }}>
              Open ↗
            </a>
          ) : (
            <span className="btn-ghost" style={{ opacity: .5, cursor: 'not-allowed' }}>Coming soon</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mt-6">
        {PRODUCTS.map((prod, i) => (
          <button
            key={prod.id}
            onClick={() => go(i)}
            className="flex-1 py-3 rounded-xl text-xs font-600 tracking-wider uppercase transition-all duration-300"
            style={{
              fontFamily: 'var(--font-mono)',
              background: i === active ? `${prod.accent}15` : 'transparent',
              border: `1px solid ${i === active ? prod.accent + '40' : 'var(--border)'}`,
              color: i === active ? prod.accent : 'var(--ink)',
              opacity: i === active ? 1 : 0.5,
            }}
          >
            {prod.name}
          </button>
        ))}
      </div>
    </div>
  )
}
