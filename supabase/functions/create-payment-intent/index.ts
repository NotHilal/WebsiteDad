// @ts-nocheck
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno&no-check=true'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set in Supabase secrets' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 500,
    })
  }

  try {
    const { amount, label, currency = 'nzd' } = await req.json()

    if (!amount || Number(amount) <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      description: label ?? 'HairGo purchase',
      automatic_payment_methods: { enabled: true },
    })

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id }),
      { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (err) {
    console.error('Stripe error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})
