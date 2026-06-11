import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scissors, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const C = {
  border: 'rgba(var(--rgb-hi),0.07)', white: 'var(--col-text)', muted: 'rgba(var(--rgb-hi),0.22)',
  gold: 'var(--col-acc)', goldBg: 'rgba(var(--rgb-acc),0.08)', goldBorder: 'rgba(var(--rgb-acc),0.2)',
}

export default function UnlinkedArtistAlert() {
  const { isAdmin } = useAuth()
  const [artists, setArtists] = useState([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  async function fetch() {
    const [{ data: allArtists }, { data: linked }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'artist'),
      supabase.from('stylists').select('profile_id').not('profile_id', 'is', null),
    ])
    const linkedIds = new Set((linked || []).map(s => s.profile_id))
    setArtists((allArtists || []).filter(a => !linkedIds.has(a.id)))
  }

  useEffect(() => {
    if (!isAdmin) return
    fetch()
    const sub = supabase.channel('unlinked-artist-alert')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stylists' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [isAdmin])

  function goLink() {
    setOpen(false)
    navigate('/studio/users?tab=artist')
  }

  if (!isAdmin || artists.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes artist-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(var(--rgb-acc),0.55); transform: scale(1); }
          50%      { box-shadow: 0 0 0 7px rgba(var(--rgb-acc),0); transform: scale(1.06); }
        }
        .ula-link:hover { background: rgba(var(--rgb-acc),0.14) !important; border-color: rgba(var(--rgb-acc),0.4) !important; color: #B8D4E8 !important; }
      `}</style>

      <button onClick={() => setOpen(p => !p)}
        style={{ position: 'relative', width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#B8D4E8,#7AAFC9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'artist-pulse 2s ease-in-out infinite', flexShrink: 0 }}>
        <Scissors size={13} color="#000" style={{ transform: 'rotate(45deg)' }} strokeWidth={2.5} />
        {artists.length > 1 && (
          <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', border: '2px solid var(--col-bg)', fontSize: 8, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif' }}>
            {artists.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }} />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{ position: 'fixed', top: '3.5rem', right: '1.5rem', zIndex: 120, width: 300, maxWidth: 'calc(100vw - 2rem)', background: 'var(--col-modal)', border: `1px solid ${C.goldBorder}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>

              {/* Header */}
              <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.goldBg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, boxShadow: `0 0 6px ${C.gold}88` }} />
                  <span style={{ fontSize: '0.82rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, color: C.white }}>
                    {artists.length} artist{artists.length > 1 ? 's' : ''} not linked
                  </span>
                </div>
                <button onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* List */}
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {artists.map((a, i) => (
                  <div key={a.id} style={{ padding: '0.75rem 1rem', borderBottom: i < artists.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: C.gold, fontFamily: 'DM Sans,sans-serif', fontWeight: 700 }}>{a.full_name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8rem', fontFamily: 'DM Sans,sans-serif', color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name || 'No name'}</p>
                      <p style={{ fontSize: '0.68rem', fontFamily: 'DM Sans,sans-serif', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${C.border}` }}>
                <button onClick={goLink} className="ula-link"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0.6rem', borderRadius: 10, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: '0.78rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                  Link artists <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
