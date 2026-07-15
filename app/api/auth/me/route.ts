import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getStore, getUserById } from '@/lib/store'

export async function GET(req: Request) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ user: null })
  const user = getUserById(getStore(), session.uid)
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user: { id: user.id, email: user.email, plan: user.plan } })
}
