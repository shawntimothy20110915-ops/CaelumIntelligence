import { NextRequest, NextResponse } from 'next/server'
import { getStore, appendLedgerEvent } from '@/lib/store'

// Mock Slack slash command handler
export async function POST(req: NextRequest) {
  const { command, queueId, action } = await req.json()
  const store = getStore()
  if (command === '/agentpass-approve' || command === '/agentpass-deny') {
    const item = store.approvalQueue.find(q => q.id === queueId)
    if (!item) return NextResponse.json({ text: 'queue item not found' })
    item.status = command === '/agentpass-approve' ? 'approved' : 'denied'
    appendLedgerEvent(store, {
      type: item.status === 'approved' ? 'action.approved' : 'action.denied',
      agentId: item.agentLabel, passportId: item.passportId, proofId: item.proofId,
      amount: item.amount, merchant: item.merchant,
      status: item.status === 'approved' ? 'completed' : 'denied',
      timestamp: Date.now(),
    })
    return NextResponse.json({ response_type: 'in_channel', text: `${item.status === 'approved' ? '✓' : '✗'} ${item.agentLabel} → ${item.action} ${item.amount ? '$' + item.amount : ''}` })
  }
  if (command === '/agentpass-status') {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `*AgentPass*: ${store.passports.size} passports · ${store.proofs.size} proofs · ${store.approvalQueue.filter(q => q.status === 'pending').length} pending approvals`,
    })
  }
  if (command === '/agentpass-list-pending') {
    const pending = store.approvalQueue.filter(q => q.status === 'pending')
    return NextResponse.json({
      response_type: 'ephemeral',
      blocks: pending.map(p => ({ type: 'section', text: { type: 'mrkdwn', text: `*${p.agentLabel}* · ${p.action} · ${p.amount ? '$' + p.amount : ''} · ${p.merchant ?? ''}` }, accessory: { type: 'button', text: { type: 'plain_text', text: 'Approve' }, value: p.id } })),
    })
  }
  void action
  return NextResponse.json({ text: 'unknown command' })
}
