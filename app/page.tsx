'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'

/* ─── Seal ─────────────────────────────────────────────────────── */
function Seal({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="seal-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--ink)" />
        </linearGradient>
      </defs>
      <polygon points="18,2 31,8 35,18 31,28 18,34 5,28 1,18 5,8" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <polygon points="18,7 27,11 30,18 27,25 18,29 9,25 6,18 9,11" fill="url(#seal-fill)" />
      <text x="18" y="22.5" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="11" fill="var(--bg)">A</text>
    </svg>
  )
}

/* ─── Animated counter ──────────────────────────────────────────── */
function AnimatedStat({ val, suffix = '' }: { val: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return
    // If val contains non-numeric, just reveal it
    const numeric = parseFloat(val.replace(/[^0-9.]/g, ''))
    if (isNaN(numeric)) { setDisplay(val); return }
    const start = Date.now()
    const duration = 1400
    const prefix = val.match(/^[^0-9]*/)?.[0] ?? ''
    const postfix = val.match(/[^0-9.]*$/)?.[0] ?? ''
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const current = eased * numeric
      const formatted = Number.isInteger(numeric)
        ? Math.round(current).toString()
        : current.toFixed(1)
      setDisplay(prefix + formatted + postfix)
      if (progress < 1) requestAnimationFrame(frame)
      else setDisplay(val)
    }
    requestAnimationFrame(frame)
  }, [inView, val])

  return <span ref={ref}>{display}{suffix}</span>
}

