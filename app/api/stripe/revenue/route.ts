import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  const { data: subs, error } = await supabaseAdmin
    .from('subscriptions')
    .select('amount_cents, currency, status')
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const mrrCents = (subs ?? []).reduce((sum, s) => sum + (s.amount_cents ?? 0), 0)
  const arrCents = mrrCents * 12

  return NextResponse.json({
    mrr: mrrCents / 100,
    arr: arrCents / 100,
    currency: 'usd',
    active_subscriptions: subs?.length ?? 0,
    as_of: new Date().toISOString(),
  })
}
