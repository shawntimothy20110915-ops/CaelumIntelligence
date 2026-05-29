'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import dynamic from 'next/dynamic'
import { LiquidButton, MetalButton } from '@/components/ui/liquid-glass-button'
import { BorderTrail } from '@/components/ui/border-trail'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { TestimonialsColumn } from '@/components/ui/testimonials-columns'
import { Boxes } from '@/components/ui/background-boxes'
import AnimatedTextCycle from '@/components/ui/animated-text-cycle'

const ShaderAnimation = dynamic(
  () => import('@/components/ui/shader-animation').then(m => ({ default: m.ShaderAnimation })),
  { ssr: false }
)

const TESTIMONIALS = [
  { text: "AgentPass eliminated our entire audit backlog. Every AI decision is cryptographically provable in seconds.", image: "https://i.pravatar.cc/150?img=1", name: "Aria Chen", role: "CTO, Nexus Systems" },
  { text: "We went from 6-hour approval queues to real-time. The trust chain is elegant engineering.", image: "https://i.pravatar.cc/150?img=2", name: "Marcus Webb", role: "VP Engineering, Orbital" },
  { text: "SOC 2 with AI agents used to be a nightmare. AgentPass made it straightforward.", image: "https://i.pravatar.cc/150?img=3", name: "Priya Nair", role: "Security Lead, Lumen AI" },
  { text: "The passport system is exactly what enterprise AI orchestration was missing.", image: "https://i.pravatar.cc/150?img=4", name: "James Okafor", role: "Head of AI, Stratos" },
  { text: "Kill switch on every agent. My compliance team finally stopped worrying.", image: "https://i.pravatar.cc/150?img=5", name: "Sofia Reyes", role: "CISO, Vanta Labs" },
  { text: "Sub-80ms trust verification. We don't even notice the overhead anymore.", image: "https://i.pravatar.cc/150?img=6", name: "Kenji Tanaka", role: "Platform Arch, Helix" },
  { text: "Immutable ledger means every stakeholder can audit without bothering engineering.", image: "https://i.pravatar.cc/150?img=7", name: "Layla Hassan", role: "COO, Quorum AI" },
  { text: "AgentPass is the trust layer we didn't know we needed until we needed it.", image: "https://i.pravatar.cc/150?img=8", name: "Finn Larsen", role: "Product, Cipher Works" },
  { text: "Our enterprise clients require explainability. AgentPass delivers it out of the box.", image: "https://i.pravatar.cc/150?img=9", name: "Mei Zhang", role: "Solutions Eng, Relay" },
]

const FEATURES = [
  {
    icon: "⬡",
    label: "Passport",
    sub: "Identity for every agent",
    desc: "Cryptographic identity bound to capabilities. Every agent gets a tamper-proof credential with a built-in kill switch.",
    color: "rgba(212,163,90,0.06)",
    glow: "rgba(212,163,90,0.6)",
  },
  {
    icon: "⛓",
    label: "Ledger",
    sub: "Immutable decision trail",
    desc: "HMAC-chained event log. Prove any decision happened exactly as recorded — no gaps, no edits, ever.",
    color: "rgba(90,125,99,0.08)",
    glow: "rgba(90,200,140,0.6)",
  },
  {
    icon: "✦",
    label: "Approvals",
    sub: "Human-in-the-loop",
    desc: "Route high-stakes decisions to human operators without halting execution. Sub-second escalation.",
    color: "rgba(122,162,247,0.06)",
    glow: "rgba(122,162,247,0.6)",
  },
  {
    icon: "◈",
    label: "Trust Chain",
    sub: "End-to-end verification",
    desc: "Every request verified. Every response signed. Every hop in your agent graph cryptographically attested.",
    color: "rgba(200,130,255,0.06)",
    glow: "rgba(200,130,255,0.6)",
  },
]

const STEPS = [
  { n: "01", label: "Install", code: "npm install agentpass-sdk" },
  { n: "02", label: "Mint", code: "await passport.mint({ label: 'my-agent' })" },
  { n: "03", label: "Protect", code: "await passport.verify(request)" },
]

function OrbitalRing({ size, duration, color, delay = 0 }: { size: number; duration: number; color: string; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, border: `1px solid ${color}`, top: '50%', left: '50%', x: -size / 2, y: -size / 2 }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    >
      <motion.div className="absolute rounded-full" style={{ width: 5, height: 5, background: color, top: -2.5, left: '50%', x: -2.5 }} />
    </motion.div>
  )
}

