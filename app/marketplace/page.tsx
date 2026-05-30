'use client'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ParticleField, AnimatedGradient } from '@/components/blocks/particle-field'

type Template = { id: string; name: string; vendor: string; category: string; priceUsd: number; installs: number; rating: number }

const CAT_COLOR: Record<string, string> = {
  commerce:'#10b981', finance:'#f59e0b', travel:'#3b82f6', security:'#ef4444',
}
const CAT_ICON: Record<string, string> = {
  commerce:'🛒', finance:'💰', travel:'✈', security:'🛡',
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  useEffect(() => { fetch('/api/marketplace').then(r => r.json()).then(d => setTemplates(d.templates)) }, [])
  return (
    <main style={{ background:'#000', minHeight:'100vh', overflow:'hidden', position:'relative' }}>
      <AnimatedGradient />
      <ParticleField count={60} />

      <div style={{ position:'relative', zIndex:1, padding:40, maxWidth:1300, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:24, marginTop:40 }}>
          {templates.map((t, i) => {
            const c = CAT_COLOR[t.category] || '#6366f1'
            const icon = CAT_ICON[t.category] || '◆'
            return (
              <motion.div
                key={t.id}
                initial={{ opacity:0, y:40, rotateX:-30 }}
                animate={{ opacity:1, y:0, rotateX:0 }}
                transition={{ delay: i * 0.1, type:'spring', stiffness:80 }}
                whileHover={{ y:-10, scale:1.03, rotateY:5 }}
                style={{
                  background:'rgba(20,20,20,0.6)', backdropFilter:'blur(12px)',
                  border:`1px solid ${c}44`, borderRadius:20, padding:24,
                  cursor:'pointer', position:'relative', overflow:'hidden',
                  perspective:1000, transformStyle:'preserve-3d',
                }}
              >
                <motion.div
                  animate={{ opacity:[0.1, 0.3, 0.1] }} transition={{ duration:3, repeat:Infinity, delay: i * 0.3 }}
                  style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 0%, ${c}33, transparent 60%)` }}
                />

                <motion.div
                  initial={{ scale:0, rotate:-180 }} animate={{ scale:1, rotate:0 }}
                  transition={{ delay: i * 0.1 + 0.2, type:'spring' }}
                  whileHover={{ rotate:360, scale:1.2 }}
                  style={{
                    width:64, height:64, borderRadius:16,
                    background:`linear-gradient(135deg, ${c}66, ${c}11)`,
                    border:`1px solid ${c}66`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:32, marginBottom:20, position:'relative',
                    boxShadow:`0 0 20px ${c}33`,
                  }}>
                  {icon}
                </motion.div>

                <motion.div
                  initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }}
                  transition={{ delay: i * 0.1 + 0.4, type:'spring', stiffness:200 }}
                  style={{ fontSize:48, fontWeight:900, color:'#fff', fontFamily:'monospace', position:'relative' }}>
                  ${t.priceUsd}
                </motion.div>

                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:14, position:'relative' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <motion.div
                      key={s}
                      initial={{ scale:0, rotate:-90 }} animate={{ scale:1, rotate:0 }}
                      transition={{ delay: i * 0.1 + 0.5 + s * 0.05 }}
                      style={{
                        width:14, height:14, color: s <= Math.round(t.rating) ? '#f59e0b' : '#222',
                        fontSize:16, lineHeight:1,
                      }}>★</motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i * 0.1 + 0.8 }}
                    style={{ marginLeft:'auto', color:'#666', fontFamily:'monospace', fontSize:12 }}>
                    {t.installs >= 1000 ? `${(t.installs/1000).toFixed(1)}k` : t.installs}
                  </motion.div>
                </div>

                <motion.button
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.1 + 0.9 }}
                  whileHover={{ scale:1.05, background:c }} whileTap={{ scale:0.97 }}
                  style={{
                    marginTop:20, width:'100%', padding:'12px', borderRadius:12,
                    background:`${c}22`, border:`1px solid ${c}66`, color:'#fff',
                    cursor:'pointer', fontSize:24, position:'relative',
                  }}>↓</motion.button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
