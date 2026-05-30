'use client'
import { useEffect, useState, use } from 'react'

export default function VerifyPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = use(params)
  const [data, setData] = useState<{ verified: boolean; receipt?: { id: string; passportId: string; agentId: string; action: string; merchant?: string; amount?: number; decision: string; issuedAt: number }; anchored?: boolean } | null>(null)

  useEffect(() => {
    fetch(`/api/verify?receiptId=${receiptId}`).then(r => r.json()).then(setData)
  }, [receiptId])

  if (!data) return <main style={{ background:'#0a0a0a', color:'#888', padding:40, minHeight:'100vh' }}>Verifying…</main>
  const color = data.verified ? '#10b981' : '#ef4444'

  return (
    <main style={{ background:'#0a0a0a', color:'#fff', minHeight:'100vh', padding:40, fontFamily:'-apple-system,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <div style={{ fontSize:11, color:'#666', letterSpacing:2, marginBottom:6 }}>AGENTPASS RECEIPT VERIFICATION</div>
        <h1 style={{ fontSize:32, fontWeight:700, marginBottom:24 }}>{receiptId}</h1>
        <div style={{ background:'#141414', borderRadius:12, padding:32, border:`2px solid ${color}44`, marginBottom:20 }}>
          <div style={{ fontSize:64, fontWeight:800, color }}>{data.verified ? '✓ VERIFIED' : '✗ INVALID'}</div>
          {data.anchored && <div style={{ color:'#60a5fa', marginTop:8, fontSize:13 }}>⛓ Merkle-anchored on Bitcoin</div>}
        </div>
        {data.receipt && (
          <div style={{ background:'#141414', borderRadius:8, padding:24, fontFamily:'monospace', fontSize:13, lineHeight:1.8 }}>
            <Row k="action"   v={data.receipt.action} />
            <Row k="merchant" v={data.receipt.merchant || '—'} />
            <Row k="amount"   v={data.receipt.amount ? `$${data.receipt.amount}` : '—'} />
            <Row k="decision" v={data.receipt.decision} />
            <Row k="passport" v={data.receipt.passportId} />
            <Row k="agent"    v={data.receipt.agentId} />
            <Row k="issued"   v={new Date(data.receipt.issuedAt).toISOString()} />
          </div>
        )}
      </div>
    </main>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display:'flex', gap:16 }}>
      <span style={{ color:'#666', width:90 }}>{k}</span>
      <span style={{ color:'#fff' }}>{v}</span>
    </div>
  )
}
