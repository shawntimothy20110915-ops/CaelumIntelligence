/**
 * Out-of-band approval notifications. Posts a one-tap approval link to a Slack
 * (or generic) webhook when configured; otherwise the link is simply returned in
 * the API response. Env-gated and best-effort — never throws into the request path.
 */
export interface ApprovalNotice {
  link: string
  agentLabel: string
  action: string
  merchant?: string
  amount?: number
  reason: string
}

export async function notifyApproval(notice: ApprovalNotice): Promise<{ delivered: boolean }> {
  const url = process.env.APPROVAL_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL
  if (!url) return { delivered: false }
  const detail = `${notice.action}${notice.merchant ? ` at ${notice.merchant}` : ''}${notice.amount !== undefined ? ` for $${notice.amount}` : ''}`
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `🔐 *${notice.agentLabel}* wants to ${detail}.\n${notice.reason}\nApprove → ${notice.link}?decision=approved\nDeny → ${notice.link}?decision=denied` }),
    })
    return { delivered: true }
  } catch {
    return { delivered: false }
  }
}
