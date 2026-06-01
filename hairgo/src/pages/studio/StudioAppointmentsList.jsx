import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, ChevronDown, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

/* ── Design tokens ─────────────────────────────────── */
const C = {
  bg:     '#0e0e14',
  card:   '#161620',
  card2:  '#1a1a26',
  gold:   '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white:  '#f0f0f0', dim: 'rgba(255,255,255,0.55)', muted: 'rgba(255,255,255,0.28)', faint: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.07)',
}

const STATUS_CFG = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  label: 'Pending'   },
  confirmed: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  label: 'Confirmed' },
  completed: { color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.25)',  label: 'Completed' },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label: 'Cancelled' },
}
const ALL_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

function dateLabel(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d))    return { text: 'Today',    accent: true }
  if (isTomorrow(d)) return { text: 'Tomorrow', accent: false }
  return { text: format(d, 'MMM d, yyyy'), accent: false }
}

/* ── Inline status dropdown ────────────────────────── */
function StatusDropdown({ appt, onUpdate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.pending

  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px 5px 8px', borderRadius: 8, cursor: 'pointer',
          background: cfg.bg, border: `1px solid ${open ? cfg.color : cfg.border}`,
          transition: 'all .15s',
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }}
          className={appt.status === 'pending' ? 'dot-pulse' : ''} />
        <span style={{ fontSize: 11, color: cfg.color, fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.04em' }}>
          {cfg.label}
        </span>
        <ChevronDown size={10} style={{ color: cfg.color, opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#1e1e2e', border: `1px solid ${C.border}`,
          borderRadius: 10, overflow: 'hidden', minWidth: 140,
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}>
          {ALL_STATUSES.filter(s => s !== appt.status).map(s => {
            const c = STATUS_CFG[s]
            return (
              <button key={s} onClick={() => { onUpdate(appt.id, s); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background .12s', textAlign: 'left',
                }}
                className="dd-opt"
              >
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

/* ── Main page ─────────────────────────────────────── */
export default function StudioAppointmentsList() {
  const [appointments, setAppointments] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)  // appointment to delete
  const [deletePass,   setDeletePass]   = useState('')
  const [deleteError,  setDeleteError]  = useState(false)
  const [showPass,     setShowPass]     = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles(full_name, phone), services(name, price, duration), stylists(name)')
      .order('date', { ascending: false })
      .order('time', { ascending: true })
    setAppointments(data || [])
    setLoading(false)
  }

  function openDelete(appt) {
    setDeleteTarget(appt)
    setDeletePass('')
    setDeleteError(false)
    setShowPass(false)
  }

  function closeDelete() {
    setDeleteTarget(null)
    setDeletePass('')
    setDeleteError(false)
  }

  async function confirmDelete() {
    if (deletePass !== '123') { setDeleteError(true); return }
    setDeleting(true)
    const { error } = await supabase.from('appointments').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (error) { toast.error(error.message); return }
    setAppointments(prev => prev.filter(a => a.id !== deleteTarget.id))
    toast.success('Appointment deleted')
    closeDelete()
  }

  async function updateStatus(id, newStatus) {
    const appt = appointments.find(a => a.id === id)
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))

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

  const filtered = useMemo(() => appointments.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      a.profiles?.full_name?.toLowerCase().includes(q) ||
      a.profiles?.phone?.includes(q) ||
      a.services?.name?.toLowerCase().includes(q) ||
      a.stylists?.name?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  }), [appointments, search, statusFilter])

  const statCards = [
    { s: 'pending',   label: 'Awaiting',  cfg: STATUS_CFG.pending   },
    { s: 'confirmed', label: 'Confirmed', cfg: STATUS_CFG.confirmed  },
    { s: 'completed', label: 'Completed', cfg: STATUS_CFG.completed  },
    { s: 'cancelled', label: 'Cancelled', cfg: STATUS_CFG.cancelled  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        @keyframes dot-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dot-pulse { animation: dot-pulse 1.6s ease-in-out infinite; }
        .al-row:hover { background: rgba(255,255,255,0.02) !important; }
        .al-row:hover .al-row-border { opacity: 1 !important; }
        .al-search:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.07); }
        .al-pill:hover  { border-color: rgba(255,255,255,0.18) !important; color: rgba(255,255,255,0.7) !important; }
        .dd-opt:hover    { background: rgba(255,255,255,0.05) !important; }
        .stat-card:hover { border-color: rgba(255,255,255,0.12) !important; transform: translateY(-1px); }
        .del-btn:hover   { background: rgba(248,113,113,0.1) !important; border-color: rgba(248,113,113,0.25) !important; color: #f87171 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.2rem' }}>
            Appointments
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{appointments.length} total</span>
            {counts.pending > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#f59e0b', fontFamily: 'Jost,sans-serif', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: 20 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} className="dot-pulse" />
                {counts.pending} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.6rem', flexShrink: 0 }}>
        {statCards.map(({ s, label, cfg }) => (
          <button key={s} className="stat-card"
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            style={{
              background: statusFilter === s ? cfg.bg : C.card,
              border: `1px solid ${statusFilter === s ? cfg.border : C.border}`,
              borderRadius: 12, padding: '0.875rem 1rem', cursor: 'pointer',
              textAlign: 'left', transition: 'all .18s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} className={s === 'pending' ? 'dot-pulse' : ''} />
              {statusFilter === s && <X size={10} style={{ color: cfg.color, opacity: 0.7 }} />}
            </div>
            <div className="font-display" style={{ fontSize: '1.6rem', color: loading ? C.border : C.white, lineHeight: 1, marginBottom: 3 }}>
              {loading ? '—' : counts[s]}
            </div>
            <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: statusFilter === s ? cfg.color : C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
              {label}
            </p>
          </button>
        ))}
      </div>

      {/* ── Search + active filter info ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by client name, phone, service or stylist…"
            autoComplete="off"
            className="al-search"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.55rem 0.875rem 0.55rem 2.2rem', fontSize: '0.82rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'all .2s', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}>
              <X size={13} />
            </button>
          )}
        </div>
        {(search || statusFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStatusFilter('all') }}
            style={{ padding: '0.48rem 1rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}
            className="al-pill">
            Clear all
          </button>
        )}
      </div>

      {/* ── Result count hint ── */}
      {!loading && (search || statusFilter !== 'all') && (
        <p style={{ flexShrink: 0, fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif', marginTop: -6 }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' && <span style={{ color: STATUS_CFG[statusFilter]?.color }}> · {STATUS_CFG[statusFilter]?.label}</span>}
          {search && <span> matching "<span style={{ color: C.dim }}>{search}</span>"</span>}
        </p>
      )}

      {/* ── Table ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.card2 }} className="shimmer" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 11, width: '35%', borderRadius: 4, background: C.card2 }} className="shimmer" />
                  <div style={{ height: 9, width: '22%', borderRadius: 4, background: C.card2 }} className="shimmer" />
                </div>
                <div style={{ height: 9, width: 70, borderRadius: 4, background: C.card2 }} className="shimmer" />
                <div style={{ height: 24, width: 90, borderRadius: 8, background: C.card2 }} className="shimmer" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={22} style={{ color: C.faint }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: C.dim, fontSize: '0.88rem', fontFamily: 'Jost,sans-serif', marginBottom: 4 }}>
                {search || statusFilter !== 'all' ? 'No appointments match your search' : 'No appointments yet'}
              </p>
              {(search || statusFilter !== 'all') && (
                <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif' }}>Try adjusting your filters</p>
              )}
            </div>
            {(search || statusFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setStatusFilter('all') }}
                style={{ padding: '6px 18px', borderRadius: 20, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.goldDim, fontSize: 11, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.1fr 140px 160px 40px', gap: 0, padding: '0.5rem 1.25rem', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.015)' }}>
              {['Date & Time', 'Client', 'Service & Stylist', 'Price', 'Status', ''].map(h => (
                <span key={h} style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((appt, i) => {
              const { text: dateText, accent } = dateLabel(appt.date)
              const initials = appt.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
              const isPastAppt = isPast(parseISO(`${appt.date}T${appt.time || '23:59'}`))
              const cfg = STATUS_CFG[appt.status] || STATUS_CFG.pending

              return (
                <div key={appt.id} className="al-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.1fr 140px 160px 40px',
                    alignItems: 'center', gap: 0,
                    padding: '0.875rem 1.25rem',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                    borderLeft: `3px solid ${accent ? cfg.color : 'transparent'}`,
                    transition: 'background .15s, border-left-color .15s',
                    position: 'relative',
                  }}>

                  {/* Date & Time */}
                  <div>
                    <p style={{ fontSize: '0.8rem', color: accent ? C.gold : C.dim, fontFamily: 'Jost,sans-serif', fontWeight: accent ? 600 : 400, marginBottom: 3 }}>
                      {dateText}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: isPastAppt && appt.status !== 'completed' ? 'rgba(248,113,113,0.6)' : C.muted, fontFamily: 'Jost,sans-serif' }}>
                      {appt.time?.slice(0, 5) || '—'}
                    </p>
                  </div>

                  {/* Client */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: cfg.color, fontFamily: '"Cormorant Garamond",serif', fontWeight: 600 }}>{initials}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: C.white, fontSize: '0.83rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                        {appt.profiles?.full_name || <span style={{ color: C.muted, fontStyle: 'italic' }}>Unknown</span>}
                      </p>
                      {appt.profiles?.phone && (
                        <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{appt.profiles.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Service & Stylist */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: C.dim, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {appt.services?.name || '—'}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[appt.stylists?.name, appt.services?.duration ? `${appt.services.duration} min` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Price */}
                  <div>
                    {appt.services?.price
                      ? <span className="font-display" style={{ fontSize: '1.05rem', color: appt.status === 'completed' ? C.gold : C.dim }}>€{appt.services.price}</span>
                      : <span style={{ color: C.faint, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>—</span>
                    }
                  </div>

                  {/* Status dropdown */}
                  <div>
                    <StatusDropdown appt={appt} onUpdate={updateStatus} />
                  </div>

                  {/* Delete */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => openDelete(appt)} className="del-btn"
                      style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid transparent`, color: 'rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>

                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p style={{ flexShrink: 0, fontSize: '0.7rem', color: C.muted, fontFamily: 'Jost,sans-serif', textAlign: 'right', opacity: 0.55 }}>
          {filtered.length} of {appointments.length} appointments
        </p>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div
          onClick={closeDelete}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, background: '#12121c', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

            {/* Red top bar */}
            <div style={{ height: 4, background: 'linear-gradient(90deg, #f87171, #ef4444)' }} />

            <div style={{ padding: '1.75rem' }}>
              {/* Icon + title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={18} color="#f87171" />
                </div>
                <div>
                  <h3 style={{ color: C.white, fontFamily: '"Cormorant Garamond",serif', fontSize: '1.35rem', fontWeight: 500, marginBottom: 4 }}>
                    Delete appointment?
                  </h3>
                  <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', lineHeight: 1.5 }}>
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              {/* Appointment summary */}
              <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
                <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 4 }}>
                  {deleteTarget.profiles?.full_name || 'Unknown client'}
                </p>
                <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif' }}>
                  {[
                    deleteTarget.services?.name,
                    deleteTarget.date ? format(parseISO(deleteTarget.date), 'MMM d, yyyy') : null,
                    deleteTarget.time?.slice(0, 5),
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Password input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 8 }}>
                  Enter password to confirm
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={deletePass}
                    onChange={e => { setDeletePass(e.target.value); setDeleteError(false) }}
                    onKeyDown={e => e.key === 'Enter' && confirmDelete()}
                    placeholder="••••••"
                    autoComplete="new-password"
                    autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: deleteError ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${deleteError ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 9, padding: '0.6rem 2.5rem 0.6rem 0.875rem',
                      fontSize: '0.88rem', color: C.white, outline: 'none',
                      fontFamily: 'Jost,sans-serif', transition: 'border-color .15s',
                      letterSpacing: showPass ? 'normal' : '0.2em',
                    }}
                  />
                  <button
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {deleteError && (
                  <p style={{ marginTop: 6, fontSize: '0.72rem', color: '#f87171', fontFamily: 'Jost,sans-serif' }}>
                    Incorrect password. Try again.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closeDelete}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .15s' }}
                  className="al-pill">
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={deleting || !deletePass}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 9, border: 'none', cursor: deleting || !deletePass ? 'not-allowed' : 'pointer',
                    background: deletePass ? 'linear-gradient(135deg, #f87171, #ef4444)' : 'rgba(248,113,113,0.15)',
                    color: deletePass ? '#fff' : 'rgba(248,113,113,0.4)',
                    fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all .2s', opacity: deleting ? 0.6 : 1,
                  }}>
                  {deleting
                    ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    : <><Trash2 size={13} /> Delete</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
