'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BrandFrame } from '@/components/blocks/brand-frame'
import { brand } from '@/lib/brand'

type Node = { id: string; type: string; label: string; trustScore?: number; x?: number; y?: number; vx?: number; vy?: number }
type Edge = { source: string; target: string; weight: number; type: string }

export default function GraphPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selected, setSelected] = useState<Node | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<{ nodes: Node[]; edges: Edge[]; nodeMap: Map<string, Node>; frame: number }>({ nodes: [], edges: [], nodeMap: new Map(), frame: 0 })

  useEffect(() => {
    fetch('/api/trust-graph').then(r => r.json()).then(d => {
      const w = Math.min(window.innerWidth - 80, 900), h = 500
      const seeded = (d.graph?.nodes ?? []).map((n: Node, i: number) => ({
        ...n,
        x: 100 + (i % 6) * (w / 6) + (Math.random() - 0.5) * 60,
        y: 80 + Math.floor(i / 6) * 130 + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0,
      }))
      setNodes(seeded)
      setEdges(d.graph?.edges ?? [])
      stateRef.current.nodes = seeded
      stateRef.current.edges = d.graph?.edges ?? []
      stateRef.current.nodeMap = new Map(seeded.map((n: Node) => [n.id, n]))
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let running = true

    const NODE_COLOR: Record<string, string> = {
      agent: brand.colors.accent,
      org:   brand.colors.gold,
      action: brand.colors.info,
    }
    const EDGE_COLOR: Record<string, string> = {
      delegated: brand.colors.accent,
      paid:      brand.colors.success,
      evaluated: brand.colors.warn,
    }

    function simulate() {
      const ns = stateRef.current.nodes
      const es = stateRef.current.edges
      const REPEL = 800, ATTRACT = 0.02, DAMPEN = 0.88
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = (ns[j].x ?? 0) - (ns[i].x ?? 0)
          const dy = (ns[j].y ?? 0) - (ns[i].y ?? 0)
          const d2 = dx * dx + dy * dy + 1
          const f = REPEL / d2
          ns[i].vx = ((ns[i].vx ?? 0) - f * dx / Math.sqrt(d2))
          ns[i].vy = ((ns[i].vy ?? 0) - f * dy / Math.sqrt(d2))
          ns[j].vx = ((ns[j].vx ?? 0) + f * dx / Math.sqrt(d2))
          ns[j].vy = ((ns[j].vy ?? 0) + f * dy / Math.sqrt(d2))
        }
      }
      // ⚡ Bolt: Use cached O(1) map lookups instead of allocating a new O(N) Map every frame
      const nodeMap = stateRef.current.nodeMap
      for (const e of es) {
        const s = nodeMap.get(e.source), t = nodeMap.get(e.target)
        if (!s || !t) continue
        const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0)
        s.vx = ((s.vx ?? 0) + dx * ATTRACT); s.vy = ((s.vy ?? 0) + dy * ATTRACT)
        t.vx = ((t.vx ?? 0) - dx * ATTRACT); t.vy = ((t.vy ?? 0) - dy * ATTRACT)
      }
      const W = canvas!.width, H = canvas!.height
      for (const n of ns) {
        n.vx = (n.vx ?? 0) * DAMPEN; n.vy = (n.vy ?? 0) * DAMPEN
        n.x = Math.max(30, Math.min(W - 30, (n.x ?? 0) + (n.vx ?? 0)))
        n.y = Math.max(30, Math.min(H - 30, (n.y ?? 0) + (n.vy ?? 0)))
      }
    }

    function draw() {
      if (!running) return
      simulate()
      const ns = stateRef.current.nodes
      const es = stateRef.current.edges
      // ⚡ Bolt: Reuse the cached Map to prevent massive GC pauses in the animation loop
      const nodeMap = stateRef.current.nodeMap
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      for (const e of es) {
        const s = nodeMap.get(e.source), t = nodeMap.get(e.target)
        if (!s || !t) continue
        ctx!.beginPath()
        ctx!.moveTo(s.x ?? 0, s.y ?? 0)
        ctx!.lineTo(t.x ?? 0, t.y ?? 0)
        ctx!.strokeStyle = EDGE_COLOR[e.type] ?? brand.colors.border
        ctx!.globalAlpha = 0.4
        ctx!.lineWidth = Math.max(0.5, Math.min(e.weight / 200, 3))
        ctx!.stroke()
        ctx!.globalAlpha = 1
      }
      for (const n of ns) {
        const c = NODE_COLOR[n.type] ?? brand.colors.muted
        ctx!.beginPath()
        ctx!.arc(n.x ?? 0, n.y ?? 0, n.type === 'org' ? 18 : 12, 0, Math.PI * 2)
        ctx!.fillStyle = c + '33'
        ctx!.fill()
        ctx!.strokeStyle = c
        ctx!.lineWidth = 2
        ctx!.shadowColor = c
        ctx!.shadowBlur = 10
        ctx!.stroke()
        ctx!.shadowBlur = 0
        ctx!.fillStyle = brand.colors.text
        ctx!.font = '10px JetBrains Mono, monospace'
        ctx!.textAlign = 'center'
        ctx!.fillText(n.label.slice(0, 12), n.x ?? 0, (n.y ?? 0) + 26)
      }
      stateRef.current.frame = requestAnimationFrame(draw)
    }
    stateRef.current.frame = requestAnimationFrame(draw)
    return () => { running = false; cancelAnimationFrame(stateRef.current.frame) }
  }, [nodes.length])

  useEffect(() => { stateRef.current.nodes = nodes; stateRef.current.edges = edges; stateRef.current.nodeMap = new Map(nodes.map(n => [n.id, n])) }, [nodes, edges])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const hit = stateRef.current.nodes.find(n => Math.hypot((n.x ?? 0) - mx, (n.y ?? 0) - my) < 18)
    setSelected(hit ?? null)
  }

  return (
    <BrandFrame title="Trust Graph" subtitle="Force-directed graph of agents, orgs & actions — click any node for details" accent={brand.colors.accent} particleCount={30}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ position: 'relative', borderRadius: brand.radius.lg, overflow: 'hidden', border: `1px solid ${brand.colors.border}`, background: brand.colors.surface }}>
          <canvas ref={canvasRef} width={900} height={500} onClick={handleClick} style={{ width: '100%', cursor: 'crosshair', display: 'block' }} />
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 12 }}>
            {[['agent', brand.colors.accent], ['org', brand.colors.gold], ['action', brand.colors.info]].map(([type, c]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: brand.font.mono, fontSize: 11, color: brand.colors.muted }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c as string }} />
                {type}
              </div>
            ))}
          </div>
        </motion.div>

        {selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 16, padding: '16px 24px', borderRadius: brand.radius.md, background: brand.colors.surface2, border: `1px solid ${brand.colors.border}`, fontFamily: brand.font.mono, fontSize: 13, color: brand.colors.text }}>
            <span style={{ color: brand.colors.muted }}>type: </span>{selected.type}
            {' · '}
            <span style={{ color: brand.colors.muted }}>id: </span>{selected.id}
            {selected.trustScore != null && <>{' · '}<span style={{ color: brand.colors.muted }}>score: </span><span style={{ color: brand.colors.success }}>{selected.trustScore}</span></>}
          </motion.div>
        )}
      </div>
    </BrandFrame>
  )
}
