import { useState, useEffect, useMemo } from 'react'
import { Check, Edit2, X, ArrowLeft, Clock, ChevronRight, ChevronLeft, Info, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  format, differenceInMinutes,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth,
  addMonths, subMonths,
} from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  green: '#34d399', greenBg: 'rgba(52,211,153,0.1)', greenBorder: 'rgba(52,211,153,0.2)',
  red: '#f87171', redBg: 'rgba(248,113,113,0.1)', redBorder: 'rgba(248,113,113,0.22)',
}

const TABLE_PER_PAGE = 15
const TABLE_COLS = '1fr 58px 70px 66px 28px'

function fmtMins(mins) {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60), m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const fmt = n => `€${(n || 0).toFixed(2)}`
const inp = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.4rem 0.6rem 0.4rem 1.5rem', fontSize: '0.8rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', width: '100%', boxSizing: 'border-box', transition: 'border-color .2s' }

function sheetMins(t) {
  const raw = Math.max(0, differenceInMinutes(new Date(t.clock_out), new Date(t.clock_in)))
  return raw >= 360 ? raw - 45 : raw
}

// ── Session / Day info modal ──────────────────────────────────────
function SessionModal({ sessions, rate, onClose }) {
  if (!sessions || sessions.length === 0) return null
  const single      = sessions.length === 1
  const t0          = sessions[0]
  const totalMins   = sessions.reduce((a, t) => a + sheetMins(t), 0)
  const paidMins    = sessions.filter(t => t.paid_at).reduce((a, t) => a + sheetMins(t), 0)
  const totalEarned = (totalMins / 60) * rate
  const totalOwed   = ((totalMins - paidMins) / 60) * rate

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: '#18181f', border: `1px solid ${C.border}`, borderRadius: 18, width: '100%', maxWidth: 360, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, margin: '0 0 3px' }}>
                {single ? 'Session Details' : `${sessions.length} Sessions`}
              </p>
              <h3 style={{ margin: 0, color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 600, fontSize: '1rem' }}>
                {format(new Date(t0.clock_in), 'EEEE, MMM d, yyyy')}
              </h3>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: single ? '0.875rem' : '0.5rem' }}>
            {single ? (
              [
                ['Clock In',  format(new Date(t0.clock_in),  'HH:mm'), C.green ],
                ['Clock Out', format(new Date(t0.clock_out), 'HH:mm'), C.red   ],
                ['Break',     differenceInMinutes(new Date(t0.clock_out), new Date(t0.clock_in)) >= 360 ? '45m (auto)' : 'None', C.muted],
                ['Net Time',  fmtMins(sheetMins(t0)), C.gold ],
                ['Earned',    rate > 0 ? fmt((sheetMins(t0) / 60) * rate) : 'No rate set', C.white],
                ['Status',    t0.paid_at ? `Paid · ${format(new Date(t0.paid_at), 'MMM d, yyyy')}` : 'Unpaid', t0.paid_at ? C.green : C.red],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', color, fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{value}</span>
                </div>
              ))
            ) : (
              <>
                {sessions.map(t => {
                  const net  = sheetMins(t)
                  const earn = (net / 60) * rate
                  return (
                    <div key={t.id} style={{ padding: '0.6rem 0.875rem', borderRadius: 10, background: t.paid_at ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)', border: `1px solid ${t.paid_at ? C.greenBorder : C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <p style={{ margin: 0, color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>
                          {format(new Date(t.clock_in), 'HH:mm')} → {format(new Date(t.clock_out), 'HH:mm')}
                        </p>
                        <p style={{ margin: '2px 0 0', color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif' }}>
                          {fmtMins(net)}{t.break_minutes ? ` · ${t.break_minutes}m break` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{rate > 0 ? fmt(earn) : '—'}</p>
                        <span style={{ fontSize: 9, color: t.paid_at ? C.green : C.red, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{t.paid_at ? 'Paid' : 'Unpaid'}</span>
                      </div>
                    </div>
                  )
                })}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Day total</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmtMins(totalMins)}</span>
                    {rate > 0 && (
                      <span style={{ fontSize: '0.85rem', color: totalOwed > 0 ? C.red : C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                        {totalOwed > 0 ? `${fmt(totalOwed)} owed` : 'All paid'}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Simplified pay table row ──────────────────────────────────────
function PayRow({ t, rate, onInfo, last }) {
  const net  = sheetMins(t)
  const earn = (net / 60) * rate
  return (
    <div className="pr-row" style={{ display: 'grid', gridTemplateColumns: TABLE_COLS, padding: '0.65rem 1rem', borderBottom: last ? 'none' : `1px solid ${C.border}`, gap: '0.5rem', alignItems: 'center' }}>
      <div style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {format(new Date(t.clock_in), 'EEE, MMM d')}
      </div>
      <div style={{ color: C.gold, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{fmtMins(net)}</div>
      <div style={{ color: rate > 0 ? C.white : C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>
        {rate > 0 ? fmt(earn) : '—'}
      </div>
      <div>
        {t.paid_at
          ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>Paid</span>
          : <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: C.redBg,   border: `1px solid ${C.redBorder}`,   color: C.red,   fontFamily: 'Jost,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>Unpaid</span>
        }
      </div>
      <button onClick={() => onInfo(t)} className="pr-info-btn"
        style={{ width: 28, height: 28, borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'all .15s' }}>
        <Info size={12} />
      </button>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────
function Pagination({ page, total, onChange }) {
  const pages = []
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i)
  } else {
    pages.push(0)
    if (page > 2) pages.push(-1)
    for (let i = Math.max(1, page - 1); i <= Math.min(total - 2, page + 1); i++) pages.push(i)
    if (page < total - 3) pages.push(-2)
    pages.push(total - 1)
  }
  const nav = d => ({ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: d ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)', cursor: d ? 'not-allowed' : 'pointer', fontSize: '1rem', fontFamily: 'Jost,sans-serif', transition: 'all .15s' })
  const num = a => ({ minWidth: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', background: a ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${a ? 'rgba(201,168,76,0.3)' : C.border}`, color: a ? '#C9A84C' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: a ? 600 : 400, transition: 'all .15s' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0.25rem 0' }}>
      <button onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0} style={nav(page === 0)}>‹</button>
      {pages.map((p, i) =>
        p < 0
          ? <span key={`e${i}`} style={{ color: C.muted, fontSize: '0.78rem', padding: '0 2px', fontFamily: 'Jost,sans-serif' }}>…</span>
          : <button key={p} onClick={() => onChange(p)} style={num(p === page)}>{p + 1}</button>
      )}
      <button onClick={() => onChange(Math.min(total - 1, page + 1))} disabled={page === total - 1} style={nav(page === total - 1)}>›</button>
    </div>
  )
}

// ── Calendar view ─────────────────────────────────────────────────
function PayCalendar({ sheets, rate, calDate, setCalDate, onDayClick }) {
  const monthStart = startOfMonth(calDate)
  const monthEnd   = endOfMonth(calDate)
  const calDays    = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end:   endOfWeek(monthEnd,     { weekStartsOn: 1 }),
  })
  const weeks = []
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7))

  const monthSheets = sheets.filter(t => isSameMonth(new Date(t.clock_in), calDate))
  const monthMins   = monthSheets.reduce((a, t) => a + sheetMins(t), 0)
  const monthPaidM  = monthSheets.filter(t => t.paid_at).reduce((a, t) => a + sheetMins(t), 0)
  const monthEarned = (monthMins / 60) * rate
  const monthOwed   = ((monthMins - monthPaidM) / 60) * rate

  const nbtn = { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'all .15s' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <style>{`.cal-day:hover { background: rgba(255,255,255,0.045) !important; } .cal-nav:hover { color: ${C.white} !important; }`}</style>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button onClick={() => setCalDate(d => subMonths(d, 1))} style={nbtn} className="cal-nav"><ChevronLeft size={14} /></button>
        <span style={{ color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 600, fontSize: '0.92rem' }}>
          {format(calDate, 'MMMM yyyy')}
        </span>
        <button onClick={() => setCalDate(d => addMonths(d, 1))} style={nbtn} className="cal-nav"><ChevronRight size={14} /></button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(255,255,255,0.025)', borderBottom: `1px solid ${C.border}` }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ padding: '0.45rem 0.25rem', textAlign: 'center', fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => {
          const wSessions  = week.flatMap(d => sheets.filter(t => isSameDay(new Date(t.clock_in), d)))
          const wMins      = wSessions.reduce((a, t) => a + sheetMins(t), 0)
          const wPaidM     = wSessions.filter(t => t.paid_at).reduce((a, t) => a + sheetMins(t), 0)
          const wEarned    = (wMins / 60) * rate
          const wOwed      = ((wMins - wPaidM) / 60) * rate
          const wInMonth   = wSessions.some(t => isSameMonth(new Date(t.clock_in), calDate))
          const isLast     = wi === weeks.length - 1

          return (
            <div key={wi} style={{ borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((day, di) => {
                  const inMonth    = isSameMonth(day, calDate)
                  const daySess    = sheets.filter(t => isSameDay(new Date(t.clock_in), day))
                  const hasWork    = daySess.length > 0
                  const allPaid    = hasWork && daySess.every(t => t.paid_at)
                  const isActive   = inMonth && hasWork

                  return (
                    <div key={di}
                      onClick={() => isActive && onDayClick(daySess)}
                      className={isActive ? 'cal-day' : undefined}
                      style={{
                        padding: '0.55rem 0.25rem',
                        textAlign: 'center',
                        borderRight: di < 6 ? `1px solid ${C.border}` : 'none',
                        cursor: isActive ? 'pointer' : 'default',
                        background: isActive ? (allPaid ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)') : 'transparent',
                        opacity: inMonth ? 1 : 0.28,
                        transition: 'background .15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        minHeight: 46,
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', color: isActive ? C.white : C.muted, fontFamily: 'Jost,sans-serif', fontWeight: isActive ? 600 : 400, lineHeight: 1 }}>
                        {format(day, 'd')}
                      </span>
                      {isActive && (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: allPaid ? C.green : C.red, flexShrink: 0 }} />
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Week summary */}
              {wInMonth && wMins > 0 && (
                <div style={{ padding: '0.3rem 1rem', background: 'rgba(255,255,255,0.015)', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.22)', fontFamily: 'Jost,sans-serif' }}>This week</span>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif' }}>
                    <span style={{ color: C.gold }}>{fmtMins(wMins)}</span>
                    {rate > 0 && <span style={{ color: C.muted }}> · <span style={{ color: C.white }}>{fmt(wEarned)}</span></span>}
                    {wOwed > 0 && <span style={{ color: C.red }}> · {fmt(wOwed)} owed</span>}
                    {wOwed === 0 && wMins > 0 && <span style={{ color: C.green }}> · paid</span>}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Month summary — one row */}
      <div style={{ background: C.card, border: `1px solid ${monthOwed > 0 ? C.redBorder : monthMins > 0 ? C.greenBorder : C.border}`, borderRadius: 12, padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {format(calDate, 'MMM')} total
        </span>
        {monthMins === 0 ? (
          <span style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>No sessions this month</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmtMins(monthMins)}</span>
            {rate > 0 && <span style={{ fontSize: '0.85rem', color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{fmt(monthEarned)} earned</span>}
            {monthOwed > 0
              ? <span style={{ fontSize: '0.85rem', color: C.red, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmt(monthOwed)} owed</span>
              : <span style={{ fontSize: '0.85rem', color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>All paid ✓</span>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
export default function StudioPayRuns() {
  const [stylists,      setStylists]      = useState([])
  const [timesheets,    setTimesheets]    = useState([])
  const [payRuns,       setPayRuns]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [selected,      setSelected]      = useState(null)
  const [editing,       setEditing]       = useState(false)
  const [editVals,      setEditVals]      = useState({ tips: '0', commissions: '0', other: '0' })
  const [saving,        setSaving]        = useState(false)
  const [payModal,      setPayModal]      = useState(false)
  const [modalSelected, setModalSelected] = useState(new Set())
  // detail view tabs / filter
  const [activeTab,     setActiveTab]     = useState('calendar')
  const [unpaidOnly,    setUnpaidOnly]    = useState(false)
  const [page,          setPage]          = useState(0)
  const [infoModal,     setInfoModal]     = useState(null)
  const [calDate,       setCalDate]       = useState(new Date())

  useEffect(() => { load() }, [])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  // reset detail view state when switching employees
  useEffect(() => {
    setActiveTab('calendar'); setPage(0); setUnpaidOnly(false)
    setCalDate(new Date()); setInfoModal(null)
  }, [selected])

  async function load() {
    setLoading(true)
    setError(null)
    const [{ data: stys, error: e1 }, { data: sheets, error: e2 }, { data: runs, error: e3 }] = await Promise.all([
      supabase.from('stylists').select('id, name, photo_url, hourly_rate').not('profile_id', 'is', null).order('display_order'),
      supabase.from('timesheets')
        .select('id, stylist_id, clock_in, clock_out, break_minutes, paid_at')
        .not('clock_out', 'is', null)
        .order('clock_in', { ascending: false }),
      supabase.from('pay_runs').select('id, stylist_id, tips, commissions, other'),
    ])
    if (e1 || e2 || e3) { setError('Could not load pay data — check your connection.'); setLoading(false); return }
    setStylists(stys || [])
    setTimesheets(sheets || [])
    setPayRuns(runs || [])
    setLoading(false)
  }

  const totalsMap = useMemo(() => {
    const map = new Map()
    for (const stylist of stylists) {
      const sheets = timesheets.filter(t => t.stylist_id === stylist.id)
      const rate   = parseFloat(stylist.hourly_rate) || 0
      let allMins = 0, paidMins = 0
      for (const t of sheets) {
        const net = sheetMins(t); allMins += net
        if (t.paid_at) paidMins += net
      }
      const unpaidMins     = allMins - paidMins
      const allEarnings    = (allMins    / 60) * rate
      const paidEarnings   = (paidMins   / 60) * rate
      const unpaidEarnings = (unpaidMins / 60) * rate
      const runs        = payRuns.filter(r => r.stylist_id === stylist.id)
      const tips        = runs.reduce((a, r) => a + (parseFloat(r.tips)        || 0), 0)
      const commissions = runs.reduce((a, r) => a + (parseFloat(r.commissions) || 0), 0)
      const other       = runs.reduce((a, r) => a + (parseFloat(r.other)       || 0), 0)
      map.set(stylist.id, { allMins, paidMins, unpaidMins, allEarnings, paidEarnings, unpaidEarnings, extras: tips + commissions + other, tips, commissions, other, rate })
    }
    return map
  }, [stylists, timesheets, payRuns])

  function openPayModal(stylist) {
    const unpaid = timesheets.filter(t => t.stylist_id === stylist.id && !t.paid_at)
    setModalSelected(new Set(unpaid.map(t => t.id)))
    setPayModal(true)
  }

  async function markPaidSelected(stylist, ids) {
    if (ids.size === 0) return toast.error('Select at least one session')
    const arr  = [...ids]
    const mins = timesheets.filter(t => arr.includes(t.id)).reduce((a, t) => a + sheetMins(t), 0)
    const { error } = await supabase.from('timesheets').update({ paid_at: new Date().toISOString() }).in('id', arr)
    if (error) return toast.error(error.message)
    toast.success(`${stylist.name} — ${fmtMins(mins)} marked as paid`)
    setPayModal(false); setModalSelected(new Set()); load()
  }

  function openEdit(stylist) {
    const runs = payRuns.filter(r => r.stylist_id === stylist.id)
    setEditVals({
      tips:        String(runs.reduce((a, r) => a + (parseFloat(r.tips)        || 0), 0)),
      commissions: String(runs.reduce((a, r) => a + (parseFloat(r.commissions) || 0), 0)),
      other:       String(runs.reduce((a, r) => a + (parseFloat(r.other)       || 0), 0)),
    })
    setEditing(true)
  }

  async function saveExtras(stylist) {
    setSaving(true)
    const extras = { tips: parseFloat(editVals.tips) || 0, commissions: parseFloat(editVals.commissions) || 0, other: parseFloat(editVals.other) || 0 }
    await supabase.from('pay_runs').delete().eq('stylist_id', stylist.id)
    const { error } = await supabase.from('pay_runs').insert({ stylist_id: stylist.id, ...extras, period_start: format(new Date(), 'yyyy-MM-dd'), period_end: format(new Date(), 'yyyy-MM-dd'), earnings: 0 })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Extras saved'); setEditing(false); load()
  }

  const summary = useMemo(() => {
    if (loading) return { owed: 0, paid: 0, pending: 0 }
    let owed = 0, paid = 0, pending = 0
    for (const t of totalsMap.values()) {
      owed += t.unpaidEarnings
      paid += t.paidEarnings
      if (t.unpaidMins > 0) pending++
    }
    return { owed, paid, pending }
  }, [totalsMap, loading])

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <AlertCircle size={28} color={C.red} />
      <p style={{ color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{error}</p>
      <button onClick={load} style={{ padding: '0.4rem 1.25rem', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.white, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer' }}>Try again</button>
    </div>
  )

  // ── EMPLOYEE DETAIL ──────────────────────────────────────────────
  if (selected) {
    const stylist        = stylists.find(s => s.id === selected.id) || selected
    const totals         = totalsMap.get(stylist.id) ?? { allMins: 0, paidMins: 0, unpaidMins: 0, allEarnings: 0, paidEarnings: 0, unpaidEarnings: 0, extras: 0, rate: 0 }
    const rate           = parseFloat(stylist.hourly_rate) || 0
    const sheets         = timesheets.filter(t => t.stylist_id === stylist.id)
    const filteredSheets = unpaidOnly ? sheets.filter(t => !t.paid_at) : sheets
    const totalPages     = Math.max(1, Math.ceil(filteredSheets.length / TABLE_PER_PAGE))
    const visible        = filteredSheets.slice(page * TABLE_PER_PAGE, (page + 1) * TABLE_PER_PAGE)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', height: '100%' }}>
        <style>{`
          .pr-back:hover       { background: rgba(255,255,255,0.06) !important; color: ${C.white} !important; }
          .pr-pay:hover        { background: rgba(52,211,153,0.22) !important; }
          .pr-edit:hover       { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
          .pr-row:hover        { background: rgba(255,255,255,0.02) !important; }
          .pr-info-btn:hover   { background: rgba(255,255,255,0.08) !important; color: ${C.white} !important; }
          .pr-modal-row:hover  { background: rgba(52,211,153,0.1) !important; border-color: ${C.greenBorder} !important; }
          .pr-modal-pay:hover  { background: rgba(52,211,153,0.22) !important; }
          .m-inp:focus         { border-color: ${C.goldBorder} !important; }
        `}</style>

        {/* Back button */}
        <div style={{ flexShrink: 0 }}>
          <button onClick={() => { setSelected(null); setEditing(false) }} className="pr-back"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.75rem', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', marginBottom: '0.75rem' }}>
            <ArrowLeft size={12} /> All Employees
          </button>

          {/* Employee header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: C.card, border: `1px solid ${totals.unpaidMins > 0 ? C.redBorder : totals.allMins > 0 ? C.greenBorder : C.border}`, borderRadius: 16, padding: '1rem 1.25rem' }}>
            {stylist.photo_url
              ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${totals.unpaidMins > 0 ? C.red : totals.allMins > 0 ? C.green : C.border}`, flexShrink: 0 }} />
              : <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.goldBg, border: `2px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: C.gold, fontSize: 22, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{stylist.name}</h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
                {stylist.hourly_rate ? `€${parseFloat(stylist.hourly_rate).toFixed(2)}/h` : 'No rate set'}
                {totals.allMins > 0 && ` · ${fmtMins(totals.allMins)} worked`}
              </p>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              {totals.unpaidMins > 0 ? (
                <>
                  <p style={{ margin: 0, fontSize: '1.3rem', color: C.red, fontFamily: 'Jost,sans-serif', fontWeight: 700, lineHeight: 1.2 }}>{fmt(totals.unpaidEarnings)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: C.red, fontFamily: 'Jost,sans-serif', opacity: 0.75 }}>{fmtMins(totals.unpaidMins)} unpaid</p>
                </>
              ) : totals.allMins > 0 ? (
                <>
                  <p style={{ margin: 0, fontSize: '1rem', color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>✓ Settled</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{fmt(totals.paidEarnings)} paid</p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>No hours yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ flexShrink: 0, display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {totals.unpaidMins > 0 && (
            <button onClick={() => openPayModal(stylist)} className="pr-pay"
              style={{ padding: '0.65rem 1.5rem', borderRadius: 10, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background .15s' }}>
              <Check size={14} /> Pay artist — {fmt(totals.unpaidEarnings)} ({fmtMins(totals.unpaidMins)} unpaid)
            </button>
          )}
          <button onClick={() => editing ? setEditing(false) : openEdit(stylist)} className="pr-edit"
            style={{ padding: '0.65rem 1.25rem', borderRadius: 10, background: editing ? C.goldBg : C.subtle, border: `1px solid ${editing ? C.goldBorder : C.border}`, color: editing ? C.gold : C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
            {editing ? <X size={13} /> : <Edit2 size={13} />}{editing ? 'Close' : '+ Extras (tips, commissions)'}
          </button>
        </div>

        {/* Extras panel */}
        {editing && (
          <div style={{ flexShrink: 0, padding: '1rem 1.25rem', background: 'rgba(201,168,76,0.04)', border: `1px solid ${C.goldBorder}`, borderRadius: 14 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.75rem' }}>Extras for {stylist.name} — cumulative</p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {[['Tips', 'tips'], ['Commissions', 'commissions'], ['Other', 'other']].map(([label, key]) => (
                <div key={key} style={{ minWidth: 130, flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 5 }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: C.goldDim, pointerEvents: 'none', fontFamily: 'Jost,sans-serif' }}>€</span>
                    <input type="number" min="0" step="0.01" value={editVals[key]} onChange={e => setEditVals(p => ({ ...p, [key]: e.target.value }))} className="m-inp" style={inp} />
                  </div>
                </div>
              ))}
              <button onClick={() => saveExtras(stylist)} disabled={saving}
                style={{ padding: '0.5rem 1.25rem', borderRadius: 9, background: `linear-gradient(135deg,${C.gold},#C4956A)`, border: 'none', color: '#000', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, height: 38, flexShrink: 0 }}>
                <Check size={13} /> Save
              </button>
            </div>
          </div>
        )}

        {/* Tab switcher: Table | Calendar */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 3, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 3 }}>
          {[['calendar', 'Calendar'], ['table', 'Table']].map(([key, label]) => (
            <button key={key} onClick={() => { setActiveTab(key); setPage(0) }}
              style={{ flex: 1, padding: '0.42rem 0.625rem', borderRadius: 8, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', fontWeight: activeTab === key ? 600 : 400, cursor: 'pointer', background: activeTab === key ? 'rgba(201,168,76,0.1)' : 'transparent', color: activeTab === key ? '#C9A84C' : C.muted, border: `1px solid ${activeTab === key ? 'rgba(201,168,76,0.22)' : 'transparent'}`, transition: 'all .18s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── TABLE TAB ── */}
        {activeTab === 'table' && (
          <>
            {/* Unpaid filter + count */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => { setUnpaidOnly(v => !v); setPage(0) }}
                style={{ padding: '0.32rem 0.875rem', borderRadius: 8, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', background: unpaidOnly ? C.redBg : C.subtle, border: `1px solid ${unpaidOnly ? C.redBorder : C.border}`, color: unpaidOnly ? C.red : C.muted, transition: 'all .15s' }}>
                {unpaidOnly ? '✕ Unpaid only' : 'Unpaid only'}
              </button>
              <span style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
                {filteredSheets.length} session{filteredSheets.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            {filteredSheets.length === 0 ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                <Clock size={28} style={{ margin: '0 auto 0.6rem', color: C.border, display: 'block' }} />
                <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', margin: 0 }}>
                  {unpaidOnly ? 'No unpaid sessions — all settled ✓' : 'No sessions recorded yet'}
                </p>
              </div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: TABLE_COLS, padding: '0.55rem 1rem', background: 'rgba(255,255,255,0.025)', borderBottom: `1px solid ${C.border}`, gap: '0.5rem' }}>
                  {['Date', 'Hours', 'Earned', 'Status', ''].map(h => (
                    <div key={h} style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{h}</div>
                  ))}
                </div>
                {visible.map((t, i) => (
                  <PayRow key={t.id} t={t} rate={rate} last={i === visible.length - 1} onInfo={t => setInfoModal([t])} />
                ))}
              </div>
            )}

            {totalPages > 1 && filteredSheets.length > 0 && (
              <Pagination page={page} total={totalPages} onChange={setPage} />
            )}
          </>
        )}

        {/* ── CALENDAR TAB ── */}
        {activeTab === 'calendar' && (
          <PayCalendar
            sheets={sheets}
            rate={rate}
            calDate={calDate}
            setCalDate={setCalDate}
            onDayClick={sessions => setInfoModal(sessions)}
          />
        )}

        {/* Session info modal */}
        {infoModal && <SessionModal sessions={infoModal} rate={rate} onClose={() => setInfoModal(null)} />}

        {/* ── Pay modal ── */}
        {payModal && (() => {
          const unpaidSheets = timesheets.filter(t => t.stylist_id === stylist.id && !t.paid_at).sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in))
          const allSelected  = unpaidSheets.length > 0 && unpaidSheets.every(t => modalSelected.has(t.id))
          const selectedMins = timesheets.filter(t => modalSelected.has(t.id)).reduce((a, t) => a + sheetMins(t), 0)
          const selectedAmt  = (selectedMins / 60) * rate
          return (
            <>
              <div onClick={() => setPayModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} />
              <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#18181f', border: `1px solid ${C.border}`, borderRadius: 18, width: '100%', maxWidth: 540, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, margin: '0 0 3px' }}>Pay Sessions</p>
                      <h3 style={{ margin: 0, color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 600, fontSize: '1rem' }}>{stylist.name}</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setModalSelected(allSelected ? new Set() : new Set(unpaidSheets.map(t => t.id)))}
                        style={{ padding: '0.35rem 0.875rem', borderRadius: 8, background: allSelected ? C.greenBg : C.subtle, border: `1px solid ${allSelected ? C.greenBorder : C.border}`, color: allSelected ? C.green : C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                      <button onClick={() => setPayModal(false)} style={{ width: 30, height: 30, borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {unpaidSheets.length === 0
                      ? <p style={{ color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0', margin: 0 }}>No unpaid sessions</p>
                      : unpaidSheets.map(t => {
                          const net = sheetMins(t), earn = (net / 60) * rate, isOn = modalSelected.has(t.id)
                          return (
                            <div key={t.id} onClick={() => setModalSelected(prev => { const n = new Set(prev); isOn ? n.delete(t.id) : n.add(t.id); return n })}
                              className="pr-modal-row"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', borderRadius: 12, background: isOn ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isOn ? C.greenBorder : C.border}`, cursor: 'pointer', transition: 'all .15s', userSelect: 'none' }}>
                              <div style={{ width: 18, height: 18, borderRadius: 5, background: isOn ? C.green : 'transparent', border: `2px solid ${isOn ? C.green : C.muted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                {isOn && <Check size={11} color="#000" strokeWidth={3} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{format(new Date(t.clock_in), 'EEEE, MMM d, yyyy')}</p>
                                <p style={{ margin: '2px 0 0', color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif' }}>
                                  {format(new Date(t.clock_in), 'HH:mm')} → {format(new Date(t.clock_out), 'HH:mm')}{t.break_minutes ? ` · ${t.break_minutes}m break` : ''}{' · '}{fmtMins(net)}
                                </p>
                              </div>
                              <p style={{ margin: 0, color: isOn ? C.green : C.muted, fontSize: '0.9rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, flexShrink: 0, transition: 'color .15s' }}>{rate > 0 ? fmt(earn) : '—'}</p>
                            </div>
                          )
                        })
                    }
                  </div>
                  <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
                    <p style={{ margin: 0, color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>
                      {modalSelected.size} session{modalSelected.size !== 1 ? 's' : ''} · <span style={{ color: C.green, fontWeight: 600 }}>{fmt(selectedAmt)}</span>
                    </p>
                    <button onClick={() => markPaidSelected(stylist, modalSelected)} disabled={modalSelected.size === 0}
                      className="pr-modal-pay"
                      style={{ padding: '0.6rem 1.5rem', borderRadius: 10, background: modalSelected.size > 0 ? C.greenBg : C.subtle, border: `1px solid ${modalSelected.size > 0 ? C.greenBorder : C.border}`, color: modalSelected.size > 0 ? C.green : C.muted, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: modalSelected.size > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s', flexShrink: 0 }}>
                      <Check size={14} />
                      {modalSelected.size > 0 ? `Pay ${modalSelected.size} — ${fmt(selectedAmt)}` : 'Pay selected'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        })()}
      </div>
    )
  }

  // ── EMPLOYEE LIST ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`.pr-emp-row:hover { background: rgba(255,255,255,0.025) !important; }`}</style>
      <div style={{ flexShrink: 0 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, margin: 0 }}>Team</p>
        <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', color: C.white, lineHeight: 1.1, margin: '2px 0 4px' }}>Pay Runs</h1>
        <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', margin: 0 }}>Hours × rate · per session tracking</p>
      </div>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
        {[
          { label: 'Total Owed', value: fmt(summary.owed), color: summary.owed > 0 ? C.red  : C.muted, border: summary.owed > 0 ? C.redBorder  : C.border },
          { label: 'Total Paid', value: fmt(summary.paid), color: C.green, border: C.greenBorder },
          { label: 'Pending',    value: `${summary.pending} employee${summary.pending !== 1 ? 's' : ''}`, color: summary.pending > 0 ? C.gold : C.muted, border: summary.pending > 0 ? C.goldBorder : C.border },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: '0.75rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(0.9rem,1.5vw,1.2rem)', color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.subtle, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ height: 11, width: '35%', borderRadius: 4, background: C.subtle }} />
                <div style={{ height: 8,  width: '22%', borderRadius: 4, background: C.subtle }} />
              </div>
              <div style={{ width: 60, height: 20, borderRadius: 8, background: C.subtle, flexShrink: 0 }} />
            </div>
          ))
        ) : stylists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: C.muted, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem' }}>No stylists found</div>
        ) : (
          stylists.map(stylist => {
            const totals  = totalsMap.get(stylist.id) ?? { allMins: 0, paidMins: 0, unpaidMins: 0, allEarnings: 0, paidEarnings: 0, unpaidEarnings: 0, extras: 0, rate: 0 }
            const isPaid  = totals.allMins > 0 && totals.unpaidMins === 0
            const noHours = totals.allMins === 0
            return (
              <div key={stylist.id} onClick={() => setSelected(stylist)} className="pr-emp-row"
                style={{ background: C.card, border: `1px solid ${isPaid ? C.greenBorder : totals.unpaidMins > 0 ? C.redBorder : C.border}`, borderRadius: 14, padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'background .15s' }}>
                {stylist.photo_url
                  ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${isPaid ? C.green : totals.unpaidMins > 0 ? C.red : C.border}`, flexShrink: 0 }} />
                  : <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.goldBg, border: `2px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: C.gold, fontSize: 16, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: C.white, fontSize: '0.88rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, lineHeight: 1.3 }}>{stylist.name}</p>
                  <p style={{ margin: '2px 0 0', color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif' }}>
                    {noHours ? 'No hours recorded' : `${fmtMins(totals.allMins)} total · ${fmtMins(totals.paidMins)} paid`}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {noHours ? (
                    <span style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>No sessions</span>
                  ) : isPaid ? (
                    <span style={{ fontSize: '0.78rem', color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Settled</span>
                  ) : (
                    <div>
                      <p style={{ margin: 0, color: C.red, fontSize: '1rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{fmt(totals.unpaidEarnings)}</p>
                      <p style={{ margin: '1px 0 0', color: C.red, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif', opacity: 0.75 }}>{fmtMins(totals.unpaidMins)} unpaid</p>
                    </div>
                  )}
                </div>
                <ChevronRight size={14} style={{ color: C.muted, flexShrink: 0 }} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
