'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const PLAN_LABELS: Record<string, { name: string; color: string }> = {
  starter: { name: 'Starter', color: 'var(--cyan)' },
  growth: { name: 'Growth', color: 'var(--violet)' },
  enterprise: { name: 'Enterprise', color: 'var(--magenta)' },
}

function SuccessContent() {
  const params = useSearchParams()
  const plan = params.get('plan') ?? 'starter'
  const { name, color } = PLAN_LABELS[plan] ?? PLAN_LABELS.starter

  useEffect(() => {
    // Mark subscription active in localStorage for dashboard badge
    localStorage.setItem('caelum_plan', plan)
    localStorage.setItem('caelum_plan_active', 'true')
  }, [plan])

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
      {/* Ambient orbs */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb orb-cyan" style={{ width: 600, height: 600, top: '-10%', left: '-10%', opacity: 0.3 }} />
        <div className="orb orb-violet" style={{ width: 400, height: 400, bottom: '0%', right: '-5%', opacity: 0.25 }} />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          maxWidth: 520,
        }}
      >
        {/* Check icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: `${color}18`,
            border: `1.5px solid ${color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            animation: 'fade-in .6s ease both',
          }}
        >
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M2 11l8 8L26 2" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: `${color}12`,
            border: `1px solid ${color}30`,
            borderRadius: 20,
            padding: '4px 14px',
            marginBottom: 22,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '.14em',
              color,
            }}
          >
            {name.toUpperCase()} PLAN ACTIVE
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            letterSpacing: '-.04em',
            lineHeight: 1.1,
            color: 'var(--ink)',
            marginBottom: 16,
          }}
        >
          You&apos;re in.
          <br />
          <span
            style={{
              background: `linear-gradient(135deg, ${color} 0%, var(--violet) 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Welcome to Caelum.
          </span>
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-dm)',
            fontSize: '.9rem',
            lineHeight: 1.65,
            color: 'var(--ink-soft)',
            marginBottom: 40,
          }}
        >
          Your {name} subscription is now active. A confirmation email is on its way.
          You have full access to the AI infrastructure layer.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 24px',
              borderRadius: 12,
              background: color,
              color: '#fff',
              fontFamily: 'var(--font-dm)',
              fontWeight: 600,
              fontSize: '.85rem',
              textDecoration: 'none',
              transition: 'opacity .2s',
            }}
          >
            Go to dashboard →
          </Link>
          <Link
            href="/pricing"
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
            View plans
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
