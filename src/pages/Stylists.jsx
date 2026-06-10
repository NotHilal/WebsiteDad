import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link2, Scissors, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getOrFetch } from '../lib/cache'

export default function Stylists() {
  const [team,    setTeam]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrFetch('stylists_all', async () => {
      const { data } = await supabase.from('stylists').select('*').not('profile_id', 'is', null).order('display_order')
      return data || []
    }, 5 * 60_000).then(data => { setTeam(data); setLoading(false) })
  }, [])

  return (
    <div className="page-root" style={{ minHeight: '100vh', paddingTop: 140, paddingBottom: 140 }}>
      <style>{`
        .team-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          max-width: 960px;
          margin: 0 auto;
        }
        @media (max-width: 860px) { .team-grid { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; } }
        @media (max-width: 520px) { .team-grid { grid-template-columns: 1fr; max-width: 340px; } }

        .team-card { cursor: default; }
        .team-photo-wrap { position: relative; overflow: hidden; border-radius: 4px; }
        .team-photo { width: 100%; height: 100%; object-fit: cover; object-position: top center; transition: transform 0.7s cubic-bezier(0.22,1,0.36,1); display: block; }
        .team-card:hover .team-photo { transform: scale(1.05); }

        .team-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(6,6,6,0.92) 0%, rgba(6,6,6,0.55) 40%, transparent 72%);
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 1.5rem;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .team-card:hover .team-overlay { opacity: 1; }

        .team-overlay-bio {
          transform: translateY(10px);
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        .team-card:hover .team-overlay-bio { transform: translateY(0); }

        .team-pill {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 9999px;
          background: rgba(184,212,232,0.15);
          border: 1px solid rgba(184,212,232,0.25);
          font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
          color: #B8D4E8; font-family: Jost,sans-serif;
          white-space: nowrap;
        }

        .ig-link {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(255,255,255,0.5); text-decoration: none;
          font-family: Jost,sans-serif; transition: color 0.2s;
          margin-top: 0.75rem;
        }
        .ig-link:hover { color: #B8D4E8; }

        .team-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(184,212,232,0.06), rgba(255,255,255,0.02));
        }

        .join-card:hover { border-color: rgba(184,212,232,0.22) !important; }
      `}</style>

      <div className="wrap">

        {/* ── Header ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center', marginBottom: 80 }}
        >
          <span className="sec-label">The Artists</span>
          <h1 className="font-display font-light"
            style={{ color: '#fff', fontSize: 'clamp(3rem,8vw,6rem)', marginBottom: '1.5rem', lineHeight: 1 }}>
            Our Team
          </h1>
          <div className="gold-bar" />
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.9rem', lineHeight: 1.85, maxWidth: 440, margin: '0 auto' }}>
            Passionate experts united by one purpose — to deliver the look that's truly yours.
          </p>
        </motion.div>

        {/* ── Grid ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="team-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="shimmer" style={{ aspectRatio: '4/5', borderRadius: 4, marginBottom: '1.25rem' }} />
                <div className="shimmer" style={{ height: 13, borderRadius: 4, width: '55%', marginBottom: 8 }} />
                <div className="shimmer" style={{ height: 9,  borderRadius: 4, width: '35%' }} />
              </div>
            ))}
          </div>
        ) : team.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'rgba(255,255,255,0.22)', fontSize: '0.9rem' }}>
            No stylists added yet.
          </div>
        ) : (
          <div className="team-grid">
            {team.map((s, i) => (
              <motion.div key={s.id} className="team-card"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Photo */}
                <div className="team-photo-wrap" style={{ aspectRatio: '4/5', marginBottom: '1.25rem' }}>
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} className="team-photo" loading="lazy" decoding="async" />
                    : <div className="team-placeholder" style={{ aspectRatio: '4/5' }}>
                        <User size={48} color="rgba(255,255,255,0.06)" strokeWidth={1} />
                      </div>
                  }

                  {/* Hover overlay */}
                  <div className="team-overlay">
                    <div className="team-overlay-bio">
                      {s.bio && (
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.75, marginBottom: '0.875rem', fontFamily: 'Jost,sans-serif', fontWeight: 300, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {s.bio}
                        </p>
                      )}
                      {s.specialties?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: s.instagram ? '0.5rem' : 0 }}>
                          {s.specialties.map(spec => (
                            <span key={spec} className="team-pill">{spec}</span>
                          ))}
                        </div>
                      )}
                      {s.instagram && (
                        <a href={`https://instagram.com/${s.instagram.replace('@','')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="ig-link"
                          onClick={e => e.stopPropagation()}>
                          <Link2 size={11} /> @{s.instagram.replace('@','')}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Permanent bottom gradient for name peek */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,6,6,0.35) 0%, transparent 30%)', pointerEvents: 'none' }} />
                </div>

                {/* Name / title */}
                <div style={{ paddingLeft: '0.1rem' }}>
                  <h3 className="font-display" style={{ fontSize: '1.45rem', color: '#f0f0f0', lineHeight: 1.15, marginBottom: '0.3rem' }}>
                    {s.name}
                  </h3>
                  {s.title && (
                    <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B8D4E8', fontFamily: 'Jost,sans-serif', fontWeight: 400 }}>
                      {s.title}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Join CTA ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginTop: 120 }}
        >
          <div className="join-card" style={{
            display: 'inline-block', maxWidth: 480, width: '100%',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 4, padding: '3.5rem 3rem',
            transition: 'border-color 0.3s',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(184,212,232,0.1)', border: '1px solid rgba(184,212,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem' }}>
              <Scissors size={18} color="#B8D4E8" style={{ transform: 'rotate(45deg)' }} />
            </div>
            <h3 className="font-display font-light" style={{ fontSize: '2rem', color: '#fff', marginBottom: '1rem' }}>
              Join the family
            </h3>
            <div className="gold-bar" />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.87rem', lineHeight: 1.9, maxWidth: 320, margin: '0 auto' }}>
              Passionate about hair? We're always looking for talented artists to join the HairGo team.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
