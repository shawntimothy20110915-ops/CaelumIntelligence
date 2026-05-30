'use client'
import { motion } from 'motion/react'
import { brand } from '@/lib/brand'
import { ParticleField, AnimatedGradient } from './particle-field'
import { BrandNav } from './brand-nav'
import { BrandLogo } from './brand-logo'

export function BrandFrame({
  children,
  accent = brand.colors.gold,
  title,
  particleCount = 50,
  showNav = true,
  showFooter = true,
}: {
  children?: React.ReactNode
  accent?: string
  title?: string
  particleCount?: number
  showNav?: boolean
  showFooter?: boolean
}) {
  return (
    <main style={{
      background: brand.colors.bg, minHeight:'100vh', overflow:'hidden',
      position:'relative', fontFamily: brand.font.sans, color: brand.colors.text,
    }}>
      <AnimatedGradient />
      <ParticleField count={particleCount} color={accent} />

      {showNav && <BrandNav />}

      <div style={{ position:'relative', zIndex:1, paddingTop: showNav ? 100 : 40 }}>
        {title && (
          <motion.div
            initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
            style={{
              textAlign:'center', marginBottom:32, paddingTop:8,
            }}
          >
            <div style={{
              fontSize:10, letterSpacing:4, color: brand.colors.muted,
              fontFamily: brand.font.mono, marginBottom:8,
            }}>AGENTPASS · TRUST INFRASTRUCTURE</div>
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{
                fontFamily: brand.font.serif, fontSize:42, fontStyle:'italic',
                color: brand.colors.text, letterSpacing:0.5,
              }}
            >
              {title}
            </motion.div>
            <motion.div
              initial={{ width:0 }} animate={{ width:80 }} transition={{ delay:0.5, duration:0.8 }}
              style={{ height:2, background: accent, margin:'14px auto 0', borderRadius:2,
                boxShadow:`0 0 12px ${accent}` }}
            />
          </motion.div>
        )}
        {children}
        {showFooter && <BrandFooter />}
      </div>
    </main>
  )
}

function BrandFooter() {
  return (
    <motion.footer
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}
      style={{
        marginTop:80, padding:'32px 40px',
        borderTop:`1px solid ${brand.colors.border}`,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        maxWidth:1300, margin:'80px auto 0',
      }}
    >
      <BrandLogo size={24} withText animated={false} />
      <div style={{ fontFamily: brand.font.mono, fontSize:11, color: brand.colors.muted, letterSpacing:1 }}>
        © AGENTPASS · CAELUM INTELLIGENCE
      </div>
    </motion.footer>
  )
}
