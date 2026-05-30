'use client'
import { useState } from 'react'

export default function OnboardPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [usecase, setUsecase] = useState('purchase')
  const [budget, setBudget] = useState('500')
  const [merchants, setMerchants] = useState('amazon.com')
  const [passportId, setPassportId] = useState('')
  const [proofId, setProofId] = useState('')

  async function go() {
    if (step === 0) { setStep(1); return }
    if (step === 1) { setStep(2); return }
    if (step === 2) {
      const mint = await fetch('/api/passport/mint', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ label: name, ttlDays: 30, budgetUsd: Number(budget) }) })
      const md = await mint.json()
      setPassportId(md.passport.id)
      const proof = await fetch('/api/proof/delegate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ passportId: md.passport.id, grantedTo: name, permissions: [usecase], ttlHours: 24, maxAmount: Number(budget), allowedMerchants: merchants.split(',').map(s=>s.trim()) }) })
      const pd = await proof.json()
      setProofId(pd.proof.id)
      setStep(3)
    }
  }

  return (
    <main style={{ background:'#0a0a0a', color:'#fff', minHeight:'100vh', padding:40, fontFamily:'-apple-system,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        <div style={{ fontSize:11, color:'#666', letterSpacing:2, marginBottom:6 }}>60-SECOND ONBOARDING · STEP {step + 1} / 4</div>
        <h1 style={{ fontSize:32, fontWeight:700, marginBottom:32 }}>{['Name your agent','What will it do?','Set guardrails','Ready to ship'][step]}</h1>

        <div style={{ background:'#141414', borderRadius:12, padding:28, marginBottom:24 }}>
          {step === 0 && <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="MyPurchaseBot" style={input} />}
          {step === 1 && (
            <select value={usecase} onChange={e => setUsecase(e.target.value)} style={input}>
              <option value="purchase">Make purchases</option>
              <option value="refund">Process refunds</option>
              <option value="search">Search and research</option>
              <option value="booking">Book travel</option>
              <option value="transfer">Transfer funds</option>
            </select>
          )}
          {step === 2 && (<>
            <label style={lbl}>Monthly Budget ($)</label>
            <input value={budget} onChange={e => setBudget(e.target.value)} style={input} />
            <label style={lbl}>Allowed Merchants</label>
            <input value={merchants} onChange={e => setMerchants(e.target.value)} style={input} />
          </>)}
          {step === 3 && (
            <div style={{ fontFamily:'monospace', fontSize:13, lineHeight:1.8 }}>
              <div style={{ color:'#10b981', marginBottom:14 }}>✓ Agent provisioned</div>
              <div style={{ color:'#888' }}>passportId: <span style={{ color:'#60a5fa' }}>{passportId}</span></div>
              <div style={{ color:'#888' }}>proofId: <span style={{ color:'#60a5fa' }}>{proofId}</span></div>
              <pre style={{ marginTop:18, padding:14, background:'#0a0a0a', borderRadius:6, fontSize:12 }}>{`fetch('/api/approval/evaluate', {
  method: 'POST',
  body: JSON.stringify({
    passportId: '${passportId}',
    proofId:    '${proofId}',
    action:     '${usecase}',
    merchant:   '${merchants.split(',')[0].trim()}',
    amount:     49,
  }),
})`}</pre>
            </div>
          )}
        </div>

        {step < 3 && <button onClick={go} disabled={step === 0 && !name} style={btn}>Continue →</button>}
        {step === 3 && <a href={`/trust/${passportId}`} style={{ ...btn, display:'inline-block', textDecoration:'none' }}>View Trust Profile</a>}
      </div>
    </main>
  )
}

const input: React.CSSProperties = { background:'#0a0a0a', border:'1px solid #2a2a2a', color:'#fff', padding:'12px 14px', borderRadius:6, width:'100%', marginBottom:10, fontSize:15 }
const lbl: React.CSSProperties = { fontSize:11, color:'#666', letterSpacing:2, marginBottom:6, display:'block' }
const btn: React.CSSProperties = { background:'#6366f1', color:'#fff', border:0, padding:'12px 24px', borderRadius:6, fontWeight:600, cursor:'pointer', fontSize:15 }
