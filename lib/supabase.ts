import { createClient, SupabaseClient } from '@supabase/supabase-js'

function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

let _admin: SupabaseClient | undefined
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_admin) _admin = createSupabaseAdmin()
    return (_admin as unknown as Record<string | symbol, unknown>)[prop]
  },
})
