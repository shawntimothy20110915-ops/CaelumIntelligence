'use client'
import { motion } from 'motion/react'
import { brand } from '@/lib/brand'

export function BrandLogo({ size = 36, withText = true, animated = true }: { size?: number; withText?: boolean; animated?: boolean }) {
  const c = brand.colors.gold
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12 }}>
      <motion.svg
        width={size} height={size} viewBox="0 0 40 40"
        initial={animated ? { rotate:-90, scale:0 } : false}
        animate={animated ? { rotate:0, scale:1 } : { rotate:0, scale:1 }}
        transition={{ type:'spring', stiffness:150, damping:14 }}
      >
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor={c} />
            <stop offset="100%" stopColor={brand.colors.goldDeep} />
          </linearGradient>
        </defs>
        {/* outer hex */}
        <motion.polygon
          points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5"
          fill="none" stroke="url(#logoGrad)" strokeWidth="2"
          initial={animated ? { pathLength:0 } : false}
          animate={animated ? { pathLength:1 } : { pathLength:1 }}
          transition={{ duration:1.2, ease:'easeOut' }}
        />
        {/* inner glyph */}
        <motion.path
          d="M14 26 L20 12 L26 26 M16.5 22 L23.5 22"
          stroke="url(#logoGrad)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={animated ? { pathLength:0 } : false}
          animate={animated ? { pathLength:1 } : { pathLength:1 }}
          transition={{ duration:0.8, delay:0.5, ease:'easeOut' }}
        />
        {/* dot */}
        <motion.circle cx="20" cy="20" r="1.5" fill={c}
          initial={animated ? { scale:0 } : false}
          animate={animated ? { scale:[0, 1.6, 1] } : { scale:1 }}
          transition={{ duration:0.6, delay:1.2 }}
        />
      </motion.svg>
      {withText && (
        <motion.div
          initial={animated ? { opacity:0, x:-6 } : false}
          animate={animated ? { opacity:1, x:0 } : { opacity:1, x:0 }}
          transition={{ delay:0.6 }}
          style={{ fontFamily: brand.font.sans, fontWeight:700, fontSize:16, letterSpacing:1.5, color: brand.colors.text }}
        >
          AGENT<span style={{ color: c }}>PASS</span>
        </motion.div>
      )}
    </div>
  )
}
