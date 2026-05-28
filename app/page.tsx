'use client'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  motion, useScroll, useTransform, useSpring,
  useInView, useMotionValue,
} from 'framer-motion'

const gold = '#d4a35a'
const goldSoft = '#c49648'
const bg = '#0a0a0d'
const ink = '#f4ecdd'
const inkSoft = '#d3c8b3'
const inkMute = '#968a76'
const signal = '#d3604a'
const evergreen = '#5a7d63'

function ProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })
  return (
    <motion.div
      style={{ scaleX, transformOrigin: 'left', background: `linear-gradient(90deg, ${gold}, ${goldSoft})` }}
      className="fixed top-0 left-0 right-0 h-[2px] z-[100]"
    />
  )
}

function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = useState('0')
  useEffect(() => {
    if (!inView) return
    const start = Date.now(), dur = 1600
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 4)
      setDisplay(Number.isInteger(to) ? Math.round(e * to).toString() : (e * to).toFixed(1))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, to])
  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

function MagBtn({ children, className = '', href }: { children: React.ReactNode; className?: string; href: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  return (
    <motion.a
      href={href}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setPos({ x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.18 })
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      className={className}
    >{children}</motion.a>
  )
}

function OrbitalRing({ size, dur, color, delay = 0 }: { size: number; dur: number; color: string; delay?: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: size, height: size, left: '50%', top: '50%',
        marginLeft: -size / 2, marginTop: -size / 2,
        border: `1px solid ${color}`, opacity: 0.18,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: dur, repeat: Infinity, ease: 'linear', delay }}
    />
  )
}