function FeatureCard({ feature, i }: { feature: typeof FEATURES[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const seen = useRef(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen.current) { seen.current = true; setVisible(true) }
    }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl p-7 overflow-hidden group cursor-default"
      style={{ background: feature.color, border: '1px solid rgba(212,163,90,0.1)', backdropFilter: 'blur(8px)' }}
    >
      <BorderTrail
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ background: feature.glow }}
        size={100}
        transition={{ duration: 3.5 }}
      />
      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-5">
          <span className="mt-0.5 text-2xl" style={{ color: feature.glow, filter: `drop-shadow(0 0 10px ${feature.glow})` }}>
            {feature.icon}
          </span>
          <div>
            <div style={{ color: 'rgba(244,236,221,0.92)', fontFamily: "'Instrument Serif', serif", fontSize: 22, lineHeight: 1.2 }}>
              {feature.label}
            </div>
            <div style={{ color: 'rgba(244,236,221,0.35)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.1em', marginTop: 3 }}>
              {feature.sub}
            </div>
          </div>
        </div>
        <p style={{ color: 'rgba(244,236,221,0.5)', fontSize: 14, lineHeight: 1.75, fontFamily: "'JetBrains Mono', monospace" }}>
          {feature.desc}
        </p>
      </div>
      <OrbitalRing size={140} duration={10} color={feature.glow.replace('0.6', '0.1')} />
    </motion.div>
  )
}

