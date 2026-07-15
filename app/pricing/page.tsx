'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const HeroCanvas = dynamic(() => import('@/components/marketing/HeroCanvas'), { ssr: false })

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: '/mo',
    description: 'For individuals and small teams getting started with AI infrastructure.',
    features: ['5 AI agents', '10K API calls / month', 'AgentPass integration', 'Email support'],
    cta: 'Get started',
    featured: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 99,
    period: '/mo',
    description: 'For growing teams that need more power and reliability.',
    features: ['25 AI agents', '100K API calls / month', 'AgentPass + trust layer', 'Custom agent workflows', 'Slack + webhook alerts', 'Priority support'],
    cta: 'Start growing',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    period: '/mo',
    description: 'For organizations that need scale, compliance, and dedicated support.',
    features: ['Unlimited AI agents', 'Unlimited API calls', 'Full AI OS access', 'SOC 2 compliance tools', 'SAML SSO', 'SLA guarantee', 'Dedicated onboarding', '24 / 7 support'],
    cta: 'Go enterprise',
    featured: false,
  },
]

function PricingCard({ plan, loading, onSelect }: { plan: (typeof PLANS)[0]; loading: boolean; onSelect: (id: string) => void }) {
  const inv = plan.featured
  return (
    <div style={{
      position: 'relative',
      background: inv ? 'var(--ink)' : 'rgba(244,244,239,0.02)',
      border: `1px solid ${inv ? 'var(--ink)' : 'var(--hair)'}`,
      borderRadius: 4, padding: '34px 30px 30px', display: 'flex', flexDirection: 'column',
    }}>
      {inv && (
        <div className="label" style={{ position: 'absolute', top: -10, left: 30, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--ink)', padding: '3px 10px', borderRadius: 2, fontSize: 9 }}>
          Most popular
        </div>
      )}
      <div className="label" style={{ color: inv ? 'rgba(6,6,7,0.55)' : 'var(--ink-40)', marginBottom: 12 }}>{plan.name}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.2rem', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, color: inv ? 'var(--bg)' : 'var(--ink)' }}>${plan.price}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: inv ? 'rgba(6,6,7,0.5)' : 'var(--ink-40)', marginBottom: 8 }}>{plan.period}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '.85rem', lineHeight: 1.6, color: inv ? 'rgba(6,6,7,0.62)' : 'var(--ink-65)', marginBottom: 26 }}>{plan.description}</p>
      <div style={{ height: 1, background: inv ? 'rgba(6,6,7,0.12)' : 'var(--hair)', marginBottom: 22 }} />
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 30, flex: 1, padding: 0 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'var(--font-body)', fontSize: '.85rem', color: inv ? 'rgba(6,6,7,0.8)' : 'var(--ink)' }}>
            <span style={{ opacity: 0.5 }}>✦</span>{f}
          </li>
        ))}
      </ul>
      <button onClick={() => onSelect(plan.id)} disabled={loading} className={inv ? 'mkt-btn' : 'mkt-btn mkt-btn-solid'}
        style={{ width: '100%', justifyContent: 'center', ...(inv ? { background: 'var(--bg)', color: 'var(--ink)', borderColor: 'var(--bg)' } : {}), opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}>
        {loading ? 'Redirecting…' : plan.cta} <span className="mkt-arr">↗</span>
      </button>
    </div>
  )
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelect(planId: string) {
    setLoading(planId)
    try {
      const origin = window.location.origin
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, successUrl: `${origin}/checkout/success?plan=${planId}`, cancelUrl: `${origin}/pricing` }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
      else { console.error('Checkout error:', data.error); setLoading(null) }
    } catch {
      setLoading(null)
    }
  }

  return (
    <main>
      <HeroCanvas />
      <div className="vignette" />
      <nav className="fixed top-0 inset-x-0 z-50" style={{ padding: '18px 28px', background: 'rgba(6,6,7,0.6)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--hair)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '.04em', color: 'var(--ink)', textDecoration: 'none' }}>CAELUM</Link>
          <Link href="/" className="label" style={{ textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </nav>

      <section style={{ position: 'relative', zIndex: 2, paddingTop: 140, paddingBottom: 100 }} className="px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center" style={{ marginBottom: 64 }}>
            <div className="label">Simple pricing</div>
            <h1 className="sheen" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', letterSpacing: '-.04em', lineHeight: .95, marginTop: 16 }}>
              Build on the layer<br />that scales with you.
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--ink-65)', maxWidth: 460, margin: '20px auto 0', lineHeight: 1.6 }}>
              No setup fees. Cancel anytime. Every plan includes a 14-day free trial.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, alignItems: 'start' }}>
            {PLANS.map(plan => <PricingCard key={plan.id} plan={plan} loading={loading === plan.id} onSelect={handleSelect} />)}
          </div>

          <div className="flex items-center justify-center flex-wrap" style={{ gap: 28, marginTop: 56 }}>
            {['SOC 2 compliant', '99.9% uptime SLA', 'Cancel anytime', 'Secure checkout · Stripe'].map(l => (
              <span key={l} className="label" style={{ fontSize: 9, color: 'var(--ink-40)' }}>✦ {l}</span>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
