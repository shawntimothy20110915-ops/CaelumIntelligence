import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

import { stripe } from '@/lib/stripe'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for unknown plan', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ plan: 'unknown', successUrl: 'http://x/success', cancelUrl: 'http://x/cancel' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('unknown')
  })

  it('returns 400 for missing price ID (empty env)', async () => {
    // STRIPE_PRICE_STARTER is not set in test env
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ plan: 'starter', successUrl: 'http://x/success', cancelUrl: 'http://x/cancel' }))
    expect(res.status).toBe(400)
  })

  it('returns checkout URL when stripe session is created', async () => {
    process.env.STRIPE_PRICE_STARTER = 'price_test_123'
    const mockCreate = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' } as Awaited<ReturnType<typeof stripe.checkout.sessions.create>>)

    // vi.doMock is not hoisted, so local variables are in scope
    vi.resetModules()
    vi.doMock('@/lib/stripe', () => ({
      stripe: { checkout: { sessions: { create: mockCreate } } },
    }))
    const { POST } = await import('./route')

    const res = await POST(makeRequest({ plan: 'starter', successUrl: 'http://x/success', cancelUrl: 'http://x/cancel' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { url: string }
    expect(body.url).toBe('https://checkout.stripe.com/test')

    delete process.env.STRIPE_PRICE_STARTER
  })
})
