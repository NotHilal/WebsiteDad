import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Calendar, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isSameDay, isBefore, startOfDay
} from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', modal: '#1a1a24',
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

const ALL_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']
const WDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StudioAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [month,        setMonth]        = useState(new Date())
  const [selectedDay,  setSelectedDay]  = useState(null)
  const [filter,       setFilter]       = useState('all')
  const [page,         setPage]         = useState(0)

  const PAGE_SIZE = 3

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles(full_name, phone), services(name, price, duration), stylists(name)')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    setAppointments(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (!error) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      toast.success(`Marked as ${status}`)
    }
  }

  const days     = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const startPad = getDay(startOfMonth(month))

  // group appointments by date string
  const byDate = appointments.reduce((acc, a) => {
    if (!acc[a.date]) acc[a.date] = []
    acc[a.date].push(a)
    return acc
  }, {})

  const allDayAppts    = selectedDay ? (byDate[format(selectedDay, 'yyyy-MM-dd')] || []) : []
  const filteredAppts  = allDayAppts.filter(a => filter === 'all' || a.status === filter)
  const totalPages     = Math.ceil(filteredAppts.length / PAGE_SIZE)
  const dayAppts       = filteredAppts.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  // count per status for the filter bar
  const dayCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = allDayAppts.filter(a => a.status === s).length
    return acc
  }, {})

  const totalAppts = appointments.length
  const pendingCount = appointments.filter(a => a.status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes dot-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        .dot-pulse { animation: dot-pulse 1.6s ease-in-out infinite; }
        .cal-day-appt:hover { border-color: ${C.goldBorder} !important; background: rgba(201,168,76,0.04) !important; cursor: pointer; }
        .cal-day-appt.has-appts:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .cal-day-empty-hover:hover { border-color: ${C.border} !important; }
        .bd-nav:hover { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .st-btn-pending:hover   { background: rgba(245,158,11,0.2) !important; }
        .st-btn-confirmed:hover { background: rgba(52,211,153,0.2) !important; }
        .st-btn-completed:hover { background: rgba(201,168,76,0.2) !important; }
        .st-btn-cancelled:hover { background: rgba(248,113,113,0.2) !important; }
        .appt-card-row:hover { border-color: rgba(201,168,76,0.15) !important; }
        .filter-pill:hover { border-color: ${C.goldBorder} !important; color: ${C.goldDim} !important; }
        .modal-x:hover { background: rgba(255,255,255,0.08) !important; color: ${C.white} !important; }
        .pg-btn:not(:disabled):hover { background: ${C.goldBg} !important; }
      `}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: '1.25rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Appointments</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
            {totalAppts} total
            {pendingCount > 0 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>· {pendingCount} pending</span>}
          </p>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setMonth(subMonths(month, 1))} className="bd-nav"
            style={{ width: 34, height: 34, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all .18s' }}>
            <ChevronLeft size={14} />
          </button>
          <span className="font-display" style={{ fontSize: '1.15rem', color: C.white, minWidth: 160, textAlign: 'center' }}>
            {format(month, 'MMMM yyyy')}
          </span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="bd-nav"
            style={{ width: 34, height: 34, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all .18s' }}>
            <ChevronRight size={14} />
          </button>
          <button onClick={() => setMonth(new Date())}
            style={{ padding: '5px 14px', borderRadius: 20, background: 'transparent', border: `1px solid ${C.goldBorder}`, color: C.goldDim, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .18s' }}
            className="bd-nav">
            Today
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 5, flexShrink: 0 }}>
          {WDAYS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 || i === 6 ? C.goldDim : C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700, padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, flex: 1, minHeight: 0, alignContent: 'start' }}>
          {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}

          {loading
            ? days.map((_, i) => (
                <div key={i} style={{ minHeight: 88, borderRadius: 10, background: C.subtle, border: `1px solid ${C.border}` }} />
              ))
            : days.map(day => {
                const key      = format(day, 'yyyy-MM-dd')
                const appts    = byDate[key] || []
                const isToday  = isSameDay(day, new Date())
                const isPast   = isBefore(day, startOfDay(new Date()))
                const isWeekend = getDay(day) === 0 || getDay(day) === 6
                const hasAppts = appts.length > 0

                // count by status for dot row
                const counts = ALL_STATUSES.reduce((acc, s) => {
                  acc[s] = appts.filter(a => a.status === s).length
                  return acc
                }, {})

                return (
                  <div key={key}
                    onClick={() => { if (hasAppts) { setSelectedDay(day); setFilter('all'); setPage(0) } }}
                    className={`cal-day-appt ${hasAppts ? 'has-appts' : 'cal-day-empty-hover'}`}
                    style={{
                      minHeight: 88, borderRadius: 10, padding: '8px 9px 7px',
                      border: `1.5px solid ${isToday ? C.goldBorder : C.border}`,
                      background: isToday ? C.goldBg : isWeekend ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.02)',
                      opacity: isPast && !hasAppts ? 0.35 : 1,
                      cursor: hasAppts ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column',
                      transition: 'all .18s ease',
                    }}>

                    {/* Day number + count */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="font-display" style={{ fontSize: '1.05rem', color: isToday ? C.gold : isPast ? C.muted : C.white, fontWeight: 700, lineHeight: 1 }}>
                        {format(day, 'd')}
                      </span>
                      {hasAppts && (
                        <span style={{ fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 700, color: C.goldDim, background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: '1px 6px', lineHeight: 1.6 }}>
                          {appts.length}
                        </span>
                      )}
                    </div>

                    {/* Status dots */}
                    {hasAppts && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 'auto' }}>
                        {ALL_STATUSES.map(st => counts[st] > 0 && (
                          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS[st].color, flexShrink: 0 }}
                              className={st === 'pending' ? 'dot-pulse' : ''} />
                            {counts[st] > 1 && (
                              <span style={{ fontSize: 8, color: STATUS[st].color, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{counts[st]}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* First appointment preview */}
                    {hasAppts && appts[0] && (
                      <p style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {appts[0].time?.slice(0, 5)} {appts[0].profiles?.full_name?.split(' ')[0] || ''}
                      </p>
                    )}
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* Legend */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 18, paddingTop: '0.875rem', marginTop: '0.5rem', borderTop: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        {ALL_STATUSES.map(st => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS[st].color, flexShrink: 0 }} />
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </div>
        ))}
      </div>

      {/* ── Day modal ── */}
      {selectedDay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setSelectedDay(null)}>
          <div style={{ width: '100%', maxWidth: 580, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: '#12121a', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7)', border: `1px solid rgba(201,168,76,0.2)` }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '1.75rem 1.75rem 1.25rem', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              {/* Ambient glow */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 700, marginBottom: 6 }}>
                    {format(selectedDay, 'MMMM yyyy')}
                  </p>
                  <h2 className="font-display font-light" style={{ fontSize: '2.4rem', color: C.white, lineHeight: 1, marginBottom: 6 }}>
                    {format(selectedDay, 'EEEE d')}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <div style={{ width: 28, height: 1, background: `linear-gradient(90deg,${C.gold},transparent)` }} />
                    <span style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
                      {allDayAppts.length} appointment{allDayAppts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedDay(null)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s', flexShrink: 0 }}
                  className="modal-x">
                  <X size={14} />
                </button>
              </div>

              {/* Filter pills */}
              {allDayAppts.length > 0 && (
                <div style={{ display: 'flex', gap: 5, marginTop: '1.1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => { setFilter('all'); setPage(0) }}
                    style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filter === 'all' ? C.goldBorder : C.border}`, background: filter === 'all' ? C.goldBg : 'transparent', color: filter === 'all' ? C.gold : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.05em' }}
                    className="filter-pill">
                    All · {allDayAppts.length}
                  </button>
                  {ALL_STATUSES.filter(s => dayCounts[s] > 0).map(s => {
                    const opt = STATUS[s]
                    return (
                      <button key={s} onClick={() => { setFilter(s); setPage(0) }}
                        style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filter === s ? opt.border : C.border}`, background: filter === s ? opt.bg : 'transparent', color: filter === s ? opt.color : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 5 }}
                        className="filter-pill">
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: filter === s ? opt.color : 'rgba(255,255,255,0.2)' }} />
                        {s} · {dayCounts[s]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: `linear-gradient(90deg, ${C.goldBorder}, transparent)`, flexShrink: 0 }} />

            {/* Appointment list */}
            <div style={{ flex: 1, minHeight: 0, padding: '0.75rem' }}>
              {dayAppts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10 }}>
                  <Calendar size={28} color={C.border} />
                  <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>No appointments for this filter</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayAppts.map(appt => {
                    const s = STATUS[appt.status] || STATUS.pending
                    const initials = appt.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'
                    return (
                      <div key={appt.id}
                        style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '1rem 1.1rem', transition: 'border-color .2s' }}
                        className="appt-card-row">

                        {/* Row 1: avatar + info + time + status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.875rem' }}>
                          {/* Avatar */}
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.78rem', color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{initials}</span>
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: C.white, fontSize: '0.88rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 2 }}>
                              {appt.profiles?.full_name || 'Unknown'}
                            </p>
                            <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {[appt.services?.name, appt.stylists?.name].filter(Boolean).join(' · ')}
                            </p>
                          </div>

                          {/* Time pill */}
                          <div style={{ padding: '4px 12px', borderRadius: 20, background: C.goldBg, border: `1px solid ${C.goldBorder}`, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.78rem', color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
                              {appt.time?.slice(0, 5)}
                            </span>
                          </div>

                          {/* Status badge */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, flexShrink: 0 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} className={appt.status === 'pending' ? 'dot-pulse' : ''} />
                            <span style={{ fontSize: 9, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, textTransform: 'capitalize', letterSpacing: '0.05em' }}>{appt.status}</span>
                          </div>
                        </div>

                        {/* Row 2: extra info */}
                        {(appt.services?.duration || appt.services?.price || appt.profiles?.phone) && (
                          <div style={{ display: 'flex', gap: 12, marginBottom: '0.875rem', paddingLeft: 50 }}>
                            {appt.services?.duration && (
                              <span style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>⏱ {appt.services.duration} min</span>
                            )}
                            {appt.services?.price && (
                              <span style={{ fontSize: '0.72rem', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>€{appt.services.price}</span>
                            )}
                            {appt.profiles?.phone && (
                              <span style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{appt.profiles.phone}</span>
                            )}
                          </div>
                        )}

                        {/* Row 3: status buttons */}
                        <div style={{ display: 'flex', gap: 5, paddingLeft: 50 }}>
                          {ALL_STATUSES.map(st => {
                            const opt = STATUS[st]
                            const isCurrent = appt.status === st
                            return (
                              <button key={st}
                                disabled={isCurrent}
                                onClick={() => updateStatus(appt.id, st)}
                                style={{
                                  padding: '5px 13px', borderRadius: 8,
                                  background: isCurrent ? C.subtle : opt.bg,
                                  border: `1px solid ${isCurrent ? C.border : opt.border}`,
                                  color: isCurrent ? 'rgba(255,255,255,0.18)' : opt.color,
                                  fontSize: 10, fontFamily: 'Jost,sans-serif',
                                  fontWeight: isCurrent ? 400 : 600,
                                  cursor: isCurrent ? 'default' : 'pointer',
                                  textTransform: 'capitalize', transition: 'all .15s',
                                }}
                                className={isCurrent ? '' : `st-btn-${st}`}>
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0.875rem 1.5rem', borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: C.subtle, border: `1px solid ${page === 0 ? C.border : C.goldBorder}`, color: page === 0 ? C.muted : C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.35 : 1, transition: 'all .18s' }}
                  className="pg-btn">
                  <ChevronLeft size={14} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setPage(i)}
                      style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, background: i === page ? C.gold : C.border, border: 'none', cursor: 'pointer', transition: 'all .2s ease', padding: 0 }} />
                  ))}
                </div>

                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: C.subtle, border: `1px solid ${page === totalPages - 1 ? C.border : C.goldBorder}`, color: page === totalPages - 1 ? C.muted : C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === totalPages - 1 ? 'default' : 'pointer', opacity: page === totalPages - 1 ? 0.35 : 1, transition: 'all .18s' }}
                  className="pg-btn">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
