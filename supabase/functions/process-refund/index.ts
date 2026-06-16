// @ts-nocheck
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS, 'Content-Type': 'application/json' }, status,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { type, id, refundPct = 100 } = await req.json()

    if (type === 'appointment') {
      const { data: appt, error } = await adminClient
        .from('appointments')
        .select('id, payment_intent_id, payment_status, status')
        .eq('id', id)
        .single()

      if (error || !appt) return json({ error: 'Appointment not found' }, 404)
      if (appt.status === 'cancelled') return json({ error: 'Already cancelled' }, 400)

      // Refund if paid via Stripe
      if (appt.payment_status === 'paid' && appt.payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve(appt.payment_intent_id)
        const refundAmount = Math.round(pi.amount * refundPct / 100)
        await stripe.refunds.create({ payment_intent: appt.payment_intent_id, amount: refundAmount })
        await adminClient
          .from('appointments')
          .update({ status: 'cancelled', payment_status: 'refunded' })
          .eq('id', id)
        return json({ refunded: true })
      }

      // Not paid via Stripe — just cancel
      await adminClient.from('appointments').update({ status: 'cancelled' }).eq('id', id)
      return json({ refunded: false })

    } else if (type === 'order') {
      // id here is the payment_intent_id (group key)
      const { data: items, error } = await adminClient
        .from('preorders')
        .select('id, payment_intent_id, payment_status, status, order_group_id')
        .or(`payment_intent_id.eq.${id},order_group_id.eq.${id}`)

      if (error || !items?.length) return json({ error: 'Order not found' }, 404)

      const first = items[0]
      const alreadyCancelled = items.every(i => i.status === 'cancelled')
      if (alreadyCancelled) return json({ error: 'Already cancelled' }, 400)

      const ids = items.map(i => i.id)

      // Refund if paid via Stripe (one refund covers the whole payment intent)
      if (first.payment_status === 'paid' && first.payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve(first.payment_intent_id)
        const refundAmount = Math.round(pi.amount * refundPct / 100)
        await stripe.refunds.create({ payment_intent: first.payment_intent_id, amount: refundAmount })
        await adminClient
          .from('preorders')
          .update({ status: 'cancelled', payment_status: 'refunded' })
          .in('id', ids)
        return json({ refunded: true })
      }

      // Not paid via Stripe — just cancel
      await adminClient.from('preorders').update({ status: 'cancelled' }).in('id', ids)
      return json({ refunded: false })

    } else {
      return json({ error: 'type must be "appointment" or "order"' }, 400)
    }

  } catch (err) {
    console.error('process-refund error:', err.message)
    return json({ error: err.message }, 500)
  }
})
