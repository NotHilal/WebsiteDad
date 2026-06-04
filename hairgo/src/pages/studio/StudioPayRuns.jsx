import { useState, useEffect, useMemo } from 'react'
import { Search, Check, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns'
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

function calcTotals(run) {
  if (!run) return { earnings: 0, other: 0, total: 0, paid: 0, toPay: 0 }
  const earnings = parseFloat(run.earnings) || 0
  const other    = (parseFloat(run.tips) || 0) + (parseFloat(run.commissions) || 0) + (parseFloat(run.other) || 0)
  const total    = earnings + other
  const paid     = parseFloat(run.paid) || 0
  return { earnings, other, total, paid, toPay: Math.max(0, total - paid) }
}

const fmt = n => `€${n.toFixed(2)}`

export default function StudioPayRuns() {
  const [period,     setPeriod]     = useState('this_month')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [stylists,   setStylists]   = useState([])
  const [payRuns,    setPayRuns]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')

  const { start, end } = getPeriodDates(period)

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    const [{ data: stys }, { data: runs }] = await Promise.all([
      supabase.from('stylists').select('id, name, photo_url').order('display_order'),
      supabase.from('pay_runs')
        .select('*')
        .gte('period_start', format(start, 'yyyy-MM-dd'))
        .lte('period_end',   format(end,   'yyyy-MM-dd')),
    ])
    setStylists(stys || [])
    setPayRuns(runs  || [])
    setLoading(false)
  }

  const getRun = id => payRuns.find(r => r.stylist_id === id)

  async function markPaid(stylist) {
    const run = getRun(stylist.id)
    if (!run) return toast.error('No pay run data for this period')
    const totals = calcTotals(run)
    const { error } = await supabase.from('pay_runs').update({ paid: totals.total }).eq('id', run.id)
    if (error) return toast.error(error.message)
    toast.success(`${stylist.name} marked as fully paid`)
    load()
  }

  const summary = useMemo(() => {
    const t = stylists.map(s => calcTotals(getRun(s.id)))
    return {
      earnings: t.reduce((a, x) => a + x.earnings, 0),
      other:    t.reduce((a, x) => a + x.other,    0),
      total:    t.reduce((a, x) => a + x.total,    0),
      paid:     t.reduce((a, x) => a + x.paid,     0),
      toPay:    t.reduce((a, x) => a + x.toPay,    0),
    }
  }, [stylists, payRuns])

  const filtered = stylists.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        .pr-row:hover  { background: rgba(255,255,255,0.02); }
        .pr-pay:hover  { background: rgba(52,211,153,0.18) !important; }
        .period-opt:hover { background: rgba(255,255,255,0.04) !important; }
        .m-inp:focus   { border-color: ${C.goldBorder} !important; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Team</p>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', color: C.white, lineHeight: 1.1 }}>Pay Runs</h1>
          <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', marginTop: 3 }}>Calculate and settle tips, commissions and wages</p>
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

      {/* ── Summary bar ──────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Earnings', value: summary.earnings, color: C.gold  },
          { label: 'Other',    value: summary.other,    color: '#a78bfa' },
          { label: 'Total',    value: summary.total,    color: C.white  },
          { label: 'Paid',     value: summary.paid,     color: C.green  },
          { label: 'To Pay',   value: summary.toPay,    color: summary.toPay > 0 ? C.red : C.muted },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem 0.75rem', textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 'clamp(1.2rem,2vw,1.6rem)', color: s.color, lineHeight: 1, marginBottom: '0.3rem' }}>{fmt(s.value)}</div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, position: 'relative', maxWidth: 260 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team member…" autoComplete="off"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.48rem 0.75rem 0.48rem 2rem', fontSize: '0.8rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', boxSizing: 'border-box' }}
          className="m-inp" />
      </div>

      {/* ── Employee list ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 100px', padding: '0.65rem 1.25rem', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', gap: '0.5rem', alignItems: 'center' }}>
            {['Team Member', 'Earnings', 'Other', 'Total', 'Paid', 'To Pay', ''].map(h => (
              <div key={h} style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, fontFamily: 'Jost,sans-serif' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 100px', padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}`, gap: '0.5rem', alignItems: 'center' }}>
                {Array.from({ length: 6 }).map((_, j) => <div key={j} style={{ height: 12, borderRadius: 4, width: j === 0 ? 120 : 55, background: C.subtle }} />)}
                <div />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No team members found</p>
            </div>
          ) : filtered.map(stylist => {
            const run    = getRun(stylist.id)
            const totals = calcTotals(run)
            const isPaid = totals.total > 0 && totals.toPay === 0

            return (
              <div key={stylist.id} className="pr-row"
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 100px', padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}`, gap: '0.5rem', alignItems: 'center', transition: 'background .15s' }}>

                {/* Member */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {stylist.photo_url
                    ? <img src={stylist.photo_url} alt={stylist.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: `1px solid ${C.border}` }} />
                    : <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: C.gold, fontSize: 13, fontWeight: 700, fontFamily: 'Jost,sans-serif' }}>{stylist.name[0]}</span>
                      </div>
                  }
                  <div>
                    <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: isPaid ? 3 : 0 }}>{stylist.name}</p>
                    {isPaid && (
                      <span style={{ fontSize: 8, padding: '1px 7px', borderRadius: 9999, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Paid</span>
                    )}
                  </div>
                </div>

                <div style={{ color: C.gold,    fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmt(totals.earnings)}</div>
                <div style={{ color: '#a78bfa', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmt(totals.other)}</div>
                <div style={{ color: C.white,   fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{fmt(totals.total)}</div>
                <div style={{ color: C.green,   fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{fmt(totals.paid)}</div>
                <div style={{ color: totals.toPay > 0 ? C.red : C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: totals.toPay > 0 ? 700 : 400 }}>{fmt(totals.toPay)}</div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {totals.toPay > 0 && (
                    <button onClick={() => markPaid(stylist)} className="pr-pay"
                      style={{ padding: '4px 12px', borderRadius: 7, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'background .15s' }}>
                      <Check size={10} /> Pay
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
