'use client'

import Link from 'next/link'

export default function CheckoutCancelPage() {
  return (
    <main
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb orb-cyan" style={{ width: 500, height: 500, top: '-8%', right: '-5%', opacity: 0.2 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 460 }}>
        {/* X icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(13,13,13,.05)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            letterSpacing: '-.04em',
            color: 'var(--ink)',
            marginBottom: 14,
          }}
        >
          No worries.
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-dm)',
            fontSize: '.9rem',
            lineHeight: 1.65,
            color: 'var(--ink-soft)',
            marginBottom: 36,
          }}
        >
          Your checkout was cancelled. Nothing was charged. You can come back and subscribe whenever you&apos;re ready.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/pricing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 24px',
              borderRadius: 12,
              background: 'var(--ink)',
              color: '#fff',
              fontFamily: 'var(--font-dm)',
              fontWeight: 600,
              fontSize: '.85rem',
              textDecoration: 'none',
            }}
          >
            View pricing →
          </Link>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--ink-soft)',
              fontFamily: 'var(--font-dm)',
              fontWeight: 500,
              fontSize: '.85rem',
              textDecoration: 'none',
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
