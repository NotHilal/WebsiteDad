import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base32Decode(str: string): Uint8Array {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const s = str.toUpperCase().replace(/=+$/, '')
  let bits = 0, value = 0
  const out: number[] = []
  for (const ch of s) {
    const idx = alpha.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) { bits -= 8; out.push((value >>> bits) & 0xff) }
  }
  return new Uint8Array(out)
}

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  )
  const buf = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) { buf[i] = c & 0xff; c = Math.floor(c / 256) }
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf))
  const off = mac[19] & 0xf
  const code = ((mac[off] & 0x7f) << 24) | (mac[off+1] << 16) | (mac[off+2] << 8) | mac[off+3]
  return (code % 1_000_000).toString().padStart(6, '0')
}

async function validateTOTP(secret: string, token: string): Promise<boolean> {
  const step = Math.floor(Date.now() / 1000 / 30)
  for (const delta of [-1, 0, 1]) {
    if (await hotp(secret, step + delta) === token) return true
  }
  return false
}

function deny(msg = 'Unauthorized', status = 401) {
  return new Response(JSON.stringify({ valid: false, error: msg }), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    // Require a valid staff JWT — the frontend already gates this behind login,
    // but we verify server-side so the endpoint can't be hit directly by non-staff.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return deny()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return deny()

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'admin' && profile?.role !== 'artist' && profile?.role !== 'manager') {
      return deny('Forbidden — studio access requires admin, artist, or manager role', 403)
    }

    // Auth confirmed — now check the TOTP token
    const { token } = await req.json()
    const secret = Deno.env.get('STUDIO_TOTP_SECRET')
    if (!secret) throw new Error('TOTP secret not configured')

    const valid = await validateTOTP(secret, String(token).replace(/\s/g, ''))
    return new Response(JSON.stringify({ valid }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
