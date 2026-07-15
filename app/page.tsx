'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { APP_VERSION } from '@/lib/version'

const HeroCanvas = dynamic(() => import('@/components/marketing/HeroCanvas'), { ssr: false })

const AGENTPASS = '/auth'

// ── scroll reveal ─────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target) } }),
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    document.querySelectorAll('.scroll-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

// ── scroll parallax: sets --py (-1..1 progress through viewport) per frame,
// rAF-throttled so it never runs more than once per paint. ─────────────────
function useParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('.parallax, .parallax-fade'))
    if (!els.length) return
    let raf = 0
    const tick = () => {
      const vh = window.innerHeight
      for (const el of els) {
        const r = el.getBoundingClientRect()
        const py = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh))
        el.style.setProperty('--py', py.toFixed(4))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
}

// ── count-up ──────────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const start = performance.now(), dur = 1500
      const tick = (n: number) => {
        const p = Math.min((n - start) / dur, 1)
        setV(Math.round((1 - Math.pow(1 - p, 3)) * to))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{v}{suffix}</span>
}

// ── nav ─────────────────────────────────────────────────────────────────--
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        padding: scrolled ? '14px 28px' : '24px 28px',
        background: scrolled ? 'rgba(6,6,7,0.72)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--hair)' : '1px solid transparent',
      }}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a href="#top" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '.04em', color: 'var(--ink)', textDecoration: 'none' }}>
          CAELUM
        </a>
        <div className="hidden md:flex items-center gap-9">
          {[['Products', '#products'], ['Mission', '#mission'], ['AgentPass', AGENTPASS]].map(([l, h]) => (
            <a key={l} href={h} target={h.startsWith('http') ? '_blank' : undefined} rel={h.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="label" style={{ textDecoration: 'none', transition: 'color .25s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-40)')}>
              {l}
            </a>
          ))}
        </div>
        <a href={AGENTPASS} target="_blank" rel="noopener noreferrer" className="mkt-btn mkt-btn-solid" style={{ padding: '10px 18px' }}>
          Launch <span className="mkt-arr">↗</span>
        </a>
      </div>
    </nav>
  )
}

// ── hero ─────────────────────────────────────────────────────────────────-
function Hero() {
  return (
    <section id="top" className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center parallax-fade" style={{ zIndex: 2, '--pf': 1.1 } as React.CSSProperties}>
      <div className="r1 label mb-12">Caelum Intelligence · est. MMXXV</div>

      <h1 className="r2 sheen" style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'clamp(3.4rem, 12vw, 11rem)', letterSpacing: '-.045em', lineHeight: .88,
      }}>
        CAELUM
      </h1>

      <p className="r3" style={{
        fontFamily: 'var(--font-display)', fontWeight: 400,
        fontSize: 'clamp(1.05rem, 2.4vw, 1.6rem)', color: 'var(--ink-65)',
        letterSpacing: '-.01em', maxWidth: 540, margin: '1.8rem auto 0', lineHeight: 1.45,
      }}>
        The intelligence layer for the age of autonomous agents.
      </p>

      <div className="r4 flex flex-wrap items-center justify-center gap-3 mt-12">
        <a href="#products" className="mkt-btn">Explore the constellation</a>
        <a href={AGENTPASS} target="_blank" rel="noopener noreferrer" className="mkt-btn mkt-btn-solid">
          Launch AgentPass <span className="mkt-arr">↗</span>
        </a>
      </div>

      <div className="fade absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3" style={{ opacity: .4 }} aria-hidden>
        <span className="label" style={{ fontSize: 9 }}>Scroll</span>
        <div style={{ width: 1, height: 46, background: 'linear-gradient(var(--ink), transparent)', animation: 'float 2.4s ease-in-out infinite' }} />
      </div>
    </section>
  )
}

