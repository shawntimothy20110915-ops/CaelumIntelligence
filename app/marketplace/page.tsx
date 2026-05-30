'use client'
import { useEffect, useState } from 'react'

type Template = { id: string; name: string; vendor: string; category: string; priceUsd: number; installs: number; rating: number }

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  useEffect(() => { fetch('/api/marketplace').then(r => r.json()).then(d => setTemplates(d.templates)) }, [])
  return (
    <main style={{ background:'#0a0a0a', color:'#fff', minHeight:'100vh', padding:40, fontFamily:'-apple-system,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <h1 style={{ fontSize:32, fontWeight:700, marginBottom:6 }}>Policy Marketplace</h1>
        <p style={{ color:'#888', marginBottom:32 }}>Browse and install pre-built policy packs. 70/30 revenue share with vendors.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background:'#141414', borderRadius:12, padding:20, border:'1px solid #222' }}>
              <div style={{ fontSize:11, color:'#666', letterSpacing:2, marginBottom:6 }}>{t.category.toUpperCase()}</div>
              <h3 style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{t.name}</h3>
              <div style={{ color:'#888', fontSize:13, marginBottom:14 }}>by {t.vendor}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontSize:24, fontWeight:700 }}>${t.priceUsd}</span>
                <span style={{ color:'#f59e0b', fontSize:14 }}>★ {t.rating} · {t.installs.toLocaleString()} installs</span>
              </div>
              <button style={{ background:'#6366f1', color:'#fff', border:0, padding:'10px 16px', borderRadius:6, fontWeight:600, cursor:'pointer', width:'100%' }}>Install</button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
