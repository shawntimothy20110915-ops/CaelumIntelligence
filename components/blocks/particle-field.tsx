'use client'
import { motion } from 'motion/react'
import { useMemo } from 'react'

export function ParticleField({ count = 40, color = '#6366f1' }: { count?: number; color?: string }) {
  const dots = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 3,
    delay: Math.random() * 4,
    dur: 6 + Math.random() * 8,
  })), [count])
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
      {dots.map(d => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0], y: [0, -40] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position:'absolute', left: `${d.x}%`, top: `${d.y}%`,
            width: d.size, height: d.size, borderRadius:'50%',
            background: color, boxShadow: `0 0 ${d.size * 4}px ${color}`,
          }}
        />
      ))}
    </div>
  )
}

export function AnimatedGradient() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <motion.div
        animate={{ background: [
          'radial-gradient(circle at 20% 30%, #6366f155, transparent 50%)',
          'radial-gradient(circle at 80% 70%, #ec489955, transparent 50%)',
          'radial-gradient(circle at 50% 50%, #10b98155, transparent 50%)',
          'radial-gradient(circle at 20% 30%, #6366f155, transparent 50%)',
        ]}}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{ position:'absolute', inset:0 }}
      />
    </div>
  )
}
