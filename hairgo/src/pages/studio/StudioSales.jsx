import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, TrendingUp, Scissors, Package, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  isToday, isSameWeek, isSameMonth, parseISO,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
} from 'date-fns'

const C = {
  card: '#161620',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
}

const APPT_COLORS = {
  completed: '#C9A84C', confirmed: '#34d399', pending: '#f59e0b', cancelled: '#f87171',
}
const STATUS_APPT = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.22)'  },
  confirmed: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.22)'  },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.22)' },
  completed: { color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.22)'  },
}
const STATUS_ORDER = {
  active:    { color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',   border: 'rgba(201,168,76,0.22)'   },
  retrieved: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.22)'   },
  expired:   { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)' },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.22)' },
}

const card  = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }
const TABS  = ['Appointments', 'Product Orders']
const MODES = ['Day', 'Week', 'Month']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

/* ── compute period boundaries ── */
function getPeriod(anchor, mode) {
  if (mode === 'day') {
    const s = new Date(anchor); s.setHours(0, 0, 0, 0)
    const e = addDays(s, 1)
    return { start: s, end: e }
  }
  if (mode === 'week') {
    const s = startOfWeek(anchor, { weekStartsOn: 1 })
    const e = endOfWeek(anchor,   { weekStartsOn: 1 })
    e.setHours(23, 59, 59, 999)
    return { start: s, end: addDays(s, 7) }
  }
  // month
  const s = startOfMonth(anchor)
  const e = endOfMonth(anchor); e.setHours(23, 59, 59, 999)
  return { start: s, end: addDays(endOfMonth(anchor), 1) }
}

function periodLabel(anchor, mode) {
  if (mode === 'day')   return format(anchor, 'MMMM d, yyyy')
  if (mode === 'week') {
    const s = startOfWeek(anchor, { weekStartsOn: 1 })
    const e = endOfWeek(anchor,   { weekStartsOn: 1 })
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  }
  return format(anchor, 'MMMM yyyy')
}

function isCurrent(anchor, mode) {
  const now = new Date()
  if (mode === 'day')   return isToday(anchor)
  if (mode === 'week')  return isSameWeek(anchor, now, { weekStartsOn: 1 })
  return isSameMonth(anchor, now)
}

function navigate(anchor, mode, dir) {
  if (mode === 'day')   return dir > 0 ? addDays(anchor, 1)   : subDays(anchor, 1)
  if (mode === 'week')  return dir > 0 ? addWeeks(anchor, 1)  : subWeeks(anchor, 1)
  return dir > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1)
}

