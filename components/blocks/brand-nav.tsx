'use client'
import { motion } from 'motion/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { brand, nav } from '@/lib/brand'
import { BrandLogo } from './brand-logo'

export function BrandNav() {
  const path = usePathname()
  const isActive = (href: string) => href === '/' ? path === '/' : path.startsWith(href)

  return (
    <motion.header
      initial={{ y:-40, opacity:0 }}
      animate={{ y:0, opacity:1 }}
      transition={{ type:'spring', stiffness:120, damping:18 }}
      style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        display:'flex', justifyContent:'center', padding:'18px 24px',
      }}
    >
      <motion.div
        style={{
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(10,10,10,0.7)', backdropFilter:'blur(16px)',
          border:`1px solid ${brand.colors.gold}33`, borderRadius: brand.radius.pill,
          padding:'10px 14px',
          boxShadow:`0 0 40px ${brand.colors.gold}11, inset 0 1px 0 ${brand.colors.gold}22`,
        }}
      >
        <Link href="/" style={{ textDecoration:'none', padding:'0 10px', display:'flex', alignItems:'center' }}>
          <BrandLogo size={28} withText={false} animated={false} />
        </Link>
        <div style={{ width:1, height:24, background: brand.colors.border }} />
        {nav.map(n => {
          const active = isActive(n.href)
          return (
            <Link key={n.href} href={n.href} style={{ textDecoration:'none', position:'relative' }}>
              <motion.div
                whileHover={{ scale:1.06 }} whileTap={{ scale:0.95 }}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 14px', borderRadius: brand.radius.pill,
                  background: active ? `${brand.colors.gold}22` : 'transparent',
                  color: active ? brand.colors.gold : brand.colors.subdued,
                  fontSize:13, fontWeight: active ? 700 : 500,
                  letterSpacing: 0.4, fontFamily: brand.font.sans,
                  border: active ? `1px solid ${brand.colors.gold}55` : '1px solid transparent',
                  cursor:'pointer', transition:'color 0.2s',
                }}
              >
                <span style={{ fontSize:16, lineHeight:1 }}>{n.icon}</span>
                <span style={{ textTransform:'uppercase' }}>{n.label}</span>
                {active && (
                  <motion.div
                    layoutId="nav-glow"
                    style={{ position:'absolute', inset:0, borderRadius: brand.radius.pill,
                      boxShadow:`0 0 20px ${brand.colors.gold}55`, pointerEvents:'none' }}
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </motion.div>
    </motion.header>
  )
}
