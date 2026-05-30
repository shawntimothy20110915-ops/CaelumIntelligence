'use client'
import { useState, useEffect } from 'react'

type Passport = { id: string; label: string; agentId: string }
type Result = { activityId: string; action: string; amount?: number; merchant?: string; originalDecision?: string; wouldApprove: boolean; reason: string }

export default function PlaygroundPage() {
  const [passports, setPassports] = useState<Passport[]>([])
  const [selected, setSelected] = useState('')
  const [maxAmount, setMaxAmount] = useState('500')
  const [merchants, setMerchants] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [summary, setSummary] = useState<{ total: number; wouldApprove: number; wouldDeny: number } | null>(null)

  useEffect(() => {
    fetch('/api/passport/mint').then(r => r.json()).then(d => { setPassports(d.passports); setSelected(d.passports[0]?.id || '') })
  }, [])

  async function run() {
    const hypothesis: { maxAmount?: number; allowedMerchants?: string[] } = {}
    if (maxAmount) hypothesis.maxAmount = Number(maxAmount)
    if (merchants.trim()) hypothesis.allowedMerchants = merchants.split(',').map(m => m.trim()).filter(Boolean)
    const r = await fetch('/api/playground', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ passportId: selected, hypothesis }) })
    const d = await r.json()
    setResults(d.results)
    setSummary({ total: d.total, wouldApprove: d.wouldApprove, wouldDeny: d.wouldDeny })
  }

  return (
    <main style={{ background:'#0a0a0a', color:'#fff', minHeight:'100vh', padding:40, fontFamily:'-apple-system,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <h1 style={{ fontSize:32, fontWeight:700, marginBottom:6 }}>Policy Playground</h1>
        <p style={{ color:'#888', marginBottom:32 }}>Test a proposed policy against historical actions — without committing to it.</p>

        <div style={{ background:'#141414', borderRadius:12, padding:24, marginBottom:24 }}>
          <Label>Passport</Label>
          <select value={selected} onChange={e => setSelected(e.target.value)} style={input}>
            {passports.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id.slice(0,12)})</option>)}
          </select>
          <Label>Max Amount ($)</Label>
          <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} style={input} />
          <Label>Allowed Merchants (comma-sep)</Label>
          <input value={merchants} onChange={e => setMerchants(e.target.value)} placeholder="whole-foods, target" style={input} />
          <button onClick={run} style={btn}>Replay against history</button>
        </div>

        {summary && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            <Stat label="Total" v={summary.total} color="#6366f1" />
            <Stat label="Would Approve" v={summary.wouldApprove} color="#10b981" />
            <Stat label="Would Deny" v={summary.wouldDeny} color="#ef4444" />
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {results.map(r => {
            const c = r.wouldApprove ? '#10b981' : '#ef4444'
            return (
              <div key={r.activityId} style={{ background:'#141414', borderLeft:`3px solid ${c}`, borderRadius:6, padding:'10px 14px', display:'flex', justifyContent:'space-between' }}>
                <div style={{ fontSize:13 }}>{r.action} {r.merchant ? `@ ${r.merchant}` : ''} {r.amount ? `$${r.amount}` : ''} — <span style={{ color:'#666' }}>{r.reason}</span></div>
                <span style={{ color: c, fontSize:12, fontWeight:600 }}>{r.wouldApprove ? '✓' : '✗'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}

const input: React.CSSProperties = { background:'#0a0a0a', border:'1px solid #2a2a2a', color:'#fff', padding:'10px 12px', borderRadius:6, width:'100%', marginBottom:14 }
const btn: React.CSSProperties = { background:'#6366f1', color:'#fff', border:0, padding:'10px 20px', borderRadius:6, fontWeight:600, cursor:'pointer' }

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:11, color:'#666', letterSpacing:2, marginBottom:6, marginTop:6 }}>{String(children).toUpperCase()}</div>
}
function Stat({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div style={{ background:'#141414', borderRadius:8, padding:16 }}>
      <div style={{ fontSize:10, color:'#666', letterSpacing:2, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700, color }}>{v}</div>
    </div>
  )
}
