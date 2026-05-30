'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ParticleField, AnimatedGradient } from '@/components/blocks/particle-field'

type Activity = {
  id: string; passportId: string; agentLabel: string; type: string;
  amount?: number; merchant?: string; decision?: string; ts: number;
}

const colorFor = (d?: string) =>
  d === 'approved' ? '#10b981' :
  d === 'denied' ? '#ef4444' :
  d === 'human_review' ? '#f59e0b' : '#6366f1'

export default function LivePage() {
  const [items, setItems] = useState<Activity[]>([])

  useEffect(() => {
    const tick = async () => {
      const r = await fetch('/api/activity?limit=40')
      const d = await r.json()
      setItems(d.activity)
    }
    tick()
    const t = setInterval(tick, 1500)
    return () => clearInterval(t)
  }, [])

  const approved = items.filter(i => i.decision === 'approved').length
  const denied   = items.filter(i => i.decision === 'denied').length
  const review   = items.filter(i => i.decision === 'human_review').length

  return (
    <main style={{ background:'#000', minHeight:'100vh', overflow:'hidden', position:'relative' }}>
      <AnimatedGradient />
      <ParticleField count={60} />

      <div style={{ position:'relative', zIndex:1, padding:40, maxWidth:1200, margin:'0 auto' }}>
        <motion.div
          initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}
          style={{ display:'flex', justifyContent:'center', gap:24, marginBottom:40 }}
        >
          <BigStat value={approved} color="#10b981" />
          <BigStat value={review}   color="#f59e0b" />
          <BigStat value={denied}   color="#ef4444" />
        </motion.div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <AnimatePresence initial={false}>
            {items.slice(0, 30).map((a, i) => {
              const c = colorFor(a.decision)
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity:0, x:-60, scale:0.9 }}
                  animate={{ opacity:1, x:0, scale:1 }}
                  exit={{ opacity:0, scale:0.9 }}
                  transition={{ delay: i * 0.02, type:'spring', stiffness:200, damping:20 }}
                  whileHover={{ scale:1.02, x:6 }}
                  style={{
                    background:'rgba(20,20,20,0.6)',
                    backdropFilter:'blur(12px)',
                    border:`1px solid ${c}33`,
                    borderLeft:`3px solid ${c}`,
                    borderRadius:10,
                    padding:'14px 18px',
                    display:'flex', alignItems:'center', gap:16,
                    boxShadow: `0 0 20px ${c}11`,
                  }}
                >
                  <motion.div
                    animate={{ scale:[1, 1.4, 1], boxShadow:[`0 0 0 0 ${c}`, `0 0 0 8px ${c}00`, `0 0 0 0 ${c}`] }}
                    transition={{ duration:1.6, repeat:Infinity }}
                    style={{ width:10, height:10, borderRadius:'50%', background:c }}
                  />
                  <div style={{ flex:1, color:'#fff', fontFamily:'monospace', fontSize:13, opacity:0.85 }}>
                    {a.agentLabel.split(' ')[0]}
                  </div>
                  {a.amount !== undefined && (
                    <motion.div
                      initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }}
                      style={{ color:c, fontWeight:700, fontSize:18, fontFamily:'monospace' }}
                    >
                      ${a.amount}
                    </motion.div>
                  )}
                  <DecisionIcon decision={a.decision} color={c} />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}

function BigStat({ value, color }: { value: number; color: string }) {
  return (
    <motion.div
      whileHover={{ scale:1.1 }}
      style={{
        background:'rgba(20,20,20,0.6)', backdropFilter:'blur(12px)',
        border:`1px solid ${color}44`, borderRadius:16,
        width:120, height:120, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden',
      }}
    >
      <motion.div
        animate={{ opacity:[0.1, 0.4, 0.1] }}
        transition={{ duration:3, repeat:Infinity }}
        style={{ position:'absolute', inset:0, background:`radial-gradient(circle, ${color}33, transparent 70%)` }}
      />
      <motion.div
        key={value}
        initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }}
        transition={{ type:'spring', stiffness:200, damping:15 }}
        style={{ fontSize:48, fontWeight:800, color, fontFamily:'monospace', position:'relative' }}
      >
        {value}
      </motion.div>
      <div style={{ width:8, height:8, borderRadius:'50%', background:color, marginTop:4, position:'relative' }} />
    </motion.div>
  )
}

function DecisionIcon({ decision, color }: { decision?: string; color: string }) {
  return (
    <motion.svg
      width="28" height="28" viewBox="0 0 28 28"
      initial={{ rotate:-180, opacity:0 }} animate={{ rotate:0, opacity:1 }}
      transition={{ type:'spring', stiffness:200 }}
    >
      <circle cx="14" cy="14" r="13" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
      {decision === 'approved' && <motion.path d="M8 14 L12 18 L20 10" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:0.4 }} />}
      {decision === 'denied' && <motion.g initial={{ pathLength:0 }} animate={{ pathLength:1 }}>
        <line x1="9" y1="9" x2="19" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="19" y1="9" x2="9" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>}
      {decision === 'human_review' && <motion.g>
        <rect x="10" y="9" width="3" height="10" fill={color} rx="1" />
        <rect x="15" y="9" width="3" height="10" fill={color} rx="1" />
      </motion.g>}
    </motion.svg>
  )
}
