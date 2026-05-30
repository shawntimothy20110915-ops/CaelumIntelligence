'use client'
import { useEffect, useState } from 'react'

type Activity = {
  id: string; passportId: string; agentLabel: string; type: string;
  message: string; amount?: number; merchant?: string; decision?: string; ts: number;
}

export default function LiveActivityPage() {
  const [items, setItems] = useState<Activity[]>([])

  useEffect(() => {
    const tick = async () => {
      const r = await fetch('/api/activity?limit=80')
      const d = await r.json()
      setItems(d.activity)
    }
    tick()
    const t = setInterval(tick, 1500)
    return () => clearInterval(t)
  }, [])

  return (
    <main style={{ background:'#0a0a0a', color:'#fff', minHeight:'100vh', padding:32, fontFamily:'-apple-system,Segoe UI,sans-serif' }}>
      <h1 style={{ fontSize:28, fontWeight:700, marginBottom:6 }}>Live Activity</h1>
      <p style={{ color:'#888', marginBottom:24 }}>Every agent action across your org — streaming in real-time.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map(a => {
          const color = a.decision === 'approved' ? '#10b981' : a.decision === 'denied' ? '#ef4444' : a.decision === 'human_review' ? '#f59e0b' : '#6366f1'
          return (
            <div key={a.id} style={{ background:'#141414', border:`1px solid ${color}33`, borderLeft:`3px solid ${color}`, borderRadius:8, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, color:'#888', marginBottom:4 }}>{new Date(a.ts).toLocaleTimeString()} · {a.agentLabel}</div>
                <div style={{ fontWeight:500 }}>{a.message}</div>
              </div>
              {a.decision && <span style={{ background:color+'22', color, padding:'4px 10px', borderRadius:4, fontSize:12, fontWeight:600, textTransform:'uppercase' }}>{a.decision}</span>}
            </div>
          )
        })}
        {!items.length && <div style={{ color:'#444' }}>No activity yet.</div>}
      </div>
    </main>
  )
}
