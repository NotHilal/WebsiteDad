import { useState, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, ChevronDown, Trash2, AlertTriangle, Eye, EyeOff, ChevronRight, Calendar, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, isToday, isTomorrow, isPast, parseISO, startOfWeek, endOfWeek, isSameMonth } from 'date-fns'
import toast from 'react-hot-toast'
import Pager from '../../lib/Pager'

const C = {
  bg:     '#0e0e14',
  card:   '#161620',
  card2:  '#1a1a26',
  gold:   '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white:  '#f0f0f0', dim: 'rgba(255,255,255,0.55)', muted: 'rgba(255,255,255,0.28)', faint: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.07)',
}

const STATUS_CFG = {
  confirmed: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', label: 'Confirmed' },
  completed: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  label: 'Completed' },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label: 'Cancelled' },
}
const ALL_STATUSES = ['confirmed', 'completed', 'cancelled']

function dateLabel(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d))    return { text: 'Today',    accent: true  }
  if (isTomorrow(d)) return { text: 'Tomorrow', accent: false }
  return { text: format(d, 'MMM d, yyyy'), accent: false }
}

function StatusDropdown({ appt, onUpdate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.confirmed

  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 8px', borderRadius: 8, cursor: 'pointer', background: cfg.bg, border: `1px solid ${open ? cfg.color : cfg.border}`, transition: 'all .15s' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: cfg.color, fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.04em' }}>{cfg.label}</span>
        <ChevronDown size={10} style={{ color: cfg.color, opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100, background: '#1e1e2e', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', minWidth: 140, boxShadow: '0 12px 40px rgba(0,0,0,0.55)' }}>
          {ALL_STATUSES.filter(s => s !== appt.status).map(s => {
            const c = STATUS_CFG[s]
            return (
              <button key={s} onClick={() => { onUpdate(appt.id, s); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background .12s', textAlign: 'left' }}
                className="dd-opt">
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: c.color, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{c.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function StudioAppointmentsList() {
  const { user, isAdmin }               = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [details,      setDetails]      = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletePass,   setDeletePass]   = useState('')
  const [deleteError,  setDeleteError]  = useState(false)
  const [showPass,     setShowPass]     = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [page,         setPage]         = useState(0)

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    if (isAdmin) {
      const { data } = await supabase
        .from('appointments')
        .select('*, profiles(full_name, phone), services(name, price, duration), stylists(name)')
        .order('date', { ascending: false })
        .order('time', { ascending: true })
      setAppointments(data || [])
    } else {
      const { data: linked } = await supabase.from('stylists').select('id').eq('profile_id', user.id).single()
      if (linked) {
        const { data } = await supabase
          .from('appointments')
          .select('*, profiles(full_name, phone), services(name, price, duration), stylists(name)')
          .eq('stylist_id', linked.id)
          .order('date', { ascending: false })
          .order('time', { ascending: true })
        setAppointments(data || [])
      }
    }
    setLoading(false)
  }

  function openDelete(appt) { setDeleteTarget(appt); setDeletePass(''); setDeleteError(false); setShowPass(false) }
  function closeDelete()     { setDeleteTarget(null); setDeletePass(''); setDeleteError(false) }

  async function confirmDelete() {
    if (deletePass !== 'hairgo24') { setDeleteError(true); return }
    setDeleting(true)
    const { error } = await supabase.from('appointments').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (error) { toast.error(error.message); return }
    setAppointments(prev => prev.filter(a => a.id !== deleteTarget.id))
    setDetails(null)
    toast.success('Appointment deleted')
    closeDelete()
  }

  async function updateStatus(id, newStatus) {
    const appt = appointments.find(a => a.id === id)
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id)
    if (error) { toast.error(error.message); return }
    const updated = { ...appt, status: newStatus }
    setAppointments(prev => prev.map(a => a.id === id ? updated : a))
    if (details?.id === id) setDetails(updated)

    if (newStatus === 'completed' && appt?.status !== 'completed' && appt?.user_id) {
      const { data: prof } = await supabase.from('profiles').select('points').eq('id', appt.user_id).single()
      const newCount = (prof?.points || 0) + 1
      await supabase.from('profiles').update({ points: newCount }).eq('id', appt.user_id)
      if (newCount % 5 === 0) {
        const code = `REWARD${Math.random().toString(36).slice(2, 7).toUpperCase()}`
        const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 3)
        const { data: coupon } = await supabase.from('coupons').insert({
          code, discount_type: 'percentage', discount_value: 30,
          min_points_required: 0, expiry_date: expiry.toISOString().split('T')[0],
          max_uses: 1, active: true,
        }).select().single()
        if (coupon) {
          await supabase.from('user_coupons').insert({ user_id: appt.user_id, coupon_id: coupon.id, used: false })
          toast.success(`Visit ${newCount} — 30% reward sent to ${appt.profiles?.full_name || 'client'}`)
        }
      } else {
        toast.success(`Visit ${newCount % 5}/5 — ${5 - (newCount % 5)} more to unlock 30% off`)
      }
    } else {
      toast.success(`Marked as ${STATUS_CFG[newStatus]?.label}`)
    }
  }

  const counts = useMemo(() =>
    ALL_STATUSES.reduce((acc, s) => { acc[s] = appointments.filter(a => a.status === s).length; return acc }, {}),
    [appointments]
  )

  const filtered = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 })
    return appointments.filter(a => {
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      const q = search.toLowerCase()
      const matchSearch = !q ||
        a.profiles?.full_name?.toLowerCase().includes(q) ||
        a.profiles?.phone?.includes(q) ||
        a.services?.name?.toLowerCase().includes(q) ||
        a.stylists?.name?.toLowerCase().includes(q)
      let matchPeriod = true
      if (periodFilter === 'day')   matchPeriod = a.date === todayStr
      else if (periodFilter === 'week') {
        const d = parseISO(a.date)
        matchPeriod = d >= weekStart && d <= weekEnd
      }
      else if (periodFilter === 'month') matchPeriod = isSameMonth(parseISO(a.date), now)
      return matchStatus && matchSearch && matchPeriod
    })
  }, [appointments, search, statusFilter, periodFilter])

  const PER_PAGE = window.innerWidth < 768 ? 6 : 10
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const statCards = [
    { s: 'confirmed', label: 'Confirmed', cfg: STATUS_CFG.confirmed },
    { s: 'completed', label: 'Completed', cfg: STATUS_CFG.completed },
    { s: 'cancelled', label: 'Cancelled', cfg: STATUS_CFG.cancelled },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.6rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .al-row:hover { background: rgba(255,255,255,0.02) !important; }
        .al-row:hover .al-info-btn { border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .al-search:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.07); }
        .al-pill:hover  { border-color: rgba(255,255,255,0.18) !important; color: rgba(255,255,255,0.7) !important; }
        .dd-opt:hover   { background: rgba(255,255,255,0.05) !important; }
        .stat-card:hover { border-color: rgba(255,255,255,0.12) !important; transform: translateY(-1px); }
        .del-row-btn:hover { color: #f87171 !important; border-color: rgba(248,113,113,0.25) !important; background: rgba(248,113,113,0.08) !important; }
        @media (max-width: 480px) {
          .stat-card { padding: 0.45rem 0.55rem !important; }
          .stat-card .stat-num { font-size: 1.05rem !important; }
          .stat-card .stat-lbl { font-size: 8px !important; letter-spacing: 0.08em !important; }
          .al-row { padding: 0.75rem 0.875rem !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.3rem,2vw,1.7rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Appointments</h1>
          <span style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{appointments.length} total</span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', flexShrink: 0 }}>
        {statCards.map(({ s, label, cfg }) => (
          <button key={s} className="stat-card"
            onClick={() => { setStatusFilter(statusFilter === s ? 'all' : s); setPage(0) }}
            style={{ background: statusFilter === s ? cfg.bg : C.card, border: `1px solid ${statusFilter === s ? cfg.border : C.border}`, borderRadius: 10, padding: '0.55rem 0.875rem', cursor: 'pointer', textAlign: 'left', transition: 'all .18s', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            <div className="font-display stat-num" style={{ fontSize: '1.25rem', color: loading ? C.border : C.white, lineHeight: 1 }}>{loading ? '—' : counts[s]}</div>
            <p className="stat-lbl" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: statusFilter === s ? cfg.color : C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, flex: 1 }}>{label}</p>
            {statusFilter === s && <X size={9} style={{ color: cfg.color, opacity: 0.7, flexShrink: 0 }} />}
          </button>
        ))}
      </div>

      {/* ── Period filter ── */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {[
          { key: 'all',   label: 'All time'   },
          { key: 'day',   label: 'Today'      },
          { key: 'week',  label: 'This week'  },
          { key: 'month', label: 'This month' },
        ].map(({ key, label }) => {
          const active = periodFilter === key
          return (
            <button key={key} onClick={() => { setPeriodFilter(key); setPage(0) }}
              className="al-pill"
              style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? C.goldBorder : 'rgba(255,255,255,0.12)'}`, background: active ? C.goldBg : 'rgba(255,255,255,0.04)', color: active ? C.gold : 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Jost,sans-serif', fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.04em' }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Search ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by client, phone, service or stylist…" autoComplete="off" className="al-search"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.42rem 0.875rem 0.42rem 2.1rem', fontSize: '0.8rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'all .2s', boxSizing: 'border-box' }} />
          {search && (
            <button onClick={() => { setSearch(''); setPage(0) }}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}>
              <X size={13} />
            </button>
          )}
        </div>
        {(search || statusFilter !== 'all' || periodFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setPeriodFilter('all'); setPage(0) }} className="al-pill"
            style={{ padding: '0.48rem 1rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
            Clear all
          </button>
        )}
      </div>

      {!loading && (search || statusFilter !== 'all' || periodFilter !== 'all') && (
        <p style={{ flexShrink: 0, fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif', marginTop: -4 }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' && <span style={{ color: STATUS_CFG[statusFilter]?.color }}> · {STATUS_CFG[statusFilter]?.label}</span>}
          {search && <span> matching "<span style={{ color: C.dim }}>{search}</span>"</span>}
        </p>
      )}

      {/* ── List ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
        {loading ? (
          <div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.card2 }} className="shimmer" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 11, width: '38%', borderRadius: 4, background: C.card2 }} className="shimmer" />
                  <div style={{ height: 9, width: '55%', borderRadius: 4, background: C.card2 }} className="shimmer" />
                </div>
                <div style={{ height: 26, width: 100, borderRadius: 8, background: C.card2 }} className="shimmer" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={22} style={{ color: C.faint }} />
            </div>
            <p style={{ color: C.dim, fontSize: '0.88rem', fontFamily: 'Jost,sans-serif' }}>
              {search || statusFilter !== 'all' ? 'No appointments match your search' : 'No appointments yet'}
            </p>
            {(search || statusFilter !== 'all' || periodFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setPeriodFilter('all'); setPage(0) }}
                style={{ padding: '6px 18px', borderRadius: 20, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.goldDim, fontSize: 11, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>{paged.map((appt, i) => {
            const { text: dateText, accent } = dateLabel(appt.date)
            const initials = appt.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
            const isPastAppt = isPast(parseISO(`${appt.date}T${appt.time || '23:59'}`))
            const cfg = STATUS_CFG[appt.status] || STATUS_CFG.confirmed

            return (
              <div key={appt.id} className="al-row"
                style={{ padding: '0.875rem 1.25rem', borderBottom: i < paged.length - 1 ? `1px solid ${C.border}` : 'none', borderLeft: `3px solid ${accent ? cfg.color : 'transparent'}`, transition: 'background .15s' }}>

                {/* Line 1: avatar + name + status + info btn */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${cfg.color}22,${cfg.color}0e)`, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: cfg.color, fontFamily: '"Cormorant Garamond",serif', fontWeight: 600 }}>{initials}</span>
                  </div>
                  <p style={{ flex: 1, color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0 }}>
                    {appt.profiles?.full_name || <span style={{ color: C.muted, fontStyle: 'italic' }}>Unknown</span>}
                  </p>
                  <StatusDropdown appt={appt} onUpdate={updateStatus} />
                  <button onClick={() => setDetails(appt)} className="al-info-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 9px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}>
                    Info <ChevronRight size={9} />
                  </button>
                  {isAdmin && (
                    <button onClick={() => openDelete(appt)} className="del-row-btn"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.4)', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>

                {/* Line 2: metadata chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', paddingLeft: 38 }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: accent ? C.gold : 'rgba(255,255,255,0.38)', fontWeight: accent ? 600 : 400 }}>{dateText}</span>
                  {appt.time && <>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                    <span style={{ fontSize: '0.7rem', color: isPastAppt && appt.status !== 'completed' ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif' }}>{appt.time.slice(0, 5)}</span>
                  </>}
                  {appt.services?.name && <>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 160 }}>{appt.services.name}</span>
                  </>}
                  {appt.stylists?.name && <>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'Jost,sans-serif' }}>{appt.stylists.name}</span>
                  </>}
                  {appt.services?.price && <>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: appt.status === 'completed' ? C.gold : 'rgba(255,255,255,0.32)', fontWeight: appt.status === 'completed' ? 600 : 400 }}>€{appt.services.price}</span>
                  </>}
                </div>
              </div>
            )
          })}<Pager page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} /></>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p style={{ flexShrink: 0, fontSize: '0.7rem', color: C.muted, fontFamily: 'Jost,sans-serif', textAlign: 'right', opacity: 0.5 }}>
          {filtered.length} of {appointments.length} appointments
        </p>
      )}

      {/* ── Details modal ── */}
      <AnimatePresence>
        {details && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            onMouseDown={e => { if (e.target === e.currentTarget) setDetails(null) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 460, background: '#12121c', border: `1px solid ${C.goldBorder}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.75)' }}>

              {(() => {
                const cfg = STATUS_CFG[details.status] || STATUS_CFG.confirmed
                const { text: dateText, accent } = dateLabel(details.date)
                const initials = details.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                const isPastAppt = isPast(parseISO(`${details.date}T${details.time || '23:59'}`))

                return (
                  <>
                    <div style={{ height: 3, background: `linear-gradient(90deg,${C.gold},#C4956A,rgba(201,168,76,0.15))` }} />
                    <div style={{ padding: '1.5rem' }}>

                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div>
                          <h2 className="font-display" style={{ fontSize: '1.5rem', color: C.white, fontWeight: 400, lineHeight: 1.1, marginBottom: 4 }}>Appointment</h2>
                          <span style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.06em' }}>
                            {format(parseISO(details.date), 'EEEE, MMMM d yyyy')}
                          </span>
                        </div>
                        <button onClick={() => setDetails(null)}
                          style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <X size={13} />
                        </button>
                      </div>

                      {/* Client */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: '0.875rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg,${cfg.color}28,${cfg.color}14)`, border: `1px solid ${cfg.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 14, color: cfg.color, fontFamily: '"Cormorant Garamond",serif', fontWeight: 600 }}>{initials}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: C.white, fontSize: '0.9rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 2 }}>
                            {details.profiles?.full_name || 'Unknown client'}
                          </p>
                          {details.profiles?.phone && (
                            <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif' }}>{details.profiles.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Info grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.875rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                            <Calendar size={10} color={C.muted} />
                            <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Date</p>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: accent ? C.gold : C.white, fontFamily: 'Jost,sans-serif', fontWeight: accent ? 600 : 400 }}>{dateText}</p>
                          <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif', marginTop: 2 }}>{format(parseISO(details.date), 'EEEE')}</p>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                            <Clock size={10} color={C.muted} />
                            <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Time</p>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: isPastAppt && details.status !== 'completed' ? 'rgba(248,113,113,0.7)' : C.white, fontFamily: 'Jost,sans-serif' }}>
                            {details.time?.slice(0, 5) || '—'}
                          </p>
                          {details.services?.duration && (
                            <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif', marginTop: 2 }}>{details.services.duration} min</p>
                          )}
                        </div>
                      </div>

                      {/* Service + stylist */}
                      {(details.services || details.stylists) && (
                        <div style={{ padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: '0.875rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 4 }}>Service</p>
                              <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {details.services?.name || '—'}
                              </p>
                              {details.stylists?.name && (
                                <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>with {details.stylists.name}</p>
                              )}
                            </div>
                            {details.services?.price && (
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 4 }}>Price</p>
                                <span className="font-display" style={{ fontSize: '1.3rem', color: details.status === 'completed' ? C.gold : C.dim }}>€{details.services.price}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status + actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: `${cfg.bg}`, border: `1px solid ${cfg.border}`, borderRadius: 10, marginBottom: isAdmin ? '0.875rem' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 8px ${cfg.color}88`, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: cfg.color, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Status</span>
                        </div>
                        <StatusDropdown appt={details} onUpdate={updateStatus} />
                      </div>

                      {/* Delete — admin only */}
                      {isAdmin && (
                        <button onClick={() => openDelete(details)} className="del-row-btn"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.55)', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'all .18s', letterSpacing: '0.06em' }}>
                          <Trash2 size={12} /> Delete Appointment
                        </button>
                      )}
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            onMouseDown={e => { if (e.target === e.currentTarget) closeDelete() }}>
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 420, background: '#12121c', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg,#f87171,#ef4444)' }} />
              <div style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={18} color="#f87171" />
                  </div>
                  <div>
                    <h3 style={{ color: C.white, fontFamily: '"Cormorant Garamond",serif', fontSize: '1.35rem', fontWeight: 500, marginBottom: 4 }}>Delete appointment?</h3>
                    <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', lineHeight: 1.5 }}>This action is permanent and cannot be undone.</p>
                  </div>
                </div>
                <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
                  <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 4 }}>
                    {deleteTarget.profiles?.full_name || 'Unknown client'}
                  </p>
                  <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif' }}>
                    {[deleteTarget.services?.name, deleteTarget.date ? format(parseISO(deleteTarget.date), 'MMM d, yyyy') : null, deleteTarget.time?.slice(0, 5)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 8 }}>
                    Enter password to confirm
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={deletePass}
                      onChange={e => { setDeletePass(e.target.value); setDeleteError(false) }}
                      onKeyDown={e => e.key === 'Enter' && confirmDelete()}
                      placeholder="••••••" autoComplete="new-password" autoFocus
                      style={{ width: '100%', boxSizing: 'border-box', background: deleteError ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${deleteError ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 9, padding: '0.6rem 2.5rem 0.6rem 0.875rem', fontSize: '0.88rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', transition: 'border-color .15s', letterSpacing: showPass ? 'normal' : '0.2em' }} />
                    <button onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {deleteError && <p style={{ marginTop: 6, fontSize: '0.72rem', color: '#f87171', fontFamily: 'Jost,sans-serif' }}>Incorrect password. Try again.</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={closeDelete} className="al-pill"
                    style={{ flex: 1, padding: '0.65rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .15s' }}>
                    Cancel
                  </button>
                  <button onClick={confirmDelete} disabled={deleting || !deletePass}
                    style={{ flex: 1, padding: '0.65rem', borderRadius: 9, border: 'none', cursor: deleting || !deletePass ? 'not-allowed' : 'pointer', background: deletePass ? 'linear-gradient(135deg,#f87171,#ef4444)' : 'rgba(248,113,113,0.15)', color: deletePass ? '#fff' : 'rgba(248,113,113,0.4)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .2s', opacity: deleting ? 0.6 : 1 }}>
                    {deleting ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <><Trash2 size={13} /> Delete</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
