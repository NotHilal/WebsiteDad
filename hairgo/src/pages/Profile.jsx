import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Package, Tag, Star, Clock, X, Edit2, Check, LogOut, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TABS = ['Overview', 'Appointments', 'Preorders', 'Rewards']

const STATUS_MAP = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  confirmed: { label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  completed: { label: 'Completed', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)'  },
  active:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  expired:   { label: 'Expired',   color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' },
}

function StatusPill({ status }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
      letterSpacing: '0.02em', color: s.color, background: s.bg, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

const ease = [0.22, 1, 0.36, 1]

/* surface token */
const S1 = 'rgba(255,255,255,0.04)'   // card bg
const S2 = 'rgba(255,255,255,0.035)'  // nested row bg
const BD = 'rgba(255,255,255,0.07)'   // divider / border

export default function Profile() {
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]             = useState('Overview')
  const [appointments, setAppts]  = useState([])
  const [preorders, setPreorders] = useState([])
  const [coupons, setCoupons]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [editName, setEditName]   = useState(false)
  const [nameInput, setNameInput] = useState(profile?.full_name || '')
  const [loggingOut, setOut]      = useState(false)

  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    const [{ data: a }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('appointments').select('*, stylists(name), services(name,price)').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('preorders').select('*, products(name,image_url,price)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_coupons').select('*, coupons(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setAppts(a || [])
    setPreorders(p || [])
    setCoupons(c || [])
    setLoading(false)
  }

  async function saveName() {
    await supabase.from('profiles').update({ full_name: nameInput }).eq('id', user.id)
    await fetchProfile(user.id)
    setEditName(false)
    toast.success('Name updated')
  }

  async function handleLogout() {
    setOut(true)
    await supabase.auth.signOut()
    navigate('/')
  }

  const pts      = profile?.points || 0
  const tier     = pts >= 500 ? 'Gold' : pts >= 200 ? 'Silver' : 'Bronze'
  const nextTier = pts >= 500 ? null : pts >= 200 ? { name: 'Gold', at: 500 } : { name: 'Silver', at: 200 }
  const progress = nextTier ? Math.min(100, (pts / nextTier.at) * 100) : 100
  const initial  = (profile?.full_name || user?.email)?.[0]?.toUpperCase()
  const name     = profile?.full_name || user?.email?.split('@')[0] || 'Guest'
  const isAdmin  = profile?.role === 'admin'

  const tierColor = tier === 'Gold' ? '#C9A84C' : tier === 'Silver' ? '#9ca3af' : '#C4956A'
  const upcoming  = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length
  const activePreorders = preorders.filter(p => p.status === 'active').length
  const activeCoupons   = coupons.filter(c => !c.used).length

  /* shared card style */
  const card = {
    background: S1,
    border: `1px solid ${BD}`,
    borderRadius: 16,
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '78px 20px 20px',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 600,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            TOP CARD — loyalty left | profile right
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          style={{ ...card, display: 'flex', overflow: 'hidden' }}
        >
          {/* LEFT — loyalty */}
          <div style={{ flex: '0 0 52%', padding: '22px 24px' }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
              Loyalty Points
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 14 }}>
              <span className="gold-gradient" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 56, lineHeight: 1, fontWeight: 400 }}>
                {pts}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, paddingBottom: 6 }}>pts</span>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 3, overflow: 'hidden', marginBottom: 8 }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                transition={{ duration: 1.6, delay: 0.3, ease }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #C9A84C, #C4956A)', borderRadius: 99 }}
              />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
              {nextTier ? `${nextTier.at - pts} pts to ${nextTier.name}` : 'Maximum tier reached'}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: BD, flexShrink: 0, margin: '16px 0' }} />

          {/* RIGHT — profile */}
          <div style={{ flex: 1, padding: '22px 20px 22px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Avatar + name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #C9A84C, #C4956A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Cormorant Garamond", serif', fontSize: 19, color: '#0a0a0a', fontWeight: 500,
                boxShadow: '0 0 18px rgba(201,168,76,0.35)',
              }}>
                {initial || '?'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {editName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                      style={{
                        background: 'transparent', border: 'none',
                        borderBottom: '1px solid rgba(201,168,76,0.45)',
                        color: 'white', fontFamily: '"Cormorant Garamond", serif',
                        fontSize: 19, outline: 'none', flex: 1, minWidth: 0,
                      }}
                      autoFocus
                    />
                    <button onClick={saveName}                 style={{ background: 'none', border: 'none', color: '#C9A84C', cursor: 'pointer', padding: 2 }}><Check size={13}/></button>
                    <button onClick={() => setEditName(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 2 }}><X size={13}/></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditName(true); setNameInput(profile?.full_name || '') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 21, color: '#f0f0f0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                      {name}
                    </span>
                    <Edit2 size={11} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  </button>
                )}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Tier */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 500,
                color: tierColor, background: `${tierColor}18`, border: `1px solid ${tierColor}30`,
                padding: '4px 12px', borderRadius: 6,
              }}>
                {isAdmin ? 'Admin' : `${tier} Member`}
              </span>
            </div>
          </div>
        </motion.div>


        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            STATS — single bar, 3 metrics inline
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.07, ease }}
          style={{ ...card, display: 'flex' }}
        >
          {[
            { label: 'Upcoming',  value: upcoming         },
            { label: 'Preorders', value: activePreorders  },
            { label: 'Coupons',   value: activeCoupons    },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              flex: 1, padding: '16px 0', textAlign: 'center',
              borderRight: i < 2 ? `1px solid ${BD}` : 'none',
            }}>
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 32, color: '#f0f0f0', lineHeight: 1, marginBottom: 4 }}>
                {value}
              </div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.28)' }}>
                {label}
              </div>
            </div>
          ))}
        </motion.div>


        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            TABS + CONTENT
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.13, ease }}
          style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '13px 4px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', transition: 'color 0.2s',
                fontWeight: tab === t ? 500 : 400,
                color: tab === t ? '#C9A84C' : 'rgba(255,255,255,0.28)',
                borderBottom: `2px solid ${tab === t ? '#C9A84C' : 'transparent'}`,
                marginBottom: -1,
              }}>
                {t}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease }}
              >

                {/* — Overview — */}
                {tab === 'Overview' && (
                  <div>
                    {[
                      { icon: Calendar, label: 'Upcoming appointments', value: upcoming,        sub: 'booked'      },
                      { icon: Package,  label: 'Active preorders',       value: activePreorders, sub: 'reserved'    },
                      { icon: Tag,      label: 'Available coupons',       value: activeCoupons,   sub: 'ready to use'},
                    ].map(({ icon: Icon, label, value, sub }, i, arr) => (
                      <div key={label} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '16px 20px',
                        borderBottom: i < arr.length - 1 ? `1px solid ${BD}` : 'none',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.14)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={14} style={{ color: 'rgba(201,168,76,0.7)' }} />
                        </div>
                        <span style={{ flex: 1, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{label}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 28, color: '#f0f0f0', lineHeight: 1 }}>{value}</span>
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginLeft: 6 }}>{sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* — Appointments — */}
                {tab === 'Appointments' && (
                  <div>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ height: 72, margin: '6px 16px', borderRadius: 10, background: S2 }} className="shimmer" />
                      ))
                    ) : appointments.length === 0 ? (
                      <EmptyState icon={Calendar} text="No appointments yet." action="Book your first visit" link="/appointments" />
                    ) : (
                      appointments.map((appt, i) => (
                        <div key={appt.id} style={{
                          padding: '14px 20px',
                          borderBottom: i < appointments.length - 1 ? `1px solid ${BD}` : 'none',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                            <div>
                              <p style={{ color: '#e5e5e5', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{appt.services?.name}</p>
                              {appt.stylists?.name && (
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>with {appt.stylists.name}</p>
                              )}
                            </div>
                            <StatusPill status={appt.status} />
                          </div>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                              <Calendar size={10} />{format(new Date(appt.date), 'MMM d, yyyy')}
                            </span>
                            {appt.time && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                                <Clock size={10} />{appt.time.slice(0, 5)}
                              </span>
                            )}
                            {appt.services?.price && (
                              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>€{appt.services.price}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* — Preorders — */}
                {tab === 'Preorders' && (
                  <div>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ height: 64, margin: '6px 16px', borderRadius: 10, background: S2 }} className="shimmer" />
                      ))
                    ) : preorders.length === 0 ? (
                      <EmptyState icon={Package} text="No active preorders." action="Browse the store" link="/store" />
                    ) : (
                      preorders.map((order, i) => (
                        <div key={order.id} style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
                          borderBottom: i < preorders.length - 1 ? `1px solid ${BD}` : 'none',
                        }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 8, background: '#181818',
                            border: `1px solid ${BD}`, overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {order.products?.image_url
                              ? <img src={order.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <Package size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#e5e5e5', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.products?.name}</p>
                            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 2 }}>
                              Qty {order.quantity}{order.products?.price && ` · €${order.products.price}`}
                            </p>
                          </div>
                          <StatusPill status={order.status} />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* — Rewards — */}
                {tab === 'Rewards' && (
                  <div>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ height: 64, margin: '6px 16px', borderRadius: 10, background: S2 }} className="shimmer" />
                      ))
                    ) : coupons.length === 0 ? (
                      <EmptyState icon={Star} text="No coupons yet. Book appointments to earn loyalty points and unlock rewards." />
                    ) : (
                      coupons.map(({ id, coupons: c, used }, i) => (
                        <div key={id} style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                          borderBottom: i < coupons.length - 1 ? `1px solid ${BD}` : 'none',
                          opacity: used ? 0.35 : 1,
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                            background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Tag size={13} style={{ color: '#C9A84C', opacity: 0.75 }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: 'monospace', color: '#C9A84C', fontSize: 13, letterSpacing: '0.08em', marginBottom: 2 }}>{c?.code}</p>
                            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>
                              {c?.discount_type === 'percentage' ? `${c.discount_value}% off` : `€${c?.discount_value} off`}
                              {c?.expiry_date && `  ·  expires ${format(new Date(c.expiry_date), 'MMM d, yyyy')}`}
                            </p>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
                            color: used ? 'rgba(255,255,255,0.25)' : '#C9A84C',
                            background: used ? 'rgba(255,255,255,0.05)' : 'rgba(201,168,76,0.1)',
                          }}>
                            {used ? 'Used' : 'Active'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>


        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SIGN OUT
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.2, ease }}
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 10, border: `1px solid ${BD}`,
            background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.16em', cursor: 'pointer',
            transition: 'color 0.2s, border-color 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = BD }}
        >
          {loggingOut
            ? <svg className="animate-spin" style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            : <LogOut size={13} />}
          {loggingOut ? 'Signing out' : 'Sign Out'}
        </motion.button>

      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, text, action, link }) {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <Icon size={22} style={{ color: 'rgba(255,255,255,0.12)' }} />
      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textAlign: 'center', maxWidth: 220, lineHeight: 1.6 }}>{text}</p>
      {action && link && (
        <button
          onClick={() => navigate(link)}
          style={{
            marginTop: 4, padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(201,168,76,0.25)',
            background: 'rgba(201,168,76,0.07)', color: '#C9A84C', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}
