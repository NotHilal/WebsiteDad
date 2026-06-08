// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    // Verify caller identity using their JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    // Confirm caller is admin
    const { data: callerProfile } = await userClient.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }, status: 403,
      })
    }

    const { userId, newRole } = await req.json()
    if (!userId || !newRole) {
      return new Response(JSON.stringify({ error: 'Missing userId or newRole' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400,
      })
    }
    if (!['user', 'admin', 'artist'].includes(newRole)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    // Use service role to bypass RLS
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await adminClient
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select('id, role')

    if (error) throw error
    if (!data?.length) throw new Error('User not found')

    return new Response(JSON.stringify({ success: true, role: data[0].role }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})
