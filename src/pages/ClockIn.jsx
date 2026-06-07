import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Scissors, CheckCircle, XCircle, LogIn } from 'lucide-react'

const C = {
  bg: '#0e0e14', card: '#161620',
  gold: '#C9A84C', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.2)',
  white: '#f0f0f0', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  green: '#34d399', greenBg: 'rgba(52,211,153,0.1)', greenBorder: 'rgba(52,211,153,0.22)',
  red: '#f87171', redBg: 'rgba(248,113,113,0.1)', redBorder: 'rgba(248,113,113,0.22)',
}

const S = { LOADING: 'loading', EXPIRED: 'expired', NO_AUTH: 'no_auth', NO_LINK: 'no_link', ACTION: 'action', DONE: 'done' }

export default function ClockIn() {
  const [params]     = useSearchParams()
  const token        = params.get('t')
  const [screen,    setScreen]    = useState(S.LOADING)
  const [stylist,   setStylist]   = useState(null)
  const [openEntry, setOpenEntry] = useState(null)
  const [result,    setResult]    = useState(null)
  const [acting,    setActing]    = useState(false)

  useEffect(() => {
    async function init() {
      if (!token) { setScreen(S.EXPIRED); return }

      // 1. Validate token against DB
      const { data: kt } = await supabase
        .from('kiosk_token')
        .select('token, expires_at')
        .eq('id', 1)
        .single()

      if (!kt || kt.token !== token || new Date(kt.expires_at) < new Date()) {
        setScreen(S.EXPIRED)
        return
      }

      // 2. Check if employee is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setScreen(S.NO_AUTH); return }

      // 3. Find their linked stylist profile
      const { data: linked } = await supabase
        .from('stylists')
        .select('id, name, photo_url')
        .eq('profile_id', user.id)
        .single()

      if (!linked) { setScreen(S.NO_LINK); return }
      setStylist(linked)

      // 4. Check if already clocked in
      const { data: open } = await supabase
        .from('timesheets')
        .select('id, clock_in')
        .eq('stylist_id', linked.id)
        .is('clock_out', null)
        .maybeSingle()

      setOpenEntry(open || null)
      setScreen(S.ACTION)
    }
    init()
  }, [token])

  async function doAction() {
    setActing(true)
    const { data, error } = await supabase.rpc('clock_action', {
      p_stylist_id: stylist.id,
      p_token: token,
    })
    setActing(false)
    if (error || data?.error) { setScreen(S.EXPIRED); return }
    setResult(data.action)
    setScreen(S.DONE)
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.25rem' }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '2.5rem' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${C.gold}, #C4956A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px rgba(201,168,76,0.25)` }}>
          <Scissors size={11} color="#000" style={{ transform: 'rotate(45deg)' }} />
        </div>
        <span className="font-display" style={{ fontSize: '1.4rem', color: C.white, lineHeight: 1 }}>
          Hair<span style={{ color: C.gold }}>Go</span>
        </span>
      </div>

      {/* LOADING */}
      {screen === S.LOADING && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.gold, animation: 'spin .8s linear infinite' }} />
        </div>
      )}

      {/* EXPIRED / invalid token */}
      {screen === S.EXPIRED && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <XCircle size={52} color={C.red} style={{ margin: '0 auto 1.25rem', display: 'block' }} />
          <h2 className="font-display font-light" style={{ color: C.white, fontSize: '1.8rem', marginBottom: '0.6rem' }}>Code expired</h2>
          <p style={{ color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem', lineHeight: 1.6 }}>
            This QR code is no longer valid.<br />Please scan the screen at the salon again.
          </p>
        </div>
      )}

      {/* NOT LOGGED IN */}
      {screen === S.NO_AUTH && (
        <div style={{ textAlign: 'center', marginTop: '3rem', width: '100%', maxWidth: 340 }}>
          <LogIn size={44} color={C.gold} style={{ margin: '0 auto 1.25rem', display: 'block' }} />
          <h2 className="font-display font-light" style={{ color: C.white, fontSize: '1.8rem', marginBottom: '0.6rem' }}>Log in first</h2>
          <p style={{ color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            You need to be logged in to clock in.<br />Log in then scan the QR code again.
          </p>
          <Link to="/login"
            style={{ display: 'block', width: '100%', padding: '0.9rem', borderRadius: 14, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', textAlign: 'center' }}>
            Go to Login
          </Link>
        </div>
      )}

      {/* ACCOUNT NOT LINKED TO A STYLIST */}
      {screen === S.NO_LINK && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <XCircle size={52} color={C.red} style={{ margin: '0 auto 1.25rem', display: 'block' }} />
          <h2 className="font-display font-light" style={{ color: C.white, fontSize: '1.8rem', marginBottom: '0.6rem' }}>Account not linked</h2>
          <p style={{ color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Your account isn't linked to a team profile yet.<br />Ask an admin to link it in the Stylists page.
          </p>
        </div>
      )}

      {/* ACTION — clock in or out */}
      {screen === S.ACTION && stylist && (
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          {stylist.photo_url
            ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `3px solid ${openEntry ? C.green : C.gold}`, margin: '0 auto 1.25rem', display: 'block' }} />
            : <div style={{ width: 100, height: 100, borderRadius: '50%', background: C.subtle, border: `3px solid ${openEntry ? C.green : C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <span style={{ fontSize: 36, color: C.muted, fontWeight: 700 }}>{stylist.name[0]}</span>
              </div>
          }

          <h2 className="font-display font-light" style={{ color: C.white, fontSize: '1.8rem', marginBottom: '0.3rem' }}>{stylist.name}</h2>

          {openEntry
            ? <p style={{ color: C.green, fontFamily: 'Jost,sans-serif', fontSize: '0.82rem', marginBottom: '2rem' }}>
                Clocked in since {new Date(openEntry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            : <p style={{ color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.82rem', marginBottom: '2rem' }}>Not clocked in</p>
          }

          <button onClick={doAction} disabled={acting} className="action-btn"
            style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: 14, fontSize: '1rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer', transition: 'all .15s', opacity: acting ? 0.6 : 1,
              background: openEntry ? C.redBg : C.goldBg,
              color: openEntry ? C.red : C.gold,
              border: `1px solid ${openEntry ? C.redBorder : C.goldBorder}`,
            }}>
            {acting ? 'Please wait…' : openEntry ? '⏹ Clock Out' : '▶ Clock In'}
          </button>
        </div>
      )}

      {/* DONE */}
      {screen === S.DONE && (
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <CheckCircle size={60} color={result === 'clock_in' ? C.green : C.red} style={{ margin: '0 auto 1.25rem', display: 'block' }} />
          <h2 className="font-display font-light" style={{ color: C.white, fontSize: '2rem', marginBottom: '0.4rem' }}>
            {result === 'clock_in' ? 'Clocked in!' : 'Clocked out!'}
          </h2>
          <p style={{ color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.88rem' }}>
            {stylist?.name.split(' ')[0]} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .action-btn:hover:not(:disabled) { opacity: 0.8 !important; }
      `}</style>
    </div>
  )
}
