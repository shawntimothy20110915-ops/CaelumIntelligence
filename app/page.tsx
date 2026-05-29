'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { LiquidButton, MetalButton } from '@/components/ui/liquid-glass-button'
import { BorderTrail } from '@/components/ui/border-trail'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { TestimonialsColumn } from '@/components/ui/testimonials-columns'
import { Boxes } from '@/components/ui/background-boxes'
import { GooeyText } from '@/components/ui/gooey-text-morphing'

const ShaderAnimation = dynamic(() => import('@/components/ui/shader-animation').then(m => ({ default: m.ShaderAnimation })), { ssr: false })

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
    desc: "Cryptographic identity bound to capabilities. Every agent gets a tamper-proof credential with built-in kill switch.",
    color: "rgba(212,163,90,0.15)",
    glow: "rgba(212,163,90,0.4)",
  },
  {
    icon: "⛓",
    label: "Ledger",
    sub: "Immutable decision trail",
    desc: "HMAC-chained event log. Prove any decision happened exactly as recorded, with no gaps or edits.",
    color: "rgba(90,125,99,0.15)",
    glow: "rgba(90,200,140,0.4)",
  },
  {
    icon: "✦",
    label: "Approvals",
    sub: "Human-in-the-loop",
    desc: "Route high-stakes decisions to human operators without halting execution. Sub-second escalation.",
    color: "rgba(122,162,247,0.1)",
    glow: "rgba(122,162,247,0.4)",
  },
  {
    icon: "◈",
    label: "Trust Chain",
    sub: "End-to-end verification",
    desc: "Every request verified. Every response signed. Every hop in your agent graph cryptographically attested.",
    color: "rgba(200,130,255,0.1)",
    glow: "rgba(200,130,255,0.4)",
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
      style={{
        width: size, height: size,
        border: `1px solid ${color}`,
        top: '50%', left: '50%',
        x: -size / 2, y: -size / 2,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    >
      <motion.div
        className="absolute rounded-full"
        style={{ width: 6, height: 6, background: color, top: -3, left: '50%', x: -3 }}
      />
    </motion.div>
  )
}

function FeatureCard({ feature, i }: { feature: typeof FEATURES[0]; i: number }) {
  const ref = useRef(null)
  const inView = useRef(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !inView.current) {
        inView.current = true
        setVisible(true)
      }
    }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl p-6 overflow-hidden group cursor-default"
      style={{ background: feature.color, border: '1px solid rgba(212,163,90,0.12)' }}
    >
      <BorderTrail
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: feature.glow }}
        size={80}
        transition={{ duration: 3 }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <span style={{ fontSize: 28, color: feature.glow, filter: `drop-shadow(0 0 8px ${feature.glow})` }}>{feature.icon}</span>
          <div>
            <div style={{ color: 'rgba(244,236,221,0.9)', fontFamily: "'Instrument Serif', serif", fontSize: 18 }}>{feature.label}</div>
            <div style={{ color: 'rgba(244,236,221,0.35)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.08em' }}>{feature.sub}</div>
          </div>
        </div>
        <p style={{ color: 'rgba(244,236,221,0.55)', fontSize: 13, lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace" }}>{feature.desc}</p>
      </div>
      <OrbitalRing size={120} duration={8} color={feature.glow.replace('0.4', '0.15')} />
    </motion.div>
  )
}

function DashboardMockup() {
  return (
    <div className="w-full h-full flex bg-[#0a0a0d] rounded-2xl overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="w-48 h-full border-r border-[rgba(212,163,90,0.08)] flex flex-col p-4 gap-2">
        <div className="text-[10px] text-[rgba(212,163,90,0.6)] mb-3 tracking-widest">AGENTPASS</div>
        {['Overview', 'Passports', 'Approvals', 'Ledger'].map((item, i) => (
          <div key={item} className="px-3 py-2 rounded-lg text-[11px] transition-colors"
            style={{ background: i === 0 ? 'rgba(212,163,90,0.12)' : 'transparent', color: i === 0 ? 'rgba(212,163,90,0.9)' : 'rgba(244,236,221,0.35)' }}>
            {item}
          </div>
        ))}
      </div>
      <div className="flex-1 p-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[['99.97%', 'Uptime'], ['<80ms', 'Latency'], ['10M+', 'Decisions'], ['0', 'Violations']].map(([v, l]) => (
            <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(212,163,90,0.05)', border: '1px solid rgba(212,163,90,0.08)' }}>
              <div style={{ color: 'rgba(212,163,90,0.9)', fontSize: 18, fontWeight: 700 }}>{v}</div>
              <div style={{ color: 'rgba(244,236,221,0.3)', fontSize: 10 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,163,90,0.06)' }}>
          <div className="text-[10px] text-[rgba(244,236,221,0.3)] mb-2">RECENT DECISIONS</div>
          {['agent-research-7f2a → approved', 'agent-write-9b1c → verified', 'agent-exec-3d8e → pending'].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-[rgba(212,163,90,0.04)] last:border-0">
              <span style={{ color: 'rgba(244,236,221,0.5)', fontSize: 10 }}>{row.split('→')[0]}</span>
              <span style={{ fontSize: 9, color: i === 2 ? 'rgba(255,180,50,0.7)' : 'rgba(90,200,140,0.7)' }}>{row.split('→')[1].trim()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const heroParallax = useTransform(scrollY, [0, 600], [0, -80])

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

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212,163,90,0.06)', background: 'rgba(10,10,13,0.7)' }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(212,163,90,0.9)', fontSize: 13, letterSpacing: '0.15em' }}>
          AGENTPASS
        </div>
        <div className="flex items-center gap-3">
          <motion.a
            href="/auth"
            whileHover={{ scale: 1.02 }}
            style={{ color: 'rgba(244,236,221,0.5)', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em', textDecoration: 'none' }}
          >
            sign in
          </motion.a>
          <LiquidButton size="sm" onClick={() => window.location.href = '/auth'}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.08em', color: 'rgba(244,236,221,0.9)' }}>
              get access
            </span>
          </LiquidButton>
        </div>
      </motion.nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ opacity: 0.4 }}>
          <ShaderAnimation />
        </div>

        {/* Mouse spotlight */}
        <motion.div
          className="absolute inset-0 z-1 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(212,163,90,0.06), transparent 70%)`,
          }}
        />

        {/* Orbital rings */}
        <div className="absolute inset-0 z-1 flex items-center justify-center pointer-events-none">
          <OrbitalRing size={400} duration={20} color="rgba(212,163,90,0.08)" />
          <OrbitalRing size={600} duration={35} color="rgba(212,163,90,0.05)" delay={3} />
          <OrbitalRing size={800} duration={55} color="rgba(212,163,90,0.03)" delay={7} />
        </div>

        <motion.div
          style={{ y: heroParallax }}
          className="relative z-10 text-center px-4 flex flex-col items-center gap-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(212,163,90,0.08)', border: '1px solid rgba(212,163,90,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a35a] animate-pulse" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(212,163,90,0.8)', letterSpacing: '0.12em' }}>
              TRUST INFRASTRUCTURE FOR AI
            </span>
          </motion.div>

          {/* Gooey title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <GooeyText
              texts={["Every agent.", "Accountable.", "Provable.", "Trusted."]}
              morphTime={1.8}
              cooldownTime={2.5}
              className="text-center"
              textClassName="text-5xl md:text-7xl lg:text-8xl font-normal leading-none"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{ color: 'rgba(244,236,221,0.55)', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: '0.04em', maxWidth: 480 }}
          >
            Cryptographic passports. Immutable ledgers. Human-in-the-loop approvals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex items-center gap-4 mt-2"
          >
            <MetalButton variant="gold" onClick={() => window.location.href = '/auth'}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: '0.08em' }}>Start building</span>
            </MetalButton>
            <LiquidButton size="lg">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: '0.08em', color: 'rgba(244,236,221,0.7)' }}>
                View ledger demo
              </span>
            </LiquidButton>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.3 }}
          className="absolute bottom-10 left-0 right-0 z-10 flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(212,163,90,0.4), transparent)' }}
          />
        </motion.div>
      </section>

      {/* Feature cards */}
      <section className="relative py-32 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(212,163,90,0.5)', letterSpacing: '0.2em' }}>
              THE STACK
            </span>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => <FeatureCard key={f.label} feature={f} i={i} />)}
          </div>
        </div>
      </section>

      {/* Container scroll — dashboard preview */}
      <section className="relative">
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-8">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(212,163,90,0.5)', letterSpacing: '0.2em' }}>
                FULL VISIBILITY
              </span>
            </div>
          }
        >
          <DashboardMockup />
        </ContainerScroll>
      </section>

      {/* Testimonials with Boxes bg */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Boxes />
        </div>
        <div className="absolute inset-0 z-1 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #0a0a0d 0%, transparent 20%, transparent 80%, #0a0a0d 100%)' }} />
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(212,163,90,0.5)', letterSpacing: '0.2em' }}>
              TRUSTED BY TEAMS SHIPPING AI
            </span>
          </motion.div>
          <div className="flex gap-4 justify-center px-4 max-h-[580px] overflow-hidden">
            <TestimonialsColumn testimonials={t1} duration={22} />
            <TestimonialsColumn testimonials={t2} duration={28} className="hidden md:block" />
            <TestimonialsColumn testimonials={t3} duration={19} className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* 3-step setup */}
      <section className="relative py-32 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(212,163,90,0.5)', letterSpacing: '0.2em' }}>
              GET STARTED
            </span>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex-1 relative rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,163,90,0.08)' }}
              >
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: 'rgba(212,163,90,0.1)', lineHeight: 1 }}>{step.n}</div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: 'rgba(244,236,221,0.8)', marginTop: 8 }}>{step.label}</div>
                <div
                  className="mt-3 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(212,163,90,0.7)', letterSpacing: '0.03em' }}
                >
                  {step.code}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10"
                    style={{ color: 'rgba(212,163,90,0.3)', fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-40 px-6 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(212,163,90,0.06), transparent)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <OrbitalRing size={500} duration={25} color="rgba(212,163,90,0.06)" />
        <OrbitalRing size={700} duration={40} color="rgba(212,163,90,0.04)" delay={5} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center flex flex-col items-center gap-8"
        >
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: '4rem', lineHeight: 1.1, color: 'rgba(244,236,221,0.9)' }}>
            Ship AI<br />
            <span style={{ color: 'rgba(212,163,90,0.9)' }}>responsibly.</span>
          </div>
          <div className="flex items-center gap-4">
            <MetalButton variant="gold" onClick={() => window.location.href = '/auth'}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: '0.08em' }}>Get your passport</span>
            </MetalButton>
            <LiquidButton size="lg">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: '0.08em', color: 'rgba(244,236,221,0.6)' }}>
                Read the docs
              </span>
            </LiquidButton>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(212,163,90,0.06)] py-8 px-8 flex items-center justify-between">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.15em' }}>
          AGENTPASS
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(244,236,221,0.2)' }}>
          © 2025 Caelum Intelligence
        </span>
      </footer>
    </div>
  )
}
