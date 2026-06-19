'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

export function IntegrationView({ sessionToken: _sessionToken }: { sessionToken: string }) {
  const [activeTab, setActiveTab] = useState<'sdk' | 'cli' | 'actions' | 'webhooks'>('sdk')
  const [copied, setCopied] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSaved, setWebhookSaved] = useState(false)
  const [webhookTesting, setWebhookTesting] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [selectedEvents, setSelectedEvents] = useState(new Set(['passport.minted', 'passport.revoked']))

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(null), 1800) })
  }

  const testWebhook = async () => {
    if (!webhookUrl.trim()) return
    setWebhookTesting(true); setWebhookTestResult(null)
    try {
      const r = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test.ping', timestamp: Date.now(), passportId: 'pp_test', hmac: 'sha256=test' }) })
      setWebhookTestResult({ ok: r.ok, msg: `${r.status} ${r.statusText}` })
    } catch (e: unknown) {
      setWebhookTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Network error' })
    } finally { setWebhookTesting(false) }
  }

  const tabs = [
    { key: 'sdk' as const,      label: 'npm SDK'        },
    { key: 'cli' as const,      label: 'CLI'            },
    { key: 'actions' as const,  label: 'GitHub Actions' },
    { key: 'webhooks' as const, label: 'Webhooks'       },
  ]

  const CB = ({ code, label, lang = '' }: { code: string; label: string; lang?: string }) => (
    <div style={{ position: 'relative', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
      {lang && <div style={{ fontSize: 9, color: 'rgba(212,163,90,0.4)', letterSpacing: '0.12em', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>{lang}</div>}
      <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(244,236,221,0.65)', lineHeight: 1.75, overflowX: 'auto' }}>{code}</pre>
      <button onClick={() => copy(code, label)} style={{ position: 'absolute', top: 10, right: 10, background: copied === label ? 'rgba(90,159,106,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied === label ? 'rgba(90,159,106,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 5, color: copied === label ? '#5a9f6a' : 'rgba(244,236,221,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', padding: '3px 8px', cursor: 'pointer', transition: 'all 0.2s' }}>{copied === label ? '✓' : 'Copy'}</button>
    </div>
  )

  const SL = ({ text }: { text: string }) => <div style={{ fontSize: 10, color: 'rgba(212,163,90,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, marginTop: 20 }}>{text}</div>
  const Callout = ({ text }: { text: string }) => <div style={{ background: 'rgba(212,163,90,0.05)', borderLeft: '2px solid rgba(212,163,90,0.35)', borderRadius: '0 6px 6px 0', padding: '10px 14px', marginBottom: 16 }}><span style={{ fontSize: 12, color: 'rgba(212,163,90,0.7)', fontFamily: 'JetBrains Mono, monospace' }}>{text}</span></div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '9px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--gold)' : '2px solid transparent', color: activeTab === t.key ? 'var(--gold)' : 'rgba(244,236,221,0.35)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: activeTab === t.key ? 600 : 400, letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1 }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'sdk' && (
        <motion.div key="sdk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <SL text="Install" />
          <CB label="sdk-install" code={`npm install @agentpass/sdk`} />
          <SL text="Initialize" />
          <CB label="sdk-init" lang="TypeScript" code={`import { AgentPass } from '@agentpass/sdk'\n\nconst ap = new AgentPass({\n  token: process.env.AGENTPASS_TOKEN,\n})`} />
          <SL text="Mint a passport" />
          <CB label="sdk-mint" lang="TypeScript" code={`const passport = await ap.mint({\n  agentName: 'purchase-agent-v2',\n  permissions: ['purchase', 'search'],\n})\n\nconsole.log(passport.id)     // pp_01J...\nconsole.log(passport.token)  // authorize agent calls with this`} />
          <SL text="Verify at runtime" />
          <CB label="sdk-verify" lang="TypeScript" code={`const result = await ap.verify(req.headers.authorization)\nif (!result.valid) throw new Error('Unauthorized agent')`} />
          <Callout text="Set AGENTPASS_TOKEN in your environment — never hardcode it." />
        </motion.div>
      )}

      {activeTab === 'cli' && (
        <motion.div key="cli" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <SL text="Install" />
          <CB label="cli-install" lang="Shell" code={`npm install -g @agentpass/cli`} />
          <SL text="Authenticate" />
          <CB label="cli-auth" lang="Shell" code={`agentpass auth --token $AGENTPASS_TOKEN`} />
          <SL text="Mint a passport" />
          <CB label="cli-mint" lang="Shell" code={`agentpass mint \\\n  --name purchase-agent-v2 \\\n  --permissions purchase,search \\\n  --ttl 7d\n\n# → Passport ID: pp_01J...\n# → Token shown once`} />
          <SL text="Manage" />
          <CB label="cli-manage" lang="Shell" code={`agentpass list\nagentpass revoke pp_01J...`} />
          <button onClick={() => {
            const blob = new Blob([`AGENTPASS_TOKEN=your_token_here\nAGENTPASS_API_URL=https://agentpassv22.vercel.app/api\n`], { type: 'text/plain' })
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '.env.agentpass'; a.click(); URL.revokeObjectURL(url)
          }} className="dash-btn-outline">↓ Download .env template</button>
        </motion.div>
      )}

      {activeTab === 'actions' && (
        <motion.div key="actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Callout text="Add AGENTPASS_TOKEN to Settings → Secrets → Actions in your GitHub repo." />
          <SL text=".github/workflows/agent-deploy.yml" />
          <CB label="gha-yml" lang="YAML" code={`name: Deploy Agent\non:\n  push:\n    branches: [main]\n\njobs:\n  mint-passport:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: agentpass/mint-passport@v1\n        id: passport\n        with:\n          token: \${{ secrets.AGENTPASS_TOKEN }}\n          agent-name: purchase-agent-v2\n          permissions: purchase,search\n          ttl: 7d\n\n      - name: Deploy\n        env:\n          PASSPORT_ID: \${{ steps.passport.outputs.passport-id }}\n          PASSPORT_TOKEN: \${{ steps.passport.outputs.token }}\n        run: ./deploy.sh`} />
          <SL text="Revoke on rollback" />
          <CB label="gha-revoke" lang="YAML" code={`      - name: Revoke on failure\n        if: failure()\n        uses: agentpass/revoke-passport@v1\n        with:\n          token: \${{ secrets.AGENTPASS_TOKEN }}\n          passport-id: \${{ steps.passport.outputs.passport-id }}`} />
        </motion.div>
      )}

      {activeTab === 'webhooks' && (
        <motion.div key="webhooks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <SL text="Endpoint URL" />
              <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-api.com/agentpass-events" className="dash-input" style={{ marginBottom: 16 }} />
              <SL text="Events" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {['passport.minted', 'action.verified', 'action.denied', 'passport.revoked', 'proof.delegated'].map(ev => (
                  <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedEvents.has(ev)} onChange={() => setSelectedEvents(prev => { const n = new Set(prev); n.has(ev) ? n.delete(ev) : n.add(ev); return n })} style={{ accentColor: 'var(--gold)', width: 14, height: 14 }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: selectedEvents.has(ev) ? 'rgba(212,163,90,0.8)' : 'rgba(244,236,221,0.35)' }}>{ev}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setWebhookSaved(true)} disabled={!webhookUrl.trim()} className="dash-btn-gold">{webhookSaved ? '✓ Saved' : 'Save Webhook'}</button>
                <button onClick={testWebhook} disabled={!webhookUrl.trim() || webhookTesting} className="dash-btn-outline">{webhookTesting ? 'Testing…' : 'Test'}</button>
              </div>
              {webhookTestResult && <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: webhookTestResult.ok ? '#5a9f6a' : '#e05c5c' }}>{webhookTestResult.ok ? '✓ ' : '✗ '}{webhookTestResult.msg}</div>}
            </div>
            <div>
              <SL text="Event payload" />
              <CB label="webhook-payload" lang="JSON" code={`{\n  "event": "action.denied",\n  "passportId": "pp_01J...",\n  "agentId": "purchase-agent-v2",\n  "action": "purchase",\n  "reason": "exceeds_limit",\n  "timestamp": 1748476800000,\n  "hmac": "sha256=..."\n}`} />
              <Callout text="Verify the HMAC signature before processing any event." />
              <SL text="Verify HMAC" />
              <CB label="webhook-hmac" lang="TypeScript" code={`import { createHmac } from 'crypto'\n\nfunction verify(payload: string, sig: string, secret: string) {\n  const expected = createHmac('sha256', secret)\n    .update(payload).digest('hex')\n  return \`sha256=\${expected}\` === sig\n}`} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