function Orb({ x, y, size, color, delay = 0 }: { x: string; y: string; size: number; color: string; delay?: number }) {
  return (
    <motion.div
      style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, filter: 'blur(60px)', opacity: 0.35, pointerEvents: 'none' }}
      animate={{ y: [0, -30, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

function Seal({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={gold} /><stop offset="1" stopColor={ink} />
        </linearGradient>
      </defs>
      <polygon points="18,2 31,8 35,18 31,28 18,34 5,28 1,18 5,8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <polygon points="18,7 27,11 30,18 27,25 18,29 9,25 6,18 9,11" fill="url(#sg)" />
      <text x="18" y="22.5" textAnchor="middle" fontFamily="Instrument Serif,serif" fontSize="11" fill={bg}>A</text>
    </svg>
  )
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } } }

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(heroScroll, [0, 1], [0, 120])
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0])

  return (
    <div style={{ background: bg, color: ink, fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <ProgressBar />

      {/* NAV */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(24px) saturate(120%)', background: 'rgba(10,10,13,0.78)', borderBottom: '1px solid rgba(255,245,220,0.07)' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Seal />
            <span style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, letterSpacing: '-0.012em', color: ink }}>AgentPass</span>
          </Link>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {['Product', 'Docs', 'Pricing', 'Status'].map(l => (
              <a key={l} href={`/${l.toLowerCase()}`} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: inkMute, textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = ink)}
                onMouseLeave={e => (e.currentTarget.style.color = inkMute)}
              >{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="/workspace" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: inkMute, textDecoration: 'none' }}>Sign in</a>
            <MagBtn href="/workspace" className="nav-cta-btn">Open workspace →</MagBtn>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', isolation: 'isolate' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <Orb x="10%" y="15%" size={500} color={gold} delay={0} />
          <Orb x="60%" y="30%" size={600} color={evergreen} delay={2} />
          <Orb x="35%" y="60%" size={300} color="#7aa2f7" delay={4} />
        </div>
        <div style={{ position: 'absolute', inset: '-10%', backgroundImage: 'linear-gradient(rgba(255,245,220,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,245,220,0.05) 1px,transparent 1px)', backgroundSize: '80px 80px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 70%)', animation: 'gridDrift 30s linear infinite', pointerEvents: 'none' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, position: 'relative', zIndex: 2, width: '100%' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 32px 80px' }}>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} style={{ marginBottom: 40 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 10px', borderRadius: 999, border: `1px solid rgba(212,163,90,0.3)`, background: 'rgba(212,163,90,0.07)', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: gold }}>
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: 999, background: gold, boxShadow: `0 0 0 4px rgba(212,163,90,0.2)`, display: 'inline-block' }} />
                Edition 04 · Merchant Verify API · Live Pilot
              </span>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.h1 variants={fadeUp} style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 'clamp(56px,9vw,148px)', lineHeight: 0.9, letterSpacing: '-0.022em', color: ink, margin: 0, maxWidth: '18ch' }}>
                The trust&nbsp;layer for the{' '}
                <em style={{ fontStyle: 'italic', color: gold, textShadow: `0 0 80px rgba(212,163,90,0.4)` }}>agent economy.</em>
              </motion.h1>
              <motion.p variants={fadeUp} style={{ marginTop: 36, fontSize: 19, lineHeight: 1.65, color: inkSoft, maxWidth: '52ch' }}>
                AgentPass verifies AI agents, enforces user permissions, records every decision, and keeps post-purchase exceptions inside one trusted, auditable path.
              </motion.p>
              <motion.div variants={fadeUp} style={{ marginTop: 40, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <MagBtn href="/workspace" className="btn-hero-primary">Start for free →</MagBtn>
                <MagBtn href="/docs" className="btn-hero-ghost">See how it works</MagBtn>
              </motion.div>
            </motion.div>

            {/* Metric strip */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }}
              style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'rgba(255,245,220,0.07)', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,245,220,0.07)' }}>
              {[
                { val: 100, suffix: '%', label: 'Events ledgered', note: 'Append-only audit trail' },
                { val: 100, prefix: '<', suffix: 'ms', label: 'Verify-proof p95', note: 'Deterministic decisions' },
                { val: 1.2, suffix: 's', label: 'Kill-switch propagation', note: 'Network-wide revocation' },
                { val: 27, suffix: '/27', label: 'Tests passing', note: 'Regression coverage' },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.08 }}
                  whileHover={{ background: 'rgba(212,163,90,0.06)' } as any}
                  style={{ background: 'rgba(10,10,13,0.9)', padding: '28px 24px', cursor: 'default', transition: 'background .2s' }}>
                  <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 'clamp(36px,4vw,52px)', lineHeight: 1, letterSpacing: '-0.02em', color: ink }}>
                    <Counter to={m.val} prefix={m.prefix} suffix={m.suffix} />
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: gold, marginTop: 10 }}>{m.label}</div>
                  <div style={{ fontSize: 13, color: inkMute, marginTop: 4, lineHeight: 1.5 }}>{m.note}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* TRUST CHAIN FEATURES */}
      <section style={{ padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: gold }}>Architecture</span>
            <h2 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 'clamp(40px,5vw,72px)', lineHeight: 1, letterSpacing: '-0.016em', color: ink, margin: '16px 0 0', textWrap: 'balance' as any }}>
              Four primitives.<br /><em style={{ fontStyle: 'italic', color: gold }}>One chain of trust.</em>
            </h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            {[
              { num: '01', title: 'Agent Passport', color: gold, body: 'A cryptographic identity for each agent — bound to the user, scoped by model class and capability tier. The trust container the rest of the system keys off of.', icon: <svg viewBox="0 0 48 48" width="40" height="40"><polygon points="24,3 42,12 45,24 42,36 24,45 6,36 3,24 6,12" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.8"/><text x="24" y="30" textAnchor="middle" fontFamily="Instrument Serif" fontSize="16" fontStyle="italic" fill={gold}>A</text></svg> },
              { num: '02', title: 'Delegation Proofs', color: '#7aa2f7', body: "Signed authorizations a merchant can verify without trusting AgentPass. HMAC over the proof's identifying fields. Scoped, expiring, revocable in real time.", icon: <svg viewBox="0 0 48 48" width="40" height="40"><rect x="6" y="12" width="36" height="26" rx="3" fill="none" stroke="#7aa2f7" strokeWidth="1.2" opacity="0.8"/><path d="M 10 20 L 24 30 L 38 20" fill="none" stroke="#7aa2f7" strokeWidth="1.2" opacity="0.8"/></svg> },
              { num: '03', title: 'Approval Engine', color: evergreen, body: 'Every action evaluated against policy. Low-risk grocery purchases auto-clear; critical actions always pause for a human. Approvals expire if no one decides.', icon: <svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="18" fill="none" stroke={evergreen} strokeWidth="1.2" opacity="0.8"/><path d="M 16 24 L 22 30 L 32 18" fill="none" stroke={evergreen} strokeWidth="2"/></svg> },
              { num: '04', title: 'Action Ledger', color: '#c8a0ff', body: 'Append-only audit trail of every state change. Click any action and see exactly who authorized what, when, and under which proof.', icon: <svg viewBox="0 0 48 48" width="40" height="40"><rect x="10" y="4" width="28" height="40" rx="2" fill="none" stroke="#c8a0ff" strokeWidth="1.2" opacity="0.8"/><line x1="15" y1="14" x2="33" y2="14" stroke="#c8a0ff" strokeWidth="0.8"/><line x1="15" y1="20" x2="33" y2="20" stroke="#c8a0ff" strokeWidth="0.8"/><line x1="15" y1="26" x2="28" y2="26" stroke="#c8a0ff" strokeWidth="0.8"/></svg> },
            ].map((card, i) => (
              <motion.div key={card.num} variants={fadeUp} whileHover={{ y: -4 } as any}
                style={{ position: 'relative', padding: 40, borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,245,220,0.08)', background: 'rgba(14,15,19,0.8)', cursor: 'default' }}>
                {/* Orbital rings */}
                <div style={{ position: 'absolute', right: 32, top: '50%', marginTop: -100, width: 200, height: 200, pointerEvents: 'none' }}>
                  <OrbitalRing size={120} dur={18} color={card.color} />
                  <OrbitalRing size={160} dur={28} color={card.color} delay={1} />
                  <OrbitalRing size={200} dur={40} color={card.color} delay={2} />
                  <div style={{ position: 'absolute', left: '50%', top: '50%', width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: '50%', background: `radial-gradient(circle, ${card.color} 0%, transparent 70%)`, opacity: 0.2, filter: 'blur(12px)' }} />
                </div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ marginBottom: 20 }}>{card.icon}</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: card.color, marginBottom: 10 }}>{card.num}</div>
                  <h3 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 30, lineHeight: 1.05, color: ink, margin: '0 0 16px' }}>{card.title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: inkSoft, maxWidth: '44ch' }}>{card.body}</p>
                </div>
                <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.15 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${card.color}, transparent 60%)`, transformOrigin: 'left' }} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3-STEP SETUP */}
      <section style={{ padding: '120px 0', borderTop: '1px solid rgba(255,245,220,0.07)', background: 'rgba(14,15,19,0.5)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ marginBottom: 72 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: gold }}>Quick start</span>
            <h2 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 'clamp(38px,5vw,68px)', lineHeight: 1, letterSpacing: '-0.014em', color: ink, margin: '16px 0 0' }}>
              Up in <em style={{ fontStyle: 'italic', color: gold }}>five minutes.</em>
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 48, position: 'relative' }}>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3 }}
              style={{ position: 'absolute', top: 40, left: '17%', right: '17%', height: 1, background: `linear-gradient(90deg, ${gold}, rgba(212,163,90,0.2))`, transformOrigin: 'left', zIndex: 0 }} />
            {[
              { step: '01', title: 'Sign in & mint a passport', body: "Email link or SSO. Bind your first agent to a user, pick a model class, set a default scope.", time: '≈ 90s' },
              { step: '02', title: 'Wire one merchant endpoint', body: "Paste one curl into your merchant's checkout. Returns a deterministic decision — no SDK required.", time: '≈ 2 min' },
              { step: '03', title: 'See your first signed receipt', body: 'Run a test action. Your ledger fills in. Signed, HMAC-recomputable, replayable — forever.', time: '≈ 90s' },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.55, delay: i * 0.15 }} style={{ position: 'relative', zIndex: 1 }}>
                <motion.div whileInView={{ scale: [0.6, 1.1, 1], opacity: [0, 1, 1] } as any} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 + 0.2 }}
                  style={{ width: 80, height: 80, borderRadius: '50%', border: `1px solid rgba(212,163,90,0.35)`, background: 'rgba(212,163,90,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                  <span style={{ fontFamily: 'Instrument Serif,serif', fontSize: 28, fontStyle: 'italic', color: gold }}>{s.step}</span>
                </motion.div>
                <h3 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 26, lineHeight: 1.1, color: ink, margin: '0 0 14px' }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: inkSoft, maxWidth: '32ch' }}>{s.body}</p>
                <span style={{ display: 'inline-block', marginTop: 16, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: inkMute }}>{s.time}</span>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }} style={{ marginTop: 56, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <MagBtn href="/workspace" className="btn-gold">Start the 5-minute tour →</MagBtn>
            <MagBtn href="/docs" className="btn-ghost">Read the quickstart</MagBtn>
            <span style={{ alignSelf: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: inkMute }}>No credit card · free during pilot</span>
          </motion.div>
        </div>
      </section>

      {/* SECURITY BENEFITS */}
      <section style={{ padding: '120px 0', borderTop: '1px solid rgba(255,245,220,0.07)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 80, alignItems: 'start' }}>
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: signal }}>Security posture</span>
              <h2 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 'clamp(38px,4.5vw,64px)', lineHeight: 1.02, letterSpacing: '-0.014em', color: ink, margin: '16px 0 24px' }}>
                Reduce the blast radius of <em style={{ fontStyle: 'italic', color: signal }}>every</em> agent decision.
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: inkSoft, maxWidth: '44ch' }}>Prompt injection, jailbreaks, session abuse — AgentPass treats every action as suspicious until proven scoped, fresh, and signed.</p>
              <div style={{ marginTop: 32 }}><MagBtn href="/workspace" className="btn-ghost">Review security controls →</MagBtn></div>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'Identity binding · agent ↔ user ↔ device', badge: 'Always on', ok: true },
                { label: 'Scoped, expiring proofs · HMAC per action', badge: 'Always on', ok: true },
                { label: 'Policy evaluation · per merchant, per amount', badge: 'Always on', ok: true },
                { label: 'Human approval queue · auto-expiring', badge: 'Always on', ok: true },
                { label: 'Ledger audit · append-only, 7yr retention', badge: 'Always on', ok: true },
                { label: 'Kill switch · network-wide revocation', badge: '1.2s avg', ok: false },
              ].map((row) => (
                <motion.div key={row.label} variants={fadeUp}
                  whileHover={{ x: 4 } as any}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(255,245,220,0.08)', background: 'rgba(14,15,19,0.7)', transition: 'border-color .2s', cursor: 'default' }}>
                  <span style={{ fontSize: 14, color: inkSoft }}>{row.label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${row.ok ? 'rgba(111,207,151,0.25)' : 'rgba(212,163,90,0.25)'}`, background: row.ok ? 'rgba(111,207,151,0.06)' : 'rgba(212,163,90,0.06)', fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: row.ok ? '#6fcf97' : gold }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: row.ok ? '#6fcf97' : gold }} />{row.badge}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ padding: '120px 0', borderTop: '1px solid rgba(255,245,220,0.07)', background: 'rgba(14,15,19,0.5)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: gold }}>Pilot partners</span>
            <h2 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 'clamp(38px,5vw,64px)', lineHeight: 1, letterSpacing: '-0.014em', color: ink, margin: '16px 0 0' }}>
              Trusted by teams building<br /><em style={{ fontStyle: 'italic', color: gold }}>responsible agent commerce.</em>
            </h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {[
              { quote: 'AgentPass gave our merchant team a single endpoint that just works. No ambiguity, no stranded tickets — the receipt tells you everything.', name: 'Maya R.', role: 'Head of Commerce Infrastructure', avatar: 'M' },
              { quote: 'When a proof went stale, revocation propagated in under two seconds. We caught it before a single transaction cleared.', name: 'Omar R.', role: 'Security Lead', avatar: 'O' },
              { quote: 'The ledger is what finally made our compliance team comfortable. Every decision is replayable, signed, and retained — forever.', name: 'Aliza K.', role: 'Chief Compliance Officer', avatar: 'A' },
            ].map((t) => (
              <motion.div key={t.name} variants={fadeUp} whileHover={{ y: -4 } as any}
                style={{ padding: 36, borderRadius: 24, border: '1px solid rgba(255,245,220,0.09)', background: 'rgba(14,15,19,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${gold}, transparent)`, opacity: 0.2 }} />
                <p style={{ fontSize: 16, lineHeight: 1.7, color: inkSoft, fontStyle: 'italic', margin: 0 }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${gold}, rgba(212,163,90,0.4))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Instrument Serif,serif', fontSize: 18, color: bg }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14, color: ink }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: inkMute }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* USE CASES */}
      <section style={{ padding: '120px 0', borderTop: '1px solid rgba(255,245,220,0.07)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ marginBottom: 72 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: gold }}>In the field</span>
            <h2 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 'clamp(38px,5vw,68px)', lineHeight: 1, letterSpacing: '-0.014em', color: ink, margin: '16px 0 0' }}>Where it earns its keep.</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {[
              { tag: 'Household', title: 'The Saturday grocery run.', body: "Maya delegates her family's weekly shop to an agent. It clears under-$100 orders automatically. Anything else pauses for her.", color: gold },
              { tag: 'Merchant', title: 'Refunds without an inbox.', body: 'Merchants verify one endpoint and ledger the outcome. Returns resolve inside the same proof chain — never a stranded ticket.', color: '#7aa2f7' },
              { tag: 'Operator', title: 'Control without surveillance.', body: 'A single pane to revoke any agent, freeze any merchant, or replay any decision — without reading private session content.', color: evergreen },
            ].map((u) => (
              <motion.div key={u.tag} variants={fadeUp} whileHover={{ y: -4, borderColor: `${u.color}44` } as any}
                style={{ padding: 36, borderRadius: 24, minHeight: 260, border: '1px solid rgba(255,245,220,0.08)', background: 'rgba(14,15,19,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', cursor: 'default', transition: 'border-color .2s' }}>
                <div style={{ position: 'absolute', bottom: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${u.color} 0%, transparent 70%)`, opacity: 0.1, filter: 'blur(30px)', pointerEvents: 'none' }} />
                <div>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: u.color }}>{u.tag}</span>
                  <h4 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 26, lineHeight: 1.1, color: ink, margin: '12px 0 14px' }}>{u.title}</h4>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: inkSoft }}>{u.body}</p>
                </div>
                <a href="/workspace" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: u.color, textDecoration: 'none', marginTop: 20 }}>Explore →</a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '80px 0 100px', borderTop: '1px solid rgba(255,245,220,0.07)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as any }}
            style={{ position: 'relative', borderRadius: 40, overflow: 'hidden', padding: '100px 60px', textAlign: 'center', border: '1px solid rgba(212,163,90,0.18)', background: `radial-gradient(700px 300px at 50% 120%, rgba(212,163,90,0.22), transparent 65%), radial-gradient(900px 500px at 50% -20%, rgba(90,125,99,0.14), transparent 65%), rgba(14,15,19,0.9)` }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,245,220,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,245,220,0.04) 1px,transparent 1px)', backgroundSize: '52px 52px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 72%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: gold }}>Begin</span>
              <h2 style={{ fontFamily: 'Instrument Serif,serif', fontWeight: 400, fontSize: 'clamp(52px,8vw,110px)', lineHeight: 0.95, letterSpacing: '-0.018em', color: ink, margin: '20px 0 0', textWrap: 'balance' as any }}>
                Trust the action,<br /><em style={{ fontStyle: 'italic', color: gold }}>not the agent.</em>
              </h2>
              <p style={{ margin: '28px auto 0', maxWidth: '46ch', fontSize: 18, lineHeight: 1.65, color: inkSoft }}>
                Join the teams building responsible AI-agent commerce — identity, permission and resolution infrastructure that scales from one household to the entire network.
              </p>
              <div style={{ marginTop: 40, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <MagBtn href="/workspace" className="btn-cta-primary">Start onboarding →</MagBtn>
                <MagBtn href="/workspace" className="btn-cta-ghost">See a live receipt</MagBtn>
              </div>
              <p style={{ marginTop: 28, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: inkMute }}>No credit card required · Free during pilot</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,245,220,0.07)', padding: '72px 0 48px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4,1fr)', gap: 48, alignItems: 'start' }}>
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}><Seal /><span style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, color: ink }}>AgentPass</span></Link>
              <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.65, color: inkSoft, maxWidth: 280 }}>Trust, permission, and resolution infrastructure for AI agents acting on behalf of people.</p>
              <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(111,207,151,0.25)', background: 'rgba(111,207,151,0.05)', fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6fcf97' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6fcf97' }} />All systems operational
              </div>
            </div>
            {[
              { title: 'Product', links: [['Agent Passport', '/#architecture'], ['Approval Engine', '/#architecture'], ['Action Ledger', '/ledger'], ['Policy Builder', '/']] },
              { title: 'Developers', links: [['Merchant API', '/workspace'], ['Verification log', '/ledger'], ['Signed proofs', '/workspace'], ['Reference', '/workspace']] },
              { title: 'Trust', links: [['Kill switch', '/'], ['Audit trail', '/ledger'], ['Status', '/api/status'], ['Disclosures', '/']] },
              { title: 'Company', links: [['About', '/'], ['Pricing', '/'], ['Workspace', '/workspace'], ['Sign in', '/workspace']] },
            ].map(g => (
              <div key={g.title}>
                <h4 style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: inkMute, margin: 0 }}>{g.title}</h4>
                <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {g.links.map(([label, href]) => (
                    <li key={label}><a href={href} style={{ fontSize: 14, color: ink, textDecoration: 'none', transition: 'color .15s' }} onMouseEnter={e => (e.currentTarget.style.color = gold)} onMouseLeave={e => (e.currentTarget.style.color = ink)}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid rgba(255,245,220,0.07)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: inkMute }}>
            <span>© 2026 AgentPass, Inc. · Edition 04</span>
            <span>Trust the action, not the agent.</span>
          </div>
        </div>
      </footer>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html { color-scheme: dark; scroll-behavior: smooth; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
        @keyframes gridDrift {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(-18px,-12px,0) scale(1.02); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        .btn-hero-primary { display:inline-flex;align-items:center;height:52px;padding:0 28px;border-radius:999px;font-size:15px;font-weight:500;background:${gold};color:${bg};text-decoration:none;white-space:nowrap;transition:transform .18s,box-shadow .18s,background .18s; }
        .btn-hero-primary:hover { background:${ink};box-shadow:0 8px 28px rgba(212,163,90,0.3);transform:translateY(-1px); }
        .btn-hero-ghost { display:inline-flex;align-items:center;height:52px;padding:0 28px;border-radius:999px;font-size:15px;font-weight:500;border:1px solid rgba(255,245,220,0.18);color:${ink};text-decoration:none;background:transparent;white-space:nowrap;transition:border-color .18s,background .18s; }
        .btn-hero-ghost:hover { border-color:rgba(255,245,220,0.35);background:rgba(255,245,220,0.04); }
        .btn-gold { display:inline-flex;align-items:center;height:46px;padding:0 22px;border-radius:999px;font-size:14px;font-weight:500;background:${gold};color:${bg};text-decoration:none;white-space:nowrap;transition:transform .18s,box-shadow .18s,background .18s; }
        .btn-gold:hover { background:${ink};transform:translateY(-1px);box-shadow:0 8px 24px rgba(212,163,90,0.25); }
        .btn-ghost { display:inline-flex;align-items:center;height:46px;padding:0 22px;border-radius:999px;font-size:14px;font-weight:500;border:1px solid rgba(255,245,220,0.18);color:${ink};text-decoration:none;background:transparent;white-space:nowrap;transition:border-color .18s,background .18s; }
        .btn-ghost:hover { border-color:rgba(255,245,220,0.35);background:rgba(255,245,220,0.04); }
        .btn-cta-primary { display:inline-flex;align-items:center;height:56px;padding:0 36px;border-radius:999px;font-size:16px;font-weight:500;background:${gold};color:${bg};text-decoration:none;white-space:nowrap;transition:transform .18s,box-shadow .18s,background .18s; }
        .btn-cta-primary:hover { background:${ink};transform:translateY(-2px);box-shadow:0 12px 36px rgba(212,163,90,0.3); }
        .btn-cta-ghost { display:inline-flex;align-items:center;height:56px;padding:0 36px;border-radius:999px;font-size:16px;font-weight:500;border:1px solid rgba(255,245,220,0.2);color:${ink};text-decoration:none;background:transparent;white-space:nowrap;transition:border-color .18s,background .18s; }
        .btn-cta-ghost:hover { border-color:rgba(255,245,220,0.4);background:rgba(255,245,220,0.05); }
        .nav-cta-btn { display:inline-flex;align-items:center;height:36px;padding:0 16px;border-radius:999px;font-size:12.5px;font-weight:500;background:${ink};color:${bg};text-decoration:none;white-space:nowrap;transition:background .18s,transform .18s; }
        .nav-cta-btn:hover { background:${gold};transform:translateY(-1px); }
        ::selection { background:rgba(212,163,90,0.3);color:${ink}; }
        *::-webkit-scrollbar { width:8px; }
        *::-webkit-scrollbar-track { background:transparent; }
        *::-webkit-scrollbar-thumb { background:rgba(255,245,220,0.12);border-radius:4px; }
        @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important;transition:none!important; } }
      `}</style>
    </div>
  )
}
