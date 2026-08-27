import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Beta onboarding. Creates a confirmed Nexus identity so friends can join
 * instantly with a handle + passphrase, with no email round-trip.
 */
export async function POST(request: Request) {
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let payload: { handle?: string; email?: string; password?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const handle = (payload.handle ?? '').trim().toLowerCase().replace(/[^a-z0-9._]/g, '')
  const email = (payload.email ?? '').trim().toLowerCase()
  const password = payload.password ?? ''

  if (handle.length < 3) return NextResponse.json({ error: 'Handle needs at least 3 characters.' }, { status: 400 })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Passphrase needs at least 8 characters.' }, { status: 400 })

  const { data: taken } = await admin.from('profiles').select('id').eq('handle', handle).maybeSingle()
  if (taken) return NextResponse.json({ error: `@${handle} is already claimed.` }, { status: 409 })

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { handle, display_name: handle },
  })

  if (error) {
    const message = /already|registered|exists/i.test(error.message)
      ? 'That email already has a Nexus identity. Sign in instead.'
      : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, handle })
}
