'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const PLAN_META: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter', color: 'var(--cyan)' },
  growth: { label: 'Growth', color: 'var(--violet)' },
  enterprise: { label: 'Enterprise', color: 'var(--magenta)' },
}

export default function SubscriptionBadge() {
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    const active = localStorage.getItem('caelum_plan_active')
    const stored = localStorage.getItem('caelum_plan')
    if (active === 'true' && stored) setPlan(stored)
  }, [])

  if (!plan) {
    return (
      <Link
        href="/pricing"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 14px',
          borderRadius: 20,
          border: '1px solid var(--border)',
          background: 'transparent',
          fontFamily: 'var(--font-dm)',
          fontSize: '.78rem',
          fontWeight: 500,
          color: 'var(--ink-soft)',
          textDecoration: 'none',
          transition: 'border-color .2s, color .2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--cyan)'
          e.currentTarget.style.color = 'var(--ink)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--ink-soft)'
        }}
      >
        <span style={{ fontSize: 10 }}>✦</span>
        Upgrade
      </Link>
    )
  }

  const meta = PLAN_META[plan] ?? { label: plan, color: 'var(--cyan)' }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 14px',
        borderRadius: 20,
        background: `${meta.color}12`,
        border: `1px solid ${meta.color}30`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: meta.color,
          animation: 'pulse-dot 2s ease infinite',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '.1em',
          color: meta.color,
        }}
      >
        {meta.label.toUpperCase()}
      </span>
    </div>
  )
}
