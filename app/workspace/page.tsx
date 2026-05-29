'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { AgentPassport, DelegationProof, LedgerEvent, ApprovalResult, SignedReceipt } from '@/lib/types'
import type { ApprovalQueueItem } from '@/lib/store'

type Tab = 'passports' | 'proofs' | 'approve' | 'queue' | 'revoke'

function Badge({ status }: { status: string }) {
  const cls =
    status === 'active' || status === 'completed' || status === 'approved'
      ? 'badge badge-green'
      : status === 'denied' || status === 'revoked'
      ? 'badge badge-red'
      : status === 'pending_review' || status === 'pending' || status === 'human_review'
      ? 'badge badge-amber'
      : 'badge badge-gray'
  return <span className={cls}>{status.toUpperCase().replace('_', ' ')}</span>
}

function timeAgo(ts: number) {
  const d = Date.now() - ts
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  return `${Math.floor(d / 3600000)}h ago`
}

export default function Workspace() {
  const [tab, setTab] = useState<Tab>('passports')
  const [passports, setPassports] = useState<AgentPassport[]>([])
  const [proofs, setProofs] = useState<DelegationProof[]>([])
  const [events, setEvents] = useState<LedgerEvent[]>([])
  const [queue, setQueue] = useState<ApprovalQueueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: string; data: unknown } | null>(null)

  // Passport mint form
  const [mintForm, setMintForm] = useState({ label: '', killSwitchUrl: '', ttlDays: '365' })

  // Proof delegation form
  const [proofForm, setProofForm] = useState({
    passportId: '', grantedTo: '', permissions: 'payment:execute,cart:read',
    maxAmount: '500', allowedMerchants: 'whole-foods,amazon-fresh', ttlHours: '24',
  })

  // Approval form
  const [approveForm, setApproveForm] = useState({
    passportId: '', proofId: '', action: 'payment:execute',
    merchant: 'whole-foods', amount: '47.23',
  })

  // Revoke form
  const [revokeForm, setRevokeForm] = useState({ type: 'passport', id: '', reason: '' })

  const fetchAll = useCallback(async () => {
    const [p, pr, e, q] = await Promise.all([
      fetch('/api/passport/mint').then(r => r.json()),
      fetch('/api/proof/delegate').then(r => r.json()),
      fetch('/api/ledger/events?limit=10').then(r => r.json()),
      fetch('/api/approval/queue').then(r => r.json()),
    ])
    setPassports(p.passports ?? [])
    setProofs(pr.proofs ?? [])
    setEvents(e.events ?? [])
    setQueue(q.queue ?? [])
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function mintPassport(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/passport/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: mintForm.label,
          killSwitchUrl: mintForm.killSwitchUrl || undefined,
          ttlDays: parseInt(mintForm.ttlDays) || undefined,
        }),
      })
      const data = await res.json()
      setResult({ type: 'Passport minted', data: data.passport })
      setMintForm({ label: '', killSwitchUrl: '', ttlDays: '365' })
      await fetchAll()
    } finally { setLoading(false) }
  }

  async function delegateProof(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/proof/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passportId: proofForm.passportId,
          grantedTo: proofForm.grantedTo,
          permissions: proofForm.permissions.split(',').map(s => s.trim()),
          maxAmount: parseFloat(proofForm.maxAmount) || undefined,
          allowedMerchants: proofForm.allowedMerchants.split(',').map(s => s.trim()).filter(Boolean),
          ttlHours: parseInt(proofForm.ttlHours) || 24,
        }),
      })
      const data = await res.json()
      setResult({ type: 'Proof delegated', data: data.proof })
      await fetchAll()
    } finally { setLoading(false) }
  }

  async function evaluateApproval(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/approval/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passportId: approveForm.passportId,
          proofId: approveForm.proofId,
          action: approveForm.action,
          merchant: approveForm.merchant || undefined,
          amount: parseFloat(approveForm.amount) || undefined,
        }),
      })
      const data = await res.json()
      setResult({ type: 'Approval evaluated', data: data })
      await fetchAll()
    } finally { setLoading(false) }
  }

  async function revoke(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: revokeForm.type, id: revokeForm.id, reason: revokeForm.reason }),
      })
      const data = await res.json()
      setResult({ type: 'Revoked', data })
      await fetchAll()
    } finally { setLoading(false) }
  }

  async function decideQueue(queueId: string, decision: 'approved' | 'denied') {
    setLoading(true)
    try {
      await fetch('/api/approval/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId, decision }),
      })
      await fetchAll()
    } finally { setLoading(false) }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'passports', label: 'passports' },
    { id: 'proofs', label: 'delegation proofs' },
    { id: 'approve', label: 'approval engine' },
    { id: 'queue', label: `human queue${queue.length > 0 ? ` (${queue.length})` : ''}` },
    { id: 'revoke', label: 'revoke / kill switch' },
  ]

  const sideEvents = events.slice(0, 6)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* NAV */}
      <nav style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.08em', fontSize: 13, textDecoration: 'none' }}>
            AGENTPASS
          </Link>
          <span style={{ color: 'var(--border-2)' }}>›</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>workspace</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/passport" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 11 }}>mint passport</Link>
          <Link href="/ledger" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 11 }}>ledger</Link>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', flex: 1 }}>
        {/* MAIN */}
        <div style={{ borderRight: '1px solid var(--border)', padding: '24px' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: 'none', border: 'none',
                  padding: '8px 14px', fontSize: 11,
                  color: tab === t.id ? 'var(--amber)' : 'var(--text-muted)',
                  borderBottom: tab === t.id ? '1px solid var(--amber)' : '1px solid transparent',
                  cursor: 'pointer', marginBottom: -1, letterSpacing: '0.04em',
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* PASSPORTS TAB */}
          {tab === 'passports' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Mint form */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>MINT AGENT PASSPORT</div>
                  <form onSubmit={mintPassport} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="label">agent label</label>
                      <input
                        className="input"
                        placeholder="e.g. Household Grocery Agent"
                        value={mintForm.label}
                        onChange={e => setMintForm(f => ({ ...f, label: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">kill-switch URL (optional)</label>
                      <input
                        className="input"
                        placeholder="https://yourapp.com/revoke/{id}"
                        value={mintForm.killSwitchUrl}
                        onChange={e => setMintForm(f => ({ ...f, killSwitchUrl: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label">TTL (days, blank = no expiry)</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="365"
                        value={mintForm.ttlDays}
                        onChange={e => setMintForm(f => ({ ...f, ttlDays: e.target.value }))}
                      />
                    </div>
                    <button type="submit" className="btn btn-amber" disabled={loading}>
                      {loading ? 'minting...' : '◈ mint passport'}
                    </button>
                  </form>
                </div>

                {/* Passport list */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>
                    ACTIVE PASSPORTS ({passports.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {passports.map(p => (
                      <div key={p.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</span>
                          <Badge status={p.status} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span>id: <span style={{ color: 'var(--amber)' }}>{p.id}</span></span>
                          <span>agent: <span style={{ color: 'var(--text)' }}>{p.agentId}</span></span>
                          <span>key: {p.publicKey.slice(0, 24)}...</span>
                          <span>minted: {timeAgo(p.mintedAt)}</span>
                          {p.expiresAt && <span>expires: {new Date(p.expiresAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROOFS TAB */}
          {tab === 'proofs' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>CREATE DELEGATION PROOF</div>
                  <form onSubmit={delegateProof} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="label">passport id</label>
                      <select
                        className="input"
                        value={proofForm.passportId}
                        onChange={e => setProofForm(f => ({ ...f, passportId: e.target.value }))}
                        required
                        style={{ background: 'var(--bg-2)', color: 'var(--text)', cursor: 'pointer' }}
                      >
                        <option value="">select passport...</option>
                        {passports.filter(p => p.status === 'active').map(p => (
                          <option key={p.id} value={p.id}>{p.label} ({p.id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">granted to (agent id)</label>
                      <input
                        className="input"
                        placeholder="agent id or name"
                        value={proofForm.grantedTo}
                        onChange={e => setProofForm(f => ({ ...f, grantedTo: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">permissions (comma-separated)</label>
                      <input
                        className="input"
                        placeholder="payment:execute,cart:read,order:create"
                        value={proofForm.permissions}
                        onChange={e => setProofForm(f => ({ ...f, permissions: e.target.value }))}
                        required
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="label">max amount ($)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="500"
                          value={proofForm.maxAmount}
                          onChange={e => setProofForm(f => ({ ...f, maxAmount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">TTL (hours)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="24"
                          value={proofForm.ttlHours}
                          onChange={e => setProofForm(f => ({ ...f, ttlHours: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">allowed merchants (comma-separated)</label>
                      <input
                        className="input"
                        placeholder="whole-foods,amazon-fresh"
                        value={proofForm.allowedMerchants}
                        onChange={e => setProofForm(f => ({ ...f, allowedMerchants: e.target.value }))}
                      />
                    </div>
                    <button type="submit" className="btn btn-amber" disabled={loading}>
                      {loading ? 'creating...' : '◇ delegate proof'}
                    </button>
                  </form>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>
                    ACTIVE PROOFS ({proofs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {proofs.map(p => (
                      <div key={p.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>{p.id}</span>
                          <Badge status={p.status} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span>passport: {p.passportId}</span>
                          <span>granted to: <span style={{ color: 'var(--text)' }}>{p.grantedTo}</span></span>
                          <span>permissions: {p.permissions.join(', ')}</span>
                          {p.constraints.maxAmount && <span>max: ${p.constraints.maxAmount}</span>}
                          <span>expires: {new Date(p.constraints.expiresAt).toLocaleString()}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>sig: {p.signature.slice(0, 24)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPROVAL ENGINE TAB */}
          {tab === 'approve' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>EVALUATE ACTION</div>
                  <form onSubmit={evaluateApproval} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="label">passport id</label>
                      <select
                        className="input"
                        value={approveForm.passportId}
                        onChange={e => setApproveForm(f => ({ ...f, passportId: e.target.value }))}
                        required
                        style={{ background: 'var(--bg-2)', color: 'var(--text)', cursor: 'pointer' }}
                      >
                        <option value="">select passport...</option>
                        {passports.map(p => (
                          <option key={p.id} value={p.id}>{p.label} ({p.id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">proof id</label>
                      <select
                        className="input"
                        value={approveForm.proofId}
                        onChange={e => setApproveForm(f => ({ ...f, proofId: e.target.value }))}
                        required
                        style={{ background: 'var(--bg-2)', color: 'var(--text)', cursor: 'pointer' }}
                      >
                        <option value="">select proof...</option>
                        {proofs.filter(p => p.status === 'active').map(p => (
                          <option key={p.id} value={p.id}>{p.id} ({p.grantedTo})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">action</label>
                      <input
                        className="input"
                        placeholder="payment:execute"
                        value={approveForm.action}
                        onChange={e => setApproveForm(f => ({ ...f, action: e.target.value }))}
                        required
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="label">merchant</label>
                        <input
                          className="input"
                          placeholder="whole-foods"
                          value={approveForm.merchant}
                          onChange={e => setApproveForm(f => ({ ...f, merchant: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">amount ($)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="47.23"
                          value={approveForm.amount}
                          onChange={e => setApproveForm(f => ({ ...f, amount: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-amber" disabled={loading}>
                      {loading ? 'evaluating...' : '◉ evaluate action'}
                    </button>
                  </form>

                  <div style={{ marginTop: 16, background: 'var(--bg-3)', border: '1px solid var(--border)', padding: '12px', fontSize: 11, color: 'var(--text-muted)' }}>
                    <div style={{ color: 'var(--text)', marginBottom: 8, fontWeight: 600 }}>policy rules</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>✓ passport must be active</span>
                      <span>✓ proof must be active and not expired</span>
                      <span>✓ action must be in proof permissions</span>
                      <span>✓ merchant must be in allowlist</span>
                      <span>⚑ amount &gt; proof limit → human review</span>
                      <span>⚑ amount &gt; $1000 → human review</span>
                      <span>✗ any failure → denied</span>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>LAST RESULT</div>
                  {result?.type === 'Approval evaluated' ? (
                    <ApprovalResultCard data={result.data as { result: ApprovalResult; receipt: SignedReceipt }} />
                  ) : (
                    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', padding: '20px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                      submit an action to see the result
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HUMAN QUEUE TAB */}
          {tab === 'queue' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>
                HUMAN APPROVAL QUEUE ({queue.length} pending)
              </div>
              {queue.length === 0 ? (
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  no items pending review
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {queue.map(item => (
                    <div key={item.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--amber-dim)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{item.agentLabel}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>queued {timeAgo(item.queuedAt)}</div>
                        </div>
                        <span className="badge badge-amber">PENDING REVIEW</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                        {[
                          { k: 'action', v: item.action },
                          { k: 'merchant', v: item.merchant ?? '—' },
                          { k: 'amount', v: item.amount ? `$${item.amount.toFixed(2)}` : '—' },
                        ].map(r => (
                          <div key={r.k} style={{ background: 'var(--bg-3)', padding: '8px', fontSize: 11 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{r.k}</div>
                            <div style={{ color: 'var(--amber)' }}>{r.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-amber"
                          onClick={() => decideQueue(item.id, 'approved')}
                          disabled={loading}
                          style={{ flex: 1 }}
                        >✓ approve</button>
                        <button
                          className="btn btn-outline"
                          onClick={() => decideQueue(item.id, 'denied')}
                          disabled={loading}
                          style={{ flex: 1, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}
                        >✗ deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVOKE TAB */}
          {tab === 'revoke' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.08em' }}>REVOKE / KILL SWITCH</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                    Revoking a passport cascades to all active delegation proofs. Network-wide propagation: 1.2s.
                  </div>
                  <form onSubmit={revoke} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="label">revoke type</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['passport', 'proof'].map(t => (
                          <button
                            key={t}
                            type="button"
                            className={revokeForm.type === t ? 'btn btn-amber' : 'btn btn-outline'}
                            style={{ flex: 1, fontSize: 11 }}
                            onClick={() => setRevokeForm(f => ({ ...f, type: t }))}
                          >{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">{revokeForm.type} id</label>
                      <select
                        className="input"
                        value={revokeForm.id}
                        onChange={e => setRevokeForm(f => ({ ...f, id: e.target.value }))}
                        required
                        style={{ background: 'var(--bg-2)', color: 'var(--text)', cursor: 'pointer' }}
                      >
                        <option value="">select {revokeForm.type}...</option>
                        {revokeForm.type === 'passport'
                          ? passports.filter(p => p.status === 'active').map(p => (
                              <option key={p.id} value={p.id}>{p.label} ({p.id})</option>
                            ))
                          : proofs.filter(p => p.status === 'active').map(p => (
                              <option key={p.id} value={p.id}>{p.id} ({p.grantedTo})</option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="label">reason</label>
                      <input
                        className="input"
                        placeholder="e.g. account compromised"
                        value={revokeForm.reason}
                        onChange={e => setRevokeForm(f => ({ ...f, reason: e.target.value }))}
                      />
                    </div>
                    <div style={{
                      padding: '10px 12px', background: 'rgba(239,68,68,0.05)',
                      border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: 'rgba(239,68,68,0.8)',
                    }}>
                      ⚠ This action is irreversible. The {revokeForm.type} will be permanently revoked.
                    </div>
                    <button
                      type="submit"
                      className="btn"
                      disabled={loading}
                      style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)', fontWeight: 600 }}
                    >
                      {loading ? 'revoking...' : `⊗ revoke ${revokeForm.type}`}
                    </button>
                  </form>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>REVOCATION RESULT</div>
                  {result?.type === 'Revoked' ? (
                    <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(239,68,68,0.2)', padding: '16px', fontSize: 12 }}>
                      <div style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 12 }}>⊗ revocation complete</div>
                      <pre style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'auto', margin: 0 }}>
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', padding: '20px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                      no revocation yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Minted/generic result banner */}
          {result && result.type !== 'Approval evaluated' && result.type !== 'Revoked' && (
            <div style={{ marginTop: 24, background: 'var(--bg-2)', border: '1px solid rgba(34,197,94,0.2)', padding: '16px' }}>
              <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 8, fontWeight: 600 }}>✓ {result.type}</div>
              <pre style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'auto', margin: 0 }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* SIDEBAR — LIVE LEDGER */}
        <div style={{ padding: '24px 16px', background: 'var(--bg)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
            <span>LIVE LEDGER</span>
            <Link href="/ledger" style={{ color: 'var(--amber)', textDecoration: 'none', fontSize: 10 }}>all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sideEvents.map(e => (
              <div key={e.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '8px 10px', fontSize: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: 'var(--amber)' }}>{e.agentId}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{timeAgo(e.timestamp)}</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>{e.type.replace('.', ' · ')}</div>
                {e.amount && <div style={{ color: 'var(--text)' }}>${e.amount.toFixed(2)} · {e.merchant}</div>}
                <div style={{
                  marginTop: 4, fontSize: 9,
                  color: e.status === 'completed' ? 'var(--green)' : e.status === 'denied' ? 'var(--red)' : 'var(--amber)',
                }}>
                  {e.status.toUpperCase().replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.08em' }}>QUICK STATS</div>
            {[
              { label: 'passports', value: passports.length, active: passports.filter(p => p.status === 'active').length },
              { label: 'proofs', value: proofs.length, active: proofs.filter(p => p.status === 'active').length },
              { label: 'queue', value: queue.length, active: queue.length },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ color: 'var(--text)' }}>{s.active}<span style={{ color: 'var(--text-dim)' }}>/{s.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalResultCard({ data }: { data: { result: ApprovalResult; receipt: SignedReceipt } }) {
  const { result, receipt } = data
  const color = result.decision === 'approved' ? 'var(--green)' : result.decision === 'denied' ? 'var(--red)' : 'var(--amber)'

  return (
    <div style={{ background: 'var(--bg-2)', border: `1px solid ${color}30`, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>
          {result.decision === 'approved' ? '✓' : result.decision === 'denied' ? '✗' : '⚑'} {result.decision.toUpperCase().replace('_', ' ')}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{result.latencyMs}ms</span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, padding: '8px', background: 'var(--bg-3)' }}>
        {result.reason}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.06em' }}>RECEIPT #{receipt?.receiptNumber}</div>
      {receipt && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { k: 'receipt id', v: receipt.id },
            { k: 'passport', v: receipt.passportId },
            { k: 'agent', v: receipt.agentId },
            { k: 'action', v: receipt.action },
            { k: 'merchant', v: receipt.merchant ?? '—' },
            { k: 'amount', v: receipt.amount ? `$${receipt.amount.toFixed(2)}` : '—' },
          ].map(row => (
            <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 10 }}>
              <span style={{ color: 'var(--text-muted)' }}>{row.k}</span>
              <span style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{row.v}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-dim)' }}>
            <div>passport hmac: {receipt.trustChain.passportHmac}</div>
            <div>proof hmac: {receipt.trustChain.proofHmac}</div>
            <div>approval hmac: {receipt.trustChain.approvalHmac}</div>
            <div>receipt hmac: {receipt.hmac}</div>
          </div>
        </div>
      )}
    </div>
  )
}
