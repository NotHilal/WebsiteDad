import { useState, useEffect, useMemo } from 'react'
import { Search, Check, ChevronDown, Edit2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
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
  red: '#f87171',
}

const PERIODS = [
  { key: 'this_week',  label: 'This Week'  },
  { key: 'last_week',  label: 'Last Week'  },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
]

function getPeriodDates(key) {
  const now = new Date()
  switch (key) {
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

const fmt = n => `€${n.toFixed(2)}`

const COLS = '1.8fr 85px 70px 110px 85px 110px 95px 95px 120px'
const inp  = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.4rem 0.6rem 0.4rem 1.5rem', fontSize: '0.8rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', width: '100%', boxSizing: 'border-box', transition: 'border-color .2s' }

export default function StudioPayRuns() {
  const [period,     setPeriod]     = useState('this_month')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [stylists,   setStylists]   = useState([])
  const [payRuns,    setPayRuns]    = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [editing,    setEditing]    = useState(null)
  const [editVals,   setEditVals]   = useState({ tips: '0', commissions: '0', other: '0' })
  const [saving,     setSaving]     = useState(false)

  const { start, end } = getPeriodDates(period)

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
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
    setStylists(stys || [])
    setPayRuns(runs  || [])
    setTimesheets(sheets || [])
    setLoading(false)
  }

  function getRun(stylistId) {
    return payRuns.find(r => r.stylist_id === stylistId)
  }

  function getNetMins(stylistId) {
    return timesheets
      .filter(t => t.stylist_id === stylistId)
      .reduce((acc, t) => {
        const raw = differenceInMinutes(new Date(t.clock_out), new Date(t.clock_in))
        return acc + Math.max(0, raw - (t.break_minutes || 0))
      }, 0)
  }

  function calcTotals(stylist) {
    const run         = getRun(stylist.id)
    const netMins     = getNetMins(stylist.id)
    const rate        = parseFloat(stylist.hourly_rate) || 0
    const earnings    = (netMins / 60) * rate
    const tips        = parseFloat(run?.tips)        || 0
    const commissions = parseFloat(run?.commissions) || 0
    const other       = parseFloat(run?.other)        || 0
    const extras      = tips + commissions + other
    const total       = earnings + extras
    const paid        = parseFloat(run?.paid) || 0
    return { netMins, rate, earnings, extras, tips, commissions, other, total, paid, toPay: Math.max(0, total - paid) }
  }

  function openEdit(stylist) {
    const run = getRun(stylist.id)
    setEditVals({
      tips:        String(run?.tips        || 0),
      commissions: String(run?.commissions || 0),
      other:       String(run?.other       || 0),
    })
    setEditing(stylist.id)
  }

  async function saveExtras(stylist) {
    setSaving(true)
    const run     = getRun(stylist.id)
    const totals  = calcTotals(stylist)
    const extras  = {
      tips:        parseFloat(editVals.tips)        || 0,
      commissions: parseFloat(editVals.commissions) || 0,
      other:       parseFloat(editVals.other)       || 0,
    }
    const payload = {
      stylist_id:   stylist.id,
      period_start: format(start, 'yyyy-MM-dd'),
      period_end:   format(end,   'yyyy-MM-dd'),
      earnings:     totals.earnings,
      ...extras,
      paid: parseFloat(run?.paid) || 0,
    }
    const { error } = run
      ? await supabase.from('pay_runs').update(extras).eq('id', run.id)
      : await supabase.from('pay_runs').insert(payload)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Extras saved')
    setEditing(null)
    load()
  }

  async function markPaid(stylist) {
    const run    = getRun(stylist.id)
    const totals = calcTotals(stylist)
    if (totals.total === 0) return toast.error('No hours logged or no hourly rate set')
    const payload = {
      stylist_id:   stylist.id,
      period_start: format(start, 'yyyy-MM-dd'),
      period_end:   format(end,   'yyyy-MM-dd'),
      earnings:     totals.earnings,
      tips:         totals.tips,
      commissions:  totals.commissions,
      other:        totals.other,
      paid:         totals.total,
    }
    const { error } = run
      ? await supabase.from('pay_runs').update({ paid: totals.total }).eq('id', run.id)
      : await supabase.from('pay_runs').insert(payload)
    if (error) return toast.error(error.message)
    toast.success(`${stylist.name} marked as fully paid`)
    load()
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
        .pr-row:hover    { background: rgba(255,255,255,0.02); }
        .pr-pay:hover    { background: rgba(52,211,153,0.18) !important; }
        .period-opt:hover { background: rgba(255,255,255,0.04) !important; }
        .m-inp:focus     { border-color: ${C.goldBorder} !important; }
        .pr-edit:hover   { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Team</p>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', color: C.white, lineHeight: 1.1 }}>Pay Runs</h1>
          <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', marginTop: 3 }}>
            Auto-calculated from timesheet hours × hourly rate
          </p>
        </div>

        {/* Period selector */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setPeriodOpen(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.dim, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>
            {PERIODS.find(p => p.key === period)?.label}
            <ChevronDown size={13} style={{ transform: periodOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: C.muted }} />
          </button>
          {periodOpen && (
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
          )}
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Earnings', value: summary.earnings, color: C.gold,                                    sub: 'Hours × rate'    },
          { label: 'Extras',   value: summary.extras,   color: '#a78bfa',                                 sub: 'Tips + more'     },
          { label: 'Total',    value: summary.total,    color: C.white,                                   sub: 'Gross payroll'   },
          { label: 'Paid',     value: summary.paid,     color: C.green,                                   sub: 'Settled'         },
          { label: 'To Pay',   value: summary.toPay,    color: summary.toPay > 0 ? C.red : C.muted,       sub: 'Outstanding'     },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem 0.875rem', textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 'clamp(1.1rem,1.8vw,1.5rem)', color: s.color, lineHeight: 1, marginBottom: '0.25rem' }}>{loading ? '—' : fmt(s.value)}</div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ flexShrink: 0, position: 'relative', maxWidth: 260 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team member…" autoComplete="off"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.48rem 0.75rem 0.48rem 2rem', fontSize: '0.8rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', boxSizing: 'border-box' }}
          className="m-inp" />
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>

          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '0.65rem 1.25rem', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', gap: '0.5rem', alignItems: 'center' }}>
            {['Team Member', 'Hours', 'Rate', 'Earnings', 'Extras', 'Total', 'Paid', 'To Pay', ''].map(h => (
              <div key={h} style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, fontFamily: 'Jost,sans-serif' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}`, gap: '0.5rem', alignItems: 'center' }}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} style={{ height: 11, borderRadius: 4, width: j === 0 ? 120 : 55, background: C.subtle }} />
                ))}
                <div />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No team members found</p>
            </div>
          ) : filtered.map(stylist => {
            const totals  = calcTotals(stylist)
            const isPaid  = totals.total > 0 && totals.toPay === 0
            const noRate  = !stylist.hourly_rate && totals.netMins > 0
            const isEditing = editing === stylist.id

            return (
              <div key={stylist.id} style={{ borderBottom: `1px solid ${C.border}` }}>

                {/* Main row */}
                <div className="pr-row"
                  style={{ display: 'grid', gridTemplateColumns: COLS, padding: '0.875rem 1.25rem', gap: '0.5rem', alignItems: 'center', transition: 'background .15s' }}>

                  {/* Member */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {stylist.photo_url
                      ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: `1px solid ${C.border}` }} />
                      : <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                        </div>
                    }
                    <div>
                      <p style={{ color: C.white, fontSize: '0.83rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{stylist.name}</p>
                      <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                        {isPaid && (
                          <span style={{ fontSize: 8, padding: '1px 7px', borderRadius: 9999, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Paid</span>
                        )}
                        {noRate && (
                          <span style={{ fontSize: 8, padding: '1px 7px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>No rate set</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hours */}
                  <div style={{ color: totals.netMins > 0 ? C.dim : 'rgba(255,255,255,0.18)', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: totals.netMins > 0 ? 600 : 400 }}>
                    {fmtMins(totals.netMins)}
                  </div>

                  {/* Rate */}
                  <div style={{ color: stylist.hourly_rate ? C.goldDim : 'rgba(255,255,255,0.18)', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>
                    {stylist.hourly_rate ? `€${parseFloat(stylist.hourly_rate).toFixed(2)}` : '—'}
                  </div>

                  {/* Earnings */}
                  <div style={{ color: totals.earnings > 0 ? C.gold : 'rgba(255,255,255,0.18)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                    {fmt(totals.earnings)}
                  </div>

                  {/* Extras */}
                  <div style={{ color: totals.extras > 0 ? '#a78bfa' : 'rgba(255,255,255,0.18)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: totals.extras > 0 ? 600 : 400 }}>
                    {fmt(totals.extras)}
                  </div>

                  {/* Total */}
                  <div style={{ color: totals.total > 0 ? C.white : 'rgba(255,255,255,0.18)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
                    {fmt(totals.total)}
                  </div>

                  {/* Paid */}
                  <div style={{ color: totals.paid > 0 ? C.green : 'rgba(255,255,255,0.18)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                    {fmt(totals.paid)}
                  </div>

                  {/* To Pay */}
                  <div style={{ color: totals.toPay > 0 ? C.red : 'rgba(255,255,255,0.18)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: totals.toPay > 0 ? 700 : 400 }}>
                    {fmt(totals.toPay)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                    <button onClick={() => isEditing ? setEditing(null) : openEdit(stylist)} className="pr-edit"
                      style={{ padding: '4px 10px', borderRadius: 7, background: isEditing ? C.goldBg : C.subtle, border: `1px solid ${isEditing ? C.goldBorder : C.border}`, color: isEditing ? C.gold : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s' }}>
                      {isEditing ? <X size={10} /> : <Edit2 size={10} />}
                      {isEditing ? 'Close' : 'Extras'}
                    </button>
                    {totals.toPay > 0 && (
                      <button onClick={() => markPaid(stylist)} className="pr-pay"
                        style={{ padding: '4px 10px', borderRadius: 7, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'background .15s' }}>
                        <Check size={10} /> Pay
                      </button>
                    )}
                  </div>
                </div>

                {/* Extras edit panel */}
                {isEditing && (
                  <div style={{ padding: '0.875rem 1.25rem 1rem', background: 'rgba(201,168,76,0.04)', borderTop: `1px solid ${C.goldBorder}` }}>
                    <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.75rem' }}>
                      Add Extras for {stylist.name}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      {[['Tips', 'tips'], ['Commissions', 'commissions'], ['Other', 'other']].map(([label, key]) => (
                        <div key={key} style={{ minWidth: 130 }}>
                          <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 5 }}>{label}</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: C.goldDim, pointerEvents: 'none', fontFamily: 'Jost,sans-serif' }}>€</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={editVals[key]}
                              onChange={e => setEditVals(p => ({ ...p, [key]: e.target.value }))}
                              className="m-inp"
                              style={inp}
                            />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => saveExtras(stylist)} disabled={saving}
                        style={{ padding: '0.45rem 1.1rem', borderRadius: 8, background: `linear-gradient(135deg,${C.gold},#C4956A)`, border: 'none', color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, height: 36 }}>
                        <Check size={12} /> Save
                      </button>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif', marginTop: '0.625rem' }}>
                      Earnings are auto-calculated from hours. These are added on top.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
