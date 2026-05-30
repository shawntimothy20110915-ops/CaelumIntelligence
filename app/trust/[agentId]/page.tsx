'use client'
import { useEffect, useState, use } from 'react'

type TrustScore = { agentId: string; score: number; approvals: number; denials: number; disputes: number; bondUsd: number; ageDays: number; badges: string[] }
type Passport = { id: string; label: string; agentId: string }

export default function TrustProfilePage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const [score, setScore] = useState<TrustScore | null>(null)
  const [passport, setPassport] = useState<Passport | null>(null)

  useEffect(() => {
    fetch(`/api/trust-score?agentId=${agentId}`).then(r => r.json()).then(d => {
      if (d.score) { setScore(d.score); setPassport(d.passport) }
    })
  }, [agentId])

  if (!score || !passport) return <main style={{ background:'#0a0a0a', color:'#888', padding:40, minHeight:'100vh' }}>Loading…</main>

  const tier = score.score >= 800 ? 'EXCELLENT' : score.score >= 600 ? 'GOOD' : score.score >= 400 ? 'FAIR' : 'POOR'
  const color = score.score >= 800 ? '#10b981' : score.score >= 600 ? '#3b82f6' : score.score >= 400 ? '#f59e0b' : '#ef4444'

  return (
    <main style={{ background:'#0a0a0a', color:'#fff', minHeight:'100vh', padding:40, fontFamily:'-apple-system,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth:780, margin:'0 auto' }}>
        <div style={{ fontSize:11, color:'#666', letterSpacing:2, marginBottom:6 }}>AGENTPASS TRUST PROFILE</div>
        <h1 style={{ fontSize:36, fontWeight:700, marginBottom:4 }}>{passport.label}</h1>
        <div style={{ color:'#888', fontFamily:'monospace', marginBottom:32 }}>{passport.agentId}</div>

        <div style={{ background:'#141414', borderRadius:12, padding:32, marginBottom:24, border:`2px solid ${color}44` }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:8 }}>
            <div style={{ fontSize:72, fontWeight:800, color }}>{score.score}</div>
            <div style={{ fontSize:24, color:'#666' }}>/ 1000</div>
          </div>
          <div style={{ fontSize:14, fontWeight:600, color, letterSpacing:2 }}>{tier}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          <Stat label="APPROVALS" value={score.approvals} color="#10b981" />
          <Stat label="DENIALS"   value={score.denials}   color="#ef4444" />
          <Stat label="DISPUTES"  value={score.disputes}  color="#f59e0b" />
          <Stat label="AGE"       value={`${score.ageDays}d`} color="#3b82f6" />
        </div>

        {score.badges.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, color:'#666', letterSpacing:2, marginBottom:10 }}>BADGES</div>
            <div style={{ display:'flex', gap:8 }}>
              {score.badges.map(b => <span key={b} style={{ background:'#1e293b', color:'#60a5fa', padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, textTransform:'uppercase' }}>{b}</span>)}
            </div>
          </div>
        )}

        <div style={{ marginTop:32, padding:'16px 20px', background:'#0f172a', borderRadius:8, fontSize:13, color:'#888' }}>
          Embed: <code style={{ color:'#60a5fa' }}>{`<img src="/api/embed?agentId=${agentId}" />`}</code>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background:'#141414', borderRadius:8, padding:'18px 16px' }}>
      <div style={{ fontSize:10, color:'#666', letterSpacing:2, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color }}>{value}</div>
    </div>
  )
}
