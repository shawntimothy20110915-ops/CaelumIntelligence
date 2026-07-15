import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getStore, getPassportsByOwner } from '@/lib/store'

/** A user's own passports — private, scoped to the session. */
export async function GET(req: Request) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const passports = getPassportsByOwner(getStore(), session.uid)
  return NextResponse.json({ passports })
}
