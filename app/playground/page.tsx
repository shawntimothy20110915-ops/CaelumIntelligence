'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ParticleField, AnimatedGradient } from '@/components/blocks/particle-field'

type Passport = { id: string; label: string; agentId: string }
type R = { activityId: string; wouldApprove: boolean; amount?: number }

export default function PlaygroundPage() {
  const [passports, setPassports] = useState<Passport[]>([])
  const [selected, setSelected] = useState('')
  const [maxAmount, setMaxAmount] = useState(500)
  const [results, setResults] = useState<R[]>([])
  const [summary, setSummary] = useState({ total:0, wouldApprove:0, wouldDeny:0 })

  useEffect(() => {
    fetch('/api/passport/mint').then(r => r.json()).then(d => {
      setPassports(d.passports); setSelected(d.passports[0]?.id || '')
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    const t = setTimeout(async () => {
      const r = await fetch('/api/playground', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ passportId: selected, hypothesis: { maxAmount } }),
      })
      const d = await r.json()
      setResults(d.results || []); setSummary({ total: d.total, wouldApprove: d.wouldApprove, wouldDeny: d.wouldDeny })
    }, 200)
    return () => clearTimeout(t)
  }, [selected, maxAmount])

  const pctApprove = summary.total ? (summary.wouldApprove / summary.total) * 100 : 0
  const pctDeny    = summary.total ? (summary.wouldDeny    / summary.total) * 100 : 0

  return (
    <main style={{ background:'#000', minHeight:'100vh', overflow:'hidden', position:'relative' }}>
      <AnimatedGradient />
      <ParticleField count={50} color="#6366f1" />

      <div style={{ position:'relative', zIndex:1, padding:40, maxWidth:1100, margin:'0 auto' }}>

        {/* Passport selector — dots */}
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} style={{ display:'flex', gap:10, marginBottom:32, justifyContent:'center' }}>
          {passports.map(p => (
            <motion.button
              key={p.id} onClick={() => setSelected(p.id)}
              whileHover={{ scale:1.1 }} whileTap={{ scale:0.95 }}
              style={{
                width:48, height:48, borderRadius:'50%',
                background: selected === p.id ? '#6366f1' : '#141414',
                border:`2px solid ${selected === p.id ? '#fff' : '#333'}`,
                cursor:'pointer', boxShadow: selected === p.id ? '0 0 24px #6366f1' : 'none',
              }}
              title={p.label}
            />
          ))}
        </motion.div>

        {/* Slider for maxAmount — visual */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
          style={{ background:'rgba(20,20,20,0.6)', backdropFilter:'blur(12px)', border:'1px solid #222', borderRadius:16, padding:32, marginBottom:32 }}>
          <motion.div style={{ fontSize:64, fontWeight:800, color:'#fff', fontFamily:'monospace', textAlign:'center', marginBottom:20 }}>
            ${maxAmount}
          </motion.div>
          <input
            type="range" min="10" max="2000" step="10" value={maxAmount}
            onChange={e => setMaxAmount(Number(e.target.value))}
            style={{ width:'100%', accentColor:'#6366f1' }}
          />
        </motion.div>

        {/* Live bar chart */}
        <div style={{ display:'flex', gap:20, alignItems:'flex-end', height:200, marginBottom:32 }}>
          <Bar label="✓" pct={pctApprove} color="#10b981" count={summary.wouldApprove} />
          <Bar label="✗" pct={pctDeny}    color="#ef4444" count={summary.wouldDeny} />
        </div>

        {/* Result dots grid */}
        <motion.div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
          <AnimatePresence>
            {results.map((r, i) => (
              <motion.div
                key={r.activityId}
                initial={{ scale:0, opacity:0 }}
                animate={{ scale:1, opacity:1 }}
                exit={{ scale:0, opacity:0 }}
                transition={{ delay: i * 0.02, type:'spring', stiffness:200 }}
                whileHover={{ scale:1.5, y:-4 }}
                style={{
                  width:24, height:24, borderRadius:'50%',
                  background: r.wouldApprove ? '#10b981' : '#ef4444',
                  boxShadow: `0 0 8px ${r.wouldApprove ? '#10b981' : '#ef4444'}88`,
                }}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  )
}

function Bar({ label, pct, color, count }: { label: string; pct: number; color: string; count: number }) {
  return (
    <motion.div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end' }}>
      <motion.div
        animate={{ height: `${Math.max(2, pct)}%` }} transition={{ type:'spring', stiffness:80, damping:14 }}
        style={{
          width:'80%', background:`linear-gradient(180deg, ${color}, ${color}44)`,
          borderRadius:'12px 12px 4px 4px', boxShadow:`0 0 30px ${color}66`,
          display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:8,
        }}
      >
        <motion.div key={count} initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }}
          style={{ color:'#fff', fontFamily:'monospace', fontWeight:700, fontSize:24 }}>
          {count}
        </motion.div>
      </motion.div>
      <div style={{ fontSize:32, color, marginTop:8 }}>{label}</div>
    </motion.div>
  )
}
