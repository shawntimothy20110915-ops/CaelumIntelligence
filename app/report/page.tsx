'use client'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

type Report = { agentId: string; score: number; scoreHistory: { date: string; score: number }[]; badges: string[]; approvals: number; denials: number; disputes: number; topMerchants: string[]; generatedAt: number }

const SCORE_COLOR = (s: number) => s >= 800 ? brand.colors.success : s >= 600 ? brand.colors.info : s >= 400 ? brand.colors.warn : brand.colors.danger

export default function ReportPage() {
  const [agentId, setAgentId] = useState('')
  const [input, setInput] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function load(id: string) {
    setLoading(true); setError('')
    fetch(`/api/credit-report?agentId=${id}`)
      .then(r => r.json())
      .then(d => { if (d.report) setReport(d.report); else setError('no report found') })
      .catch(() => setError('fetch error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/trust-score').then(r => r.json()).then(d => {
      const id = d.scores?.[0]?.agentId ?? ''
      if (id) { setInput(id); setAgentId(id); load(id) }
    })
  }, [])

  const c = report ? SCORE_COLOR(report.score) : brand.colors.muted
  const maxScore = Math.max(...(report?.scoreHistory.map(h => h.score) ?? [1]))

  return (
    <BrandFrame title="Credit Report" subtitle="Full trust history for an agent — paste an agentId and hit ↵ to load" accent={brand.colors.gold} particleCount={40}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { setAgentId(input.trim()); load(input.trim()) } }}
            placeholder="agentId…"
            style={{ flex: 1, background: 'transparent', border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.md, color: brand.colors.text, fontFamily: brand.font.mono, fontSize: 14, padding: '12px 16px', outline: 'none' }} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            onClick={() => { if (input.trim()) { setAgentId(input.trim()); load(input.trim()) } }}
            style={{ padding: '12px 24px', borderRadius: brand.radius.md, background: brand.colors.gold, border: 'none', color: brand.colors.bg, fontFamily: brand.font.mono, fontWeight: 700, cursor: 'pointer' }}>
            ↵
          </motion.button>
        </motion.div>

        {loading && (
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ textAlign: 'center', color: brand.colors.muted, fontFamily: brand.font.mono }}>scanning ledger…</motion.div>
        )}
        {error && <div style={{ color: brand.colors.danger, fontFamily: brand.font.mono, textAlign: 'center' }}>{error}</div>}

        {report && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                style={{ flex: '0 0 180px', background: brand.colors.surface, borderRadius: brand.radius.lg, padding: 24, border: `1px solid ${c}44`, textAlign: 'center' }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: c, fontFamily: brand.font.mono, filter: `drop-shadow(0 0 20px ${c}88)` }}>{report.score}</div>
                <div style={{ color: brand.colors.muted, fontFamily: brand.font.mono, fontSize: 11, marginTop: 4 }}>TRUST SCORE</div>
              </motion.div>

              <div style={{ flex: 1, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[['✓', report.approvals, brand.colors.success], ['✗', report.denials, brand.colors.danger], ['⚑', report.disputes, brand.colors.warn]].map(([icon, val, col]) => (
                  <motion.div key={String(icon)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    style={{ flex: '1 1 100px', background: brand.colors.surface, borderRadius: brand.radius.md, padding: 20, border: `1px solid ${col as string}33`, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, fontWeight: 900, color: col as string, fontFamily: brand.font.mono }}>{String(val)}</div>
                    <div style={{ fontSize: 28, color: col as string }}>{String(icon)}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ background: brand.colors.surface, borderRadius: brand.radius.lg, padding: 24, border: `1px solid ${brand.colors.border}` }}>
              <div style={{ fontFamily: brand.font.mono, fontSize: 11, color: brand.colors.muted, marginBottom: 16, letterSpacing: 2 }}>30-DAY HISTORY</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                {report.scoreHistory.map((h, i) => (
                  <motion.div key={h.date}
                    initial={{ height: 0 }} animate={{ height: `${(h.score / maxScore) * 100}%` }}
                    transition={{ delay: i * 0.1, ease: 'easeOut' }}
                    style={{ flex: 1, background: `linear-gradient(180deg, ${c}, ${c}44)`, borderRadius: '4px 4px 0 0', minHeight: 4, boxShadow: `0 0 12px ${c}44` }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {report.scoreHistory.map(h => (
                  <div key={h.date} style={{ fontFamily: brand.font.mono, fontSize: 9, color: brand.colors.muted }}>{h.date.slice(5)}</div>
                ))}
              </div>
            </motion.div>

            {report.topMerchants.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                style={{ background: brand.colors.surface, borderRadius: brand.radius.lg, padding: 24, border: `1px solid ${brand.colors.border}` }}>
                <div style={{ fontFamily: brand.font.mono, fontSize: 11, color: brand.colors.muted, marginBottom: 16, letterSpacing: 2 }}>TOP MERCHANTS</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {report.topMerchants.map((m, i) => (
                    <motion.div key={m} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.08, type: 'spring' }}
                      style={{ padding: '8px 16px', borderRadius: brand.radius.pill, background: `${brand.colors.accent}22`, border: `1px solid ${brand.colors.accent}44`, color: brand.colors.text, fontFamily: brand.font.mono, fontSize: 13 }}>
                      {m}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {report.badges.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                style={{ display: 'flex', gap: 12 }}>
                {report.badges.map((b, i) => (
                  <motion.div key={b} initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.6 + i * 0.1, type: 'spring' }}
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    style={{ width: 52, height: 52, borderRadius: '50%', background: `radial-gradient(circle, ${c}44, ${c}11)`, border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: `0 0 20px ${c}55` }}>
                    {b === 'trusted' ? '⬢' : b === 'veteran' ? '◆' : '✦'}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </BrandFrame>
  )
}
