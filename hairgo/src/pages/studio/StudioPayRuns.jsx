import { useState, useEffect, useMemo } from 'react'
import { Search, Check, ChevronDown, Edit2, X, BarChart2, Users, ArrowLeft, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getOrFetch, invalidate } from '../../lib/cache'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, differenceInMinutes,
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

const PERIODS = [
  { key: 'all_time',   label: 'All Time'   },
  { key: 'this_week',  label: 'This Week'  },
  { key: 'last_week',  label: 'Last Week'  },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
]

function getPeriodDates(key) {
  const now = new Date()
  switch (key) {
    case 'all_time':   return { start: new Date('2000-01-01'), end: new Date('2099-12-31') }
    case 'this_week':  return { start: startOfWeek(now, { weekStartsOn: 1 }),             end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'last_week':  return { start: startOfWeek(subWeeks(now,1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now,1), { weekStartsOn: 1 }) }
    case 'this_month': return { start: startOfMonth(now),              end: endOfMonth(now) }
    case 'last_month': return { start: startOfMonth(subMonths(now,1)), end: endOfMonth(subMonths(now,1)) }
    default:           return { start: startOfMonth(now),              end: endOfMonth(now) }
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
  const [period,           setPeriod]           = useState('this_month')
  const [periodOpen,       setPeriodOpen]       = useState(false)
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

  const { start, end } = getPeriodDates(period)

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    const [stys, runs, sheets] = await getOrFetch(`studio_payruns_${period}`, async () => {
      const [{ data: stys }, { data: runs }, { data: sheets }] = await Promise.all([
        supabase.from('stylists').select('id, name, photo_url, hourly_rate').order('display_order'),
        supabase.from('pay_runs')
          .select('*')
          .gte('period_start', format(start, 'yyyy-MM-dd'))
          .lte('period_end',   format(end,   'yyyy-MM-dd')),
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
    if (period === 'all_time') return toast.error('Select a specific period to add extras')
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
    invalidate(`studio_payruns_${period}`); load()
  }

  async function markPaid(stylist) {
    if (period === 'all_time') return toast.error('Select a specific period to mark as paid')
    const run    = getRun(stylist.id)
    const totals = calcTotals(stylist)
    if (totals.total === 0) return toast.error('No hours logged or no hourly rate set')
    const payload = { stylist_id: stylist.id, period_start: format(start, 'yyyy-MM-dd'), period_end: format(end, 'yyyy-MM-dd'), earnings: totals.earnings, tips: totals.tips, commissions: totals.commissions, other: totals.other, paid: totals.total }
    const { error } = run
      ? await supabase.from('pay_runs').update({ paid: totals.total }).eq('id', run.id)
      : await supabase.from('pay_runs').insert(payload)
    if (error) return toast.error(error.message)
    toast.success(`${stylist.name} marked as fully paid`)
    invalidate(`studio_payruns_${period}`); load()
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

  // Period selector (reused in both views)
  const PeriodSelector = (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setPeriodOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.dim, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>
        {PERIODS.find(p => p.key === period)?.label}
        <ChevronDown size={13} style={{ transform: periodOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: C.muted }} />
      </button>
      {periodOpen && (
        <>
          <div onClick={() => setPeriodOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 5px)', background: '#131320', border: `1px solid ${C.goldBorder}`, borderRadius: 12, overflow: 'hidden', zIndex: 50, minWidth: 145, boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg,#C9A84C,#C4956A,rgba(201,168,76,0.1))' }} />
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => { setPeriod(p.key); setPeriodOpen(false) }} className="period-opt"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: period === p.key ? C.goldBg : 'transparent', border: 'none', color: period === p.key ? C.gold : C.dim, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: period === p.key ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }}>
                {period === p.key && <Check size={11} />}
                <span style={{ marginLeft: period === p.key ? 0 : 19 }}>{p.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        .pr-row:hover      { background: rgba(255,255,255,0.02); }
        .pr-pay:hover      { background: rgba(52,211,153,0.18) !important; }
        .period-opt:hover  { background: rgba(255,255,255,0.04) !important; }
        .m-inp:focus       { border-color: ${C.goldBorder} !important; }
        .pr-edit:hover     { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .pr-back:hover     { background: rgba(255,255,255,0.06) !important; color: ${C.white} !important; }
        .pr-emp-card:hover { border-color: ${C.goldBorder} !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .pr-mobile-cards   { display: none; }
        @media (max-width: 767px) {
          .pr-stats          { grid-template-columns: repeat(3, 1fr) !important; }
          .pr-desktop-table  { display: none !important; }
          .pr-mobile-cards   { display: flex !important; }
          .pr-emp-grid       { grid-template-columns: 1fr 1fr !important; }
          .pr-tab-inner      { flex-direction: column !important; gap: 3px !important; }
          .pr-tab-desc       { display: none !important; }
          .pr-gen-main       { flex-direction: column !important; }
          .pr-gen-status     { width: 100% !important; flex: 0 0 108px !important; flex-direction: row !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          {selectedEmployee ? (
            <div>
              <button onClick={() => setSelectedEmployee(null)} className="pr-back"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.75rem', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', marginBottom: '0.5rem' }}>
                <ArrowLeft size={12} /> All Employees
              </button>
              <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.4rem,2.5vw,2rem)', color: C.white, lineHeight: 1.1 }}>{selectedEmployee.name}</h1>
              <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>
                {PERIODS.find(p => p.key === period)?.label} · Pay details
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Team</p>
              <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', color: C.white, lineHeight: 1.1 }}>Pay Runs</h1>
              <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', marginTop: 3 }}>Auto-calculated from timesheet hours × hourly rate</p>
            </>
          )}
        </div>
        {PeriodSelector}
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

          {/* Main: chart (left) + status column (right) — fills remaining height */}
          <div className="pr-gen-main" style={{ flex: 1, minHeight: 0, display: 'flex', gap: '0.625rem' }}>

            {/* Bar chart card */}
            <div style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* chart header */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <h3 style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, margin: 0 }}>Payroll Breakdown</h3>
                  <p style={{ color: C.muted, fontSize: '0.67rem', fontFamily: 'Jost,sans-serif', margin: '1px 0 0' }}>{period === 'all_time' ? 'All time' : `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[{ label: 'Earnings', color: C.gold }, { label: 'Extras', color: C.purple }, { label: 'Paid', color: C.green }, { label: 'To Pay', color: C.red }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* chart body — fills remaining height via flex:1 */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ display: 'flex', gap: '0.625rem', height: '100%', alignItems: 'flex-end' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        <div style={{ flex: 1 }} />
                        <div style={{ width: '60%', height: `${30 + i * 10}%`, maxHeight: 110, borderRadius: '5px 5px 0 0', background: C.subtle }} />
                        <div style={{ width: '60%', height: 1, background: C.border, margin: '0 0 5px' }} />
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.subtle }} />
                        <div style={{ width: 38, height: 7, borderRadius: 4, background: C.subtle, marginTop: 4 }} />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>
                    No team members found
                  </div>
                ) : (() => {
                  const allTotals = filtered.map(s => ({ stylist: s, totals: calcTotals(s) }))
                  const maxTotal  = Math.max(...allTotals.map(({ totals }) => totals.total), 0.01)
                  const MAX_H = 130
                  return (
                    <div style={{ display: 'flex', gap: '0.5rem', height: '100%', alignItems: 'flex-end', overflowX: filtered.length > 8 ? 'auto' : 'hidden', overflowY: 'hidden' }}>
                      {allTotals.map(({ stylist, totals }) => {
                        const barH   = totals.total > 0 ? Math.max(8, (totals.total / maxTotal) * MAX_H) : 4
                        const paidH  = totals.total > 0 ? (totals.paid / totals.total) * barH : 0
                        const toPayH = barH - paidH
                        const isPaid = totals.total > 0 && totals.toPay === 0
                        return (
                          <div key={stylist.id} style={{ flex: 1, minWidth: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                            <div style={{ flex: 1 }} />
                            <div style={{ fontSize: '0.6rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, color: isPaid ? C.green : totals.toPay > 0 ? C.red : C.muted, marginBottom: 3, whiteSpace: 'nowrap' }}>
                              {totals.total > 0 ? (isPaid ? '✓' : fmt(totals.toPay)) : '—'}
                            </div>
                            <div style={{ width: '62%', maxWidth: 44, height: barH, borderRadius: '5px 5px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                              {toPayH > 0 && <div style={{ height: toPayH, background: totals.extras > 0 ? `linear-gradient(160deg,${C.purple}bb,${C.gold}aa)` : `linear-gradient(160deg,${C.gold}dd,${C.goldDim})`, borderRadius: paidH === 0 ? '5px 5px 0 0' : 0 }} />}
                              {paidH  > 0 && <div style={{ height: paidH,  background: `linear-gradient(160deg,${C.green}bb,rgba(52,211,153,0.45))`, borderRadius: toPayH === 0 ? '5px 5px 0 0' : 0 }} />}
                              {totals.total === 0 && <div style={{ flex: 1, background: C.subtle }} />}
                            </div>
                            <div style={{ width: '62%', maxWidth: 44, height: 1, background: C.border, margin: '0 0 5px', flexShrink: 0 }} />
                            {stylist.photo_url
                              ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1px solid ${C.border}`, flexShrink: 0 }} />
                              : <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ color: C.gold, fontSize: 10, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                                </div>
                            }
                            <p style={{ fontSize: '0.6rem', color: C.dim, fontFamily: 'Jost,sans-serif', marginTop: 3, textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{stylist.name.split(' ')[0]}</p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Status column — Fully Paid + Outstanding stacked */}
            <div className="pr-gen-status" style={{ width: 192, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

              {/* Fully Paid */}
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.greenBorder}`, borderRadius: 14, padding: '0.875rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
                  <Check size={13} style={{ color: C.green }} />
                  <span style={{ fontSize: '0.76rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, color: C.green }}>Fully Paid</span>
                  {!loading && <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', marginLeft: 2 }}>
                    ({filtered.filter(s => { const t = calcTotals(s); return t.total > 0 && t.toPay === 0 }).length})
                  </span>}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 26, borderRadius: 7, background: C.subtle, flexShrink: 0 }} />)
                  ) : (() => {
                    const paid = filtered.filter(s => { const t = calcTotals(s); return t.total > 0 && t.toPay === 0 })
                    return paid.length === 0
                      ? <p style={{ color: C.muted, fontSize: '0.7rem', fontFamily: 'Jost,sans-serif' }}>No one fully paid yet</p>
                      : paid.map(stylist => (
                          <div key={stylist.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 7, padding: '3px 7px', flexShrink: 0 }}>
                            {stylist.photo_url
                              ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1px solid ${C.greenBorder}`, flexShrink: 0 }} />
                              : <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.greenBg, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ color: C.green, fontSize: 8, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                                </div>
                            }
                            <span style={{ fontSize: '0.7rem', color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stylist.name.split(' ')[0]}</span>
                            <Check size={9} style={{ color: C.green, flexShrink: 0 }} />
                          </div>
                        ))
                  })()}
                </div>
              </div>

              {/* Outstanding */}
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.redBorder}`, borderRadius: 14, padding: '0.875rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
                  <Clock size={13} style={{ color: C.red }} />
                  <span style={{ fontSize: '0.76rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, color: C.red }}>Outstanding</span>
                  {!loading && <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', marginLeft: 2 }}>
                    ({filtered.filter(s => calcTotals(s).toPay > 0).length})
                  </span>}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 26, borderRadius: 7, background: C.subtle, flexShrink: 0 }} />)
                  ) : (() => {
                    const owed = filtered.filter(s => calcTotals(s).toPay > 0).map(s => ({ stylist: s, totals: calcTotals(s) }))
                    return owed.length === 0
                      ? <p style={{ color: C.muted, fontSize: '0.7rem', fontFamily: 'Jost,sans-serif' }}>All payments settled</p>
                      : owed.map(({ stylist, totals }) => (
                          <div key={stylist.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 7, padding: '3px 7px', flexShrink: 0 }}>
                            {stylist.photo_url
                              ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `1px solid ${C.redBorder}`, flexShrink: 0 }} />
                              : <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.redBg, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ color: C.red, fontSize: 8, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                                </div>
                            }
                            <span style={{ fontSize: '0.7rem', color: C.red, fontFamily: 'Jost,sans-serif', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stylist.name.split(' ')[0]}</span>
                            <span style={{ fontSize: '0.68rem', color: C.red, fontFamily: 'Jost,sans-serif', fontWeight: 700, flexShrink: 0 }}>{fmt(totals.toPay)}</span>
                          </div>
                        ))
                  })()}
                </div>
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
                  <button key={stylist.id} onClick={() => setSelectedEmployee(stylist)} className="pr-emp-card"
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
            {/* Profile hero */}
            <div style={{ flexShrink: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {stylist.photo_url
                ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${isPaid ? C.green : C.goldBorder}`, flexShrink: 0 }} />
                : <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.goldBg, border: `2px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: C.gold, fontSize: 24, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h2 className="font-display font-light" style={{ fontSize: '1.35rem', color: C.white, lineHeight: 1 }}>{stylist.name}</h2>
                  {isPaid && <span style={{ fontSize: 8, padding: '2px 9px', borderRadius: 9999, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Paid</span>}
                  {noRate  && <span style={{ fontSize: 8, padding: '2px 9px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontFamily: 'Jost,sans-serif', fontWeight: 700, textTransform: 'uppercase' }}>No rate set</span>}
                </div>
                <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>
                  {totals.netMins > 0 ? fmtMins(totals.netMins) : 'No hours logged'}
                  {stylist.hourly_rate ? ` · €${parseFloat(stylist.hourly_rate).toFixed(2)}/h` : ''}
                  {' · '}{empSheets.length} timesheet {empSheets.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>

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

                  {/* Mobile */}
                  <div className="pr-mobile-cards" style={{ flexDirection: 'column' }}>
                    {empSheets.map((t, i) => {
                      const net = Math.max(0, differenceInMinutes(new Date(t.clock_out), new Date(t.clock_in)) - (t.break_minutes || 0))
                      return (
                        <div key={i} style={{ padding: '0.75rem 1rem', borderBottom: i < empSheets.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                          <p style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.4rem' }}>{format(new Date(t.clock_in), 'EEE, MMM d')}</p>
                          <div style={{ display: 'flex', gap: 0 }}>
                            {[
                              { label: 'In',    val: format(new Date(t.clock_in),  'HH:mm'), color: C.green },
                              { label: 'Out',   val: format(new Date(t.clock_out), 'HH:mm'), color: C.red   },
                              { label: 'Break', val: t.break_minutes ? `${t.break_minutes}m` : '—', color: t.break_minutes ? C.goldDim : 'rgba(255,255,255,0.2)' },
                              { label: 'Net',   val: fmtMins(net), color: C.gold },
                            ].map(({ label, val, color }, idx, arr) => (
                              <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ fontSize: 7, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
                                <div style={{ color, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{val}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
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