/* ──────────────────────────────────────────────────── */
export default function StudioSales() {
  const [anchor,       setAnchor]       = useState(new Date())
  const [mode,         setMode]         = useState('day')
  const [appointments, setAppointments] = useState([])
  const [preorders,    setPreorders]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('Appointments')
  const [search,       setSearch]       = useState('')

  const { start, end } = getPeriod(anchor, mode)
  const startISO = start.toISOString()
  const endISO   = end.toISOString()

  useEffect(() => { load() }, [startISO, endISO])

  async function load() {
    setLoading(true)
    const [{ data: appts }, { data: orders }] = await Promise.all([
      supabase.from('appointments')
        .select('*, profiles(full_name, phone), services(name, price, duration), stylists(name)')
        .gte('created_at', startISO).lt('created_at', endISO)
        .order('created_at', { ascending: false }),
      supabase.from('preorders')
        .select('*, products(name, price, image_url), profiles(full_name, phone)')
        .gte('created_at', startISO).lt('created_at', endISO)
        .order('created_at', { ascending: false }),
    ])
    setAppointments(appts  || [])
    setPreorders(orders    || [])
    setLoading(false)
  }

  const paidAppts       = appointments.filter(a => a.payment_status === 'paid')
  const servicesRevenue = paidAppts.reduce((s, a) => s + (parseFloat(a.services?.price) || 0), 0)
  const paidOrders      = preorders.filter(p => p.payment_status === 'paid')
  const productsRevenue = paidOrders.reduce((s, p) => s + (parseFloat(p.products?.price) || 0) * (p.quantity || 1), 0)
  const totalRevenue    = servicesRevenue + productsRevenue

  const filteredAppts  = appointments.filter(a => !search || a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()))
  const filteredOrders = preorders.filter(p =>
    !search || p.products?.name?.toLowerCase().includes(search.toLowerCase()) || p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const summaryCards = [
    { label: 'Total Revenue',  value: `€${totalRevenue.toFixed(2)}`,    sub: 'Collected via Stripe',      color: C.gold,    icon: TrendingUp },
    { label: 'Services',       value: `€${servicesRevenue.toFixed(2)}`, sub: `${paidAppts.length} paid`,  color: '#34d399', icon: Scissors   },
    { label: 'Product Orders', value: `€${productsRevenue.toFixed(2)}`, sub: `${paidOrders.length} paid`, color: '#a78bfa', icon: Package    },
  ]

  const currentPeriod = isCurrent(anchor, mode)
  const periodBadge   = mode === 'day' ? 'Today' : mode === 'week' ? 'This week' : 'This month'
  const emptyText     = mode === 'day' ? 'this day' : mode === 'week' ? 'this week' : 'this month'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.875rem', overflowY: 'auto' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, paddingBottom: '0.875rem', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div>
            <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Sales</h1>
            <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Revenue overview</p>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
            {MODES.map(m => {
              const active = mode === m.toLowerCase()
              return (
                <button key={m} onClick={() => { setMode(m.toLowerCase()); setSearch('') }}
                  style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: active ? 700 : 400, cursor: 'pointer', border: 'none', background: active ? C.goldBg : 'transparent', color: active ? C.gold : C.muted, outline: active ? `1px solid ${C.goldBorder}` : 'none', transition: 'all .18s' }}>
                  {m}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setAnchor(d => navigate(d, mode, -1))} className="s-nav-btn"
            style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all .18s' }}>
            <ChevronLeft size={13} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p className="font-display" style={{ fontSize: '1.05rem', color: C.white, lineHeight: 1.2 }}>{periodLabel(anchor, mode)}</p>
            {currentPeriod && <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif' }}>{periodBadge}</span>}
          </div>
          <button onClick={() => setAnchor(d => navigate(d, mode, 1))} className="s-nav-btn"
            style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all .18s' }}>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => setAnchor(new Date())} className="s-today-btn"
            style={{ padding: '4px 13px', borderRadius: 20, background: 'transparent', border: `1px solid ${C.goldBorder}`, color: C.goldDim, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .18s' }}>
            {periodBadge}
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', flexShrink: 0 }}>
        {summaryCards.map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} style={{ ...card, padding: '1.1rem 1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <Icon size={14} color={color} strokeWidth={1.5} />
            </div>
            <div className="font-display" style={{ fontSize: '1.75rem', color: loading ? C.border : C.white, lineHeight: 1, marginBottom: '0.2rem' }}>
              {loading ? '—' : value}
            </div>
            <p style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.1rem' }}>{label}</p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif' }}>{loading ? '…' : sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '0.75rem', flexShrink: 0 }}>

        <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.875rem' }}>
            {mode === 'day' ? 'Appointments by Hour' : mode === 'week' ? 'Revenue by Day' : 'Revenue by Day'}
          </p>
          {loading
            ? <div style={{ height: 90, background: C.subtle, borderRadius: 8 }} className="shimmer" />
            : mode === 'day'
              ? <HourlyChart appointments={appointments} hours={HOURS} />
              : <PeriodChart appointments={appointments} preorders={preorders} start={start} end={end} mode={mode} />
          }
        </div>

        <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.875rem' }}>
            Appointment Status
          </p>
          {loading
            ? <div style={{ height: 90, background: C.subtle, borderRadius: 8 }} className="shimmer" />
            : <StatusBreakdown appointments={appointments} />
          }
        </div>
      </div>

      {/* ── Revenue split bar ── */}
      {!loading && totalRevenue > 0 && (
        <div style={{ ...card, padding: '1rem 1.25rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Revenue Breakdown</p>
            <span className="font-display" style={{ color: C.gold, fontSize: '1rem' }}>€{totalRevenue.toFixed(2)}</span>
          </div>
          <RevenueSplit servicesRevenue={servicesRevenue} productsRevenue={productsRevenue} total={totalRevenue} />
        </div>
      )}

      {/* ── Tabs + table ── */}
      <div style={{ ...card, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, padding: '0 1.25rem' }}>
          <div style={{ display: 'flex' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => { setTab(t); setSearch('') }} style={{
                padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'Jost,sans-serif',
                fontWeight: tab === t ? 600 : 400, color: tab === t ? C.gold : C.muted,
                borderBottom: `2px solid ${tab === t ? C.gold : 'transparent'}`, marginBottom: -1, transition: 'color .2s',
              }}>
                {t}
                <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 7px', borderRadius: 20, background: tab === t ? C.goldBg : 'rgba(255,255,255,0.05)', color: tab === t ? C.goldDim : 'rgba(255,255,255,0.2)' }}>
                  {t === 'Appointments' ? appointments.length : preorders.length}
                </span>
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} autoComplete="off"
              placeholder={tab === 'Appointments' ? 'Search client…' : 'Search product or client…'}
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.78rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', width: 200, transition: 'border-color .2s' }}
              className="s-search" />
          </div>
        </div>

        {/* Appointments table */}
        {tab === 'Appointments' && (
          loading ? <Skeleton rows={5} /> :
          filteredAppts.length === 0 ? <Empty icon={Scissors} text={`No appointments for ${emptyText}`} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                  {['Booked', 'Appt. Date', 'Client', 'Service', 'Stylist', 'Status', 'Payment', 'Price'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1.1rem', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, textAlign: 'left', fontFamily: 'Jost,sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAppts.map((appt, i) => {
                  const s = STATUS_APPT[appt.status] || STATUS_APPT.pending
                  return (
                    <tr key={appt.id} style={{ borderBottom: i < filteredAppts.length - 1 ? `1px solid ${C.border}` : 'none' }} className="s-row">
                      <td style={{ padding: '0.7rem 1.1rem', fontFamily: 'Jost,sans-serif', fontSize: '0.75rem', color: C.muted, whiteSpace: 'nowrap' }}>
                        {appt.created_at ? format(new Date(appt.created_at), mode === 'day' ? 'HH:mm' : 'MMM d HH:mm') : '—'}
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem', fontFamily: 'Jost,sans-serif', fontSize: '0.75rem', color: C.gold, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {appt.date ? format(parseISO(appt.date), 'MMM d') : '—'} {appt.time?.slice(0, 5)}
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem' }}>
                        <p style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>{appt.profiles?.full_name || '—'}</p>
                        {appt.profiles?.phone && <p style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif' }}>{appt.profiles.phone}</p>}
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem', color: C.dim, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>
                        {appt.services?.name || '—'}
                        {appt.services?.duration && <span style={{ color: C.muted, fontSize: '0.68rem', marginLeft: 5 }}>{appt.services.duration}min</span>}
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem', color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>{appt.stylists?.name || '—'}</td>
                      <td style={{ padding: '0.7rem 1.1rem' }}>
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 600, textTransform: 'capitalize' }}>{appt.status}</span>
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem' }}>
                        {appt.payment_status === 'paid'
                          ? <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Paid</span>
                          : <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Unpaid</span>
                        }
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem', fontFamily: 'Jost,sans-serif', fontSize: '0.8rem', color: appt.payment_status === 'paid' ? C.gold : C.muted, fontWeight: appt.payment_status === 'paid' ? 600 : 400 }}>
                        {appt.services?.price ? `€${appt.services.price}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {paidAppts.length > 0 && !search && (
                <tfoot>
                  <tr style={{ borderTop: `1px solid ${C.goldBorder}`, background: C.goldBg }}>
                    <td colSpan={7} style={{ padding: '0.6rem 1.1rem', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
                      Revenue — paid via Stripe ({paidAppts.length})
                    </td>
                    <td style={{ padding: '0.6rem 1.1rem', color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 700, fontSize: '0.88rem' }}>€{servicesRevenue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )
        )}

        {/* Product Orders table */}
        {tab === 'Product Orders' && (
          loading ? <Skeleton rows={4} /> :
          filteredOrders.length === 0 ? <Empty icon={Package} text={`No product orders for ${emptyText}`} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                  {['Product', 'Client', 'Qty', 'Status', 'Payment', 'Unit Price', 'Total'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1.1rem', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, textAlign: 'left', fontFamily: 'Jost,sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, i) => {
                  const s = STATUS_ORDER[order.status] || STATUS_ORDER.active
                  const lineTotal = (parseFloat(order.products?.price) || 0) * (order.quantity || 1)
                  return (
                    <tr key={order.id} style={{ borderBottom: i < filteredOrders.length - 1 ? `1px solid ${C.border}` : 'none' }} className="s-row">
                      <td style={{ padding: '0.7rem 1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#181818', border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {order.products?.image_url ? <img src={order.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={12} style={{ color: C.muted }} />}
                          </div>
                          <span style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>{order.products?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem' }}>
                        <p style={{ color: C.dim, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>{order.profiles?.full_name || '—'}</p>
                        {order.profiles?.phone && <p style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif' }}>{order.profiles.phone}</p>}
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem', color: C.dim, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>×{order.quantity || 1}</td>
                      <td style={{ padding: '0.7rem 1.1rem' }}>
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 600, textTransform: 'capitalize' }}>{order.status === 'active' ? 'Awaiting Pickup' : order.status}</span>
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem' }}>
                        {order.payment_status === 'paid'
                          ? <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Paid</span>
                          : <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Unpaid</span>
                        }
                      </td>
                      <td style={{ padding: '0.7rem 1.1rem', color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>{order.products?.price ? `€${order.products.price}` : '—'}</td>
                      <td style={{ padding: '0.7rem 1.1rem', fontFamily: 'Jost,sans-serif', fontSize: '0.8rem', color: order.payment_status === 'paid' ? C.gold : C.muted, fontWeight: order.payment_status === 'paid' ? 600 : 400 }}>
                        {order.products?.price ? `€${lineTotal.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {paidOrders.length > 0 && !search && (
                <tfoot>
                  <tr style={{ borderTop: `1px solid ${C.goldBorder}`, background: C.goldBg }}>
                    <td colSpan={6} style={{ padding: '0.6rem 1.1rem', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>Revenue — paid via Stripe ({paidOrders.length})</td>
                    <td style={{ padding: '0.6rem 1.1rem', color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 700, fontSize: '0.88rem' }}>€{productsRevenue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )
        )}
      </div>

      <style>{`
        .s-nav-btn:hover   { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .s-today-btn:hover { background: ${C.gold} !important; color: #000 !important; }
        .s-search:focus    { border-color: ${C.goldBorder} !important; }
        .s-row:hover       { background: rgba(255,255,255,0.02); }
        .bar-col:hover .bar-fill  { filter: brightness(1.3); }
        .bar-col:hover .bar-label { color: rgba(255,255,255,0.6) !important; }
      `}</style>
    </div>
  )
}

/* ── Period chart (week / month) ─────────────────── */
function PeriodChart({ appointments, preorders, start, end, mode }) {
  const days = eachDayOfInterval({ start, end: addDays(end, -1) })
  // Cap month view to avoid too many bars
  const displayed = mode === 'month' ? days : days

  const data = displayed.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const apptRev = appointments
      .filter(a => a.payment_status === 'paid' && a.created_at?.startsWith(dayStr))
      .reduce((s, a) => s + (parseFloat(a.services?.price) || 0), 0)
    const ordRev = preorders
      .filter(p => p.payment_status === 'paid' && p.created_at?.startsWith(dayStr))
      .reduce((s, p) => s + (parseFloat(p.products?.price) || 0) * (p.quantity || 1), 0)
    return { day, label: mode === 'month' ? format(day, 'd') : format(day, 'EEE'), total: apptRev + ordRev, apptRev, ordRev }
  })

  const maxVal = Math.max(1, ...data.map(d => d.total))
  const isToday = (day) => format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: mode === 'month' ? 2 : 5, height: 72 }}>
        {data.map(({ day, total, apptRev }, i) => {
          const heightPct = total === 0 ? 0 : Math.max(5, (total / maxVal) * 100)
          const today = isToday(day)
          return (
            <div key={i} className="bar-col" title={`€${total.toFixed(2)}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end', cursor: 'default' }}>
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%', position: 'relative' }}>
                {total === 0
                  ? <div style={{ width: '100%', height: 3, background: today ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                  : (
                    <motion.div className="bar-fill"
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.55, delay: i * 0.02, ease: [0.22, 1, 0.36, 1] }}
                      style={{ width: '100%', background: today ? `linear-gradient(to top, ${C.gold}, ${C.gold}88)` : 'linear-gradient(to top, #34d399, #34d39966)', borderRadius: '3px 3px 0 0', position: 'relative', transition: 'filter .2s' }}>
                      {total > 0 && mode !== 'month' && (
                        <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: today ? C.gold : '#34d399', fontFamily: 'Jost,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          €{total.toFixed(0)}
                        </span>
                      )}
                    </motion.div>
                  )
                }
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: mode === 'month' ? 2 : 5 }}>
        {data.map(({ day, label, total }, i) => {
          const today = isToday(day)
          return (
            <div key={i} className="bar-label" style={{ flex: 1, textAlign: 'center', fontSize: mode === 'month' ? 7 : 8, color: today ? C.goldDim : total > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', fontFamily: 'Jost,sans-serif', transition: 'color .2s', fontWeight: today ? 700 : 400 }}>
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Hourly chart (day view) ─────────────────────── */
function HourlyChart({ appointments, hours }) {
  const counts = hours.map(h => {
    const hStr = String(h).padStart(2, '0')
    const slot  = appointments.filter(a => a.time?.startsWith(hStr))
    return { h, total: slot.length, completed: slot.filter(a => a.status === 'completed').length, confirmed: slot.filter(a => a.status === 'confirmed').length, pending: slot.filter(a => a.status === 'pending').length }
  })
  const maxCount = Math.max(1, ...counts.map(c => c.total))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 72 }}>
        {counts.map(({ h, total, completed, confirmed, pending }, i) => {
          const heightPct = total === 0 ? 0 : Math.max(6, (total / maxCount) * 100)
          const color = completed > 0 ? C.gold : confirmed > 0 ? '#34d399' : pending > 0 ? '#f59e0b' : null
          return (
            <div key={h} className="bar-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%', position: 'relative' }}>
                {total === 0
                  ? <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                  : (
                    <motion.div className="bar-fill"
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.55, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      style={{ width: '100%', background: color ? `linear-gradient(to top, ${color}, ${color}88)` : 'rgba(255,255,255,0.12)', borderRadius: '3px 3px 0 0', position: 'relative', transition: 'filter .2s' }}>
                      {total > 0 && <span style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: color || C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>{total}</span>}
                    </motion.div>
                  )
                }
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {counts.map(({ h, total }) => (
          <div key={h} className="bar-label" style={{ flex: 1, textAlign: 'center', fontSize: 8, color: total > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', fontFamily: 'Jost,sans-serif', transition: 'color .2s' }}>{h}h</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
        {[['completed', C.gold], ['confirmed', '#34d399'], ['pending', '#f59e0b']].map(([s, col]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 1, background: col }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif', textTransform: 'capitalize', letterSpacing: '0.1em' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Status breakdown ────────────────────────────── */
function StatusBreakdown({ appointments }) {
  const total   = appointments.length
  const statuses = ['completed', 'confirmed', 'pending', 'cancelled']
  const counts  = statuses.map(s => ({ s, n: appointments.filter(a => a.status === s).length, col: APPT_COLORS[s] }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        {total > 0 && counts.map(({ s, n, col }) => n === 0 ? null : (
          <motion.div key={s} initial={{ width: 0 }} animate={{ width: `${(n / total) * 100}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%', background: col }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {counts.map(({ s, n, col }) => (
          <div key={s} style={{ background: `${col}10`, border: `1px solid ${col}22`, borderRadius: 9, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', color: n > 0 ? col : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'capitalize', color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>{s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Revenue split ───────────────────────────────── */
function RevenueSplit({ servicesRevenue, productsRevenue, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${(servicesRevenue / total) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%', background: 'linear-gradient(90deg, #34d399, #34d39988)' }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${(productsRevenue / total) * 100}%` }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%', background: 'linear-gradient(90deg, #a78bfa88, #a78bfa)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#34d399' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif' }}>Services <span style={{ color: '#34d399', fontWeight: 600 }}>€{servicesRevenue.toFixed(2)}</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#a78bfa' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif' }}>Products <span style={{ color: '#a78bfa', fontWeight: 600 }}>€{productsRevenue.toFixed(2)}</span></span>
        </div>
      </div>
    </div>
  )
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function Skeleton({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => <div key={i} style={{ height: 52, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} className="shimmer" />)}
    </div>
  )
}

function Empty({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
      <Icon size={22} style={{ color: 'rgba(255,255,255,0.07)' }} />
      <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>{text}</p>
    </div>
  )
}
