import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const cardStyle = {
  style: {
    base: {
      color: '#f0f0f0',
      fontFamily: 'Jost, sans-serif',
      fontSize: '14px',
      fontWeight: '300',
      letterSpacing: '0.04em',
      '::placeholder': { color: 'rgba(255,255,255,0.2)' },
    },
    invalid: { color: '#f87171' },
  },
}

const inputWrap = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '13px 14px',
  transition: 'border-color 0.2s',
}

function Field({ label, children }) {
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', fontFamily: 'Jost, sans-serif', fontWeight: 600, marginBottom: 8 }}>
        {label}
      </p>
      <div style={inputWrap} className="card-field">
        {children}
      </div>
    </div>
  )
}

function CheckoutForm({ clientSecret, amount, label, onSuccess, onCancel }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error,  setError]  = useState(null)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setError(null)

    const cardNumber = elements.getElement(CardNumberElement)
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardNumber } }
    )

    if (confirmError) {
      setError(confirmError.message)
      setPaying(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      setError('Payment incomplete. Please try again.')
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Amount card ─────────────────────────── */}
      <div style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(184,212,232,0.12) 0%, rgba(122,175,201,0.06) 100%)',
        border: '1px solid rgba(184,212,232,0.2)',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #B8D4E8, #E8D5A3, #7AAFC9)' }} />
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,212,232,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ padding: '1.5rem 1.75rem 1.4rem' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(184,212,232,0.6)', fontFamily: 'Jost, sans-serif', fontWeight: 600, marginBottom: 10 }}>
            Amount due
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: label ? 10 : 0 }}>
            <span style={{ fontSize: '0.95rem', color: 'rgba(184,212,232,0.7)', fontFamily: 'Jost, sans-serif', fontWeight: 300, lineHeight: 1, paddingBottom: 6 }}>€</span>
            <span className="font-display" style={{ fontSize: '3.2rem', color: '#fff', lineHeight: 1, fontWeight: 300 }}>{amount}</span>
          </div>
          {label && (
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>{label}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.75rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {['VISA', 'MC', 'AMEX'].map((brand) => (
            <div key={brand} style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost, sans-serif', letterSpacing: '0.08em', fontWeight: 600 }}>{brand}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock size={9} color="rgba(184,212,232,0.5)" />
            <span style={{ fontSize: 8, color: 'rgba(184,212,232,0.5)', fontFamily: 'Jost, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>SSL</span>
          </div>
        </div>
      </div>

      {/* ── Card fields ─────────────────────────── */}
      <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost, sans-serif', fontWeight: 600, marginBottom: 14 }}>
        Card details
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <Field label="Card number">
          <CardNumberElement options={cardStyle} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Expiry">
            <CardExpiryElement options={cardStyle} />
          </Field>
          <Field label="CVC">
            <CardCvcElement options={cardStyle} />
          </Field>
        </div>
      </div>

      {/* ── Error ───────────────────────────────── */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 16 }}>
          <span style={{ color: '#f87171', fontSize: '0.78rem', fontFamily: 'Jost, sans-serif' }}>{error}</span>
        </div>
      )}

      {/* ── Pay button ─────────────────────────── */}
      <button type="submit" disabled={paying || !stripe || !elements} className="btn-gold"
        style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: 12, letterSpacing: '0.2em', marginBottom: 12 }}>
        {paying ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Processing…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={14} />
            <span>Pay €{amount} securely</span>
          </div>
        )}
      </button>

      {/* ── Trust line ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        <ShieldCheck size={10} color="rgba(255,255,255,0.15)" />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.12em', fontFamily: 'Jost, sans-serif' }}>
          256-bit encryption · Powered by Stripe · We never store your card
        </span>
      </div>

      {/* ── Back ───────────────────────────────── */}
      <button type="button" onClick={onCancel} disabled={paying}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '0.6rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', cursor: 'pointer', transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.22)'}>
        <ArrowLeft size={11} /> Back
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .card-field:focus-within {
          border-color: rgba(184,212,232,0.55) !important;
          box-shadow: 0 0 0 3px rgba(184,212,232,0.07);
          background: rgba(184,212,232,0.03) !important;
        }
      `}</style>
    </form>
  )
}

export default function StripeCheckout({ clientSecret, amount, label, onSuccess, onCancel }) {
  if (!clientSecret) return null

  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 460,
        background: '#0e0e14',
        border: '1px solid rgba(184,212,232,0.15)',
        borderRadius: 24,
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #B8D4E8, #E8D5A3, #7AAFC9)' }} />
        <div style={{ padding: '2rem' }}>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm clientSecret={clientSecret} amount={amount} label={label} onSuccess={onSuccess} onCancel={onCancel} />
          </Elements>
        </div>
      </div>
    </div>
  )
}
