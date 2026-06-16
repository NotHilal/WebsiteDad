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

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { type, serviceId, couponId, couponCode, paymentIntentId, label, currency = 'nzd' } = await req.json()

    // ── Confirm coupon after successful payment ──────────────────────────────
    // Called from the client after Stripe payment succeeds. Verifies the intent
    // status with Stripe before touching the coupon so an abandoned checkout
    // never consumes the discount.
    if (type === 'confirm-coupon') {
      if (!paymentIntentId) return json({ error: 'paymentIntentId required' }, 400)

      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (pi.status !== 'succeeded') return json({ error: 'Payment not confirmed' }, 400)

      if (couponId) {
        const { data: uc } = await adminClient.from('user_coupons')
          .select('coupon_id, used').eq('id', couponId).eq('user_id', user.id).single()
        if (uc && !uc.used) {
          await adminClient.from('user_coupons').update({ used: true }).eq('id', couponId)
          await adminClient.from('coupons').update({ active: false }).eq('id', uc.coupon_id)
        }
      } else if (couponCode) {
        // Guest appointment or cart — deactivate so no one else can claim it.
        const { data: c } = await adminClient.from('coupons').select('id')
          .eq('code', String(couponCode).toUpperCase()).single()
        if (c) await adminClient.from('coupons').update({ active: false }).eq('id', c.id)
      }

      return json({ ok: true })
    }

    // ── Mark coupon used (pay-in-store) ─────────────────────────────────────
    // No Stripe payment intent involved — staff collect payment physically.
    // Still routed through the edge function so we can use the admin client
    // to deactivate the coupon globally (user client has no UPDATE on coupons).
    if (type === 'mark-coupon-used') {
      if (!couponId) return json({ error: 'couponId required' }, 400)
      const { data: uc } = await adminClient.from('user_coupons')
        .select('coupon_id, used').eq('id', couponId).eq('user_id', user.id).single()
      if (uc && !uc.used) {
        await adminClient.from('user_coupons').update({ used: true }).eq('id', couponId)
        await adminClient.from('coupons').update({ active: false }).eq('id', uc.coupon_id)
      }
      return json({ ok: true })
    }

    // ── Create payment intent ────────────────────────────────────────────────
    let amountCents: number
    let description: string

    if (type === 'appointment') {
      if (!serviceId) return json({ error: 'serviceId is required' }, 400)

      const { data: service, error: svcErr } = await userClient
        .from('services')
        .select('price, name')
        .eq('id', serviceId)
        .eq('active', true)
        .single()

      if (svcErr || !service) return json({ error: 'Service not found' }, 404)

      let price = parseFloat(service.price)

      if (couponId) {
        const { data: uc } = await adminClient
          .from('user_coupons')
          .select('id, used, coupons(discount_type, discount_value, expiry_date, active, min_points_required)')
          .eq('id', couponId)
          .eq('user_id', user.id)
          .single()

        const c = uc?.coupons
        const expired = c?.expiry_date && new Date(c.expiry_date) < new Date()

        if (uc && !uc.used && c?.active && !expired) {
          let canApply = true
          if (c.min_points_required > 0) {
            const { data: prof } = await adminClient.from('profiles').select('points').eq('id', user.id).single()
            if ((prof?.points ?? 0) < c.min_points_required) canApply = false
          }
          if (canApply) {
            price = c.discount_type === 'percentage'
              ? Math.max(0, price * (1 - c.discount_value / 100))
              : Math.max(0, price - c.discount_value)
            // Coupon is marked used only after payment succeeds (confirm-coupon action)
          }
        }
      }

      if (couponCode && !couponId) {
        // Guest-only path: logged-in users always have a couponId via user_coupons.
        const { data: coupon } = await adminClient.from('coupons').select('*')
          .eq('code', String(couponCode).toUpperCase()).eq('active', true).maybeSingle()
        const c = coupon as any
        const expired = c?.expiry_date && new Date(c.expiry_date) < new Date()
        const exceeded = c?.max_uses != null && (c.current_uses ?? 0) >= c.max_uses
        if (c && !expired && !exceeded) {
          price = c.discount_type === 'percentage'
            ? Math.max(0, price * (1 - c.discount_value / 100))
            : Math.max(0, price - parseFloat(c.discount_value))
        }
      }

      amountCents = Math.round(price * 100)
      description = label ?? `Appointment: ${service.name}`

    } else if (type === 'cart') {
      const { data: items, error: cartErr } = await adminClient
        .from('cart_items')
        .select('quantity, products(id, name, price, stock, available)')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())

      if (cartErr || !items?.length) return json({ error: 'Cart is empty or expired' }, 400)

      for (const item of items) {
        if (!item.products?.available) return json({ error: 'A product in your cart is no longer available' }, 400)
        if ((item.products?.stock ?? 0) < item.quantity) return json({ error: 'Insufficient stock for one or more items' }, 400)
      }

      let total = items.reduce((s, i) => s + parseFloat(i.products.price) * i.quantity, 0)

      if (couponCode) {
        const { data: coupon } = await adminClient
          .from('coupons')
          .select('*')
          .eq('code', String(couponCode).toUpperCase())
          .eq('active', true)
          .maybeSingle()
        const c = coupon as any
        const expired = c?.expiry_date && new Date(c.expiry_date) < new Date()
        const exceeded = c?.max_uses != null && (c.current_uses ?? 0) >= c.max_uses
        if (c && !expired && !exceeded && c.discount_type === 'fixed') {
          total = Math.max(0, total - parseFloat(c.discount_value))
          // current_uses incremented only after payment succeeds (confirm-coupon action)
        }
      }

      amountCents = Math.round(total * 100)
      description = label ?? `HairGo Store — ${items.length} item${items.length !== 1 ? 's' : ''}`

    } else {
      return json({ error: 'type must be "appointment", "cart", or "confirm-coupon"' }, 400)
    }

    if (amountCents <= 0) return json({ error: 'Amount must be positive' }, 400)
    if (!Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: 'Stripe not configured' }, 500)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      description,
      payment_method_types: ['card'],
    })

    return json({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id })

  } catch (err) {
    console.error('create-payment-intent error:', err.message)
    return json({ error: err.message }, 400)
  }
})
