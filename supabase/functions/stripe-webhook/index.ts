// @ts-nocheck
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role to bypass RLS
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent

    // Update appointment if one was linked after payment
    await supabase
      .from('appointments')
      .update({ payment_status: 'paid' })
      .eq('payment_intent_id', pi.id)

    // Update preorder if one was linked after payment
    await supabase
      .from('preorders')
      .update({ payment_status: 'paid' })
      .eq('payment_intent_id', pi.id)
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent

    await supabase
      .from('appointments')
      .update({ payment_status: 'failed' })
      .eq('payment_intent_id', pi.id)

    await supabase
      .from('preorders')
      .update({ payment_status: 'failed' })
      .eq('payment_intent_id', pi.id)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }, status: 200,
  })
})
