import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {},
  STRIPE_WEBHOOK_SECRET: 'test-secret',
}))

import { supabaseAdmin } from '@/lib/supabase'

describe('GET /api/stripe/revenue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns zero MRR when no active subscriptions', async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as unknown as ReturnType<typeof supabaseAdmin.from>)

    const { GET } = await import('./route')
    const res = await GET()
    const json = await res.json()

    expect(json.mrr).toBe(0)
    expect(json.arr).toBe(0)
    expect(json.active_subscriptions).toBe(0)
  })

  it('sums active subscription amounts', async () => {
    const rows = [
      { amount_cents: 2900, currency: 'usd', status: 'active' },
      { amount_cents: 9900, currency: 'usd', status: 'active' },
    ]
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    } as unknown as ReturnType<typeof supabaseAdmin.from>)

    const { GET } = await import('./route')
    const res = await GET()
    const json = await res.json()

    expect(json.mrr).toBe(128)
    expect(json.arr).toBe(1536)
    expect(json.active_subscriptions).toBe(2)
  })

  it('returns 500 on database error', async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    } as unknown as ReturnType<typeof supabaseAdmin.from>)

    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
