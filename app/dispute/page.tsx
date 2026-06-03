'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

type Message = { role: 'user' | 'system'; text: string; ts: number }
type Thread = { id: string; receiptId: string; passportId: string; messages: Message[]; status: string; createdAt: number }

export default function DisputePage() {
  const [receiptId, setReceiptId] = useState('')
  const [passportId, setPassportId] = useState('')
  const [thread, setThread] = useState<Thread | null>(null)
  const [msg, setMsg] = useState('')
  const [step, setStep] = useState<'form' | 'chat'>('form')
  const [shake, setShake] = useState(false)

  function deny() { setShake(true); setTimeout(() => setShake(false), 500) }

  async function open() {
    if (!receiptId.trim() || !passportId.trim()) { deny(); return }
    const r = await fetch('/api/dispute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId: receiptId.trim(), passportId: passportId.trim(), message: 'Opening dispute — please review this denial.' }),
    })
    const d = await r.json()
    if (d.thread) { setThread(d.thread); setStep('chat') }
  }

  async function send() {
    if (!msg.trim() || !thread) { deny(); return }
    const userMsg = msg.trim(); setMsg('')
    const r = await fetch('/api/dispute', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id, message: userMsg, role: 'user' }),
    })
    const d1 = await r.json()
    setThread(d1.thread)
    await new Promise(res => setTimeout(res, 800))
    const reply = ['Reviewing on-chain receipt…', 'Checking policy at time of denial…', 'Decision under review — expect resolution within 24 h.'][Math.floor(Math.random() * 3)]
    const r2 = await fetch('/api/dispute', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id, message: reply, role: 'system' }),
    })
    const d2 = await r2.json()
    setThread(d2.thread)
  }

  const STATUS_COLOR: Record<string, string> = { open: brand.colors.warn, resolved: brand.colors.success, escalated: brand.colors.danger }

  return (
    <BrandFrame title="Dispute" subtitle="Contest a denial — open a thread, submit evidence, get a resolution" accent={brand.colors.danger} particleCount={40}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form"
              initial={{ opacity: 0, y: 30 }} animate={shake ? { x: [0, -10, 10, -8, 8, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[['Receipt ID', receiptId, setReceiptId], ['Passport ID', passportId, setPassportId]].map(([label, val, setter]) => (
                <div key={String(label)}>
                  <div style={{ fontFamily: brand.font.mono, fontSize: 11, color: brand.colors.muted, marginBottom: 8, letterSpacing: 2 }}>{String(label)}</div>
                  <input value={String(val)} onChange={e => (setter as (v: string) => void)(e.target.value)}
                    placeholder={`${String(label).toLowerCase()}…`}
                    style={{ width: '100%', background: brand.colors.surface, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.md, color: brand.colors.text, fontFamily: brand.font.mono, fontSize: 14, padding: '14px 16px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={open}
                style={{ padding: '16px', borderRadius: brand.radius.md, background: brand.colors.danger, border: 'none', color: brand.colors.text, fontFamily: brand.font.mono, fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: `0 0 30px ${brand.colors.danger}44` }}>
                Open Dispute ⚑
              </motion.button>
            </motion.div>
          )}

          {step === 'chat' && thread && (
            <motion.div key="chat" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[thread.status] ?? brand.colors.muted }} />
                <span style={{ fontFamily: brand.font.mono, fontSize: 12, color: brand.colors.muted }}>
                  {thread.id} · {thread.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, maxHeight: 400, overflowY: 'auto', padding: '4px 0' }}>
                <AnimatePresence>
                  {thread.messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: m.role === 'user' ? 30 : -30 }} animate={{ opacity: 1, x: 0 }}
                      style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '12px 16px', borderRadius: brand.radius.md,
                        background: m.role === 'user' ? `${brand.colors.accent}33` : brand.colors.surface,
                        border: `1px solid ${m.role === 'user' ? brand.colors.accent : brand.colors.border}44`,
                        fontFamily: brand.font.mono, fontSize: 13, color: brand.colors.text }}>
                      {m.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="add evidence or question…"
                  style={{ flex: 1, background: brand.colors.surface, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.md, color: brand.colors.text, fontFamily: brand.font.mono, fontSize: 14, padding: '12px 16px', outline: 'none' }} />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={send}
                  style={{ padding: '12px 20px', borderRadius: brand.radius.md, background: brand.colors.accent, border: 'none', color: brand.colors.text, cursor: 'pointer', fontSize: 18 }}>
                  →
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BrandFrame>
  )
}
