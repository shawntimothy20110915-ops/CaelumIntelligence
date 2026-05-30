'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

const STEPS = [
  { icon:'◉', color: brand.colors.accent },
  { icon:'⬢', color: '#ec4899' },
  { icon:'◆', color: brand.colors.warn },
  { icon:'✦', color: brand.colors.success },
]
const USECASES = [
  { v:'purchase', icon:'🛒' }, { v:'refund', icon:'↩' }, { v:'search', icon:'⌕' },
  { v:'booking',  icon:'✈' }, { v:'transfer', icon:'⇄' },
]

export default function OnboardPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [usecase, setUsecase] = useState('purchase')
  const [budget, setBudget] = useState(500)
  const [passportId, setPassportId] = useState('')

  async function go() {
    if (step < 2) { setStep(step + 1); return }
    if (step === 2) {
      const mint = await fetch('/api/passport/mint', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ label: name || 'agent', ttlDays:30, budgetUsd: budget }) })
      const md = await mint.json()
      setPassportId(md.passport.id)
      await fetch('/api/proof/delegate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ passportId: md.passport.id, grantedTo: name, permissions:[usecase], ttlHours:24, maxAmount: budget }) })
      setStep(3)
    }
  }

  const c = STEPS[step].color

  return (
    <BrandFrame title="Onboarding" accent={c} particleCount={60}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 24px', minHeight:'70vh', justifyContent:'center' }}>

        <div style={{ display:'flex', gap:14, marginBottom:60 }}>
          {STEPS.map((s, i) => (
            <motion.div key={i}
              animate={{
                width: i === step ? 40 : 12,
                background: i <= step ? s.color : brand.colors.border,
                boxShadow: i === step ? `0 0 16px ${s.color}` : 'none',
              }}
              transition={{ type:'spring', stiffness:200 }}
              style={{ height:12, borderRadius:6 }}/>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="name"
              initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-30 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32 }}>
              <motion.div animate={{ scale:[1, 1.05, 1] }} transition={{ duration:2, repeat:Infinity }}
                style={{ fontSize:80, color:c, filter:`drop-shadow(0 0 20px ${c})` }}>◉</motion.div>
              <input autoFocus value={name} onChange={e => setName(e.target.value)}
                style={{
                  background:'transparent', border:'none', borderBottom:`2px solid ${c}`,
                  color: brand.colors.text, fontSize:48, fontWeight:700, textAlign:'center',
                  width:400, outline:'none', padding:'12px 0', fontFamily: brand.font.mono,
                }}/>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="usecase"
              initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-30 }}
              style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:20 }}>
              {USECASES.map((u, i) => (
                <motion.button key={u.v}
                  initial={{ scale:0, rotate:-90 }} animate={{ scale:1, rotate:0 }}
                  transition={{ delay: i * 0.1, type:'spring', stiffness:150 }}
                  whileHover={{ scale:1.15, y:-8 }} whileTap={{ scale:0.95 }}
                  onClick={() => setUsecase(u.v)}
                  style={{
                    width:120, height:120, borderRadius: brand.radius.lg, cursor:'pointer',
                    background: usecase === u.v ? `linear-gradient(135deg, ${c}66, ${c}11)` : brand.colors.surface,
                    border: usecase === u.v ? `2px solid ${c}` : `1px solid ${brand.colors.border}`,
                    boxShadow: usecase === u.v ? `0 0 30px ${c}66` : 'none',
                    fontSize:48, color: brand.colors.text,
                  }}>{u.icon}</motion.button>
              ))}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="budget"
              initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-30 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32, width:500 }}>
              <motion.div key={budget} initial={{ scale:0.8 }} animate={{ scale:1 }} transition={{ type:'spring' }}
                style={{ fontSize:96, fontWeight:900, color:c, fontFamily: brand.font.mono, filter:`drop-shadow(0 0 20px ${c}88)` }}>
                ${budget}
              </motion.div>
              <input type="range" min="50" max="5000" step="50" value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                style={{ width:'100%', accentColor:c }}/>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="done"
              initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32, position:'relative' }}>
              {[0, 1, 2, 3].map(i => (
                <motion.div key={i}
                  animate={{ scale:[1, 2.5], opacity:[0.6, 0] }}
                  transition={{ duration:2.5, repeat:Infinity, delay: i * 0.5 }}
                  style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:`2px solid ${c}` }}/>
              ))}
              <motion.div
                initial={{ rotate:-180 }} animate={{ rotate:0 }} transition={{ type:'spring', stiffness:100 }}
                style={{ fontSize:120, color:c, filter:`drop-shadow(0 0 30px ${c})` }}>✦</motion.div>
              <motion.a href={`/trust/${passportId.replace('pass-','')}`}
                initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
                whileHover={{ scale:1.1 }}
                style={{
                  padding:'16px 40px', borderRadius: brand.radius.pill,
                  background:`linear-gradient(135deg, ${c}, ${c}88)`,
                  color: brand.colors.text, textDecoration:'none', fontWeight:700, letterSpacing:2,
                  boxShadow:`0 0 40px ${c}88`,
                }}>→</motion.a>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 3 && (
          <motion.button onClick={go}
            whileHover={{ scale:1.1, x:6 }} whileTap={{ scale:0.95 }}
            style={{
              marginTop:60, width:80, height:80, borderRadius:'50%', cursor:'pointer',
              background:`linear-gradient(135deg, ${c}, ${c}88)`, border:'none',
              color: brand.colors.text, fontSize:36, boxShadow:`0 0 30px ${c}66`,
            }}>→</motion.button>
        )}
      </div>
    </BrandFrame>
  )
}
