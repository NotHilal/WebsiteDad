import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Scissors, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [ready,    setReady]   = useState(false)
  const [newPass,  setNewPass] = useState('')
  const [confirm,  setConfirm] = useState('')
  const [showNew,  setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading,  setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPass.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPass !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      toast.success('Password updated! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', background: 'rgba(var(--rgb-hi),0.04)',
    border: '1px solid rgba(var(--rgb-hi),0.08)', borderRadius: 13,
    padding: '14px 46px 14px 46px',
    fontSize: '0.88rem', color: 'var(--col-text)', outline: 'none',
    fontFamily: 'DM Sans,sans-serif', fontWeight: 300,
    transition: 'border-color 0.3s, background 0.3s', boxSizing: 'border-box',
  }
  const lbl = {
    display: 'block', fontSize: 12, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: 'var(--col-text)',
    marginBottom: 8, fontFamily: 'DM Sans,sans-serif',
  }
  const onFocus = e => { e.target.style.borderColor = 'var(--col-acc)'; e.target.style.background = 'rgba(var(--rgb-hi),0.06)' }
  const onBlur  = e => { e.target.style.borderColor = 'rgba(var(--rgb-hi),0.08)'; e.target.style.background = 'rgba(var(--rgb-hi),0.04)' }

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, height: 420, background: 'radial-gradient(circle, rgba(var(--rgb-acc),0.06) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--col-acc),var(--col-acc2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', boxShadow: '0 8px 36px rgba(var(--rgb-acc),0.38)' }}>
            <Scissors size={21} color="var(--col-bg)" style={{ transform: 'rotate(45deg)' }} />
          </div>
          <h1 className="font-display font-light" style={{ fontSize: '2.4rem', color: 'var(--col-text)', textAlign: 'center', marginBottom: '0.8rem', lineHeight: 1 }}>
            New password
          </h1>
          <div className="gold-bar" style={{ margin: '0 auto' }} />
        </div>

        <div className="glass" style={{ borderRadius: 26, padding: '2.5rem' }}>
          {!ready ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ color: 'var(--col-text)', opacity: 0.5, fontFamily: 'DM Sans,sans-serif', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Verifying reset link… if nothing happens, the link may have expired.
                <br /><br />
                <button onClick={() => navigate('/login')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-acc)', fontFamily: 'DM Sans,sans-serif', fontSize: '0.88rem' }}>
                  Back to sign in
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={13} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-text)', pointerEvents: 'none' }} />
                  <input type={showNew ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} required placeholder="Min. 8 chars" style={inp} onFocus={onFocus} onBlur={onBlur} autoFocus />
                  <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={lbl}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={13} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-text)', pointerEvents: 'none' }} />
                  <input type={showConf ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" style={inp} onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowConf(!showConf)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showConf ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-gold" style={{ width: '100%' }}>
                {loading
                  ? <div style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: 'var(--col-bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <>Update Password <ArrowRight size={14} /></>
                }
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
