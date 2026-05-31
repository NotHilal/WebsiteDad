import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Lock, Unlock, X, BanIcon, Clock } from 'lucide-react'
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
  danger: '#f87171', dangerBg: 'rgba(248,113,113,0.12)', dangerBorder: 'rgba(248,113,113,0.25)',
  warning: '#f59e0b', warnBg: 'rgba(245,158,11,0.1)', warnBorder: 'rgba(245,158,11,0.25)',
}

const SLOTS = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']

export default function StudioBlockedDates() {
  const [dates,        setDates]        = useState([])
  const [blockedHours, setBlockedHours] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [month,        setMonth]        = useState(new Date())
  const [selected,     setSelected]     = useState(null)
  const [blockTab,     setBlockTab]     = useState('day')
  const [reason,       setReason]       = useState('')
  const [selHours,     setSelHours]     = useState([])
  const [saving,       setSaving]       = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: d }, { data: h }] = await Promise.all([
      supabase.from('blocked_dates').select('*').order('date'),
      supabase.from('blocked_hours').select('*').order('date'),
    ])
    setDates(d || [])
    setBlockedHours(h || [])
    setLoading(false)
  }

  // maps: date string → record or hours array
  const blockedMap      = Object.fromEntries(dates.map(d => [d.date, d]))
  const blockedHoursMap = blockedHours.reduce((acc, h) => {
    if (!acc[h.date]) acc[h.date] = []
    acc[h.date].push(h.hour)
    return acc
  }, {})

  const days     = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const startPad = getDay(startOfMonth(month))
  const isPast   = d => isBefore(d, startOfDay(new Date()))
  const isToday  = d => isSameDay(d, new Date())

  function handleDayClick(day) {
    if (isPast(day)) return
    const key = format(day, 'yyyy-MM-dd')
    const existingHours = blockedHoursMap[key] || []
    setSelected({ day, key, blocked: blockedMap[key] || null })
    setReason(blockedMap[key]?.reason || '')
    setSelHours(existingHours)
    setBlockTab(blockedMap[key] ? 'day' : existingHours.length > 0 ? 'hours' : 'day')
  }

  function closeModal() {
    setSelected(null); setReason(''); setSelHours([]); setBlockTab('day')
  }

  function toggleHour(h) {
    setSelHours(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])
  }

  // ── Full day block ──
  async function blockDay() {
    setSaving(true)
    try {
      const { error } = await supabase.from('blocked_dates').insert({ date: selected.key, reason: reason.trim() || null })
      if (error) throw error
      toast.success('Day blocked')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function unblockDay() {
    setSaving(true)
    await supabase.from('blocked_dates').delete().eq('id', selected.blocked.id)
    toast.success('Day unblocked')
    setSaving(false); closeModal(); load()
  }

  // ── Hour block ──
  async function saveHours() {
    setSaving(true)
    try {
      // Delete all existing blocked hours for this date first
      await supabase.from('blocked_hours').delete().eq('date', selected.key)
      // Insert newly selected ones
      if (selHours.length > 0) {
        const { error } = await supabase.from('blocked_hours').insert(
          selHours.map(h => ({ date: selected.key, hour: h }))
        )
        if (error) throw error
      }
      toast.success(selHours.length > 0 ? `${selHours.length} hour${selHours.length !== 1 ? 's' : ''} blocked` : 'Hours unblocked')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const upcoming = dates.filter(d => !isPast(new Date(d.date + 'T00:00:00')))
  const upcomingPartial = Object.entries(blockedHoursMap)
    .filter(([date]) => !blockedMap[date] && !isPast(new Date(date + 'T00:00:00')))
    .sort(([a], [b]) => a.localeCompare(b))

  const WDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .bd-day.available:hover {
          border-color: ${C.gold} !important;
          background: rgba(201,168,76,0.06) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(201,168,76,0.14);
          cursor: pointer;
        }
        .bd-nav:hover { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .bd-today-btn:hover { background: ${C.gold} !important; color: #000 !important; }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); outline: none; }
        .hour-pill { transition: all .15s ease; }
        .hour-pill:hover:not(.hour-blocked-existing) { border-color: ${C.gold} !important; color: ${C.gold} !important; background: ${C.goldBg} !important; }
        .block-tab-btn:hover:not(.active) { color: ${C.dim} !important; background: rgba(255,255,255,0.04) !important; }
        .unblock-btn:hover { background: rgba(248,113,113,0.08) !important; }
        .bd-item:hover { border-color: ${C.dangerBorder} !important; }
        .bd-partial-item:hover { border-color: ${C.warnBorder} !important; }
      `}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: '1.25rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}` }}>
        <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>
          Blocked Dates & Hours
        </h1>
        <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
          Click any future date to block the full day or specific time slots
        </p>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', flex: 1, minHeight: 0 }}>

        {/* ── Calendar ── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1.1rem 1.5rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button onClick={() => setMonth(subMonths(month, 1))} className="bd-nav"
              style={{ width: 36, height: 36, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all .2s', flexShrink: 0 }}>
              <ChevronLeft size={15} />
            </button>
            <span className="font-display" style={{ fontSize: '1.3rem', color: C.white, flex: 1, textAlign: 'center' }}>
              {format(month, 'MMMM yyyy')}
            </span>
            <button onClick={() => setMonth(new Date())} className="bd-today-btn"
              style={{ padding: '5px 14px', borderRadius: 20, background: 'transparent', border: `1px solid ${C.goldBorder}`, color: C.goldDim, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .2s', flexShrink: 0 }}>
              Today
            </button>
            <button onClick={() => setMonth(addMonths(month, 1))} className="bd-nav"
              style={{ width: 36, height: 36, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all .2s', flexShrink: 0 }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 18, padding: '0.65rem 1.5rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
            {[
              { dot: { background: C.subtle, border: `1px solid ${C.border}` }, label: 'Available' },
              { dot: { background: C.goldBg, border: `1px solid ${C.goldBorder}` }, label: 'Today' },
              { dot: { background: C.warnBg, border: `1px solid ${C.warnBorder}` }, label: 'Hours blocked' },
              { dot: { background: C.dangerBg, border: `1px solid ${C.dangerBorder}` }, label: 'Full day blocked' },
            ].map(({ dot, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, flexShrink: 0, ...dot }} />
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ flex: 1, padding: '1rem 1.5rem 1.5rem', overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 6 }}>
              {WDAYS.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: i === 0 || i === 6 ? C.goldDim : C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700, paddingBottom: 6 }}>
                  {d}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
              {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} style={{ minHeight: 72 }} />)}

              {loading
                ? days.map((_, i) => <div key={i} style={{ minHeight: 72, borderRadius: 10, background: C.subtle, border: `1px solid ${C.border}` }} />)
                : days.map(day => {
                    const key       = format(day, 'yyyy-MM-dd')
                    const past      = isPast(day)
                    const today     = isToday(day)
                    const fullyBlocked  = !!blockedMap[key]
                    const partialHours  = blockedHoursMap[key] || []
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6

                    let bg     = isWeekend && !past ? 'rgba(201,168,76,0.025)' : 'rgba(255,255,255,0.03)'
                    let border = C.border
                    let numColor = C.dim

                    if (fullyBlocked) { bg = C.dangerBg; border = C.dangerBorder; numColor = C.danger }
                    else if (today)   { bg = C.goldBg;   border = C.goldBorder;   numColor = C.gold }
                    else if (partialHours.length > 0) { bg = C.warnBg; border = C.warnBorder; numColor = C.warning }

                    return (
                      <div key={key} className={`bd-day ${!past ? 'available' : ''}`}
                        onClick={() => handleDayClick(day)}
                        style={{ minHeight: 72, borderRadius: 10, padding: '7px 7px 5px', border: `1.5px solid ${border}`, background: bg, opacity: past ? 0.3 : 1, cursor: past ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', transition: 'all .18s ease' }}>

                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span className="font-display" style={{ fontSize: '1.1rem', color: numColor, fontWeight: 700, lineHeight: 1 }}>
                            {format(day, 'd')}
                          </span>
                          {today && !fullyBlocked && (
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, marginTop: 4 }} />
                          )}
                        </div>

                        {/* Full day label */}
                        {fullyBlocked && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <BanIcon size={8} color={C.danger} />
                            <span style={{ fontSize: 8, color: C.danger, fontFamily: 'Jost,sans-serif', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {blockedMap[key]?.reason || 'Full day'}
                            </span>
                          </div>
                        )}

                        {/* Hour tags */}
                        {!fullyBlocked && partialHours.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                            {partialHours.slice(0, 3).map(h => (
                              <span key={h} style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: 'rgba(245,158,11,0.18)', color: C.warning, fontFamily: 'Jost,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</span>
                            ))}
                            {partialHours.length > 3 && (
                              <span style={{ fontSize: 7, color: C.warning, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>+{partialHours.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>

        {/* ── Side list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0, overflow: 'hidden' }}>

          {/* Full day blocks */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', flex: upcoming.length > 0 ? '1' : '0 0 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '0.875rem 1.1rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BanIcon size={12} color={C.danger} />
              <div>
                <p style={{ fontSize: '0.78rem', color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Full Days</p>
                <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{upcoming.length} blocked</p>
              </div>
            </div>
            <div style={{ overflowY: 'auto', minHeight: 0, padding: '0.625rem' }}>
              {upcoming.length === 0 ? (
                <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', textAlign: 'center', padding: '0.75rem 0' }}>None</p>
              ) : upcoming.map(d => (
                <div key={d.id} className="bd-item"
                  onClick={() => handleDayClick(new Date(d.date + 'T00:00:00'))}
                  style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: 9, padding: '0.6rem 0.875rem', marginBottom: 5, cursor: 'pointer', transition: 'border-color .18s' }}>
                  <p style={{ color: C.danger, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                    {format(new Date(d.date + 'T00:00:00'), 'EEE, MMM d')}
                  </p>
                  {d.reason && <p style={{ color: 'rgba(248,113,113,0.5)', fontSize: '0.68rem', fontFamily: 'Jost,sans-serif', marginTop: 1 }}>{d.reason}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Partial hour blocks */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', flex: upcomingPartial.length > 0 ? '1' : '0 0 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '0.875rem 1.1rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={12} color={C.warning} />
              <div>
                <p style={{ fontSize: '0.78rem', color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Hour Blocks</p>
                <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{upcomingPartial.length} date{upcomingPartial.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div style={{ overflowY: 'auto', minHeight: 0, padding: '0.625rem' }}>
              {upcomingPartial.length === 0 ? (
                <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', textAlign: 'center', padding: '0.75rem 0' }}>None</p>
              ) : upcomingPartial.map(([date, hours]) => (
                <div key={date} className="bd-partial-item"
                  onClick={() => handleDayClick(new Date(date + 'T00:00:00'))}
                  style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 9, padding: '0.6rem 0.875rem', marginBottom: 5, cursor: 'pointer', transition: 'border-color .18s' }}>
                  <p style={{ color: C.warning, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 4 }}>
                    {format(new Date(date + 'T00:00:00'), 'EEE, MMM d')}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {hours.map(h => (
                      <span key={h} style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: C.warning, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{h}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Day modal ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={closeModal}>
          <div style={{ width: '100%', maxWidth: 460, background: C.modal, borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', border: `1px solid ${C.goldBorder}` }}
            onClick={e => e.stopPropagation()}>

            {/* Gold top bar */}
            <div style={{ height: 3, background: `linear-gradient(90deg,${C.gold},#C4956A,rgba(201,168,76,0.15))` }} />

            <div style={{ padding: '1.5rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h2 className="font-display" style={{ fontSize: '1.6rem', color: C.white, lineHeight: 1.1 }}>
                    {format(selected.day, 'EEEE')}
                  </h2>
                  <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>
                    {format(selected.day, 'MMMM d, yyyy')}
                  </p>
                </div>
                <button onClick={closeModal}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', background: C.subtle, borderRadius: 10, padding: 3, marginBottom: '1.25rem', gap: 3 }}>
                {[
                  { id: 'day',   label: 'Full Day',    icon: BanIcon  },
                  { id: 'hours', label: 'By Hours',    icon: Clock    },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setBlockTab(id)} className={`block-tab-btn${blockTab === id ? ' active' : ''}`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.55rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, transition: 'all .18s',
                      background: blockTab === id ? C.goldBg : 'transparent',
                      color: blockTab === id ? C.gold : C.muted,
                      outline: blockTab === id ? `1px solid ${C.goldBorder}` : 'none',
                    }}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Full Day ── */}
              {blockTab === 'day' && (
                selected.blocked ? (
                  <>
                    {selected.blocked.reason && (
                      <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: 10, padding: '0.875rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <BanIcon size={13} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: '0.82rem', color: C.danger, fontFamily: 'Jost,sans-serif', lineHeight: 1.5 }}>{selected.blocked.reason}</p>
                      </div>
                    )}
                    <p style={{ fontSize: '0.82rem', color: C.muted, fontFamily: 'Jost,sans-serif', marginBottom: '1.25rem', lineHeight: 1.65 }}>
                      This full day is blocked — no bookings are accepted on this date.
                    </p>
                    <div style={{ display: 'flex', gap: '0.625rem' }}>
                      <button onClick={closeModal} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={unblockDay} disabled={saving} className="unblock-btn"
                        style={{ flex: 1.4, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1.5px solid ${C.dangerBorder}`, color: C.danger, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.5 : 1, transition: 'background .18s' }}>
                        {saving ? <div style={{ width: 14, height: 14, border: `2px solid rgba(248,113,113,0.3)`, borderTopColor: C.danger, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <><Unlock size={13} /> Unblock Day</>}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: '1.1rem' }}>
                      <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 7 }}>
                        Reason <span style={{ textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.18)' }}>(optional)</span>
                      </label>
                      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Public holiday, Team day off…" className="m-inp" autoFocus
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.6rem 0.875rem', fontSize: '0.85rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.625rem' }}>
                      <button onClick={closeModal} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={blockDay} disabled={saving}
                        style={{ flex: 1.4, padding: '0.65rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.5 : 1 }}>
                        {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <><Lock size={13} /> Block Full Day</>}
                      </button>
                    </div>
                  </>
                )
              )}

              {/* ── Tab: Hours ── */}
              {blockTab === 'hours' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
                      Select slots to block — clients won't see them
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setSelHours([...SLOTS])}
                        style={{ fontSize: 9, padding: '3px 9px', borderRadius: 7, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.goldDim, cursor: 'pointer', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>All</button>
                      <button onClick={() => setSelHours([])}
                        style={{ fontSize: 9, padding: '3px 9px', borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Clear</button>
                    </div>
                  </div>

                  {/* Morning + Afternoon side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0 12px', marginBottom: '1.25rem' }}>
                    {[
                      ['Morning',   SLOTS.filter(s => parseInt(s) < 13)],
                      ['Afternoon', SLOTS.filter(s => parseInt(s) >= 13)],
                    ].map(([label, slots], col) => col === 0 ? (
                      <div key={label}>
                        <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700, marginBottom: 8 }}>{label}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                          {slots.map(h => {
                            const sel = selHours.includes(h)
                            return (
                              <button key={h} onClick={() => toggleHour(h)} className="hour-pill"
                                style={{ padding: '0.45rem 0', borderRadius: 8, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: sel ? 700 : 400, cursor: 'pointer', transition: 'all .15s', border: sel ? 'none' : `1px solid ${C.border}`, background: sel ? `linear-gradient(135deg,${C.gold},#C4956A)` : 'rgba(255,255,255,0.03)', color: sel ? '#000' : C.muted, boxShadow: sel ? `0 3px 10px rgba(201,168,76,0.3)` : 'none' }}>
                                {h}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : [
                      <div key="div" style={{ background: `1px solid ${C.border}`, borderRadius: 1 }} />,
                      <div key={label}>
                        <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700, marginBottom: 8 }}>{label}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                          {slots.map(h => {
                            const sel = selHours.includes(h)
                            return (
                              <button key={h} onClick={() => toggleHour(h)} className="hour-pill"
                                style={{ padding: '0.45rem 0', borderRadius: 8, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: sel ? 700 : 400, cursor: 'pointer', transition: 'all .15s', border: sel ? 'none' : `1px solid rgba(201,168,76,0.1)`, background: sel ? `linear-gradient(135deg,${C.gold},#C4956A)` : 'rgba(201,168,76,0.03)', color: sel ? '#000' : C.muted, boxShadow: sel ? `0 3px 10px rgba(201,168,76,0.3)` : 'none' }}>
                                {h}
                              </button>
                            )
                          })}
                        </div>
                      </div>,
                    ])}
                  </div>

                  <div style={{ display: 'flex', gap: '0.625rem' }}>
                    <button onClick={closeModal} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={saveHours} disabled={saving}
                      style={{ flex: 1.4, padding: '0.65rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.5 : 1 }}>
                      {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <><Clock size={13} /> Save {selHours.length > 0 ? `(${selHours.length} slot${selHours.length !== 1 ? 's' : ''})` : 'Hours'}</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
