'use client'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { brand } from '@/lib/brand'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<{ email: string; plan: string } | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setMe(d.user))
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      window.location.href = '/dashboard'
    } catch {
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setMe(null)
  }

  const card: React.CSSProperties = {
    width: '100%', maxWidth: 420, background: brand.colors.surface,
    border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg,
    padding: 36, boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '12px 14px', marginTop: 6, marginBottom: 16,
    background: brand.colors.bg, border: `1px solid ${brand.colors.border}`,
    borderRadius: brand.radius.md, color: brand.colors.text, fontSize: 15,
    fontFamily: brand.font.sans, outline: 'none',
  }
  const label: React.CSSProperties = { fontSize: 13, color: brand.colors.subdued, fontWeight: 500 }

  return (
    <main style={{
      minHeight: '100vh', background: brand.colors.bg, color: brand.colors.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: brand.font.sans,
    }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 90 }} style={card}>
        <a href="/" style={{ color: brand.colors.gold, fontWeight: 700, fontSize: 18, textDecoration: 'none', letterSpacing: -0.3 }}>
          AgentPass
        </a>

        {checking ? (
          <p style={{ color: brand.colors.muted, marginTop: 28 }}>Loading…</p>
        ) : me ? (
          <div style={{ marginTop: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 6px' }}>You’re signed in</h1>
            <p style={{ color: brand.colors.muted, fontSize: 14, margin: '0 0 24px' }}>
              {me.email} · <span style={{ color: brand.colors.gold }}>{me.plan}</span> plan
            </p>
            <a href="/dashboard" style={{
              display: 'block', textAlign: 'center', padding: '12px 0', borderRadius: brand.radius.md,
              background: brand.colors.gold, color: '#0a0a0a', fontWeight: 600, textDecoration: 'none', marginBottom: 12,
            }}>Go to dashboard</a>
            <button onClick={logout} style={{
              width: '100%', padding: '11px 0', borderRadius: brand.radius.md, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${brand.colors.border}`, color: brand.colors.subdued, fontSize: 14,
            }}>Log out</button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: '24px 0 4px' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ color: brand.colors.muted, fontSize: 14, margin: '0 0 24px' }}>
              {mode === 'login' ? 'Sign in to your AgentPass dashboard.' : 'Start free — no card required.'}
            </p>

            <form onSubmit={submit}>
              <label style={label} htmlFor="email">Email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" style={input} autoComplete="email" />

              <label style={label} htmlFor="password">Password</label>
              <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} style={input}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

              {error && (
                <div style={{
                  background: `${brand.colors.danger}14`, border: `1px solid ${brand.colors.danger}44`,
                  color: brand.colors.danger, borderRadius: brand.radius.md, padding: '10px 12px',
                  fontSize: 13, marginBottom: 16,
                }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px 0', borderRadius: brand.radius.md, cursor: 'pointer',
                background: brand.colors.gold, color: '#0a0a0a', fontWeight: 600, fontSize: 15, border: 'none',
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', color: brand.colors.muted, fontSize: 14, marginTop: 20 }}>
              {mode === 'login' ? "Don’t have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
                style={{ background: 'none', border: 'none', color: brand.colors.gold, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </motion.div>
    </main>
  )
}