/* ─── Scroll progress bar ───────────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })
  return (
    <motion.div
      style={{ scaleX, transformOrigin: 'left' }}
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] bg-gradient-to-r from-transparent via-[var(--gold)] to-[var(--gold-soft)]"
    />
  )
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Home() {
  const [hasData, setHasData] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try { setHasData(localStorage.getItem('ap-has-data') === '1') } catch {}
  }, [])

  function toggleData() {
    const next = !hasData
    setHasData(next)
    try { localStorage.setItem('ap-has-data', next ? '1' : '0') } catch {}
    if (next) {
      const sec = document.getElementById('ledger')
      if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
    }
  }

  return (
    <>
      <ScrollProgress />

      <style>{`
        /* ── Hero ── */
        .hero {
          position: relative; isolation: isolate; overflow: hidden;
          padding-top: 72px; padding-bottom: 100px;
        }
        .hero .grid-bg {
          position: absolute; inset: -10%;
          background-image:
            linear-gradient(rgba(255,245,220,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,245,220,0.055) 1px, transparent 1px);
          background-size: 88px 88px; background-position: center top;
          mask-image: radial-gradient(ellipse 90% 60% at 50% 20%, black 20%, transparent 72%);
          -webkit-mask-image: radial-gradient(ellipse 90% 60% at 50% 20%, black 20%, transparent 72%);
          animation: grid-drift 28s linear infinite;
        }
        @keyframes grid-drift {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(-20px,-14px,0) scale(1.025); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        .hero .aurora {
          position: absolute; inset: -15%; pointer-events: none;
          filter: blur(90px); opacity: 0.48; z-index: 0;
        }
        .hero .aurora .b1 {
          position: absolute; left: 6%; top: 8%;
          width: 38vw; height: 38vw; border-radius: 50%;
          background: radial-gradient(circle, var(--gold) 0%, transparent 62%);
          mix-blend-mode: screen;
          animation: a1 22s ease-in-out infinite;
        }
        .hero .aurora .b2 {
          position: absolute; right: 4%; top: 28%;
          width: 42vw; height: 42vw; border-radius: 50%;
          background: radial-gradient(circle, var(--evergreen) 0%, transparent 62%);
          mix-blend-mode: screen; opacity: 0.8;
          animation: a2 30s ease-in-out infinite;
        }
        .hero .aurora .b3 {
          position: absolute; left: 38%; top: 52%;
          width: 26vw; height: 26vw; border-radius: 50%;
          background: radial-gradient(circle, var(--azure) 0%, transparent 62%);
          mix-blend-mode: screen; opacity: 0.35;
          animation: a3 36s ease-in-out infinite;
        }
        @keyframes a1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(9%,5%) scale(1.09); } }
        @keyframes a2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-7%,-6%) scale(1.06); } }
        @keyframes a3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-5%,7%) scale(1.12); } }

        .hero .sweep {
          position: absolute; inset: 0; pointer-events: none;
          overflow: hidden; mix-blend-mode: screen; opacity: 0.55;
        }
        .hero .sweep::before {
          content: ""; position: absolute; inset: -30% auto -30% -40%; width: 28%;
          background: linear-gradient(100deg, transparent 0%, rgba(212,163,90,0) 20%, rgba(212,163,90,0.18) 50%, rgba(212,163,90,0) 80%, transparent 100%);
          filter: blur(48px); transform: skewX(-12deg);
          animation: sweep 16s cubic-bezier(0.42,0,0.58,1) infinite;
        }
        @keyframes sweep {
          0%   { transform: translateX(0) skewX(-12deg); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateX(360%) skewX(-12deg); opacity: 0; }
        }

        .hero-eyebrow-line {
          width: 32px; height: 1px;
          background: linear-gradient(90deg, var(--gold), transparent);
        }

        .hero-title {
          font-family: 'Instrument Serif', serif;
          font-weight: 400;
          font-size: clamp(52px, 8.5vw, 136px);
          line-height: 0.93;
          letter-spacing: -0.022em;
          color: var(--ink);
          margin: 0;
          text-wrap: balance;
        }
        .hero-title em {
          font-style: italic;
          color: var(--gold);
          text-shadow: 0 0 80px rgba(212,163,90,0.3);
        }
        .hero-desc {
          font-size: clamp(15px, 1.8vw, 19px);
          line-height: 1.65;
          color: var(--ink-soft);
          max-width: 58ch;
        }

        /* ── Stats ── */
        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--rule);
          border: 1px solid var(--rule);
          border-radius: 24px;
          overflow: hidden;
          margin-top: 88px;
        }
        @media (max-width: 900px) { .stats { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 480px) { .stats { grid-template-columns: 1fr; } }

        .stat-cell {
          background: var(--panel);
          padding: 32px 28px;
          display: flex; flex-direction: column; gap: 14px;
          transition: background 0.2s ease;
        }
        .stat-cell:hover { background: color-mix(in srgb, var(--panel) 90%, var(--gold) 10%); }
        .stat-val {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(40px, 5vw, 58px);
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        .stat-note { font-size: 13px; color: var(--ink-fade); line-height: 1.55; }

        /* ── Ribbon ── */
        .ribbon {
          position: relative; overflow: hidden;
          border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
          background: var(--bg-2);
        }
        .ribbon-track {
          display: flex; gap: 56px; padding: 14px 0;
          white-space: nowrap; width: max-content;
          animation: ticker 80s linear infinite;
        }
        .ribbon-item {
          display: inline-flex; align-items: center; gap: 10px;
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute);
        }
        .ribbon-item .pip { width: 5px; height: 5px; border-radius: 999px; background: var(--gold); }
        .ribbon-item .pip.r { background: var(--signal); }
        .ribbon-item .pip.g { background: #6fcf97; }

        /* ── Chapter head ── */
        .chapter-head {
          display: grid;
          grid-template-columns: 220px 1fr auto;
          align-items: end; gap: 24px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--rule);
          position: relative;
        }
        .chapter-head::after {
          content: "";
          position: absolute; left: 0; bottom: -1px;
          width: 80px; height: 1px;
          background: var(--gold);
        }
        @media (max-width: 720px) { .chapter-head { grid-template-columns: 1fr; align-items: start; } }

        /* ── Primitives ── */
        .primitives {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 0; border-bottom: 1px solid var(--rule);
        }
        @media (max-width: 960px) { .primitives { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 540px) { .primitives { grid-template-columns: 1fr; } }

        .prim {
          position: relative; padding: 44px 32px 36px;
          border-top: 1px solid var(--rule);
          border-right: 1px solid var(--rule);
          min-height: 300px;
          display: flex; flex-direction: column; justify-content: space-between;
          transition: background 0.22s ease;
          overflow: hidden;
        }
        .prim::before {
          content: ""; position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, var(--gold), transparent 60%);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.35s ease;
        }
        .prim:hover::before { transform: scaleX(1); }
        .prim:hover { background: rgba(212,163,90,0.03); }
        .prim:last-child { border-right: 0; }
        .prim .num { font-family: 'Instrument Serif', serif; font-size: 60px; color: var(--ink-whisper); line-height: 1; }
        .prim h3 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 28px; line-height: 1.05; color: var(--ink); }
        .prim p  { margin-top: 12px; font-size: 14px; line-height: 1.62; color: var(--ink-soft); max-width: 34ch; }

        /* ── Ledger ── */
        .ledger { display: grid; gap: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
        .led-row {
          display: grid; grid-template-columns: 64px 1fr 110px 88px;
          gap: 14px; align-items: center;
          padding: 10px 14px;
          background: rgba(255,245,220,0.02);
          border: 1px solid var(--rule);
          border-radius: 10px;
          transition: background 0.15s, border-color 0.15s;
        }
        .led-row:hover { background: rgba(255,245,220,0.04); border-color: var(--rule-2); }
        .led-row .t     { color: var(--ink-fade); }
        .led-row .name  { color: var(--ink); }
        .led-row .actor { color: var(--ink-soft); }
        .led-row .status { letter-spacing: 0.12em; text-transform: uppercase; font-size: 10px; }
        .led-row .status.ok   { color: #6fcf97; }
        .led-row .status.hold { color: var(--gold); }
        .led-row .status.deny { color: var(--signal); }
        .led-row.alive {
          border-color: rgba(212,163,90,0.28);
          background: linear-gradient(90deg, rgba(212,163,90,0.08), rgba(255,245,220,0.02) 70%);
        }

        /* ── Receipt ── */
        .receipt {
          position: relative; padding: 36px;
          background: var(--panel); border: 1px solid var(--rule-2);
          border-radius: 24px; overflow: hidden;
        }
        .receipt::before {
          content: ""; position: absolute; inset: 0;
          background: radial-gradient(350px 200px at 100% 0%, rgba(212,163,90,0.16), transparent 65%);
          pointer-events: none;
        }
        .receipt .row {
          display: flex; justify-content: space-between;
          padding: 13px 0; border-bottom: 1px dashed rgba(255,245,220,0.08);
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
        }
        .receipt .row span:first-child { color: var(--ink-fade); letter-spacing: 0.1em; text-transform: uppercase; font-size: 10px; }
        .receipt .row span:last-child  { color: var(--ink); }
        .receipt .row.big span:last-child { color: var(--gold); font-size: 15px; font-weight: 500; }
        .receipt .stamp { position: absolute; right: 28px; top: 28px; width: 100px; height: 100px; transform: rotate(7deg); opacity: 0.9; }

        /* ── Section ── */
        .section { padding: 120px 0; position: relative; }
        .section.tight { padding: 80px 0; }
        .section-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(38px, 5vw, 72px);
          line-height: 1; letter-spacing: -0.014em;
          color: var(--ink); margin: 0; text-wrap: balance;
        }

        /* ── Uses ── */
        .uses { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        @media (max-width: 880px) { .uses { grid-template-columns: 1fr; } }
        .use {
          position: relative; padding: 28px; border: 1px solid var(--rule);
          border-radius: 20px; background: var(--panel);
          min-height: 260px; display: flex; flex-direction: column;
          justify-content: space-between; overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .use:hover { border-color: rgba(212,163,90,0.35); transform: translateY(-2px); }
        .use::after {
          content: ""; position: absolute;
          right: -50px; bottom: -50px;
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(212,163,90,0.08), transparent 70%);
          pointer-events: none;
        }
        .use h4 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 26px; line-height: 1.1; margin: 12px 0 0; }

        /* ── Column text ── */
        .column {
          columns: 2; column-gap: 56px;
          column-rule: 1px solid var(--rule);
          font-size: 17px; line-height: 1.72; color: var(--ink-soft);
        }
        .column p { margin-bottom: 18px; }
        .column p:first-child::first-letter {
          font-family: 'Instrument Serif', serif;
          font-size: 74px; float: left;
          line-height: 0.85; padding-right: 12px; padding-top: 6px;
          color: var(--gold); font-style: italic;
        }
        @media (max-width: 800px) { .column { columns: 1; } }

        /* ── Final CTA ── */
        .final {
          position: relative; overflow: hidden;
          border: 1px solid var(--rule-2); border-radius: 40px;
          padding: 120px 40px; text-align: center;
          background:
            radial-gradient(600px 280px at 50% 110%, rgba(212,163,90,0.22), transparent 65%),
            radial-gradient(800px 400px at 50% -10%, rgba(90,125,99,0.14), transparent 65%),
            var(--panel);
        }
        .final::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,245,220,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,245,220,0.04) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 75%);
        }
        .final-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(52px, 7.5vw, 110px);
          line-height: 0.95; letter-spacing: -0.018em;
          text-wrap: balance;
        }

        /* ── Horizon ── */
        .horizon {
          position: relative; width: 100%;
          aspect-ratio: 21/9; border-radius: 28px; overflow: hidden;
          border: 1px solid var(--rule-2);
          background:
            radial-gradient(55% 70% at 50% 100%, rgba(212,163,90,0.5), transparent 70%),
            radial-gradient(85% 75% at 50% 100%, rgba(90,125,99,0.4), transparent 70%),
            linear-gradient(180deg, #08090d 0%, #1b1a18 52%, #2a201a 100%);
        }
        .horizon::after {
          content: ""; position: absolute;
          left: 0; right: 0; top: 61%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,163,90,0.65), transparent);
          box-shadow: 0 0 40px rgba(212,163,90,0.55);
        }
        .horizon .stars {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(1px 1px at 20% 28%, rgba(255,255,255,0.65), transparent),
            radial-gradient(1px 1px at 70% 18%, rgba(255,255,255,0.45), transparent),
            radial-gradient(1.5px 1.5px at 35% 11%, rgba(255,255,255,0.72), transparent),
            radial-gradient(1px 1px at 88% 40%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 10% 22%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1.2px 1.2px at 56% 7%, rgba(255,255,255,0.72), transparent),
            radial-gradient(1px 1px at 45% 35%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 78% 15%, rgba(255,255,255,0.4), transparent);
          mask-image: linear-gradient(180deg, black 0%, black 48%, transparent 78%);
        }
        .horizon .copy {
          position: absolute; inset: 0;
          padding: 60px; display: flex;
          flex-direction: column; justify-content: flex-end; gap: 8px;
        }

        /* ── Trust stage ── */
        .trust-stage {
          position: relative; border-radius: 28px;
          border: 1px solid var(--rule-2);
          background:
            radial-gradient(800px 440px at 70% 28%, rgba(212,163,90,0.16), transparent 60%),
            radial-gradient(600px 380px at 22% 82%, rgba(90,125,99,0.18), transparent 65%),
            linear-gradient(180deg, #0d0e13 0%, #07080b 100%);
          overflow: hidden; padding: 56px 40px; min-height: 440px;
        }
        .trust-stage::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,245,220,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,245,220,0.04) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 78%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 78%);
        }
        .trust-stage .ring {
          position: absolute; inset: 12%; width: 76%; height: 76%;
          opacity: 0.45; animation: ring-spin 72s linear infinite;
          pointer-events: none;
        }
        @keyframes ring-spin { to { transform: rotate(360deg); } }
        .trust-stage .chain {
          position: relative; z-index: 2;
          display: grid;
          grid-template-columns: 1fr 56px 1fr 56px 1fr 56px 1fr;
          align-items: start; gap: 14px;
        }
        @media (max-width: 920px) {
          .trust-stage .chain { grid-template-columns: 1fr; gap: 24px; }
          .trust-stage .line { display: none; }
        }
        .trust-stage .node {
          text-align: center; color: var(--gold);
          position: relative;
          transition: transform 0.5s ease;
        }
        .trust-stage .node h4 {
          margin-top: 14px; font-family: 'Instrument Serif', serif;
          font-weight: 400; font-size: 23px; line-height: 1.05; color: var(--ink);
        }
        .trust-stage .node p {
          margin-top: 8px; font-size: 13px; line-height: 1.55;
          color: var(--ink-soft); max-width: 20ch; margin-inline: auto;
        }
        .trust-stage .step-num {
          display: inline-block; margin-top: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 0.22em;
          text-transform: uppercase; color: var(--ink-mute);
        }
        .trust-stage .seal {
          position: relative; width: 72px; height: 72px;
          margin: 0 auto; border-radius: 999px;
          border: 1px solid rgba(212,163,90,0.28);
          background: rgba(212,163,90,0.05);
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--gold);
          transition: box-shadow 0.5s ease, border-color 0.5s ease;
        }
        .trust-stage .seal .dot-pulse {
          position: absolute; inset: -6px;
          border-radius: 999px;
          border: 1px solid rgba(212,163,90,0.5);
          opacity: 0; transform: scale(0.9);
        }
        .trust-stage .node[data-step="1"] .seal { animation: seal-glow 7.2s ease-in-out infinite; animation-delay: 0.0s; }
        .trust-stage .node[data-step="2"] .seal { animation: seal-glow 7.2s ease-in-out infinite; animation-delay: 1.6s; }
        .trust-stage .node[data-step="3"] .seal { animation: seal-glow 7.2s ease-in-out infinite; animation-delay: 3.2s; }
        .trust-stage .node[data-step="4"] .seal { animation: seal-glow 7.2s ease-in-out infinite; animation-delay: 4.8s; }
        .trust-stage .node[data-step="1"] .dot-pulse { animation: ping 7.2s ease-out infinite; animation-delay: 0.0s; }
        .trust-stage .node[data-step="2"] .dot-pulse { animation: ping 7.2s ease-out infinite; animation-delay: 1.6s; }
        .trust-stage .node[data-step="3"] .dot-pulse { animation: ping 7.2s ease-out infinite; animation-delay: 3.2s; }
        .trust-stage .node[data-step="4"] .dot-pulse { animation: ping 7.2s ease-out infinite; animation-delay: 4.8s; }
        @keyframes seal-glow {
          0%,8%  { box-shadow: 0 0 0 rgba(212,163,90,0);   background: rgba(212,163,90,0.05); }
          14%    { box-shadow: 0 0 44px rgba(212,163,90,0.5); background: rgba(212,163,90,0.18); border-color: var(--gold); }
          24%    { box-shadow: 0 0 60px rgba(212,163,90,0.28); }
          100%   { box-shadow: 0 0 0 rgba(212,163,90,0);   background: rgba(212,163,90,0.05); }
        }
        @keyframes ping {
          0%,6%  { transform: scale(0.85); opacity: 0; }
          14%    { transform: scale(1.0);  opacity: 0.6; }
          30%    { transform: scale(1.5);  opacity: 0; }
          100%   { transform: scale(1.5);  opacity: 0; }
        }
        .trust-stage .line {
          align-self: center; margin-top: 35px; position: relative;
          height: 1px;
          background: linear-gradient(90deg, rgba(212,163,90,0.45), rgba(212,163,90,0.12));
          overflow: hidden;
        }
        .trust-stage .line .pulse {
          position: absolute; top: -3px; left: 0;
          width: 26px; height: 7px; border-radius: 999px;
          background: radial-gradient(closest-side, var(--gold) 0%, transparent 80%);
          filter: blur(0.5px);
          box-shadow: 0 0 16px rgba(212,163,90,0.8);
          animation: travel 7.2s ease-in-out infinite;
        }
        .trust-stage .chain .line:nth-of-type(2) .pulse { animation-delay: 0.4s; }
        .trust-stage .chain .line:nth-of-type(4) .pulse { animation-delay: 2.0s; }
        .trust-stage .chain .line:nth-of-type(6) .pulse { animation-delay: 3.6s; }
        @keyframes travel {
          0%,8%  { transform: translateX(-30px); opacity: 0; }
          14%    { opacity: 1; }
          22%    { transform: translateX(calc(100% + 30px)); opacity: 0; }
          100%   { transform: translateX(calc(100% + 30px)); opacity: 0; }
        }
        .trust-stage .telemetry {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
        }
        .trust-stage .telemetry span {
          position: absolute; left: var(--x); top: var(--y);
          transform: translate(-50%,-50%);
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          letter-spacing: 0.18em; color: var(--ink-fade);
          opacity: 0; text-transform: uppercase;
          animation: tele-float 7s ease-in-out infinite;
          animation-delay: var(--d);
        }
        @keyframes tele-float {
          0%,100% { opacity: 0; transform: translate(-50%,-50%) translateY(8px); }
          20%     { opacity: 0.65; transform: translate(-50%,-50%) translateY(0); }
          60%     { opacity: 0.55; transform: translate(-50%,-50%) translateY(-4px); }
          80%     { opacity: 0; transform: translate(-50%,-50%) translateY(-12px); }
        }

        /* ── Nav ── */
        .nav {
          position: sticky; top: 0; z-index: 50;
          backdrop-filter: blur(22px) saturate(130%);
          -webkit-backdrop-filter: blur(22px) saturate(130%);
          background: color-mix(in srgb, var(--bg) 76%, transparent);
          border-bottom: 1px solid var(--rule);
        }
        .nav-inner {
          max-width: 1650px; margin: 0 auto; padding: 14px 28px;
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
        }
        .brand { display: inline-flex; align-items: center; gap: 12px; }
        .brand-mark { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; }
        .brand-name { font-family: 'Instrument Serif', serif; font-size: 22px; letter-spacing: -0.012em; color: var(--ink); }
        .nav-links { display: none; align-items: center; gap: 30px; }
        .nav-links a { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--ink-mute); transition: color 0.15s; }
        .nav-links a:hover, .nav-links a.active { color: var(--ink); }
        .nav-cta { display: none; align-items: center; gap: 16px; }
        .nav-cta .divider { width: 1px; height: 16px; background: var(--rule-2); }
        @media (min-width: 1024px) { .nav-links, .nav-cta { display: flex; } }

        /* ── Misc ── */
        .atmos { position: absolute; inset: 0; pointer-events: none; background: var(--grad-aurora); mix-blend-mode: screen; opacity: 0.85; }
        .grain { position: relative; }
        .grain::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 3px 3px; opacity: 0.55; mix-blend-mode: overlay;
        }
        .chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 12px; border-radius: 999px;
          border: 1px solid var(--rule-2);
          background: rgba(255,245,220,0.025);
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-soft);
        }
        .chip .dot { width: 6px; height: 6px; border-radius: 999px; background: var(--gold); box-shadow: 0 0 0 4px rgba(212,163,90,0.18); }
        .chip.live .dot { background: var(--signal); animation: pulse 2s ease-in-out infinite; }
        .chip.ok .dot   { background: #6fcf97; }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }

        .pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill {
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute);
          border: 1px solid var(--rule-2); border-radius: 999px; padding: 6px 14px;
          transition: border-color 0.15s, color 0.15s;
        }
        .pill:hover { border-color: rgba(212,163,90,0.4); color: var(--gold); }

        .tile {
          background: var(--panel); border: 1px solid var(--rule);
          border-radius: 16px; padding: 18px 24px;
          transition: border-color 0.18s;
        }
        .tile:hover { border-color: var(--rule-2); }

        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          height: 46px; padding: 0 22px; border-radius: 999px;
          font-size: 13.5px; font-weight: 500; letter-spacing: -0.005em;
          transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
          white-space: nowrap;
        }
        .btn-primary { background: var(--ink); color: var(--bg); }
        .btn-primary:hover { background: var(--gold); color: var(--void); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(212,163,90,0.28); }
        .btn-ghost { border: 1px solid var(--rule-2); color: var(--ink); background: transparent; }
        .btn-ghost:hover { border-color: var(--rule-3); background: rgba(255,245,220,0.04); }
        .btn-gold { background: var(--gold); color: var(--void); }
        .btn-gold:hover { background: var(--ink); color: var(--void); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(212,163,90,0.24); }
        .btn-sm { height: 36px; padding: 0 16px; font-size: 12.5px; }

        .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--ink-mute);
        }
        .chapter-index { font-family: 'Instrument Serif', serif; font-size: 14px; color: var(--ink-mute); }
        .panel { background: var(--panel); border: 1px solid var(--rule); border-radius: 20px; }

        .container { max-width: 1340px; margin: 0 auto; padding: 0 24px; }
        @media (min-width: 768px) { .container { padding: 0 40px; } }

        .footer { border-top: 1px solid var(--rule); background: var(--bg); }

        .italic { font-style: italic; }
        .text-soft { color: var(--ink-soft); }
        .text-mute { color: var(--ink-mute); }
        .text-fade { color: var(--ink-fade); }
        .text-gold { color: var(--gold); }
        .text-balance { text-wrap: balance; }
        .hover-shift { transition: transform 0.18s ease, color 0.18s ease; }
        .hover-shift:hover { transform: translate(2px,-2px); color: var(--gold); }

        @keyframes reveal-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .reveal { animation: reveal-up 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: var(--rule-2); border-radius: 4px; }

        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <motion.header
        className="nav"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="nav-inner">
          <Link href="/" className="brand" aria-label="AgentPass">
            <span className="brand-mark"><Seal /></span>
            <span className="brand-name">AgentPass</span>
          </Link>
          <nav className="nav-links">
            {[
              { label: 'Product',   href: '/#product' },
              { label: 'Docs',      href: '/docs' },
              { label: 'Workspace', href: '/workspace' },
              { label: 'Status',    href: '/api/status' },
            ].map(item => (
              <a key={item.label} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <div className="nav-cta">
            <a href="/workspace" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Sign in</a>
            <span className="divider" aria-hidden="true" />
            <Link href="/workspace" className="btn btn-primary btn-sm">Open workspace →</Link>
          </div>
        </div>
      </motion.header>

      <main>
        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section className="hero" id="product">
          <div className="aurora" aria-hidden="true">
            <span className="b1" /><span className="b2" /><span className="b3" />
          </div>
          <div className="grid-bg" aria-hidden="true" />
          <div className="sweep" aria-hidden="true" />
          <div className="atmos" aria-hidden="true" />

          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ paddingTop: 56 }}
            >
              {/* Eyebrow */}
              <motion.div
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
              >
                <span className="hero-eyebrow-line" />
                <span className="chip live">
                  <span className="dot" />
                  Edition 04 · Cinematic Pilot · Merchant Verify API
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                className="hero-title"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              >
                We build the trust&nbsp;layer<br />
                for the <em>agent economy</em>.
              </motion.h1>

              {/* Description + CTAs */}
              <motion.div
                style={{
                  marginTop: 52, display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
                  gap: 48, alignItems: 'start',
                  borderTop: '1px solid var(--rule)', paddingTop: 36
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              >
                <p className="hero-desc text-balance">
                  AgentPass verifies AI agents, enforces user permissions, records every decision, and keeps post-purchase exceptions inside one trusted, auditable path — so people can delegate real money and real decisions without losing the receipt.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <Link href="/workspace" className="btn btn-gold">Open workspace →</Link>
                  <Link href="/workspace" className="btn btn-ghost">Read the prospectus</Link>
                </div>
              </motion.div>

              {/* Stats */}
              <div className="stats">
                {[
                  { eyebrow: 'Trust events ledgered', val: '100%',   note: 'Append-only audit trail — every state change written before merchant confirms.' },
                  { eyebrow: 'Verify-proof p95',      val: '<100ms', note: 'Deterministic merchant decisions, including HMAC recomputation.' },
                  { eyebrow: 'Real-time revoke',       val: '1.2s',  note: 'Network-wide propagation — every active session terminated on kill.' },
                  { eyebrow: 'Regression coverage',   val: '27/27', note: 'Test suite green across passport, proof, policy, ledger, resolution.' },
                ].map((s, i) => (
                  <motion.div
                    key={s.eyebrow}
                    className="stat-cell"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.09 }}
                  >
                    <span className="eyebrow">{s.eyebrow}</span>
                    <span className="stat-val">
                      {s.val === '<100ms' ? (
                        <>&lt;<AnimatedStat val="100" />ms</>
                      ) : s.val === '27/27' ? (
                        <><AnimatedStat val="27" />/<AnimatedStat val="27" /></>
                      ) : s.val === '1.2s' ? (
                        <><AnimatedStat val="1.2" />s</>
                      ) : (
                        <AnimatedStat val={s.val} />
                      )}
                    </span>
                    <span className="stat-note">{s.note}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── RIBBON ────────────────────────────────────────────────── */}
        {hasData && (
          <section className="ribbon" aria-label="Sample decision stream">
            <div className="container" style={{ paddingTop: 10, paddingBottom: 0 }}>
              <span className="eyebrow" style={{ color: 'var(--ink-fade)' }}>Sample stream · the kind of decisions you'll watch flow once you're wired in</span>
            </div>
            <div className="ribbon-track">
              {[
                { color: 'g', text: 'OK · drift-7af2 · groceries · $84.20 · auto-clear' },
                { color: '',  text: 'HOLD · halo-31bc · subscription change · awaiting human' },
                { color: 'g', text: 'OK · pilot-902e · refund initiated · resolution-flow' },
                { color: 'r', text: 'DENY · echo-0001 · proof revoked · signature_mismatch' },
                { color: 'g', text: 'OK · sigma-44dd · travel booking · within scope' },
                { color: '',  text: 'HOLD · drift-7af2 · amount exceeds limit · approval queued' },
                { color: 'g', text: 'OK · pilot-902e · merchant signed receipt · ledgered' },
                { color: 'r', text: 'DENY · ghost-7012 · scope mismatch · proof_revoked' },
                { color: 'g', text: 'OK · drift-7af2 · groceries · $84.20 · auto-clear' },
                { color: '',  text: 'HOLD · halo-31bc · subscription change · awaiting human' },
                { color: 'g', text: 'OK · pilot-902e · refund initiated · resolution-flow' },
                { color: 'r', text: 'DENY · echo-0001 · proof revoked · signature_mismatch' },
              ].map((item, i) => (
                <span key={i} className="ribbon-item">
                  <span className={`pip${item.color ? ` ${item.color}` : ''}`} />
                  {item.text}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── SECTION 02 — First five minutes ───────────────────────── */}
        <section className="section" id="start">
          <div className="container">
            <motion.div
              className="chapter-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="chapter-index">02 — If you're new here</span>
              <h2 className="section-title">Your first <em className="italic" style={{ color: 'var(--gold)' }}>five minutes</em>.</h2>
              <span className="eyebrow">Day-one tour</span>
            </motion.div>

            <p style={{ marginTop: 32, maxWidth: '60ch', fontSize: 17, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
              Below is what setup actually looks like for a brand-new operator. No live data yet — that's the point. By minute six you'll have a passport minted, a proof signed, and the first receipt on the ledger.
            </p>

            <div style={{ marginTop: 48, borderTop: '1px solid var(--rule)' }} className="primitives">
              {[
                { num: 'i',   title: 'Sign in.',          body: 'Email link or SSO. No credit card. We bind the workspace to your device — same proof-style rules we hold our agents to.',                                      time: '≈ 30s' },
                { num: 'ii',  title: 'Mint a passport.',  body: 'Bind your first agent to a user, pick a model class, set a default scope. We hand you the credentials and the kill-switch URL together.',                     time: '≈ 1m' },
                { num: 'iii', title: 'Wire one merchant.', body: "Paste a curl into your merchant's checkout flow — or hand them the docs. The endpoint returns a deterministic decision; nothing to negotiate.",              time: '≈ 2m' },
                { num: 'iv',  title: 'See your first receipt.', body: 'Run a test action. Your ledger fills in. The receipt is signed, the HMAC is recomputable, and the decision is replayable — forever.',                  time: '≈ 90s' },
              ].map((p, i) => (
                <motion.div
                  key={p.num}
                  className="prim"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.08 }}
                >
                  <span className="num">{p.num}</span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                    <span style={{ display: 'inline-block', marginTop: 14, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-fade)' }}>{p.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Link href="/workspace" className="btn btn-gold">Start the 5-minute tour →</Link>
              <Link href="/workspace" className="btn btn-ghost">Read the quickstart</Link>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ink-fade)', marginLeft: 8 }}>No credit card · free during pilot</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 03 — The opportunity ─────────────────────────── */}
        <section className="section" id="why">
          <div className="container">
            <motion.div
              className="chapter-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="chapter-index">03 — The opportunity</span>
              <h2 className="section-title">Why now.</h2>
              <span className="eyebrow">Read · 4 min</span>
            </motion.div>

            <motion.div
              style={{ marginTop: 56 }}
              className="column"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p>Agentic commerce is no longer hypothetical. Consumer AI agents are about to book flights, buy groceries, file returns, and renegotiate subscriptions on behalf of hundreds of millions of people. None of that runs on infrastructure designed for it.</p>
              <p>OAuth was built for humans approving apps. Payment networks were built for cards in wallets. Compliance regimes were built for institutions. The default answer to <em className="italic" style={{ color: 'var(--ink)' }}>"is this agent allowed to do X for this user right now?"</em> is silence — or a checkbox that no one audited.</p>
              <p>AgentPass is the verification, permission and resolution layer that lets people delegate real money and real decisions to agents and still feel in control when they wake up the next morning. Identity, proof, approval, ledger, resolution — one continuous chain.</p>
              <p>We make merchants the trust counter-party they always wanted to be. We give households a single approvals queue instead of seven app inboxes. We give regulators an audit trail that survives the lifetime of the decision, not the lifetime of a session token.</p>
            </motion.div>

            <div className="pill-list" style={{ marginTop: 48 }}>
              {['Trust ledger', 'Delegation proofs', 'Approval engine', 'Merchant network', 'Resolution flows', 'Kill-switch propagation', 'Household roles'].map(p => (
                <span key={p} className="pill">{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 04 — Horizon ──────────────────────────────────── */}
        <section className="section tight">
          <div className="container">
            <motion.div
              className="horizon"
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="stars" />
              <div className="copy">
                <span className="eyebrow">04 — Posture</span>
                <h3 className="section-title" style={{ color: 'var(--ink)', maxWidth: '18ch' }}>A signed receipt for every agent decision, on the horizon of trust.</h3>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 05 — Architecture ─────────────────────────────── */}
        <section className="section" id="architecture">
          <div className="container">
            <motion.div
              className="chapter-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="chapter-index">05 — Architecture</span>
              <h2 className="section-title">Four primitives. <em className="italic" style={{ color: 'var(--gold)' }}>One chain of trust.</em></h2>
              <a href="/workspace" className="hover-shift" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Reference →</a>
            </motion.div>

            <div className="primitives" style={{ marginTop: 48, borderTop: '1px solid var(--rule)' }}>
              {[
                { num: '01', title: 'Agent Passport',     body: 'A cryptographic identity for each agent — bound to the user, scoped by model class and capability tier. The trust container the rest of the system keys off of.' },
                { num: '02', title: 'Delegation Proofs',  body: 'Signed authorizations a merchant can verify without trusting AgentPass. HMAC over the proof\'s identifying fields. Scoped, expiring, revocable in real time.' },
                { num: '03', title: 'Approval Engine',    body: 'Every action evaluated against policy. Low-risk grocery purchases auto-clear; critical actions always pause for a human. Approvals expire if no one decides.' },
                { num: '04', title: 'Action Ledger',      body: 'Append-only audit trail of every state change. Click any action and see exactly who authorized what, when, and under which proof.' },
              ].map((p, i) => (
                <motion.div
                  key={p.num}
                  className="prim"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.1 }}
                >
                  <span className="num">{p.num}</span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 06 — Receipts ─────────────────────────────────── */}
        <section className="section" id="ledger" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
          <div className="container">
            <motion.div
              className="chapter-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="chapter-index">06 — Receipts</span>
              <h2 className="section-title">Every action, signed.</h2>
              <span className="eyebrow">{hasData ? 'Your workspace' : 'Anonymous view'}</span>
            </motion.div>

            <p style={{ marginTop: 24, maxWidth: '64ch', fontSize: 15, lineHeight: 1.65, color: 'var(--ink-fade)' }}>
              {hasData
                ? "Here's the last burst of activity from your workspace. Click any row to open it in the ledger and replay the full decision path — input, policy snapshot, signature."
                : "You're not signed in, so we won't fake a workspace for you. Below is the trust chain itself — the four primitives every AgentPass decision passes through. Sign in and this section fills in with your own ledger and signed receipts."}
            </p>

            {/* Anonymous — trust chain */}
            {!hasData && (
              <motion.div
                style={{ marginTop: 56 }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="trust-stage" aria-hidden="true">
                  <svg className="ring" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(212,163,90,0.15)" strokeWidth="0.3" strokeDasharray="0.4 1.2" />
                  </svg>
                  <div className="chain">
                    {[
                      { step: 1, letter: 'P', label: 'Passport', desc: 'Identity bound to a person, a model class, a device.',
                        icon: <><polygon points="32,4 56,16 60,32 56,48 32,60 8,48 4,32 8,16" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" /><text x="32" y="38" textAnchor="middle" fontFamily="Instrument Serif" fontSize="22" fontStyle="italic" fill="currentColor">P</text></> },
                      { step: 2, letter: '✉', label: 'Proof',    desc: 'Scoped, expiring, signed. Recomputable by the merchant.',
                        icon: <><rect x="8" y="14" width="48" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" /><path d="M 12 22 L 32 36 L 52 22" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" /><text x="32" y="58" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" letterSpacing="1.5" fill="currentColor">HMAC</text></> },
                      { step: 3, letter: '✓', label: 'Approval', desc: 'Policy evaluates. Humans pause critical actions.',
                        icon: <><circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" /><path d="M 22 32 L 30 40 L 44 24" fill="none" stroke="currentColor" strokeWidth="1.4" /></> },
                      { step: 4, letter: 'R', label: 'Receipt',  desc: 'Append-only, replayable, signed. Yours for seven years.',
                        icon: <><rect x="14" y="6" width="36" height="52" rx="2" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" /><line x1="20" y1="18" x2="44" y2="18" stroke="currentColor" strokeWidth="0.6" /><line x1="20" y1="26" x2="44" y2="26" stroke="currentColor" strokeWidth="0.6" /><line x1="20" y1="34" x2="38" y2="34" stroke="currentColor" strokeWidth="0.6" /><text x="32" y="50" textAnchor="middle" fontFamily="Instrument Serif" fontSize="14" fontStyle="italic" fill="currentColor">AP</text></> },
                    ].flatMap((node, i, arr) => {
                      const el = (
                        <div key={node.step} className="node" data-step={node.step}>
                          <div className="seal">
                            <svg viewBox="0 0 64 64" width="56" height="56">{node.icon}</svg>
                            <span className="dot-pulse" />
                          </div>
                          <span className="step-num">0{node.step}</span>
                          <h4>{node.label}</h4>
                          <p>{node.desc}</p>
                        </div>
                      )
                      return i < arr.length - 1 ? [el, <div key={`line-${i}`} className="line"><span className="pulse" /></div>] : [el]
                    })}
                  </div>
                  <div className="telemetry">
                    {[
                      { x: '8%',  y: '22%', d: '0s',   t: 'prf_2bX1A…a1f9' },
                      { x: '78%', y: '18%', d: '1.4s',  t: 'OK · 42ms' },
                      { x: '22%', y: '78%', d: '2.6s',  t: 'led_018f7c4a' },
                      { x: '64%', y: '84%', d: '3.8s',  t: 'sha256=f3b8…' },
                      { x: '42%', y: '12%', d: '5.0s',  t: 'scope: grocery' },
                      { x: '88%', y: '60%', d: '6.2s',  t: 'HOLD · expires 58m' },
                    ].map((t, i) => (
                      <span key={i} style={{ ['--x' as string]: t.x, ['--y' as string]: t.y, ['--d' as string]: t.d }}>{t.t}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 24, borderTop: '1px solid var(--rule)' }}>
                  <span className="eyebrow">One pass through this chain · ~42ms · always signed</span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href="/workspace" className="btn btn-gold btn-sm">Sign in to see your own ledger →</Link>
                    <button onClick={toggleData} className="btn btn-ghost btn-sm" type="button">Preview sample data</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Signed-in — ledger + receipt */}
            {hasData && (
              <motion.div
                style={{ marginTop: 56, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
                  <span className="chip" style={{ position: 'absolute', top: -12, left: 24, background: 'var(--bg-2)', borderColor: 'var(--rule-3)', color: 'var(--gold)', fontSize: 10 }}><span className="dot" />Sample · not your data</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="eyebrow">Action ledger · last 8 events (example)</span>
                    <span className="chip live"><span className="dot" />Demo stream</span>
                  </div>
                  <div className="ledger">
                    <div className="led-row alive"><span className="t">02:14</span><span className="name">checkout.commit · groceries · $84.20</span><span className="actor">drift-7af2</span><span className="status ok">OK</span></div>
                    <div className="led-row"><span className="t">02:13</span><span className="name">proof.verify · merchant=wholefoods.api</span><span className="actor">drift-7af2</span><span className="status ok">OK</span></div>
                    <div className="led-row"><span className="t">02:11</span><span className="name">subscription.modify · plus → family</span><span className="actor">halo-31bc</span><span className="status hold">HOLD</span></div>
                    <div className="led-row"><span className="t">02:09</span><span className="name">refund.initiate · order#9114</span><span className="actor">pilot-902e</span><span className="status ok">OK</span></div>
                    <div className="led-row"><span className="t">02:07</span><span className="name">passport.bind · scope=travel</span><span className="actor">sigma-44dd</span><span className="status ok">OK</span></div>
                    <div className="led-row"><span className="t">02:04</span><span className="name">proof.revoke · cause=stale_session</span><span className="actor">echo-0001</span><span className="status deny">DENY</span></div>
                    <div className="led-row"><span className="t">02:01</span><span className="name">policy.evaluate · amount_over_500</span><span className="actor">drift-7af2</span><span className="status hold">HOLD</span></div>
                    <div className="led-row"><span className="t">01:58</span><span className="name">checkout.commit · travel · $312.00</span><span className="actor">sigma-44dd</span><span className="status ok">OK</span></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--rule)' }}>
                    <span className="eyebrow">Cryptographically signed · 7yr retention</span>
                    <a href="/ledger" className="hover-shift" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Open ledger →</a>
                  </div>
                </div>

                <div className="receipt">
                  <span className="chip" style={{ position: 'absolute', top: -12, left: 24, background: 'var(--bg-2)', borderColor: 'var(--rule-3)', color: 'var(--gold)', fontSize: 10, zIndex: 2 }}><span className="dot" />Sample receipt</span>
                  <div className="stamp">
                    <svg viewBox="0 0 110 110">
                      <circle cx="55" cy="55" r="52" fill="none" stroke="var(--signal)" strokeWidth="1.5" opacity="0.6" />
                      <circle cx="55" cy="55" r="42" fill="none" stroke="var(--signal)" strokeWidth="0.7" opacity="0.5" />
                      <text x="55" y="38" textAnchor="middle" fill="var(--signal)" fontFamily="JetBrains Mono" fontSize="7" letterSpacing="2">VERIFIED</text>
                      <text x="55" y="62" textAnchor="middle" fill="var(--signal)" fontFamily="Instrument Serif" fontSize="22" fontStyle="italic">AP</text>
                      <text x="55" y="78" textAnchor="middle" fill="var(--signal)" fontFamily="JetBrains Mono" fontSize="7" letterSpacing="2">EDITION 04</text>
                    </svg>
                  </div>
                  <span className="eyebrow">Signed Receipt · #9114</span>
                  <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 32, lineHeight: 1.05, marginTop: 14, maxWidth: '14ch' }}>Groceries, on your behalf.</h3>
                  <div style={{ marginTop: 24 }}>
                    <div className="row"><span>Agent</span><span>drift-7af2 · gpt-class-A</span></div>
                    <div className="row"><span>Acting for</span><span>Maya R. · household-04</span></div>
                    <div className="row"><span>Merchant</span><span>wholefoods.api</span></div>
                    <div className="row"><span>Proof</span><span>prf_2bX…·a1f9</span></div>
                    <div className="row"><span>Policy</span><span>grocery.under_100 · OK</span></div>
                    <div className="row big"><span>Amount</span><span>$84.20</span></div>
                  </div>
                  <p style={{ marginTop: 24, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-fade)' }}>Auto-cleared at 02:14:08 UTC. HMAC verified merchant-side at 02:14:08.041. Ledgered before merchant returned 200.</p>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={toggleData} className="btn btn-ghost btn-sm">Back to anonymous view</button>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── SECTION 07 — Use cases ────────────────────────────────── */}
        <section className="section" id="usecases">
          <div className="container">
            <motion.div
              className="chapter-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="chapter-index">07 — In the field</span>
              <h2 className="section-title">Where it earns its keep.</h2>
              <span className="eyebrow">Pilot partners</span>
            </motion.div>

            <div className="uses" style={{ marginTop: 48 }}>
              {[
                { tag: 'Household', title: 'The Saturday grocery run.', body: "Maya delegates her family's weekly shop to an agent. It clears under-$100 grocery orders automatically. Anything else pauses for her.", link: 'See the household →', href: '/workspace' },
                { tag: 'Merchant',  title: 'Refunds without an inbox.', body: 'Merchants verify one endpoint and ledger the outcome. Returns and refunds resolve inside the same proof chain — never a stranded customer-service ticket.', link: 'See the API →', href: '/workspace' },
                { tag: 'Operator',  title: 'Control without surveillance.', body: 'A single pane to revoke any agent, freeze any merchant, or replay any decision — without reading anyone\'s private session content.', link: 'Open control plane →', href: '/workspace' },
              ].map((u, i) => (
                <motion.div
                  key={u.tag}
                  className="use"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.09 }}
                >
                  <span className="eyebrow">{u.tag}</span>
                  <h4>{u.title}</h4>
                  <p className="text-soft" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{u.body}</p>
                  <a href={u.href} className="hover-shift" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', marginTop: 16 }}>{u.link}</a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 08 — Security ─────────────────────────────────── */}
        <section className="section" id="security" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)', borderTop: '1px solid var(--rule)' }}>
          <div className="container">
            <motion.div
              className="chapter-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="chapter-index">08 — Security posture</span>
              <h2 className="section-title">Reduce the blast radius of <em className="italic" style={{ color: 'var(--signal)' }}>every</em> agent decision.</h2>
              <span className="eyebrow">Built in · not configured</span>
            </motion.div>

            <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 48, alignItems: 'start' }}>
              <div>
                <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--ink-soft)', maxWidth: '48ch' }}>
                  Prompt injection, model jailbreaks, session abuse, merchant-side ambiguity — AgentPass treats every action as suspicious until proven scoped, fresh, and signed. The default is pause; the exception is auto-clear.
                </p>
                <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <Link href="/workspace" className="btn btn-ghost">Review security controls →</Link>
                  <a href="/api/status" className="btn btn-ghost">System status</a>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { label: 'Identity binding · agent ↔ user ↔ device', badge: 'Always on', ok: true },
                  { label: 'Scoped, expiring proofs · HMAC per action',  badge: 'Always on', ok: true },
                  { label: 'Policy evaluation · per merchant, per amount', badge: 'Always on', ok: true },
                  { label: 'Human approval · expiring queue',              badge: 'Always on', ok: true },
                  { label: 'Ledger audit · append-only, 7yr retention',   badge: 'Always on', ok: true },
                  { label: 'Kill switch · network-wide revocation',        badge: '1.2s avg',  ok: false },
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    className="tile"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px' }}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{row.label}</span>
                    <span className={`chip${row.ok ? ' ok' : ''}`}><span className="dot" />{row.badge}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 09 — Insights ─────────────────────────────────── */}
        <section className="section">
          <div className="container">
            <motion.div
              className="chapter-head"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="chapter-index">09 — Recent thinking</span>
              <h2 className="section-title">Prospectus notes.</h2>
              <a href="/workspace" className="hover-shift" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>All insights →</a>
            </motion.div>

            <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 48 }}>
              {[
                { tag: 'Perspective', title: 'The category bet: identity infrastructure for the agent era.',     body: 'AI agents are about to do real things — book, buy, return, renew. None of the existing stack was built for an AI actor.',          date: 'May 2026 · 8 min' },
                { tag: 'Product',     title: 'Merchant verification API enters live pilot.',                       body: 'One endpoint, deterministic decision, recomputable HMAC. No SDK, no negotiation, no opaque trust.',                              date: 'May 2026 · 5 min' },
                { tag: 'Security',    title: 'Why we ship a kill switch on day one.',                             body: 'Agents can be jailbroken, prompts can be injected. Real-time revocation propagates in 1.2s — every active session terminated.', date: 'May 2026 · 6 min' },
              ].map((a, i) => (
                <motion.article
                  key={a.tag}
                  style={{ borderTop: '1px solid var(--rule-2)', paddingTop: 24 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.1 }}
                >
                  <span className="eyebrow">{a.tag}</span>
                  <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 26, lineHeight: 1.15, marginTop: 16 }} className="hover-shift">{a.title}</h3>
                  <p style={{ marginTop: 14, fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{a.body}</p>
                  <span style={{ marginTop: 24, display: 'inline-block', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-fade)' }}>{a.date}</span>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────── */}
        <section className="section" style={{ paddingBottom: 80 }}>
          <div className="container">
            <motion.div
              className="final grain"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="eyebrow">Begin</span>
              <h2 className="final-title" style={{ marginTop: 20 }}>
                Trust the action,<br />
                <em className="italic" style={{ color: 'var(--gold)' }}>not the agent.</em>
              </h2>
              <p style={{ margin: '30px auto 0', maxWidth: '48ch', fontSize: 17, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
                Join the teams building responsible AI-agent commerce — with identity, permission and resolution infrastructure that scales from a single household to the entire network.
              </p>
              <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <Link href="/workspace" className="btn btn-gold">Start onboarding →</Link>
                <Link href="/workspace" className="btn btn-ghost">See a live receipt</Link>
              </div>
              <p style={{ marginTop: 32, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--ink-fade)' }}>No credit card required · Free during pilot</p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="container" style={{ paddingTop: 80, paddingBottom: 64 }}>
          <div style={{ display: 'grid', gap: 48, gridTemplateColumns: '1.4fr repeat(4,1fr)', alignItems: 'start' }}>
            <div>
              <Link href="/" className="brand">
                <span className="brand-mark"><Seal /></span>
                <span className="brand-name">AgentPass</span>
              </Link>
              <p style={{ marginTop: 24, maxWidth: 300, fontSize: 14, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
                Trust, permission, and resolution infrastructure for AI agents acting on behalf of people.
              </p>
              <div className="chip ok" style={{ marginTop: 24 }}><span className="dot" />All systems operational</div>
              <p style={{ marginTop: 28, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ink-whisper)' }}>© 2026 AgentPass, Inc.</p>
            </div>
            {[
              { title: 'Product',    links: [['Agent Passport', '/#architecture'], ['Approval Engine', '/#architecture'], ['Policy Builder', '/#architecture'], ['Action Ledger', '/ledger']] },
              { title: 'Developers', links: [['Merchant API', '/workspace'], ['Verification log', '/ledger'], ['Signed proofs', '/workspace'], ['Reference', '/workspace']] },
              { title: 'Trust',      links: [['Kill switch', '/#security'], ['Audit trail', '/ledger'], ['Status', '/api/status'], ['Disclosures', '/#security']] },
              { title: 'Company',    links: [['About', '/'], ['Pricing', '/'], ['Workspace', '/workspace'], ['Sign in', '/workspace']] },
            ].map(g => (
              <div key={g.title}>
                <h4 className="eyebrow">{g.title}</h4>
                <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {g.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} style={{ fontSize: 14, color: 'var(--ink)' }} className="hover-shift">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 80, paddingTop: 24, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ink-fade)' }}>
            <span>Edition 04 · Cinematic Editorial</span>
            <span>Trust the action, not the agent.</span>
          </div>
        </div>
      </footer>
    </>
  )
}
