'use client'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

type Template = { id: string; name: string; vendor: string; category: string; priceUsd: number; installs: number; rating: number }

const CAT_COLOR: Record<string, string> = {
  commerce: brand.colors.success,
  finance:  brand.colors.warn,
  travel:   brand.colors.info,
  security: brand.colors.danger,
}
const CAT_ICON: Record<string, string> = {
  commerce:'🛒', finance:'💰', travel:'✈', security:'🛡',
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  useEffect(() => { fetch('/api/marketplace').then(r => r.json()).then(d => setTemplates(d.templates)) }, [])

  return (
    <BrandFrame title="Marketplace" accent={brand.colors.gold} particleCount={60}>
      <div style={{ maxWidth:1300, margin:'0 auto', padding:'0 40px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:24 }}>
          {templates.map((t, i) => {
            const c = CAT_COLOR[t.category] || brand.colors.accent
            const icon = CAT_ICON[t.category] || '◆'
            return (
              <motion.div key={t.id}
                initial={{ opacity:0, y:40, rotateX:-30 }}
                animate={{ opacity:1, y:0, rotateX:0 }}
                transition={{ delay: i * 0.1, type:'spring', stiffness:80 }}
                whileHover={{ y:-10, scale:1.03, rotateY:5 }}
                style={{
                  background: brand.colors.surface2, backdropFilter:'blur(12px)',
                  border:`1px solid ${c}44`, borderRadius: brand.radius.lg, padding:24,
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
                    width:64, height:64, borderRadius: brand.radius.md,
                    background:`linear-gradient(135deg, ${c}66, ${c}11)`,
                    border:`1px solid ${c}66`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:32, marginBottom:20, position:'relative',
                    boxShadow:`0 0 20px ${c}33`,
                  }}>{icon}</motion.div>

                <motion.div
                  initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }}
                  transition={{ delay: i * 0.1 + 0.4, type:'spring', stiffness:200 }}
                  style={{ fontSize:48, fontWeight:900, color: brand.colors.text, fontFamily: brand.font.mono, position:'relative' }}>
                  ${t.priceUsd}
                </motion.div>

                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:14, position:'relative' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <motion.div key={s}
                      initial={{ scale:0, rotate:-90 }} animate={{ scale:1, rotate:0 }}
                      transition={{ delay: i * 0.1 + 0.5 + s * 0.05 }}
                      style={{
                        width:14, color: s <= Math.round(t.rating) ? brand.colors.warn : brand.colors.border,
                        fontSize:16, lineHeight:1,
                      }}>★</motion.div>
                  ))}
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i * 0.1 + 0.8 }}
                    style={{ marginLeft:'auto', color: brand.colors.muted, fontFamily: brand.font.mono, fontSize:12 }}>
                    {t.installs >= 1000 ? `${(t.installs/1000).toFixed(1)}k` : t.installs}
                  </motion.div>
                </div>

                <motion.button
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.1 + 0.9 }}
                  whileHover={{ scale:1.05, background:c }} whileTap={{ scale:0.97 }}
                  style={{
                    marginTop:20, width:'100%', padding:'12px', borderRadius: brand.radius.md,
                    background:`${c}22`, border:`1px solid ${c}66`, color: brand.colors.text,
                    cursor:'pointer', fontSize:24, position:'relative',
                  }}>↓</motion.button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </BrandFrame>
  )
}
