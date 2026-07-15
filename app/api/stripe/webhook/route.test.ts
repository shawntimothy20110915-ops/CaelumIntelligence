import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
  STRIPE_WEBHOOK_SECRET: 'test-secret',
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

function makeRequest(body: string, sig = 'test-sig') {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': sig },
  })
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 400 for invalid signature', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid sig')
    })
    const { POST } = await import('./route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(400)
  })

  it('upserts subscription on customer.subscription.created', async () => {
    const sub = {
      id: 'sub_test',
      customer: 'cus_test',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { nickname: 'Starter', id: 'price_1', unit_amount: 2900, currency: 'usd' } }] },
    }
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.created',
      data: { object: sub },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      upsert: upsertMock,
    } as unknown as ReturnType<typeof supabaseAdmin.from>)

    const { POST } = await import('./route')
    const res = await POST(makeRequest(JSON.stringify(sub)))
    expect(res.status).toBe(200)
    expect(upsertMock).toHaveBeenCalledOnce()
  })

  it('returns 200 for unhandled event types', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'invoice.paid',
      data: { object: {} },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

    const { POST } = await import('./route')
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })
})
