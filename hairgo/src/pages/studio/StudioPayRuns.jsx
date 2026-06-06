import { useState, useEffect, useMemo } from 'react'
import { Search, Check, ChevronDown, ChevronLeft, ChevronRight, Edit2, X, BarChart2, Users, ArrowLeft, ArrowRight, Clock, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getOrFetch, invalidate } from '../../lib/cache'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay,
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  differenceInMinutes, isSameDay, isSameWeek, isSameMonth, isToday,
} from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  green: '#34d399', greenBg: 'rgba(52,211,153,0.1)', greenBorder: 'rgba(52,211,153,0.2)',
  red: '#f87171', redBg: 'rgba(248,113,113,0.1)', redBorder: 'rgba(248,113,113,0.22)',
  purple: '#a78bfa', purpleBg: 'rgba(167,139,250,0.1)', purpleBorder: 'rgba(167,139,250,0.2)',
}

const MODES = ['daily', 'weekly', 'monthly']

function getModeDates(mode, anchor) {
  switch (mode) {
    case 'daily':   return { start: startOfDay(anchor),   end: endOfDay(anchor)   }
    case 'weekly':  return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) }
    case 'monthly': return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
    default:        return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
  }
}

function stepAnchor(mode, anchor, dir) {
  switch (mode) {
    case 'daily':   return dir > 0 ? addDays(anchor, 1)   : subDays(anchor, 1)
    case 'weekly':  return dir > 0 ? addWeeks(anchor, 1)  : subWeeks(anchor, 1)
    case 'monthly': return dir > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1)
    default:        return anchor
  }
}

function formatRange(mode, start, end) {
  switch (mode) {
    case 'daily':   return format(start, 'EEEE, MMM d, yyyy')
    case 'weekly':  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    case 'monthly': return format(start, 'MMMM yyyy')
    default:        return ''
  }
}

