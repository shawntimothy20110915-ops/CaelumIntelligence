'use client'
import { useState } from 'react'
import { motion } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

type Cycle = 'monthly' | 'annual'

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For builders kicking the tires',
    priceMonthly: 0,
    priceAnnual: 0,
    cta: 'Start free',
    accent: brand.colors.subdued,
    highlight: false,
    features: [
      '500 verified actions / mo',
      '3 active agent passports',
      'Tamper-proof decision ledger',
      'Built-in kill switch',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For teams shipping agents to real users',
    priceMonthly: 29,
    priceAnnual: 23, // ~20% off, billed annually
    cta: 'Upgrade to Pro',
    accent: brand.colors.gold,
    highlight: true,
    features: [
      '25,000 verified actions / mo',
      '50 active agent passports',
      'Real-time human-in-the-loop approvals',
      'Cryptographic receipts + replay',
      'Trust scores & anomaly alerts',
      'Webhooks + Slack alerts',
      'Priority email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For regulated, audited, mission-critical fleets',
    priceMonthly: null,
    priceAnnual: null,
    cta: 'Talk to us',
    accent: brand.colors.accent,
    highlight: false,
    features: [
      'Unlimited actions & passports',
      'SSO / SAML + role-based access',
      'SOC 2 evidence packs on demand',
      'Merkle anchoring & portable VCs',
      'Insurance, escrow & bonding',
      'Dedicated support + SLA',
      'On-prem / VPC deployment',
    ],
  },
] as const

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkout(tierId: string) {
    if (tierId === 'free') { window.location.href = '/onboard'; return }
    if (tierId === 'enterprise') { window.location.href = 'mailto:sales@agentpass.dev?subject=AgentPass%20Enterprise'; return }
    setError(null); setLoading(tierId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier: tierId, cycle }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setError(data.error || 'Checkout is not configured yet. Add your Stripe keys to enable payments.')
    } catch {
      setError('Could not reach checkout. Try again in a moment.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <BrandFrame
      title="Pricing"
      subtitle="Start free. Pay only when your agents go to production. Cancel anytime."
      accent={brand.colors.gold}
      particleCount={50}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 40px' }}>
        {/* Billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 44 }}>
          <div style={{
            display: 'inline-flex', gap: 4, padding: 4,
            background: brand.colors.surface2, border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.pill, backdropFilter: 'blur(8px)',
          }}>
            {(['monthly', 'annual'] as Cycle[]).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                style={{
                  padding: '8px 22px', borderRadius: brand.radius.pill, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, fontFamily: brand.font.sans,
                  background: cycle === c ? brand.colors.gold : 'transparent',
                  color: cycle === c ? '#0a0a0a' : brand.colors.subdued,
                  transition: 'all .2s',
                }}>
                {c === 'monthly' ? 'Monthly' : 'Annual'}
                {c === 'annual' && <span style={{ marginLeft: 8, opacity: .8, fontSize: 12 }}>save 20%</span>}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            maxWidth: 560, margin: '0 auto 28px', textAlign: 'center', padding: '12px 18px',
            background: `${brand.colors.warn}14`, border: `1px solid ${brand.colors.warn}44`,
            borderRadius: brand.radius.md, color: brand.colors.warn, fontSize: 14,
          }}>{error}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24, alignItems: 'stretch' }}>
          {TIERS.map((t, i) => {
            const price = cycle === 'annual' ? t.priceAnnual : t.priceMonthly
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 80 }}
                whileHover={{ y: -8 }}
                style={{
                  position: 'relative', display: 'flex', flexDirection: 'column',
                  background: brand.colors.surface2, backdropFilter: 'blur(12px)',
                  border: `1px solid ${t.highlight ? t.accent + '88' : brand.colors.border}`,
                  borderRadius: brand.radius.lg, padding: 32, overflow: 'hidden',
                  boxShadow: t.highlight ? `0 0 40px ${t.accent}22` : 'none',
                }}>
                {t.highlight && (
                  <div style={{
                    position: 'absolute', top: 18, right: -34, transform: 'rotate(45deg)',
                    background: t.accent, color: '#0a0a0a', fontSize: 11, fontWeight: 700,
                    padding: '4px 40px', letterSpacing: 1,
                  }}>POPULAR</div>
                )}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `radial-gradient(circle at 50% 0%, ${t.accent}18, transparent 55%)`,
                }} />

                <div style={{ position: 'relative' }}>
                  <h3 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: brand.colors.text }}>{t.name}</h3>
                  <p style={{ color: brand.colors.muted, fontSize: 13, margin: '6px 0 24px', minHeight: 34 }}>{t.tagline}</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 28 }}>
                    {price === null ? (
                      <span style={{ fontSize: 34, fontWeight: 700, color: brand.colors.text }}>Custom</span>
                    ) : (
                      <>
                        <span style={{ fontSize: 46, fontWeight: 700, color: brand.colors.text, lineHeight: 1 }}>${price}</span>
                        <span style={{ color: brand.colors.muted, fontSize: 15 }}>/mo</span>
                      </>
                    )}
                  </div>

                  <button onClick={() => checkout(t.id)} disabled={loading === t.id}
                    style={{
                      width: '100%', padding: '13px 0', borderRadius: brand.radius.md, cursor: 'pointer',
                      fontSize: 15, fontWeight: 600, fontFamily: brand.font.sans, marginBottom: 28,
                      border: t.highlight ? 'none' : `1px solid ${brand.colors.border}`,
                      background: t.highlight ? t.accent : 'transparent',
                      color: t.highlight ? '#0a0a0a' : brand.colors.text,
                      opacity: loading === t.id ? .6 : 1, transition: 'all .2s',
                    }}>
                    {loading === t.id ? 'Redirecting…' : t.cta}
                  </button>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {t.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: brand.colors.subdued }}>
                        <span style={{ color: t.accent, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', color: brand.colors.muted, fontSize: 13, marginTop: 40 }}>
          All plans include the full trust ledger, kill switch, and SDK. Prices in USD. Need something custom?{' '}
          <a href="mailto:sales@agentpass.dev" style={{ color: brand.colors.gold }}>Email us</a>.
        </p>
      </div>
    </BrandFrame>
  )
}