function DashboardMockup() {
  return (
    <div className="w-full h-full flex bg-[#08080b] rounded-2xl overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Sidebar */}
      <div className="w-52 h-full border-r border-[rgba(212,163,90,0.07)] flex flex-col p-4 gap-1">
        <div className="text-[11px] text-[rgba(212,163,90,0.5)] mb-4 tracking-[0.18em] font-medium">AGENTPASS</div>
        {[['◈', 'Overview'], ['⬡', 'Passports'], ['⊙', 'Approvals'], ['≡', 'Ledger']].map(([icon, item], i) => (
          <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors"
            style={{
              background: i === 0 ? 'rgba(212,163,90,0.1)' : 'transparent',
              color: i === 0 ? 'rgba(212,163,90,0.9)' : 'rgba(244,236,221,0.3)',
              borderLeft: i === 0 ? '2px solid rgba(212,163,90,0.5)' : '2px solid transparent',
            }}>
            <span style={{ fontSize: 10 }}>{icon}</span>{item}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="text-[11px] text-[rgba(244,236,221,0.3)] mb-5 tracking-widest">OVERVIEW</div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[['0', 'Passports'], ['0', 'Pending'], ['0', 'Events']].map(([v, l]) => (
            <div key={l} className="rounded-xl p-3.5" style={{ background: 'rgba(212,163,90,0.04)', border: '1px solid rgba(212,163,90,0.08)' }}>
              <div style={{ color: 'rgba(212,163,90,0.85)', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{v}</div>
              <div style={{ color: 'rgba(244,236,221,0.28)', fontSize: 10, marginTop: 5 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="rounded-xl p-5 flex flex-col items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(212,163,90,0.1)', minHeight: 110 }}>
          <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.15em' }}>NO ACTIVITY YET</div>
          <div style={{ fontSize: 11, color: 'rgba(244,236,221,0.2)' }}>Mint a passport to get started</div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const heroParallax = useTransform(scrollY, [0, 700], [0, -60])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!heroRef.current) return
      const rect = heroRef.current.getBoundingClientRect()
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const t1 = TESTIMONIALS.slice(0, 3)
  const t2 = TESTIMONIALS.slice(3, 6)
  const t3 = TESTIMONIALS.slice(6, 9)

  return (
    <div style={{ background: '#0a0a0d', minHeight: '100vh', color: '#f4ecdd', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
      `}</style>

      {/* ── Nav ─────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ backdropFilter: 'blur(24px)', background: 'rgba(10,10,13,0.75)', borderBottom: '1px solid rgba(212,163,90,0.07)' }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(212,163,90,0.85)', fontSize: 14, letterSpacing: '0.18em', fontWeight: 500 }}>
          AGENTPASS
        </div>
        <div className="flex items-center gap-5">
          <motion.a
            href="/auth"
            whileHover={{ color: 'rgba(244,236,221,0.8)' }}
            style={{ color: 'rgba(244,236,221,0.4)', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textDecoration: 'none', transition: 'color 0.2s' }}
          >
            sign in
          </motion.a>
          <LiquidButton size="sm" onClick={() => { window.location.href = '/auth' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '0.1em', color: 'rgba(244,236,221,0.88)', fontWeight: 500 }}>
              Get access
            </span>
          </LiquidButton>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
        {/* Shader bg */}
        <div className="absolute inset-0 z-0" style={{ opacity: 0.35 }}>
          <ShaderAnimation />
        </div>

        {/* Mouse spotlight */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none transition-all duration-75"
          style={{ background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, rgba(212,163,90,0.05), transparent 65%)` }}
        />

        {/* Orbital rings */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
          <OrbitalRing size={440} duration={22} color="rgba(212,163,90,0.07)" />
          <OrbitalRing size={660} duration={38} color="rgba(212,163,90,0.04)" delay={4} />
          <OrbitalRing size={880} duration={60} color="rgba(212,163,90,0.025)" delay={9} />
        </div>

        <motion.div
          style={{ y: heroParallax }}
          className="relative z-10 text-center px-6 flex flex-col items-center gap-7 max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{ background: 'rgba(212,163,90,0.07)', border: '1px solid rgba(212,163,90,0.22)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a35a] animate-pulse" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(212,163,90,0.8)', letterSpacing: '0.14em', fontWeight: 500 }}>
              TRUST INFRASTRUCTURE FOR AI AGENTS
            </span>
          </motion.div>

          {/* Headline with AnimatedTextCycle */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.02em', color: 'rgba(244,236,221,0.95)', margin: 0 }}
          >
            Every{' '}
            <AnimatedTextCycle
              words={["agent", "decision", "action", "request", "workflow"]}
              interval={2800}
              className="text-[#d4a35a]"
            />
            <br />
            <span style={{ color: 'rgba(244,236,221,0.6)' }}>accountable.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{ color: 'rgba(244,236,221,0.45)', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, lineHeight: 1.7, letterSpacing: '0.02em', maxWidth: 500, margin: 0 }}
          >
            Cryptographic passports. Immutable ledgers.<br />
            Human-in-the-loop approvals.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex items-center gap-4 mt-1"
          >
            <MetalButton variant="gold" onClick={() => { window.location.href = '/auth' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.08em', fontWeight: 600 }}>
                Start building
              </span>
            </MetalButton>
            <LiquidButton size="lg">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.08em', color: 'rgba(244,236,221,0.65)', fontWeight: 400 }}>
                View demo
              </span>
            </LiquidButton>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute bottom-10 left-0 right-0 z-10 flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 44, background: 'linear-gradient(to bottom, rgba(212,163,90,0.45), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="relative py-36 px-6 md:px-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(212,163,90,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              The Stack
            </span>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={f.label} feature={f} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── Dashboard scroll reveal ───────────────────── */}
      <ContainerScroll
        titleComponent={
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-4"
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(212,163,90,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Full Visibility
            </span>
          </motion.div>
        }
      >
        <DashboardMockup />
      </ContainerScroll>

      {/* ── Testimonials ────────────────────────────────── */}
      <section className="relative py-36 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-60">
          <Boxes />
        </div>
        <div className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #0a0a0d 0%, rgba(10,10,13,0.15) 18%, rgba(10,10,13,0.15) 82%, #0a0a0d 100%)' }} />
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(212,163,90,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Trusted by teams shipping AI
            </span>
          </motion.div>
          <div className="flex gap-5 justify-center px-6 max-h-[600px] overflow-hidden">
            <TestimonialsColumn testimonials={t1} duration={24} />
            <TestimonialsColumn testimonials={t2} duration={30} className="hidden md:block" />
            <TestimonialsColumn testimonials={t3} duration={20} className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* ── Setup steps ─────────────────────────────────── */}
      <section className="relative py-36 px-6 md:px-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(212,163,90,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Get started in 3 steps
            </span>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="flex-1 relative rounded-2xl p-7"
                style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(212,163,90,0.09)' }}
              >
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 56, color: 'rgba(212,163,90,0.08)', lineHeight: 1, marginBottom: 8 }}>
                  {step.n}
                </div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'rgba(244,236,221,0.82)', marginBottom: 14 }}>
                  {step.label}
                </div>
                <div className="px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.45)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(212,163,90,0.72)', letterSpacing: '0.03em', lineHeight: 1.5 }}>
                  {step.code}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8"
                    style={{ color: 'rgba(212,163,90,0.25)', fontFamily: "'JetBrains Mono', monospace", fontSize: 18 }}>
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="relative py-44 px-6 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 55% 35% at 50% 50%, rgba(212,163,90,0.055), transparent)' }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <OrbitalRing size={560} duration={28} color="rgba(212,163,90,0.055)" />
        <OrbitalRing size={780} duration={45} color="rgba(212,163,90,0.03)" delay={6} />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center flex flex-col items-center gap-9"
        >
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(2.8rem, 6vw, 5rem)', lineHeight: 1.1, color: 'rgba(244,236,221,0.9)', margin: 0, letterSpacing: '-0.02em' }}>
            Ship AI<br />
            <span style={{ color: 'rgba(212,163,90,0.9)' }}>responsibly.</span>
          </h2>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(244,236,221,0.38)', letterSpacing: '0.04em', maxWidth: 380, lineHeight: 1.7, margin: 0 }}>
            Every agent. Every decision. On the record.
          </p>
          <div className="flex items-center gap-4">
            <MetalButton variant="gold" onClick={() => { window.location.href = '/auth' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.09em', fontWeight: 600 }}>
                Get your passport
              </span>
            </MetalButton>
            <LiquidButton size="lg">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.09em', color: 'rgba(244,236,221,0.55)', fontWeight: 400 }}>
                Read the docs
              </span>
            </LiquidButton>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(212,163,90,0.07)', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(212,163,90,0.45)', letterSpacing: '0.18em' }}>
          AGENTPASS
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(244,236,221,0.18)' }}>
          © 2025 Caelum Intelligence
        </span>
      </footer>
    </div>
  )
}