// ── marquee ──────────────────────────────────────────────────────────────-
function Marquee() {
  const items = ['AgentPass', 'Agent Identity', 'Delegation Proofs', 'Trust Layer', 'Audit Ledger', 'Cryptographic Auth', 'Approval Engine', 'AI Operating System']
  const row = [...items, ...items]
  return (
    <div className="relative overflow-hidden py-5" style={{ zIndex: 2, borderTop: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)' }}>
      <div className="marquee">
        {row.map((it, i) => (
          <span key={i} className="flex items-center" style={{ whiteSpace: 'nowrap' }}>
            <span className="label" style={{ color: 'var(--ink-65)' }}>{it}</span>
            <span className="mx-7" style={{ color: 'var(--ink-22)' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── mission ──────────────────────────────────────────────────────────────-
function Mission() {
  return (
    <section id="mission" className="relative px-6 py-40" style={{ zIndex: 2 }}>
      <div className="max-w-4xl mx-auto scroll-reveal">
        <div className="flex items-center gap-5 mb-12">
          <span className="label">Mission</span>
          <div className="rule flex-1" />
        </div>
        <p className="parallax" style={{
          fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 'clamp(1.7rem, 4.4vw, 3.4rem)', letterSpacing: '-.03em', lineHeight: 1.22, color: 'var(--ink-90)',
          '--pd': '14px',
        } as React.CSSProperties}>
          Agents will soon book the flights, sign the contracts, move the money.
          <span style={{ color: 'var(--ink-40)' }}> The infrastructure to trust them does not yet exist.</span>
          <span className="sheen"> We are building it.</span>
        </p>
      </div>
    </section>
  )
}

// ── products ─────────────────────────────────────────────────────────────-
const PRODUCTS = [
  { n: '01', name: 'AgentPass', desc: 'Cryptographic identity, delegation proofs, and an audit ledger for autonomous agents.', status: 'Live', href: AGENTPASS },
  { n: '02', name: 'Approval Engine', desc: 'Policy evaluation for agent actions at p95 under 100ms.', status: 'Live', href: AGENTPASS },
  { n: '03', name: '—', desc: 'A new star is forming.', status: 'Soon', href: '#' },
]

function Products() {
  return (
    <section id="products" className="relative px-6 py-28" style={{ zIndex: 2 }}>
      <div className="max-w-5xl mx-auto">
        <div className="scroll-reveal flex items-end justify-between mb-14">
          <div>
            <div className="label mb-4">The Constellation</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.4rem)', letterSpacing: '-.035em', lineHeight: 1, color: 'var(--ink)' }}>
              Products
            </h2>
          </div>
          <span className="label hidden sm:block">{PRODUCTS.length} systems</span>
        </div>

        <div className="scroll-reveal">
          {PRODUCTS.map(p => {
            const ext = p.href.startsWith('http')
            const dead = p.href === '#'
            return (
              <a key={p.n} href={p.href} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined}
                className="row group" style={dead ? { pointerEvents: 'none' } : undefined}>
                <span className="label" style={{ fontSize: 11, color: 'var(--ink-22)' }}>{p.n}</span>
                <span className="name">
                  <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(1.3rem, 3vw, 2rem)', letterSpacing: '-.02em', color: 'var(--ink)' }}>
                    {p.name}
                  </span>
                  <span style={{ display: 'block', marginTop: 8, fontFamily: 'var(--font-body)', fontSize: '.9rem', lineHeight: 1.5, color: 'var(--ink-40)', maxWidth: 460 }}>
                    {p.desc}
                  </span>
                </span>
                <span className="flex items-center gap-5">
                  <span className="label" style={{ fontSize: 9 }}>{p.status}</span>
                  {!dead && <span className="go" style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>↗</span>}
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── metrics ──────────────────────────────────────────────────────────────-
function Metrics() {
  const stats = [
    { v: 99, s: '.9%', l: 'Uptime SLA' },
    { v: 100, s: 'ms', l: 'p95 Verify' },
    { v: 7, s: 'yr', l: 'Ledger Retention' },
    { v: 27, s: '/27', l: 'Tests Passing' },
  ]
  return (
    <section className="relative px-6 py-24" style={{ zIndex: 2, borderTop: '1px solid var(--hair)' }}>
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
        {stats.map(s => (
          <div key={s.l} className="scroll-reveal text-center">
            <div className="stat-num" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', color: 'var(--ink)', lineHeight: 1 }}>
              <Counter to={s.v} suffix={s.s} />
            </div>
            <div className="label mt-4">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── footer ───────────────────────────────────────────────────────────────-
function Footer() {
  return (
    <footer className="relative px-6 pt-24 pb-12" style={{ zIndex: 2, borderTop: '1px solid var(--hair)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center gap-7 mb-20">
          <div className="label">Caelum Intelligence</div>
          <a href={AGENTPASS} target="_blank" rel="noopener noreferrer" className="sheen"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2.4rem, 8vw, 6rem)', letterSpacing: '-.04em', textDecoration: 'none', lineHeight: 1 }}>
            Build with agents you can trust.
          </a>
          <a href={AGENTPASS} target="_blank" rel="noopener noreferrer" className="mkt-btn mkt-btn-solid mt-4">
            Launch AgentPass <span className="mkt-arr">↗</span>
          </a>
        </div>
        <div className="rule mb-7" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="label" style={{ fontSize: 9 }}>© MMXXV Caelum Intelligence · v{APP_VERSION}</span>
          <div className="flex items-center gap-7">
            {[['AgentPass', AGENTPASS], ['Pricing', '/pricing']].map(([l, h]) => (
              <a key={l} href={h} target={h.startsWith('http') ? '_blank' : undefined} rel={h.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="label" style={{ fontSize: 9, textDecoration: 'none', transition: 'color .25s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-40)')}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── page ─────────────────────────────────────────────────────────────────-
export default function Home() {
  useScrollReveal()
  useParallax()
  return (
    <main>
      <HeroCanvas />
      <div className="vignette" />
      <Nav />
      <Hero />
      <Marquee />
      <Mission />
      <Products />
      <Metrics />
      <Footer />
    </main>
  )
}
