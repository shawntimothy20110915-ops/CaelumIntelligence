'use client'
import { useEffect, useState, use } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { ParticleField, AnimatedGradient } from '@/components/blocks/particle-field'

type TrustScore = { agentId: string; score: number; approvals: number; denials: number; disputes: number; ageDays: number; badges: string[] }
type Passport = { id: string; label: string; agentId: string }

export default function TrustPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const [score, setScore] = useState<TrustScore | null>(null)
  const [passport, setPassport] = useState<Passport | null>(null)
  const counter = useMotionValue(0)
  const rounded = useTransform(counter, v => Math.round(v))

  useEffect(() => {
    fetch(`/api/trust-score?agentId=${agentId}`).then(r => r.json()).then(d => {
      if (d.score) {
        setScore(d.score); setPassport(d.passport)
        animate(counter, d.score.score, { duration: 1.8, ease:'easeOut' })
      }
    })
  }, [agentId, counter])

  if (!score || !passport) return <main style={{ background:'#000', minHeight:'100vh' }}><ParticleField /></main>

  const color = score.score >= 800 ? '#10b981' : score.score >= 600 ? '#3b82f6' : score.score >= 400 ? '#f59e0b' : '#ef4444'
  const pct = score.score / 1000

  return (
    <main style={{ background:'#000', minHeight:'100vh', overflow:'hidden', position:'relative' }}>
      <AnimatedGradient />
      <ParticleField count={50} color={color} />

      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>

        {/* Big animated ring */}
        <motion.div
          initial={{ scale:0, rotate:-90 }} animate={{ scale:1, rotate:0 }}
          transition={{ type:'spring', stiffness:80, damping:14 }}
          style={{ position:'relative', width:360, height:360, marginBottom:40 }}
        >
          {/* outer pulse rings */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ scale:[1, 1.4], opacity:[0.4, 0] }}
              transition={{ duration:2.5, repeat:Infinity, delay: i * 0.8 }}
              style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${color}` }}
            />
          ))}

          <svg width="360" height="360" viewBox="0 0 360 360" style={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
            <circle cx="180" cy="180" r="160" fill="none" stroke="#222" strokeWidth="12" />
            <motion.circle
              cx="180" cy="180" r="160" fill="none"
              stroke={color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 160}
              initial={{ strokeDashoffset: 2 * Math.PI * 160 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 160 * (1 - pct) }}
              transition={{ duration:1.8, ease:'easeOut' }}
              style={{ filter:`drop-shadow(0 0 12px ${color})` }}
            />
          </svg>

          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <motion.div style={{ fontSize:96, fontWeight:900, color, fontFamily:'monospace' }}>
              {rounded}
            </motion.div>
            <motion.div
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.8 }}
              style={{ display:'flex', gap:6, marginTop:8 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay: 1.8 + i*0.1, type:'spring' }}
                  style={{ width:8, height:8, borderRadius:'50%', background: i < Math.ceil(pct*5) ? color : '#222' }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Orbiting badges */}
        <div style={{ display:'flex', gap:16, marginBottom:32 }}>
          {score.badges.map((b, i) => (
            <motion.div
              key={b}
              initial={{ scale:0, rotate:180 }} animate={{ scale:1, rotate:0 }}
              transition={{ delay: 0.5 + i*0.15, type:'spring', stiffness:150 }}
              whileHover={{ scale:1.2, rotate:10 }}
              style={{
                width:56, height:56, borderRadius:'50%',
                background:`radial-gradient(circle, ${color}44, ${color}11)`,
                border:`2px solid ${color}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:24, boxShadow:`0 0 24px ${color}66`,
              }}
            >
              {b === 'trusted' ? '⬢' : b === 'veteran' ? '◆' : b === 'clean' ? '✦' : '★'}
            </motion.div>
          ))}
        </div>

        {/* Stat bars (no labels) */}
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', height:120 }}>
          <StatBar value={score.approvals} max={Math.max(score.approvals, score.denials, score.disputes, 1)} color="#10b981" delay={0.2} />
          <StatBar value={score.denials}   max={Math.max(score.approvals, score.denials, score.disputes, 1)} color="#ef4444" delay={0.4} />
          <StatBar value={score.disputes}  max={Math.max(score.approvals, score.denials, score.disputes, 1)} color="#f59e0b" delay={0.6} />
          <StatBar value={score.ageDays}   max={365} color="#3b82f6" delay={0.8} />
        </div>
      </div>
    </main>
  )
}

function StatBar({ value, max, color, delay }: { value: number; max: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ height:0, opacity:0 }}
      animate={{ height: 4 + (value / max) * 100, opacity:1 }}
      transition={{ delay, duration:1, ease:'easeOut' }}
      whileHover={{ scaleY:1.1 }}
      style={{
        width:32, background:`linear-gradient(180deg, ${color}, ${color}66)`,
        borderRadius:6, boxShadow:`0 0 16px ${color}66`,
      }}
    />
  )
}