function fmtMins(mins) {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const fmt  = n => `€${n.toFixed(2)}`
const COLS = '1.8fr 85px 70px 110px 85px 110px 95px 95px 120px'
const inp  = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.4rem 0.6rem 0.4rem 1.5rem', fontSize: '0.8rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', width: '100%', boxSizing: 'border-box', transition: 'border-color .2s' }

export default function StudioPayRuns() {
  const [mode,             setMode]             = useState('monthly')
  const [anchor,           setAnchor]           = useState(new Date())
  const [showPicker,       setShowPicker]       = useState(false)
  const [pickerMonth,      setPickerMonth]      = useState(startOfMonth(new Date()))
  const [stylists,         setStylists]         = useState([])
  const [payRuns,          setPayRuns]          = useState([])
  const [timesheets,       setTimesheets]       = useState([])
  const [loading,          setLoading]          = useState(true)
  const [search,           setSearch]           = useState('')
  const [editing,          setEditing]          = useState(null)
  const [editVals,         setEditVals]         = useState({ tips: '0', commissions: '0', other: '0' })
  const [saving,           setSaving]           = useState(false)
  const [view,             setView]             = useState('general')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [mobilePage,       setMobilePage]       = useState(0)

  const { start, end } = getModeDates(mode, anchor)
  const cacheKey = `studio_payruns_${mode}_${format(start, 'yyyy-MM-dd')}`

  useEffect(() => { load() }, [mode, anchor])

  async function load() {
    setLoading(true)
    const [stys, runs, sheets] = await getOrFetch(cacheKey, async () => {
      const [{ data: stys }, { data: runs }, { data: sheets }] = await Promise.all([
        supabase.from('stylists').select('id, name, photo_url, hourly_rate').order('display_order'),
        supabase.from('pay_runs')
          .select('*')
          .lte('period_start', format(end,   'yyyy-MM-dd'))
          .gte('period_end',   format(start, 'yyyy-MM-dd')),
        supabase.from('timesheets')
          .select('stylist_id, clock_in, clock_out, break_minutes')
          .gte('clock_in', start.toISOString())
          .lte('clock_in', end.toISOString())
          .not('clock_out', 'is', null),
      ])
      return [stys || [], runs || [], sheets || []]
    }, 2 * 60_000)
    setStylists(stys)
    setPayRuns(runs)
    setTimesheets(sheets)
    setLoading(false)
  }

  function getRun(stylistId)  { return payRuns.find(r => r.stylist_id === stylistId) }

  function getNetMins(stylistId) {
    return timesheets
      .filter(t => t.stylist_id === stylistId)
      .reduce((acc, t) => {
        const raw = differenceInMinutes(new Date(t.clock_out), new Date(t.clock_in))
        return acc + Math.max(0, raw - (t.break_minutes || 0))
      }, 0)
  }

  function calcTotals(stylist) {
    const runs        = payRuns.filter(r => r.stylist_id === stylist.id)
    const netMins     = getNetMins(stylist.id)
    const rate        = parseFloat(stylist.hourly_rate) || 0
    const earnings    = (netMins / 60) * rate
    const tips        = runs.reduce((a, r) => a + (parseFloat(r.tips)        || 0), 0)
    const commissions = runs.reduce((a, r) => a + (parseFloat(r.commissions) || 0), 0)
    const other       = runs.reduce((a, r) => a + (parseFloat(r.other)       || 0), 0)
    const extras      = tips + commissions + other
    const total       = earnings + extras
    const paid        = runs.reduce((a, r) => a + (parseFloat(r.paid)        || 0), 0)
    return { netMins, rate, earnings, extras, tips, commissions, other, total, paid, toPay: Math.max(0, total - paid) }
  }

  function openEdit(stylist) {
    const run = getRun(stylist.id)
    setEditVals({ tips: String(run?.tips || 0), commissions: String(run?.commissions || 0), other: String(run?.other || 0) })
    setEditing(stylist.id)
  }

  async function saveExtras(stylist) {
    setSaving(true)
    const run    = getRun(stylist.id)
    const totals = calcTotals(stylist)
    const extras = { tips: parseFloat(editVals.tips) || 0, commissions: parseFloat(editVals.commissions) || 0, other: parseFloat(editVals.other) || 0 }
    const payload = { stylist_id: stylist.id, period_start: format(start, 'yyyy-MM-dd'), period_end: format(end, 'yyyy-MM-dd'), earnings: totals.earnings, ...extras, paid: parseFloat(run?.paid) || 0 }
    const { error } = run
      ? await supabase.from('pay_runs').update(extras).eq('id', run.id)
      : await supabase.from('pay_runs').insert(payload)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Extras saved')
    setEditing(null)
    invalidate(cacheKey); load()
  }

  async function markPaid(stylist) {
    const run    = getRun(stylist.id)
    const totals = calcTotals(stylist)
    if (totals.total === 0) return toast.error('No hours logged or no hourly rate set')
    const payload = { stylist_id: stylist.id, period_start: format(start, 'yyyy-MM-dd'), period_end: format(end, 'yyyy-MM-dd'), earnings: totals.earnings, tips: totals.tips, commissions: totals.commissions, other: totals.other, paid: totals.total }
    const { error } = run
      ? await supabase.from('pay_runs').update({ paid: totals.total }).eq('id', run.id)
      : await supabase.from('pay_runs').insert(payload)
    if (error) return toast.error(error.message)
    toast.success(`${stylist.name} marked as fully paid`)
    invalidate(cacheKey); load()
  }

  const summary = useMemo(() => {
    const t = stylists.map(s => calcTotals(s))
    return {
      earnings: t.reduce((a, x) => a + x.earnings, 0),
      extras:   t.reduce((a, x) => a + x.extras,   0),
      total:    t.reduce((a, x) => a + x.total,     0),
      paid:     t.reduce((a, x) => a + x.paid,      0),
      toPay:    t.reduce((a, x) => a + x.toPay,     0),
    }
  }, [stylists, payRuns, timesheets])

  const filtered = stylists.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        .pr-row:hover        { background: rgba(255,255,255,0.02); }
        .pr-pay:hover        { background: rgba(52,211,153,0.18) !important; }
        .m-inp:focus         { border-color: ${C.goldBorder} !important; }
        .pr-edit:hover       { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .pr-back:hover       { background: rgba(255,255,255,0.06) !important; color: ${C.white} !important; }
        .pr-emp-card:hover   { border-color: ${C.goldBorder} !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .pr-nav-btn:hover    { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .pr-date-btn:hover   { background: rgba(255,255,255,0.05) !important; }
        .pr-mode-btn:hover   { color: ${C.dim} !important; }
        .pr-picker-week:hover { background: rgba(201,168,76,0.1) !important; border-color: rgba(201,168,76,0.15) !important; }
        .pr-picker-day:hover  { background: rgba(255,255,255,0.06) !important; }
        .pr-picker-month:hover { background: rgba(255,255,255,0.06) !important; }
        .pr-mobile-cards   { display: none; }
        @media (max-width: 767px) {
          .pr-stats          { grid-template-columns: repeat(3, 1fr) !important; }
          .pr-desktop-table  { display: none !important; }
          .pr-mobile-cards   { display: flex !important; }
          .pr-emp-grid       { grid-template-columns: 1fr 1fr !important; }
          .pr-tab-inner      { flex-direction: column !important; gap: 3px !important; }
          .pr-tab-desc       { display: none !important; }
          .pr-gen-main       { flex-direction: column !important; }
          .pr-gen-status     { width: auto !important; }
          .pr-settled-list   { flex-direction: row !important; flex-wrap: wrap !important; overflow: hidden !important; gap: 4px !important; }
          .pr-settled-chip   { flex: none !important; }
          .pr-settled-amt    { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}` }}>
        {selectedEmployee ? (
          <div>
            <button onClick={() => setSelectedEmployee(null)} className="pr-back"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.75rem', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', marginBottom: '0.75rem' }}>
              <ArrowLeft size={12} /> All Employees
            </button>
            {(() => {
              const t = calcTotals(selectedEmployee)
              const isPaid = t.total > 0 && t.toPay === 0
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', background: C.card, border: `1px solid ${isPaid ? C.greenBorder : t.toPay > 0 ? C.redBorder : C.border}`, borderRadius: 16, padding: '0.75rem 1rem' }}>
                  {selectedEmployee.photo_url
                    ? <img src={selectedEmployee.photo_url} alt={selectedEmployee.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${isPaid ? C.green : t.toPay > 0 ? C.red : C.border}`, flexShrink: 0 }} />
                    : <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.goldBg, border: `2px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: C.gold, fontSize: 20, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{selectedEmployee.name[0]}</span>
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.2rem,2vw,1.6rem)', color: C.white, lineHeight: 1.1, margin: 0 }}>{selectedEmployee.name}</h1>
                    <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', marginTop: 3, marginBottom: 0 }}>
                      {selectedEmployee.hourly_rate ? `€${parseFloat(selectedEmployee.hourly_rate).toFixed(2)}/h` : 'No rate set'}
                      {' · '}{formatRange(mode, start, end)}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{ color: t.total > 0 ? C.white : C.muted, fontSize: '1.1rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{fmt(t.total)}</p>
                    {isPaid
                      ? <span style={{ fontSize: 10, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>✓ Settled</span>
                      : t.toPay > 0
                        ? <span style={{ fontSize: 10, color: C.red, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmt(t.toPay)} owed</span>
                        : <span style={{ fontSize: 10, color: C.muted, fontFamily: 'Jost,sans-serif' }}>no hours</span>
                    }
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <>
            <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Team</p>
            <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', color: C.white, lineHeight: 1.1 }}>Pay Runs</h1>
            <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', marginTop: 3 }}>Auto-calculated from timesheet hours × hourly rate</p>
          </>
        )}
      </div>

      {/* ── View toggle (hidden on employee detail) ── */}
      {!selectedEmployee && (
        <div style={{ flexShrink: 0, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14, padding: 4 }}>
          {[
            { key: 'general',  label: 'General Infos',  Icon: BarChart2, desc: 'Overview & payroll'  },
            { key: 'employee', label: 'Employee Infos', Icon: Users,     desc: 'Per-person details'  },
          ].map(({ key, label, Icon, desc }) => (
            <button key={key} onClick={() => setView(key)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.7rem 1rem', borderRadius: 10, background: view === key ? C.card : 'transparent', border: `1px solid ${view === key ? C.goldBorder : 'transparent'}`, cursor: 'pointer', transition: 'all .2s' }}
              className="pr-tab-inner">
              <Icon size={16} style={{ color: view === key ? C.gold : C.muted, flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: view === key ? C.white : C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: view === key ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</div>
                <div className="pr-tab-desc" style={{ fontSize: 9, color: view === key ? C.goldDim : 'rgba(255,255,255,0.12)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.04em', marginTop: 1 }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Mode tabs (Daily / Weekly / Monthly) — hidden on employee list ── */}
      {(view === 'general' || selectedEmployee) && <div style={{ flexShrink: 0, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14, padding: 4 }}>
        {MODES.map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: 10, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: mode === m ? 600 : 400, letterSpacing: '0.06em', textTransform: 'capitalize', cursor: 'pointer', transition: 'all .2s', background: mode === m ? C.card : 'transparent', border: `1px solid ${mode === m ? C.goldBorder : 'transparent'}`, color: mode === m ? C.gold : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            className="pr-mode-btn">
            {m === 'daily' && <CalendarDays size={14} />}
            {m === 'weekly' && <Clock size={14} />}
            {m === 'monthly' && <BarChart2 size={14} />}
            {m}
          </button>
        ))}
      </div>}

      {/* ── Date navigator (arrows + calendar picker) — hidden on employee list ── */}
      {(view === 'general' || selectedEmployee) && <div style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0.5rem 0.625rem' }}>
          <button onClick={() => setAnchor(a => stepAnchor(mode, a, -1))} className="pr-nav-btn"
            style={{ width: 32, height: 32, borderRadius: 9, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}>
            <ChevronLeft size={15} />
          </button>

          <button onClick={() => { setShowPicker(p => !p); setPickerMonth(startOfMonth(anchor)) }} className="pr-date-btn"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem 0.5rem', borderRadius: 10, transition: 'background .15s' }}>
            <CalendarDays size={14} style={{ color: C.goldDim, flexShrink: 0 }} />
            <span style={{ fontSize: '0.88rem', color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {formatRange(mode, start, end)}
            </span>
          </button>

          <button onClick={() => setAnchor(a => stepAnchor(mode, a, 1))} className="pr-nav-btn"
            style={{ width: 32, height: 32, borderRadius: 9, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}>
            <ChevronRight size={15} />
          </button>

          <button onClick={() => setAnchor(new Date())} className="pr-nav-btn"
            style={{ height: 32, padding: '0 10px', borderRadius: 9, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all .15s', flexShrink: 0, whiteSpace: 'nowrap' }}>
            Today
          </button>
        </div>

        {/* Calendar picker backdrop */}
        {showPicker && <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}

        {/* Calendar picker */}
        {showPicker && (() => {
          const gridStart  = startOfWeek(startOfMonth(pickerMonth), { weekStartsOn: 1 })
          const pickerDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
          const pickerWeeks = Array.from({ length: 6 }, (_, i) => pickerDays.slice(i * 7, (i + 1) * 7))
          return (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50, background: '#1b1b27', border: `1px solid ${C.border}`, borderRadius: 14, padding: '1rem', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="pr-nav-btn"
                  style={{ width: 28, height: 28, borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
                  <ChevronLeft size={13} />
                </button>
                <span style={{ color: C.white, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem', fontWeight: 600 }}>
                  {format(pickerMonth, 'MMMM yyyy')}
                </span>
                <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="pr-nav-btn"
                  style={{ width: 28, height: 28, borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Day headers */}
              {mode !== 'monthly' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.25rem' }}>
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.08em', padding: '3px 0', textTransform: 'uppercase' }}>{d}</div>
                  ))}
                </div>
              )}

              {/* Calendar rows */}
              {mode === 'daily' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {pickerDays.map((day, i) => {
                    const selected = isSameDay(day, anchor)
                    return (
                      <button key={i} onClick={() => { setAnchor(day); setShowPicker(false) }}
                        className="pr-picker-day"
                        style={{ textAlign: 'center', padding: '7px 0', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', borderRadius: 8, cursor: 'pointer', transition: 'all .15s', border: selected ? `1px solid rgba(201,168,76,0.4)` : '1px solid transparent', background: selected ? 'rgba(201,168,76,0.15)' : 'transparent', color: !isSameMonth(day, pickerMonth) ? 'rgba(255,255,255,0.15)' : isToday(day) ? C.gold : selected ? 'rgba(201,168,76,0.9)' : C.white, fontWeight: isToday(day) ? 700 : 400 }}>
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>
              ) : mode === 'weekly' ? (
                pickerWeeks.map((wk, wi) => {
                  const selected = isSameWeek(wk[0], anchor, { weekStartsOn: 1 })
                  return (
                    <div key={wi} className="pr-picker-week"
                      onClick={() => { setAnchor(wk[0]); setShowPicker(false) }}
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderRadius: 9, cursor: 'pointer', marginBottom: 2, transition: 'all .15s', background: selected ? 'rgba(201,168,76,0.12)' : 'transparent', border: selected ? `1px solid rgba(201,168,76,0.25)` : '1px solid transparent' }}>
                      {wk.map((day, di) => (
                        <div key={di} style={{ textAlign: 'center', padding: '7px 0', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif',
                          color: !isSameMonth(day, pickerMonth) ? 'rgba(255,255,255,0.15)' : isToday(day) ? C.gold : selected ? 'rgba(201,168,76,0.9)' : C.white,
                          fontWeight: isToday(day) ? 700 : 400 }}>
                          {format(day, 'd')}
                        </div>
                      ))}
                    </div>
                  )
                })
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = new Date(pickerMonth.getFullYear(), i, 1)
                    const selected = isSameMonth(m, anchor)
                    return (
                      <button key={i} onClick={() => { setAnchor(m); setShowPicker(false) }}
                        className="pr-picker-month"
                        style={{ padding: '0.6rem 0.4rem', borderRadius: 9, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: selected ? 600 : 400, cursor: 'pointer', transition: 'all .15s', background: selected ? 'rgba(201,168,76,0.12)' : 'transparent', border: selected ? `1px solid rgba(201,168,76,0.3)` : `1px solid ${C.border}`, color: selected ? C.gold : C.dim, textAlign: 'center' }}>
                        {format(m, 'MMM')}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>}

      {/* ════════════════════════════════════════════════════════
          GENERAL VIEW
      ════════════════════════════════════════════════════════ */}
      {view === 'general' && (
        <>
          {/* Compact 5-stat row */}
          <div className="pr-stats" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
            {[
              { label: 'Earnings', value: summary.earnings, color: C.gold,                               sub: 'Hrs × rate'  },
              { label: 'Extras',   value: summary.extras,   color: C.purple,                             sub: 'Tips + more' },
              { label: 'Total',    value: summary.total,    color: C.white,                              sub: 'Gross pay'   },
              { label: 'Paid',     value: summary.paid,     color: C.green,                              sub: 'Settled'     },
              { label: 'To Pay',   value: summary.toPay,    color: summary.toPay > 0 ? C.red : C.muted, sub: 'Outstanding' },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${s.label === 'Paid' ? C.greenBorder : s.label === 'To Pay' && summary.toPay > 0 ? C.redBorder : C.border}`, borderRadius: 11, padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                <div className="font-display" style={{ fontSize: 'clamp(0.88rem,1.3vw,1.2rem)', color: s.color, lineHeight: 1, marginBottom: '0.18rem' }}>{loading ? '—' : fmt(s.value)}</div>
                <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Main: To Pay (left) + Settled (right) */}
          <div className="pr-gen-main" style={{ flex: 1, minHeight: 0, display: 'flex', gap: '0.625rem' }}>

            {/* To Pay card */}
            <div style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                <Clock size={14} style={{ color: C.red }} />
                <span style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>To Pay</span>
                {!loading && (() => {
                  const n = filtered.filter(s => calcTotals(s).toPay > 0).length
                  return n > 0
                    ? <span style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 99, padding: '1px 8px', fontSize: 9, color: C.red, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{n} pending</span>
                    : <span style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 99, padding: '1px 8px', fontSize: 9, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>all clear</span>
                })()}
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ background: C.subtle, borderRadius: 11, padding: '0.75rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 10, borderRadius: 4, width: '50%', background: 'rgba(255,255,255,0.07)' }} />
                        <div style={{ height: 8, borderRadius: 4, width: '35%', background: 'rgba(255,255,255,0.05)' }} />
                      </div>
                      <div style={{ width: 52, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                    </div>
                  ))
                ) : (() => {
                  const unpaid = filtered.map(s => ({ stylist: s, totals: calcTotals(s) })).filter(({ totals }) => totals.toPay > 0)
                  if (unpaid.length === 0) return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Check size={28} style={{ color: C.green, opacity: 0.6 }} />
                      <p style={{ color: C.green, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, margin: 0, opacity: 0.8 }}>All payments settled</p>
                      <p style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif', margin: 0 }}>Nothing to pay right now</p>
                    </div>
                  )
                  return unpaid.map(({ stylist, totals }) => (
                    <div key={stylist.id} style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 11, padding: '0.65rem 0.875rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {stylist.photo_url
                        ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1px solid ${C.redBorder}`, flexShrink: 0 }} />
                        : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(248,113,113,0.12)', border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: C.red, fontSize: 14, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                          </div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stylist.name}</p>
                        <p style={{ color: C.muted, fontSize: '0.67rem', fontFamily: 'Jost,sans-serif', margin: 0, lineHeight: 1.3 }}>
                          {totals.netMins > 0 ? fmtMins(totals.netMins) : '0h'}{stylist.hourly_rate ? ` × €${parseFloat(stylist.hourly_rate).toFixed(0)}/h` : ''}
                          {totals.extras > 0 && <span style={{ color: C.purple }}>{` + €${totals.extras.toFixed(0)} extras`}</span>}
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <p style={{ color: C.red, fontSize: '0.95rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{fmt(totals.toPay)}</p>
                        <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif' }}>owed</span>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Settled column */}
            <div className="pr-gen-status" style={{ width: 192, flexShrink: 0, display: 'flex', flexDirection: 'column', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1rem', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.625rem' }}>
                <Check size={14} style={{ color: C.green }} />
                <span style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Settled</span>
                {!loading && (() => {
                  const n = filtered.filter(s => { const t = calcTotals(s); return t.total > 0 && t.toPay === 0 }).length
                  return n > 0 && <span style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 99, padding: '1px 7px', fontSize: 9, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{n}</span>
                })()}
              </div>
              <div className="pr-settled-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 28, borderRadius: 7, background: C.subtle, flexShrink: 0 }} />)
                ) : (() => {
                  const settled = filtered.filter(s => { const t = calcTotals(s); return t.total > 0 && t.toPay === 0 }).map(s => ({ stylist: s, totals: calcTotals(s) }))
                  if (settled.length === 0) return (
                    <p style={{ color: C.muted, fontSize: '0.7rem', fontFamily: 'Jost,sans-serif', margin: 0 }}>No settled payments yet</p>
                  )
                  return settled.map(({ stylist, totals }) => (
                    <div key={stylist.id} className="pr-settled-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: '4px 8px', flexShrink: 0 }}>
                      {stylist.photo_url
                        ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1px solid ${C.greenBorder}`, flexShrink: 0 }} />
                        : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: C.green, fontSize: 9, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                          </div>
                      }
                      <span style={{ fontSize: '0.7rem', color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stylist.name.split(' ')[0]}</span>
                      <span className="pr-settled-amt" style={{ fontSize: '0.7rem', color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, flexShrink: 0 }}>{fmt(totals.total)}</span>
                      <Check size={9} style={{ color: C.green, flexShrink: 0 }} />
                    </div>
                  ))
                })()}
              </div>
            </div>

          </div>
        </>
      )}


      {/* ════════════════════════════════════════════════════════
          EMPLOYEE LIST VIEW
      ════════════════════════════════════════════════════════ */}
      {view === 'employee' && !selectedEmployee && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading ? (
            <div className="pr-emp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: C.subtle }} />
                  <div style={{ height: 12, borderRadius: 4, width: 80, background: C.subtle }} />
                  <div style={{ height: 9, borderRadius: 4, width: 55, background: C.subtle }} />
                  <div style={{ width: '100%', height: 44, borderRadius: 10, background: C.subtle }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="pr-emp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {stylists.map(stylist => {
                const totals = calcTotals(stylist)
                const isPaid = totals.total > 0 && totals.toPay === 0
                const noRate = !stylist.hourly_rate
                return (
                  <button key={stylist.id} onClick={() => { setSelectedEmployee(stylist); setMobilePage(0) }} className="pr-emp-card"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '1.5rem 1rem 1.25rem', borderRadius: 16, background: C.card, border: `1px solid ${isPaid ? C.greenBorder : totals.toPay > 0 ? C.redBorder : C.border}`, cursor: 'pointer', transition: 'all .2s', textAlign: 'center' }}>

                    {/* Avatar */}
                    <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                      {stylist.photo_url
                        ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${isPaid ? C.green : totals.toPay > 0 ? C.red : C.border}`, transition: 'border-color .2s' }} />
                        : <div style={{ width: 60, height: 60, borderRadius: '50%', background: C.goldBg, border: `2px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: C.gold, fontSize: 22, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                          </div>
                      }
                      {isPaid && (
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: C.green, border: `2px solid ${C.card}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={9} color="#000" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <p style={{ color: C.white, fontSize: '0.88rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, lineHeight: 1.2, marginBottom: 3 }}>{stylist.name}</p>
                    <p style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'Jost,sans-serif', marginBottom: '0.875rem' }}>
                      {totals.netMins > 0 ? fmtMins(totals.netMins) : 'No hours'}{stylist.hourly_rate ? ` · €${parseFloat(stylist.hourly_rate).toFixed(0)}/h` : ''}
                    </p>

                    {/* Amounts */}
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.6rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 7, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Total</div>
                        <div className="font-display" style={{ fontSize: '1rem', color: totals.total > 0 ? C.white : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>{fmt(totals.total)}</div>
                      </div>
                      <div style={{ width: 1, height: 28, background: C.border }} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 7, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>To Pay</div>
                        <div className="font-display" style={{ fontSize: '1rem', color: totals.toPay > 0 ? C.red : isPaid ? C.green : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>
                          {isPaid ? '✓ Paid' : fmt(totals.toPay)}
                        </div>
                      </div>
                    </div>

                    {noRate && (
                      <span style={{ marginTop: 8, fontSize: 8, padding: '2px 8px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontFamily: 'Jost,sans-serif', fontWeight: 700, textTransform: 'uppercase' }}>No rate set</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          EMPLOYEE DETAIL VIEW
      ════════════════════════════════════════════════════════ */}
      {view === 'employee' && selectedEmployee && (() => {
        const stylist   = stylists.find(s => s.id === selectedEmployee.id) || selectedEmployee
        const totals    = calcTotals(stylist)
        const isPaid    = totals.total > 0 && totals.toPay === 0
        const noRate    = !stylist.hourly_rate && totals.netMins > 0
        const isEditing = editing === stylist.id
        const empSheets = timesheets
          .filter(t => t.stylist_id === stylist.id)
          .sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in))
        return (
          <>
            {/* Financial stats */}
            <div className="pr-stats" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem' }}>
              {[
                { label: 'Earnings', value: totals.earnings, color: C.gold,                                sub: 'Hours × rate' },
                { label: 'Extras',   value: totals.extras,   color: C.purple,                              sub: 'Tips + more'  },
                { label: 'Total',    value: totals.total,    color: C.white,                               sub: 'Gross'        },
                { label: 'Paid',     value: totals.paid,     color: C.green,                               sub: 'Settled'      },
                { label: 'To Pay',   value: totals.toPay,    color: totals.toPay > 0 ? C.red : C.muted,   sub: 'Outstanding'  },
              ].map(s => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0.875rem 0.625rem', textAlign: 'center' }}>
                  <div className="font-display" style={{ fontSize: 'clamp(1rem,1.6vw,1.35rem)', color: s.color, lineHeight: 1, marginBottom: '0.2rem' }}>{fmt(s.value)}</div>
                  <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ flexShrink: 0, display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => isEditing ? setEditing(null) : openEdit(stylist)} className="pr-edit"
                style={{ padding: '0.6rem 1.25rem', borderRadius: 10, background: isEditing ? C.goldBg : C.subtle, border: `1px solid ${isEditing ? C.goldBorder : C.border}`, color: isEditing ? C.gold : C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}>
                {isEditing ? <X size={13} /> : <Edit2 size={13} />}{isEditing ? 'Close Extras' : '+ Add Extras'}
              </button>
              {totals.toPay > 0 && (
                <button onClick={() => markPaid(stylist)} className="pr-pay"
                  style={{ padding: '0.6rem 1.25rem', borderRadius: 10, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background .15s' }}>
                  <Check size={13} /> Mark as Paid — {fmt(totals.toPay)}
                </button>
              )}
            </div>

            {/* Extras edit panel */}
            {isEditing && (
              <div style={{ flexShrink: 0, padding: '1rem 1.25rem', background: 'rgba(201,168,76,0.04)', border: `1px solid ${C.goldBorder}`, borderRadius: 14 }}>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.875rem' }}>Extras for {stylist.name}</p>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {[['Tips', 'tips'], ['Commissions', 'commissions'], ['Other', 'other']].map(([label, key]) => (
                    <div key={key} style={{ minWidth: 140, flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 5 }}>{label}</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: C.goldDim, pointerEvents: 'none', fontFamily: 'Jost,sans-serif' }}>€</span>
                        <input type="number" min="0" step="0.01" value={editVals[key]} onChange={e => setEditVals(p => ({ ...p, [key]: e.target.value }))} className="m-inp" style={inp} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => saveExtras(stylist)} disabled={saving}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: 9, background: `linear-gradient(135deg,${C.gold},#C4956A)`, border: 'none', color: '#000', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, height: 38 }}>
                    <Check size={13} /> Save
                  </button>
                </div>
              </div>
            )}

            {/* Timesheet entries */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.625rem' }}>
                Timesheet Entries — {empSheets.length} {empSheets.length === 1 ? 'session' : 'sessions'}
              </p>

              {empSheets.length === 0 ? (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                  <Clock size={28} style={{ margin: '0 auto 0.6rem', color: C.border, display: 'block' }} />
                  <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No timesheet entries this period</p>
                </div>
              ) : (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  {/* Desktop */}
                  <div className="pr-desktop-table">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px 90px', padding: '0.6rem 1.25rem', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', gap: '0.5rem' }}>
                      {['Date', 'Clock In', 'Clock Out', 'Break', 'Net Hours'].map(h => (
                        <div key={h} style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, fontFamily: 'Jost,sans-serif' }}>{h}</div>
                      ))}
                    </div>
                    {empSheets.map((t, i) => {
                      const net = Math.max(0, differenceInMinutes(new Date(t.clock_out), new Date(t.clock_in)) - (t.break_minutes || 0))
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px 90px', padding: '0.75rem 1.25rem', borderBottom: i < empSheets.length - 1 ? `1px solid ${C.border}` : 'none', gap: '0.5rem', alignItems: 'center' }} className="pr-row">
                          <div style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>{format(new Date(t.clock_in), 'EEE, MMM d')}</div>
                          <div style={{ color: C.green, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{format(new Date(t.clock_in), 'HH:mm')}</div>
                          <div style={{ color: C.red, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{format(new Date(t.clock_out), 'HH:mm')}</div>
                          <div style={{ color: t.break_minutes ? C.goldDim : 'rgba(255,255,255,0.2)', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>{t.break_minutes ? `${t.break_minutes}m` : '—'}</div>
                          <div style={{ color: C.gold, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmtMins(net)}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Mobile — paginated, 2 per page, fixed height */}
                  <div className="pr-mobile-cards" style={{ flexDirection: 'column' }}>
                    {(() => {
                      const pageItems = empSheets.slice(mobilePage * 2, mobilePage * 2 + 2)
                      const slots = [...pageItems, ...Array(2 - pageItems.length).fill(null)]
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', height: 158 }}>
                          {slots.map((t, i) => (
                            <div key={i} style={{ flex: 1, borderBottom: i === 0 ? `1px solid ${C.border}` : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 1rem' }}>
                              {t ? (
                                <>
                                  <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.35rem' }}>{format(new Date(t.clock_in), 'EEE, MMM d')}</p>
                                  <div style={{ display: 'flex' }}>
                                    {[
                                      { label: 'In',    val: format(new Date(t.clock_in),  'HH:mm'), color: C.green },
                                      { label: 'Out',   val: format(new Date(t.clock_out), 'HH:mm'), color: C.red   },
                                      { label: 'Break', val: t.break_minutes ? `${t.break_minutes}m` : '—', color: t.break_minutes ? C.goldDim : 'rgba(255,255,255,0.2)' },
                                      { label: 'Net',   val: fmtMins(Math.max(0, differenceInMinutes(new Date(t.clock_out), new Date(t.clock_in)) - (t.break_minutes || 0))), color: C.gold },
                                    ].map(({ label, val, color }, idx, arr) => (
                                      <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                        <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                                        <div style={{ color, fontSize: '0.9rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{val}</div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    {/* Pagination */}
                    {empSheets.length > 2 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.875rem', borderTop: `1px solid ${C.border}` }}>
                        <button onClick={() => setMobilePage(p => Math.max(0, p - 1))} disabled={mobilePage === 0}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, background: mobilePage === 0 ? 'transparent' : C.subtle, border: `1px solid ${mobilePage === 0 ? 'transparent' : C.border}`, color: mobilePage === 0 ? 'rgba(255,255,255,0.15)' : C.muted, fontSize: '0.7rem', fontFamily: 'Jost,sans-serif', cursor: mobilePage === 0 ? 'default' : 'pointer' }}>
                          <ArrowLeft size={10} /> Prev
                        </button>
                        <span style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
                          {mobilePage * 2 + 1}–{Math.min(mobilePage * 2 + 2, empSheets.length)} of {empSheets.length}
                        </span>
                        <button onClick={() => setMobilePage(p => Math.min(Math.ceil(empSheets.length / 2) - 1, p + 1))} disabled={mobilePage >= Math.ceil(empSheets.length / 2) - 1}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, background: mobilePage >= Math.ceil(empSheets.length / 2) - 1 ? 'transparent' : C.subtle, border: `1px solid ${mobilePage >= Math.ceil(empSheets.length / 2) - 1 ? 'transparent' : C.border}`, color: mobilePage >= Math.ceil(empSheets.length / 2) - 1 ? 'rgba(255,255,255,0.15)' : C.muted, fontSize: '0.7rem', fontFamily: 'Jost,sans-serif', cursor: mobilePage >= Math.ceil(empSheets.length / 2) - 1 ? 'default' : 'pointer' }}>
                          Next <ArrowRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
