'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

type Entry = { rank: number; agentId: string; passportLabel: string; score: number; approvals: number; badges: string[] }

function scoreColor(s: number) {
  if (s >= 800) return brand.colors.success
  if (s >= 600) return brand.colors.info
  if (s >= 400) return brand.colors.warn
  return brand.colors.danger
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const load = () => fetch('/api/leaderboard').then(r => r.json()).then(d => setEntries(d.leaderboard ?? []))
    load()
    const id = setInterval(() => { load(); setTick(t => t + 1) }, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <BrandFrame title="Leaderboard" subtitle="Live ranked reputation — scores update every 5 s · top 50 agents by TrustScore" accent={brand.colors.gold} particleCount={60}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <AnimatePresence>
          {entries.map((e, i) => {
            const c = scoreColor(e.score)
            const pct = e.score / 1000
            return (
              <motion.div key={e.agentId}
                layout
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 120 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  padding: '18px 24px', marginBottom: 12,
                  background: brand.colors.surface2, backdropFilter: 'blur(12px)',
                  border: `1px solid ${c}33`, borderRadius: brand.radius.lg,
                  position: 'relative', overflow: 'hidden',
                }}>
                <motion.div
                  animate={{ opacity: [0.05, 0.15, 0.05] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
                  style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 0% 50%, ${c}22, transparent 60%)` }} />

                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04 + 0.2, type: 'spring' }}
                  style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: i < 3 ? `radial-gradient(circle, ${brand.colors.gold}44, ${brand.colors.gold}11)` : brand.colors.surface,
                    border: `2px solid ${i < 3 ? brand.colors.gold : brand.colors.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: brand.font.mono, fontWeight: 900, fontSize: 18,
                    color: i < 3 ? brand.colors.gold : brand.colors.muted,
                    boxShadow: i < 3 ? `0 0 20px ${brand.colors.gold}44` : 'none',
                  }}>
                  {i === 0 ? '◆' : i === 1 ? '◉' : i === 2 ? '⬢' : `${e.rank}`}
                </motion.div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: brand.font.mono, fontWeight: 700, fontSize: 16, color: brand.colors.text, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.passportLabel}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {e.badges.map(b => (
                      <motion.span key={b}
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                        style={{ padding: '2px 10px', borderRadius: brand.radius.pill, background: `${c}22`, border: `1px solid ${c}55`, color: c, fontFamily: brand.font.mono, fontSize: 10, letterSpacing: 1 }}>
                        {b}
                      </motion.span>
                    ))}
                  </div>
                </div>

                <div style={{ flexShrink: 0, width: 140 }}>
                  <div style={{ height: 4, background: brand.colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
                      transition={{ delay: i * 0.04 + 0.3, duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', background: `linear-gradient(90deg, ${c}, ${c}88)`, borderRadius: 2, boxShadow: `0 0 8px ${c}` }} />
                  </div>
                  <motion.div key={`${e.score}-${tick}`}
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    style={{ fontFamily: brand.font.mono, fontWeight: 900, fontSize: 28, color: c, textAlign: 'right', filter: `drop-shadow(0 0 8px ${c}88)` }}>
                    {e.score}
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {entries.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', color: brand.colors.muted, fontFamily: brand.font.mono, paddingTop: 80 }}>
            no agents ranked yet
          </motion.div>
        )}
      </div>
    </BrandFrame>
  )
}
