import { NextRequest, NextResponse } from 'next/server'
import type { NlPolicyResult } from '@/lib/types'

// Simple NL → policy DSL parser
export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const lower = prompt.toLowerCase()
  const permissions: string[] = []
  if (lower.includes('buy') || lower.includes('purchase') || lower.includes('spend')) permissions.push('purchase')
  if (lower.includes('refund')) permissions.push('refund')
  if (lower.includes('search') || lower.includes('look up') || lower.includes('find')) permissions.push('search')
  if (lower.includes('book') || lower.includes('reserve')) permissions.push('booking')
  if (lower.includes('transfer') || lower.includes('wire')) permissions.push('transfer')

  const amountMatch = lower.match(/\$?\s*(\d{1,3}(?:,\d{3})*|\d+)/)
  const maxAmount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : undefined

  const merchants: string[] = []
  const merchantMatch = lower.match(/(?:on|at|from)\s+([a-z0-9.\- ]+?)(?:\s+(?:and|or|,|for|with|up|until|$))/g)
  if (merchantMatch) {
    merchantMatch.forEach((m: string) => {
      const cleaned = m.replace(/^(on|at|from)\s+/, '').replace(/\s+(and|or|,|for|with|up|until|$).*$/, '').trim()
      if (cleaned) merchants.push(cleaned)
    })
  }

  let ttlHours = 24
  if (lower.includes('hour'))   ttlHours = 1
  if (lower.includes('day'))    ttlHours = 24
  if (lower.includes('week'))   ttlHours = 168
  if (lower.includes('month'))  ttlHours = 720

  const confidence = (
    (permissions.length > 0 ? 0.4 : 0) +
    (maxAmount !== undefined ? 0.3 : 0) +
    (merchants.length > 0 ? 0.2 : 0) +
    0.1
  )

  const result: NlPolicyResult = {
    prompt,
    compiled: {
      permissions: permissions.length ? permissions : ['search'],
      maxAmount, allowedMerchants: merchants.length ? merchants : undefined, ttlHours,
    },
    confidence,
  }
  return NextResponse.json({ result })
}
