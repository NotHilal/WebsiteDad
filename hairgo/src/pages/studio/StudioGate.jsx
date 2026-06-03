import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Scissors, Mail, KeyRound, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function StudioGate() {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [studioPass, setStudioPass] = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const { user, isAdmin, signIn, fetchProfile, loading: authLoading, profile } = useAuth()
  const navigate = useNavigate()

  const STUDIO_PASSWORD = import.meta.env.VITE_STUDIO_PASSWORD || 'hairgo2024'

  // Already passed the gate this session — go straight in
  useEffect(() => {
    if (!authLoading && user && sessionStorage.getItem('studio_access') === 'true' && (profile?.role === 'admin' || profile?.role === 'employee')) {
      navigate('/studio/dashboard')
    }
  }, [authLoading, user, profile])

  async function handleSubmit(e) {
    e.preventDefault()
    if (studioPass.trim() !== STUDIO_PASSWORD.trim()) return toast.error('Incorrect studio access code')
    setLoading(true)
    try {
      let currentUser = user
      let role = profile?.role
      if (!currentUser) {
        const data = await signIn(email, password)
        currentUser = data.user
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
        role = prof?.role
      }
      if (role !== 'admin' && role !== 'employee') {
        toast.error('This account does not have studio access')
        setLoading(false)
        return
      }
      sessionStorage.setItem('studio_access', 'true')
      navigate('/studio/dashboard')
    } catch (err) {
      toast.error(err.message || 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  // Show nothing while auth is loading
  if (authLoading) return null

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '18px 20px 18px 52px',
    fontSize: '0.95rem',
    color: '#fff',
    outline: 'none',
    fontFamily: 'Jost, sans-serif',
    fontWeight: 300,
    transition: 'border-color 0.3s, background 0.3s',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 10,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)',
    marginBottom: 10,
    fontFamily: 'Jost, sans-serif',
  }

  const iconStyle = {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.2)',
    pointerEvents: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', overflow: 'hidden' }}>

      {/* ── Left panel ─────────────────────────────────── */}
      <div style={{ width: 400, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 52px', borderRight: '1px solid rgba(255,255,255,0.05)' }}
        className="hidden lg:flex">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(201,168,76,0.04) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#C9A84C,#C4956A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(201,168,76,0.3)' }}>
              <Scissors size={16} color="#000" style={{ transform: 'rotate(45deg)' }} />
            </div>
            <span className="font-display" style={{ fontSize: '1.6rem', color: '#fff' }}>Hair<span style={{ color: '#C9A84C' }}>Go</span></span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <h2 className="font-display font-light" style={{ color: '#fff', fontSize: '3.5rem', lineHeight: 1.05, marginBottom: 24 }}>
            Welcome<br />
            <span className="gold-gradient" style={{ fontStyle: 'italic' }}>back.</span>
          </h2>
          <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg,#C9A84C,transparent)', marginBottom: 20 }} />
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.88rem', lineHeight: 1.9, maxWidth: 280, fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
            The HairGo Studio is your private management hub — restricted to authorised administrators only.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.14)', fontFamily: 'Jost, sans-serif' }}>
            HairGo Studio · Doha, Qatar
          </p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: 480 }}
        >
          {/* Header */}
          <div style={{ marginBottom: 52 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 16, fontFamily: 'Jost, sans-serif' }}>
              Studio Access
            </p>
            <h1 className="font-display font-light" style={{ color: '#fff', fontSize: '2.6rem', lineHeight: 1.1, marginBottom: 0 }}>
              {user ? `Welcome back` : 'Sign in to continue'}
            </h1>
            {user && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontFamily: 'Jost, sans-serif', marginTop: 8 }}>
                Signed in as <span style={{ color: '#C9A84C' }}>{user.email}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>

            {/* Email + Password — only when not signed in */}
            {!user && (
              <>
                <div style={{ marginBottom: 28 }}>
                  <label style={labelStyle}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={iconStyle} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@hairgo.com"
                      required
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.45)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={iconStyle} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ ...inputStyle, paddingRight: 52 }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.45)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.22)'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: user ? '0 0 36px 0' : '36px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost, sans-serif', whiteSpace: 'nowrap' }}>
                Studio Verification
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Studio code */}
            <div style={{ marginBottom: 44 }}>
              <label style={labelStyle}>Studio Access Code</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ ...iconStyle, color: 'rgba(201,168,76,0.4)' }} />
                <input
                  type="password"
                  value={studioPass}
                  onChange={e => setStudioPass(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, borderColor: 'rgba(201,168,76,0.15)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; e.target.style.background = 'rgba(201,168,76,0.04)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(201,168,76,0.15)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 10, fontFamily: 'Jost, sans-serif', letterSpacing: '0.02em' }}>
                Unique code issued to studio administrators
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '20px 32px',
                borderRadius: 16,
                background: 'linear-gradient(135deg,#C9A84C 0%,#E8D5A3 50%,#C4956A 100%)',
                color: '#000',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontFamily: 'Jost, sans-serif',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: '0 12px 40px rgba(201,168,76,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading
                ? <div style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <><span>Enter Studio</span><ArrowRight size={15} /></>
              }
            </button>

          </form>

          {/* Footer note */}
          <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.1)', marginTop: 36, fontFamily: 'Jost, sans-serif', letterSpacing: '0.08em' }}>
            Unauthorised access is strictly prohibited
          </p>

        </motion.div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
