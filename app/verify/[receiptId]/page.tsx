'use client'
import { useEffect, useState, use } from 'react'
import { motion } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

export default function VerifyPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = use(params)
  const [data, setData] = useState<{ verified: boolean; anchored?: boolean; receipt?: { amount?: number; merchant?: string; decision: string; issuedAt: number } } | null>(null)

  useEffect(() => {
    fetch(`/api/verify?receiptId=${receiptId}`).then(r => r.json()).then(setData)
  }, [receiptId])

  if (!data) return <BrandFrame title="Verification" />
  const color = data.verified ? brand.colors.success : brand.colors.danger

  return (
    <BrandFrame title="Verification" accent={color} particleCount={80}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:40, padding:'0 40px' }}>
        <motion.div
          initial={{ scale:0, rotate:-90 }} animate={{ scale:1, rotate:0 }}
          transition={{ type:'spring', stiffness:80, damping:12 }}
          style={{ position:'relative', width:280, height:280 }}
        >
          {[0, 1, 2, 3].map(i => (
            <motion.div key={i}
              animate={{ scale:[1, 2], opacity:[0.4, 0] }}
              transition={{ duration:2.5, repeat:Infinity, delay: i * 0.6 }}
              style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${color}` }}
            />
          ))}
          <svg width="280" height="280" viewBox="0 0 280 280">
            <motion.circle cx="140" cy="140" r="120" fill={`${color}11`} stroke={color} strokeWidth="4"
              initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:1 }}
              style={{ filter:`drop-shadow(0 0 24px ${color})` }} />
            {data.verified ? (
              <motion.path d="M85 142 L122 178 L196 100" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ delay:0.6, duration:0.6 }}
                style={{ filter:`drop-shadow(0 0 12px ${color})` }} />
            ) : (
              <motion.g initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ delay:0.6, duration:0.6 }}>
                <line x1="95" y1="95" x2="185" y2="185" stroke={color} strokeWidth="10" strokeLinecap="round" />
                <line x1="185" y1="95" x2="95" y2="185" stroke={color} strokeWidth="10" strokeLinecap="round" />
              </motion.g>
            )}
          </svg>
        </motion.div>

        {data.anchored && (
          <motion.div
            initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:1.2 }}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', borderRadius: brand.radius.pill,
              background:`${brand.colors.info}22`, border:`1px solid ${brand.colors.info}55` }}
          >
            <motion.div animate={{ rotate:360 }} transition={{ duration:8, repeat:Infinity, ease:'linear' }}
              style={{ width:20, height:20, borderRadius:'50%', background:`conic-gradient(${brand.colors.info}, transparent)` }} />
            <span style={{ color: brand.colors.info, fontFamily: brand.font.mono, fontSize:13 }}>⛓ BTC</span>
          </motion.div>
        )}

        {data.receipt && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.4 }}
            style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}
          >
            {data.receipt.amount && <Pill v={`$${data.receipt.amount}`} color={brand.colors.success} delay={1.5} />}
            {data.receipt.merchant && <Pill v={data.receipt.merchant} color={brand.colors.accent} delay={1.65} />}
            <Pill v={data.receipt.decision} color={color} delay={1.8} />
          </motion.div>
        )}
      </div>
    </BrandFrame>
  )
}

function Pill({ v, color, delay }: { v: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ scale:0, y:20 }} animate={{ scale:1, y:0 }} transition={{ delay, type:'spring', stiffness:200 }}
      whileHover={{ scale:1.1, y:-4 }}
      style={{
        padding:'12px 24px', borderRadius: brand.radius.pill,
        background:`linear-gradient(135deg, ${color}33, ${color}11)`,
        border:`1px solid ${color}66`, color: brand.colors.text,
        fontFamily: brand.font.mono, fontWeight:700, fontSize:14,
        boxShadow:`0 0 20px ${color}33`,
      }}
    >{v}</motion.div>
  )
}
