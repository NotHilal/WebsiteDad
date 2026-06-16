import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react'

// Lazy — only initializes when checkout first opens, not on page load
let _stripePromise = null
function getStripe() {
  if (!_stripePromise) _stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  return _stripePromise
}

function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('hg-theme') ?? 'dark') !== 'light'
  )
  useEffect(() => {
    setIsDark(document.documentElement.dataset.theme !== 'light')
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.dataset.theme !== 'light')
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

function Field({ label, children, isDark }) {
  const inputWrap = {
    background: isDark ? 'rgba(255,255,255,0.05)' : '#ececf2',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.22)'}`,
    borderRadius: 12,
    padding: '13px 14px',
    transition: 'border-color 0.2s',
  }
  return (
    <div>
      <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.5)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, marginBottom: 8 }}>
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
  const [paying,     setPaying]     = useState(false)
  const [error,      setError]      = useState(null)
  const [cardReady,  setCardReady]  = useState(false)
  const isDark = useIsDark()

  // Fallback: if onReady never fires, unblock fields after 4 s
  useEffect(() => {
    const t = setTimeout(() => setCardReady(true), 4000)
    return () => clearTimeout(t)
  }, [])

  const cardStyle = {
    style: {
      base: {
        color: isDark ? '#e8e8f0' : '#1a1a2e',
        backgroundColor: 'transparent',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px',
        fontWeight: '300',
        letterSpacing: '0.04em',
        '::placeholder': { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.45)' },
      },
      invalid: { color: '#f87171' },
    },
  }

  const muted  = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.6)'
  const subtle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.5)'
  const back   = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.55)'
  const backHover = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.85)'

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
        background: isDark
          ? 'linear-gradient(135deg, rgba(184,212,232,0.12) 0%, rgba(122,175,201,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(184,212,232,0.35) 0%, rgba(122,175,201,0.2) 100%)',
        border: `1px solid ${isDark ? 'rgba(184,212,232,0.2)' : 'rgba(122,175,201,0.45)'}`,
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #B8D4E8, #E8D5A3, #7AAFC9)' }} />
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,212,232,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ padding: '1.5rem 1.75rem 1.4rem' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: isDark ? 'rgba(184,212,232,0.6)' : 'rgba(0,0,0,0.7)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, marginBottom: 10 }}>
            Amount due
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: label ? 10 : 0 }}>
            <span style={{ fontSize: '0.95rem', color: 'rgba(184,212,232,0.7)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: 1, paddingBottom: 6 }}>$</span>
            <span className="font-display" style={{ fontSize: '3.2rem', color: 'var(--col-text)', lineHeight: 1, fontWeight: 300 }}>{amount}</span>
          </div>
          {label && (
            <p style={{ fontSize: '0.78rem', color: 'var(--col-text)', opacity: isDark ? 0.4 : 0.65, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{label}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.75rem 1.75rem', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          {['VISA', 'MC', 'AMEX'].map((brand) => (
            <div key={brand} style={{ padding: '3px 8px', borderRadius: 5, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }}>
              <span style={{ fontSize: 8, color: muted, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.08em', fontWeight: 600 }}>{brand}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock size={9} color="rgba(184,212,232,0.5)" />
            <span style={{ fontSize: 8, color: 'rgba(184,212,232,0.5)', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>SSL</span>
          </div>
        </div>
      </div>

      {/* ── Card fields ─────────────────────────── */}
      <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, marginBottom: 14 }}>
        Card details
      </p>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <Field label="Card number" isDark={isDark}>
          <CardNumberElement options={cardStyle} onReady={() => setCardReady(true)} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Expiry" isDark={isDark}>
            <CardExpiryElement options={cardStyle} />
          </Field>
          <Field label="CVC" isDark={isDark}>
            <CardCvcElement options={cardStyle} />
          </Field>
        </div>

        {!cardReady && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: isDark ? 'rgba(14,14,20,0.6)' : 'rgba(240,241,247,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, border: `2px solid ${isDark ? 'rgba(184,212,232,0.2)' : 'rgba(0,0,0,0.15)'}`, borderTopColor: isDark ? '#B8D4E8' : '#7AAFC9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 11, color: isDark ? 'rgba(184,212,232,0.6)' : 'rgba(0,0,0,0.45)', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.1em' }}>Loading secure fields…</span>
          </div>
        )}
      </div>

      {/* ── Error ───────────────────────────────── */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 16 }}>
          <span style={{ color: '#f87171', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>{error}</span>
        </div>
      )}

      {/* ── Pay button ─────────────────────────── */}
      <button type="submit" disabled={paying || !stripe || !elements} className="btn-gold"
        style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: 12, letterSpacing: '0.2em', marginBottom: 12 }}>
        {paying ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: 'var(--col-bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Processing…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={14} />
            <span>Pay ${amount} securely</span>
          </div>
        )}
      </button>

      {/* ── Trust line ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        <ShieldCheck size={10} color={subtle} />
        <span style={{ fontSize: 9, color: subtle, letterSpacing: '0.12em', fontFamily: 'DM Sans, sans-serif' }}>
          256-bit encryption · Powered by Stripe · We never store your card
        </span>
      </div>

      {/* ── Back ───────────────────────────────── */}
      <button type="button" onClick={onCancel} disabled={paying}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '0.6rem', background: 'none', border: 'none', color: back, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = backHover}
        onMouseLeave={e => e.currentTarget.style.color = back}>
        <ArrowLeft size={11} /> Back
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .card-field:focus-within {
          border-color: rgba(122,175,201,0.75) !important;
          box-shadow: 0 0 0 3px rgba(122,175,201,0.12);
          background: rgba(184,212,232,0.06) !important;
        }
      `}</style>
    </form>
  )
}

export default function StripeCheckout({ clientSecret, amount, label, onSuccess, onCancel }) {
  if (!clientSecret) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--col-bg)',
        border: '1px solid rgba(184,212,232,0.15)',
        borderRadius: 24,
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(var(--rgb-hi),0.04)',
        overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #B8D4E8, #E8D5A3, #7AAFC9)' }} />
        <div style={{ padding: '2rem' }}>
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <CheckoutForm clientSecret={clientSecret} amount={amount} label={label} onSuccess={onSuccess} onCancel={onCancel} />
          </Elements>
        </div>
      </div>
    </div>
  )
}
