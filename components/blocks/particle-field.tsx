'use client'
import { useEffect, useRef } from 'react'

/**
 * Caelum "constellation" — the shared brand animation.
 * Dense white points on near-black, drifting, linking to near neighbours,
 * twinkling, and reaching toward the cursor. One color (ink). Pure 2D canvas.
 *
 * Keeps the original ParticleField/AnimatedGradient export signatures so every
 * BrandFrame page picks it up unchanged. The `color` prop is accepted but the
 * field is locked to ink to preserve the monochrome system.
 */

const INK = '244,244,239'

type Star = { x: number; y: number; vx: number; vy: number; r: number; phase: number; tw: number }

export function ParticleField({ count }: { count?: number; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const want = count

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, dpr = 1
    let stars: Star[] = []
    const mouse = { x: -9999, y: -9999, active: false }
    const LINK = 138
    const MOUSE_LINK = 200

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const auto = Math.round((w * h) / 8200)
      const n = Math.min(Math.max(want ?? auto, 70), 240)
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.3 + 0.5, phase: Math.random() * Math.PI * 2, tw: Math.random() * 0.7 + 0.4,
      }))
    }

    let raf = 0, t = 0
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy
        if (s.x < -20) s.x = w + 20; else if (s.x > w + 20) s.x = -20
        if (s.y < -20) s.y = h + 20; else if (s.y > h + 20) s.y = -20
      }
      ctx.lineWidth = 1
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i]
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j]
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy
          if (d2 < LINK * LINK) {
            const o = (1 - Math.sqrt(d2) / LINK) * 0.16
            ctx.strokeStyle = `rgba(${INK},${o})`
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
        if (mouse.active) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y, d2 = dx * dx + dy * dy
          if (d2 < MOUSE_LINK * MOUSE_LINK) {
            const o = (1 - Math.sqrt(d2) / MOUSE_LINK) * 0.42
            ctx.strokeStyle = `rgba(${INK},${o})`
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke()
          }
        }
      }
      for (const s of stars) {
        const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * s.tw + s.phase)
        ctx.fillStyle = `rgba(${INK},${0.85 * tw})`
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill()
      }
      raf = requestAnimationFrame(frame)
    }

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true }
    const onLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999 }
    let rt = 0
    const onResize = () => { clearTimeout(rt); rt = window.setTimeout(build, 150) as unknown as number }

    build()
    if (reduced) { frame(); cancelAnimationFrame(raf) }
    else raf = requestAnimationFrame(frame)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseout', onLeave)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [want])

  return <canvas ref={ref} aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
}

// A faint, slow monochrome wash — replaces the old multicolor gradient.
export function AnimatedGradient() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(900px 480px at 18% 16%, rgba(244,244,239,0.05), transparent 55%),' +
          'radial-gradient(900px 500px at 82% 84%, rgba(244,244,239,0.04), transparent 55%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 80% at 50% 0%, transparent 55%, var(--bg) 100%)',
      }} />
    </div>
  )
}
