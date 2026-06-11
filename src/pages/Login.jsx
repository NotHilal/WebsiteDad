import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Scissors, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [show, setShow]     = useState(false)
  const [loading, setLoad]  = useState(false)
  const { signIn }          = useAuth()
  const navigate            = useNavigate()
  const location            = useLocation()
  const from                = location.state?.from?.pathname || '/'

  async function submit(e) {
    e.preventDefault()
    setLoad(true)
    try {
      await signIn(email, password)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Invalid credentials')
    } finally {
      setLoad(false)
    }
  }

  const inp = {
    width: '100%', background: 'rgba(var(--rgb-hi),0.04)',
    border: '1px solid rgba(var(--rgb-hi),0.08)', borderRadius: 13,
    padding: '14px 14px 14px 46px',
    fontSize: '0.88rem', color: 'var(--col-text)', outline: 'none',
    fontFamily: 'DM Sans,sans-serif', fontWeight: 300,
    transition: 'border-color 0.3s, background 0.3s',
  }
  const lbl = {
    display: 'block', fontSize: 10, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: 'var(--col-text)',
    marginBottom: 8, fontFamily: 'DM Sans,sans-serif',
  }
  const onFocus = e => { e.target.style.borderColor = 'var(--col-acc)'; e.target.style.background = 'rgba(var(--rgb-hi),0.06)' }
  const onBlur  = e => { e.target.style.borderColor = 'rgba(var(--rgb-hi),0.08)'; e.target.style.background = 'rgba(var(--rgb-hi),0.04)' }

  return (
    <div style={{ height: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', overflow: 'hidden', paddingBottom: '6vh' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, height: 420, background: 'radial-gradient(circle, rgba(var(--rgb-acc),0.06) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--col-acc),var(--col-acc2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', boxShadow: '0 8px 36px rgba(var(--rgb-acc),0.38)' }}>
            <Scissors size={21} color="var(--col-bg)" style={{ transform: 'rotate(45deg)' }} />
          </div>
          <h1 className="font-display font-light" style={{ fontSize: '2.6rem', color: 'var(--col-text)', textAlign: 'center', marginBottom: '0.8rem', lineHeight: 1 }}>
            Welcome back
          </h1>
          <div className="gold-bar" style={{ margin: '0 auto' }} />
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: 26, padding: '2.5rem' }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={13} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-text)', pointerEvents: 'none' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" style={inp} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-text)', pointerEvents: 'none' }} />
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPass(e.target.value)} required placeholder="••••••••" style={{ ...inp, paddingRight: 46 }} onFocus={onFocus} onBlur={onBlur} />
                <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {show ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold" style={{ width: '100%' }}>
              {loading
                ? <div style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.25)', borderTopcolor: 'var(--col-bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <>Sign In <ArrowRight size={14} /></>
              }
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 22, borderTop: '1px solid rgba(var(--rgb-hi),0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--col-text)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--col-acc)', textDecoration: 'none', fontWeight: 400 }}
                onMouseEnter={e => e.currentTarget.style.color = '#E8D5A3'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--col-acc)'}>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
