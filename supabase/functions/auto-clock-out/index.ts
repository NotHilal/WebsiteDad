import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Find everyone still clocked in
  const { data: open, error: fetchErr } = await supabase
    .from('timesheets')
    .select('id, clock_in, stylist_id')
    .is('clock_out', null)

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!open || open.length === 0) {
    return new Response(JSON.stringify({ clocked_out: 0, message: 'Nobody was still clocked in.' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Set clock_out to 22:00 of the same day they clocked in
  const updates = open.map(entry => {
    const clockInDate = new Date(entry.clock_in)
    const clockOut = new Date(clockInDate)
    clockOut.setHours(22, 0, 0, 0)
    // If they somehow clocked in after 22:00, set clock_out 1 min later
    if (clockOut <= clockInDate) clockOut.setTime(clockInDate.getTime() + 60_000)
    return supabase
      .from('timesheets')
      .update({ clock_out: clockOut.toISOString() })
      .eq('id', entry.id)
  })

  await Promise.all(updates)

  return new Response(
    JSON.stringify({ clocked_out: open.length, ids: open.map(e => e.id) }),
    { headers: { ...cors, 'Content-Type': 'application/json' } }
  )
})
