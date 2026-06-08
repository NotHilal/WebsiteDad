import { useState, useEffect } from 'react'
import { Calendar, ShoppingBag, Users, MessageSquare, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getOrFetch } from '../../lib/cache'
import { format, getHours } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const C = {
  card: '#161620',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
}

const STATUS = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.22)'  },
  confirmed: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.22)'  },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.22)' },
  completed: { color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.22)'  },
}

const SLOTS = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']

function greeting() {
  const h = getHours(new Date())
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }

export default function StudioDashboard() {
  const [stats,         setStats]         = useState({ appointments: 0, pending: 0, preorders: 0, users: 0, msgs: 0 })
  const [todayAppts,    setTodayAppts]    = useState([])
  const [stylists,      setStylists]      = useState([])
  const [stylistFilter, setStylistFilter] = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [activeClockIn, setActiveClockIn] = useState(undefined) // undefined = not yet fetched
  const navigate = useNavigate()
  const { isAdmin, user } = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    const today = format(new Date(), 'yyyy-MM-dd')
    const result = await getOrFetch(`studio_dashboard_${today}`, async () => {
      const [
        { count: apptCount }, { count: pending }, { count: preorders },
        { count: users }, { count: msgs }, { data: todayList }, { data: stylistList },
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('preorders').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('read', false),
        supabase.from('appointments')
          .select('*, profiles(full_name), services(name, price, duration), stylists(name, photo_url)')
          .eq('date', today)
          .order('time'),
        supabase.from('stylists').select('id, name, photo_url').order('display_order'),
      ])
      return {
        stats: { appointments: apptCount || 0, pending: pending || 0, preorders: preorders || 0, users: users || 0, msgs: msgs || 0 },
        todayAppts: todayList || [],
        stylists: stylistList || [],
      }
    }, 60_000)
    setStats(result.stats)
    setTodayAppts(result.todayAppts)
    setStylists(result.stylists)
    setLoading(false)

    if (!isAdmin && user) {
      const { data: linked } = await supabase
        .from('stylists').select('id').eq('profile_id', user.id).single()
      if (linked) {
        const { data: open } = await supabase
          .from('timesheets').select('id, clock_in')
          .eq('stylist_id', linked.id).is('clock_out', null).maybeSingle()
        setActiveClockIn(open || null)
      } else {
        setActiveClockIn(null)
      }
    }
  }

  const statCards = [
    { icon: Calendar,      label: 'Appointments', value: stats.appointments, sub: `${stats.pending} pending`, link: '/studio/schedule', color: C.gold },
    { icon: ShoppingBag,   label: 'Orders',       value: stats.preorders,    sub: 'Awaiting pickup',          link: '/studio/orders',      color: '#a78bfa' },
    isAdmin
      ? { icon: Users,  label: 'Clients',    value: stats.users, sub: 'Registered',    link: '/studio/users',       color: '#34d399' }
      : { icon: Clock,  label: 'Timesheets', value: null,        sub: 'My time logs',  link: '/studio/timesheets',  color: '#34d399' },
    { icon: MessageSquare, label: 'Messages',     value: stats.msgs,         sub: 'Unread',                   link: '/studio/messages',  color: '#60a5fa' },
  ]

  const visibleAppts = stylistFilter ? todayAppts.filter(a => a.stylist_id === stylistFilter) : todayAppts
  const bookedCount  = visibleAppts.length
  const freeCount    = SLOTS.length - new Set(visibleAppts.map(a => a.time?.slice(0, 5))).size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.1rem' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Overview</p>
        <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>
          {greeting()}.
        </h1>
        <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', flexShrink: 0 }}>
        {statCards.map(c => {
          const isClockCard = !isAdmin && c.label === 'Timesheets'
          const clockedIn   = isClockCard && !!activeClockIn
          const elapsed     = clockedIn ? Math.floor((Date.now() - new Date(activeClockIn.clock_in)) / 60000) : 0
          const elapsedStr  = elapsed >= 60 ? `${Math.floor(elapsed/60)}h ${elapsed%60}m` : `${elapsed}m`
          const dotColor    = clockedIn ? '#34d399' : 'rgba(255,255,255,0.18)'
          return (
            <button key={c.label} onClick={() => navigate(c.link)} className="d-stat"
              style={{ ...card, padding: '1.1rem 1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'all .2s ease', borderColor: isClockCard && clockedIn ? 'rgba(52,211,153,0.2)' : undefined }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${isClockCard && clockedIn ? '#34d399' : c.color}14`, border: `1px solid ${isClockCard && clockedIn ? '#34d399' : c.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
                <c.icon size={15} color={isClockCard && clockedIn ? '#34d399' : c.color} strokeWidth={1.5} />
              </div>
              {isClockCard ? (
                activeClockIn === undefined ? (
                  <div className="font-display" style={{ fontSize: '2rem', color: C.border, lineHeight: 1, marginBottom: '0.2rem' }}>—</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.2rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, animation: clockedIn ? 'dash-pulse 2s infinite' : 'none' }} />
                    <span className="font-display" style={{ fontSize: '1.35rem', color: clockedIn ? '#34d399' : C.muted, lineHeight: 1 }}>
                      {clockedIn ? 'In' : 'Out'}
                    </span>
                  </div>
                )
              ) : (
                <div className="font-display" style={{ fontSize: '2rem', color: loading ? C.border : C.white, lineHeight: 1, marginBottom: '0.2rem' }}>
                  {loading ? '—' : c.value}
                </div>
              )}
              <p style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.1rem' }}>{c.label}</p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif' }}>
                {isClockCard ? (clockedIn ? `Since ${elapsedStr} ago` : 'Not clocked in') : c.sub}
              </p>
            </button>
          )
        })}
      </div>

      {/* Today's schedule */}
      <div style={{ ...card, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Schedule header */}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.05rem', color: C.white, marginBottom: 2 }}>Today's Schedule</h2>
            <p style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
              {loading ? '…' : `${bookedCount} booked · ${freeCount} free slot${freeCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
            {format(new Date(), 'MMM d')}
          </span>
        </div>

        {/* Stylist filter */}
        {stylists.length > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '0.625rem 1.25rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
            <button onClick={() => setStylistFilter(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, border: `1px solid ${!stylistFilter ? C.goldBorder : C.border}`, background: !stylistFilter ? C.goldBg : 'transparent', color: !stylistFilter ? C.gold : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
              All stylists
            </button>
            {stylists.map(s => {
              const active = stylistFilter === s.id
              return (
                <button key={s.id} onClick={() => setStylistFilter(active ? null : s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 12px 4px 4px', borderRadius: 20, border: `1px solid ${active ? C.goldBorder : C.border}`, background: active ? C.goldBg : 'transparent', color: active ? C.gold : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1.5px solid ${active ? C.gold : 'rgba(255,255,255,0.12)'}` }} />
                    : <div style={{ width: 22, height: 22, borderRadius: '50%', background: active ? C.goldBg : C.subtle, border: `1.5px solid ${active ? C.goldBorder : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: active ? C.gold : C.muted, fontWeight: 700 }}>
                        {s.name.charAt(0)}
                      </div>
                  }
                  {s.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        )}

        {/* Slots */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ height: 44, borderRadius: 8, background: C.subtle }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {SLOTS.map(slot => {
                const slotAppts = visibleAppts.filter(a => a.time?.slice(0, 5) === slot)
                const count = slotAppts.length

                return (
                  <div key={slot} style={{ display: 'flex', gap: 12, minHeight: 44, alignItems: count > 0 ? 'flex-start' : 'center' }}>

                    {/* Time */}
                    <span style={{ width: 40, flexShrink: 0, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', textAlign: 'right', paddingTop: count > 0 ? 10 : 0,
                      color: count > 1 ? '#f59e0b' : count === 1 ? C.gold : 'rgba(255,255,255,0.15)',
                      fontWeight: count > 0 ? 700 : 400,
                    }}>
                      {slot}
                    </span>

                    {/* Separator */}
                    <div style={{ width: 1, alignSelf: 'stretch', flexShrink: 0,
                      background: count > 1 ? 'rgba(245,158,11,0.4)' : count === 1 ? C.goldBorder : 'rgba(255,255,255,0.05)',
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: count > 0 ? 5 : 0, paddingBottom: count > 0 ? 5 : 0 }}>

                      {count === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>Free</span>
                        </div>
                      )}

                      {count === 1 && (() => {
                        const appt = slotAppts[0]
                        const s = STATUS[appt.status] || STATUS.pending
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.4rem 0.875rem', borderRadius: 10, background: s.bg, border: `1px solid ${s.border}` }}>
                            {appt.stylists?.photo_url
                              ? <img src={appt.stylists.photo_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: `1.5px solid ${s.border}` }} />
                              : <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${s.color}22`, border: `1.5px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: s.color, fontWeight: 700, flexShrink: 0 }}>
                                  {appt.stylists?.name?.charAt(0) || '?'}
                                </div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {appt.stylists?.name || 'Stylist'}
                              </p>
                              <p style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {[appt.services?.name, appt.profiles?.full_name].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            {appt.services?.price && <span style={{ fontSize: '0.72rem', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, flexShrink: 0 }}>€{appt.services.price}</span>}
                            {appt.payment_status === 'pay_in_store' && (
                              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontFamily: 'Jost,sans-serif', fontWeight: 700, flexShrink: 0 }}>
                                Pay in store
                              </span>
                            )}
                            <div style={{ padding: '2px 9px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, flexShrink: 0 }}>
                              <span style={{ fontSize: 9, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, textTransform: 'capitalize' }}>{appt.status}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {count > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ marginBottom: 2 }}>
                            <span style={{ fontSize: 9, padding: '2px 9px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
                              {count} bookings
                            </span>
                          </div>
                          {slotAppts.map(appt => {
                            const s = STATUS[appt.status] || STATUS.pending
                            return (
                              <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.35rem 0.75rem', borderRadius: 9, background: s.bg, border: `1px solid ${s.border}` }}>
                                {appt.stylists?.photo_url
                                  ? <img src={appt.stylists.photo_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: `1.5px solid ${s.border}` }} />
                                  : <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${s.color}22`, border: `1.5px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: s.color, fontWeight: 700, flexShrink: 0 }}>
                                      {appt.stylists?.name?.charAt(0) || '?'}
                                    </div>
                                }
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ color: C.white, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {appt.stylists?.name || 'Stylist'}
                                  </p>
                                  <p style={{ color: C.muted, fontSize: '0.65rem', fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {[appt.services?.name, appt.profiles?.full_name].filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  {appt.services?.price && <span style={{ fontSize: '0.68rem', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>€{appt.services.price}</span>}
                                  {appt.payment_status === 'pay_in_store' && (
                                    <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
                                      In store
                                    </span>
                                  )}
                                  <div style={{ padding: '2px 7px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}` }}>
                                    <span style={{ fontSize: 8, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, textTransform: 'capitalize' }}>{appt.status}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dot-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes dash-pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(52,211,153,0.5)} 50%{opacity:.8;box-shadow:0 0 0 4px rgba(52,211,153,0)} }
        .dot-pulse { animation: dot-pulse 1.6s ease-in-out infinite; }
        .d-stat:hover { border-color: ${C.goldBorder} !important; background: #1a1a24 !important; }
        @media (max-width: 639px) { .dash-stats { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>
    </div>
  )
}
