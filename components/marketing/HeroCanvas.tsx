'use client'

import { useEffect, useRef } from 'react'

/**
 * Caelum — a living constellation.
 * The brand's entire identity: dense white points on near-black, drifting,
 * connecting to near neighbours, twinkling, and reaching toward the cursor.
 * One color. Maximum density. Pure 2D canvas — no deps, DPR-aware.
 */

const INK = '244,244,239'

type Star = {
  x: number; y: number; vx: number; vy: number
  r: number; phase: number; tw: number
}

export default function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, dpr = 1
    let stars: Star[] = []
    const mouse = { x: -9999, y: -9999, active: false }
    const LINK = 138            // neighbour link radius (px)
    const MOUSE_LINK = 200      // cursor link radius (px)

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // density scales with viewport area, capped for perf
      const count = Math.min(Math.max(Math.round((w * h) / 8200), 90), 240)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.3 + 0.5,
        phase: Math.random() * Math.PI * 2,
        tw: Math.random() * 0.7 + 0.4,
      }))
    }

    let raf = 0
    let t = 0
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, w, h)

      // drift
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy
        if (s.x < -20) s.x = w + 20; else if (s.x > w + 20) s.x = -20
        if (s.y < -20) s.y = h + 20; else if (s.y > h + 20) s.y = -20
      }

      // links between neighbours — the density
      ctx.lineWidth = 1
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i]
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < LINK * LINK) {
            const o = (1 - Math.sqrt(d2) / LINK) * 0.16
            ctx.strokeStyle = `rgba(${INK},${o})`
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
        // links toward cursor — interactive reach
        if (mouse.active) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y
          const d2 = dx * dx + dy * dy
          if (d2 < MOUSE_LINK * MOUSE_LINK) {
            const o = (1 - Math.sqrt(d2) / MOUSE_LINK) * 0.42
            ctx.strokeStyle = `rgba(${INK},${o})`
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke()
          }
        }
      }

      // points — twinkling
      for (const s of stars) {
        const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * s.tw + s.phase)
        ctx.fillStyle = `rgba(${INK},${0.85 * tw})`
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill()
      }

      raf = requestAnimationFrame(frame)
    }

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true }
    const onLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999 }
    let resizeTimer = 0
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 150) as unknown as number }

    build()
    if (reduced) { frame(); cancelAnimationFrame(raf) } // single static paint
    else raf = requestAnimationFrame(frame)

    // Pause the loop when the tab is hidden — save CPU/battery.
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else if (!reduced) raf = requestAnimationFrame(frame)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseout', onLeave)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)

    // fade the field out as the hero scrolls past — ties the canvas to the
    // same scroll-driven feel as the rest of the page.
    let scrollRaf = 0
    const onScroll = () => {
      if (reduced) return
      cancelAnimationFrame(scrollRaf)
      scrollRaf = requestAnimationFrame(() => {
        const fade = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.9))
        canvas.style.opacity = String(fade)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(scrollRaf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
