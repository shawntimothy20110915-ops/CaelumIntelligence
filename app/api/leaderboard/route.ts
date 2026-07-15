import { NextResponse } from 'next/server'
import { getStore, buildLeaderboard } from '@/lib/store'

export async function GET() {
  const store = getStore()
  const entries = buildLeaderboard(store)
  return NextResponse.json({ leaderboard: entries, total: entries.length })
}
