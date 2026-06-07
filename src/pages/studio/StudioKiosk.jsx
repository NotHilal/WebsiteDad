import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCode } from 'react-qr-code'
import { supabase } from '../../lib/supabase'
import { Scissors, X } from 'lucide-react'

const C = {
  bg: '#0e0e14', card: '#161620',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)',
  white: '#f0f0f0', muted: 'rgba(255,255,255,0.22)',
  border: 'rgba(255,255,255,0.07)',
  green: '#34d399', red: '#f87171',
}

export default function StudioKiosk() {
  const navigate = useNavigate()
  const [token,  setToken]  = useState(null)
  const [secs,   setSecs]   = useState(10)
  const [origin] = useState(window.location.origin)

  const refreshToken = useCallback(async () => {
    const t       = crypto.randomUUID()
    const expires = new Date(Date.now() + 20_000).toISOString()
    await supabase.from('kiosk_token').upsert({ id: 1, token: t, expires_at: expires })
    setToken(t)
    setSecs(10)
  }, [])

  useEffect(() => { refreshToken() }, [refreshToken])

  useEffect(() => {
    if (!token) return
    const iv = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { refreshToken(); return 10 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [token, refreshToken])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') navigate('/studio/dashboard') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const url = token ? `${origin}/clockin?t=${token}` : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>

      {/* Exit */}
      <button onClick={() => navigate('/studio/dashboard')} className="kiosk-exit"
        style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
        <X size={16} />
      </button>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${C.gold}, #C4956A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px rgba(201,168,76,0.3)` }}>
          <Scissors size={14} color="#000" style={{ transform: 'rotate(45deg)' }} />
        </div>
        <span className="font-display" style={{ fontSize: '2rem', color: C.white, lineHeight: 1 }}>
          Hair<span style={{ color: C.gold }}>Go</span>
        </span>
      </div>

      {/* QR code */}
      {url ? (
        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 0 80px rgba(201,168,76,0.12)', display: 'flex' }}>
          <QRCode value={url} size={230} />
        </div>
      ) : (
        <div style={{ width: 286, height: 286, borderRadius: 24, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.gold, animation: 'spin .8s linear infinite' }} />
        </div>
      )}

      {/* Label */}
      <p style={{ color: C.white, fontSize: '1.15rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginTop: '2rem', letterSpacing: '0.03em' }}>
        Scan to clock in or out
      </p>

      {/* Countdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.75rem' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: secs > 10 ? C.green : C.red, animation: 'blink 1.8s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>
          Refreshes in {secs}s
        </span>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', marginTop: '3.5rem', letterSpacing: '0.06em' }}>
        ESC to exit kiosk mode
      </p>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0.25 } }
        .kiosk-exit:hover { color: ${C.white} !important; border-color: rgba(255,255,255,0.15) !important; background: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  )
}
