import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, MessageSquare, Tag, Calendar, Clock, X, Scissors, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  format, formatDistanceToNow, parseISO,
  addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay,
} from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  bg:     'var(--col-modal)',
  card:   'var(--col-modal)',
  gold:   'var(--col-acc)', goldDim: 'var(--col-acc)',
  goldBg: 'rgba(var(--rgb-acc),0.08)', goldBorder: 'rgba(var(--rgb-acc),0.18)',
  white:  'var(--col-text)', dim: 'var(--col-text)', muted: 'var(--col-text)',
  border: 'rgba(var(--rgb-hi),0.07)',
  shimA:  'var(--shimmer-a)',
}
const SLOTS = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']
const AMBER = { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.22)' }
const GREEN = { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.22)' }
const BLUE  = { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.22)' }

export default function StudioRescheduleRequests() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [requests,       setRequests]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [stylists,       setStylists]       = useState([])
  const [reschedModal,   setReschedModal]   = useState(null)
  const [reschedDate,    setReschedDate]    = useState('')
  const [reschedTime,    setReschedTime]    = useState('')
  const [reschedStylist, setReschedStylist] = useState('')
  const [reschedWorking,    setReschedWorking]    = useState(false)
  const [creditWorking,     setCreditWorking]     = useState(null)
  const [reschedMonth,      setReschedMonth]      = useState(new Date())
  const [rBlockedDates,     setRBlockedDates]     = useState([])
  const [rStylistDayOffs,   setRStylistDayOffs]   = useState([])
  const [rTakenSlots,       setRTakenSlots]       = useState([])
  const [rBlockedHours,     setRBlockedHours]     = useState([])

  useEffect(() => { load(); loadStylists() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        id, title, status, created_at, appointment_id,
        appointments!appointment_id(id, date, time, payment_status, services(name, price, duration), stylists(id, name)),
        profiles!user_id(full_name, email, phone),
        ticket_messages(id, content, is_from_admin, created_at)
      `)
      .not('appointment_id', 'is', null)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (error) console.error('load requests:', error)
    setRequests(data || [])
    setLoading(false)
  }

  async function loadStylists() {
    const { data } = await supabase.from('stylists').select('id, name').order('name')
    setStylists(data || [])
  }

  // Load global blocked dates when modal opens
  useEffect(() => {
    if (!reschedModal) return
    supabase.from('blocked_dates').select('date').is('stylist_id', null).eq('status', 'approved')
      .then(({ data }) => setRBlockedDates((data || []).map(b => b.date)))
  }, [reschedModal?.ticket?.id])

  // Load stylist-specific day-offs when stylist changes
  useEffect(() => {
    if (!reschedModal || !reschedStylist) { setRStylistDayOffs([]); return }
    supabase.from('blocked_dates').select('date').eq('stylist_id', reschedStylist).eq('status', 'approved')
      .then(({ data }) => setRStylistDayOffs((data || []).map(d => d.date)))
  }, [reschedStylist, reschedModal?.ticket?.id])

  // Load taken slots when date + stylist are both set
  useEffect(() => {
    if (!reschedModal || !reschedDate || !reschedStylist) { setRTakenSlots([]); setRBlockedHours([]); return }
    const apptId  = reschedModal.ticket?.appointment_id
    const duration = reschedModal.ticket?.appointments?.services?.duration || 60
    Promise.all([
      (async () => {
        let q = supabase.from('appointments').select('time, services(duration)').eq('stylist_id', reschedStylist).eq('date', reschedDate).neq('status', 'cancelled')
        if (apptId) q = q.neq('id', apptId)
        return q
      })(),
      supabase.from('blocked_hours').select('hour').eq('date', reschedDate).or(`stylist_id.eq.${reschedStylist},stylist_id.is.null`),
    ]).then(([{ data: appts }, { data: hours }]) => {
      const takenSet = new Set()
      for (const appt of (appts || [])) {
        const [ah, am] = appt.time.slice(0, 5).split(':').map(Number)
        const apptStart = ah * 60 + am
        const apptEnd   = apptStart + (appt.services?.duration || 60)
        for (const slot of SLOTS) {
          const [sh, sm] = slot.split(':').map(Number)
          const slotStart = sh * 60 + sm
          const slotEnd   = slotStart + duration
          if (slotStart < apptEnd && slotEnd > apptStart) takenSet.add(slot)
        }
      }
      setRTakenSlots([...takenSet])
      setRBlockedHours((hours || []).map(h => h.hour))
    })
  }, [reschedDate, reschedStylist, reschedModal?.ticket?.appointment_id])

  async function handleReschedule() {
    if (!reschedModal || !reschedDate || !reschedTime) return
    setReschedWorking(true)
    try {
      const { ticket } = reschedModal
      const updates = { date: reschedDate, time: reschedTime }
      if (reschedStylist) updates.stylist_id = reschedStylist
      await supabase.from('appointments').update(updates).eq('id', ticket.appointment_id)
      const stylist = stylists.find(s => s.id === reschedStylist)
      const dateStr = new Date(reschedDate + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long', month: 'long', day: 'numeric' })
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id, sender_id: user.id,
        content: `Your appointment has been rescheduled to ${dateStr} at ${reschedTime}${stylist ? ` with ${stylist.name}` : ''}. See you then! ✨`,
        is_from_admin: true, read: false,
      })
      await supabase.from('tickets').update({ status: 'resolved' }).eq('id', ticket.id)
      setRequests(prev => prev.filter(t => t.id !== ticket.id))
      setReschedModal(null)
      toast.success('Appointment rescheduled & client notified')
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule')
    } finally {
      setReschedWorking(false)
    }
  }

  async function handleCancelOnly(ticket) {
    setCreditWorking(ticket.id)
    try {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', ticket.appointment_id)
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id, sender_id: user.id,
        content: 'Your appointment has been cancelled. Please contact us if you have any questions.',
        is_from_admin: true, read: false,
      })
      await supabase.from('tickets').update({ status: 'resolved' }).eq('id', ticket.id)
      setRequests(prev => prev.filter(t => t.id !== ticket.id))
      toast.success('Appointment cancelled')
    } catch (err) {
      toast.error(err.message || 'Failed to cancel')
    } finally {
      setCreditWorking(null)
    }
  }

  async function handleIssueCredit(ticket) {
    setCreditWorking(ticket.id)
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { type: 'cancel-with-credit', id: ticket.appointment_id },
      })
      if (error) throw error
      const creditMsg = data?.couponCode
        ? `Your appointment has been cancelled. A store credit of $${data.creditAmount} (code: ${data.couponCode}) has been added to your account — use it anytime on your next booking!`
        : `Your appointment has been cancelled. No payment was on file so no credit was issued.`
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id, sender_id: user.id,
        content: creditMsg, is_from_admin: true, read: false,
      })
      await supabase.from('tickets').update({ status: 'resolved' }).eq('id', ticket.id)
      setRequests(prev => prev.filter(t => t.id !== ticket.id))
      toast.success(data?.couponCode ? `Credit ${data.couponCode} ($${data.creditAmount}) issued` : 'Appointment cancelled')
    } catch (err) {
      toast.error(err.message || 'Failed to issue credit')
    } finally {
      setCreditWorking(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .req-card { transition: border-color .2s, box-shadow .2s; }
        .req-card:hover { border-color: rgba(245,158,11,0.28) !important; box-shadow: 0 4px 24px rgba(0,0,0,0.18); }
        .req-act:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .req-chat:hover { background: rgba(96,165,250,0.18) !important; }
        .rsch-inp:focus { border-color: rgba(var(--rgb-acc),0.4) !important; outline: none; }
        @media (max-width: 640px) {
          .req-card-body   { padding: 0.875rem 1rem !important; }
          .req-info-grid   { grid-template-columns: 1fr !important; }
          .req-footer      { flex-direction: column !important; align-items: flex-start !important; }
          .req-actions     { flex-direction: column !important; width: 100% !important; }
          .req-actions button { width: 100% !important; justify-content: center !important; }
          .req-shimmer-grid { grid-template-columns: 1fr !important; }
          .req-modal-pad   { padding: 1.25rem !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.3rem,2vw,1.7rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.2rem' }}>
            Client Requests
          </h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'DM Sans,sans-serif', opacity: 0.7 }}>
            Reschedule & cancellation requests awaiting action
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!loading && requests.length > 0 && (
            <div style={{ padding: '4px 12px', borderRadius: 20, background: AMBER.bg, border: `1px solid ${AMBER.border}` }}>
              <span style={{ fontSize: 11, color: AMBER.color, fontFamily: 'DM Sans,sans-serif', fontWeight: 700, letterSpacing: '0.06em' }}>
                {requests.length} pending
              </span>
            </div>
          )}
          <button onClick={load} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: 11, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'all .15s', letterSpacing: '0.08em' }}>
            <RefreshCw size={11} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ height: 3, background: 'rgba(var(--rgb-hi),0.05)' }} />
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="req-shimmer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ height: 90, borderRadius: 8, background: C.shimA }} className="shimmer" />
                  <div style={{ height: 90, borderRadius: 8, background: C.shimA }} className="shimmer" />
                </div>
                <div style={{ height: 52, borderRadius: 8, background: C.shimA }} className="shimmer" />
                <div style={{ height: 36, borderRadius: 8, background: C.shimA }} className="shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4.5rem 1.5rem', gap: 14, textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={26} color={C.gold} strokeWidth={1.5} />
          </div>
          <div>
            <p style={{ color: C.white, fontSize: '0.95rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 500, marginBottom: 5 }}>All clear</p>
            <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'DM Sans,sans-serif', opacity: 0.6 }}>
              No pending reschedule or cancellation requests from clients.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <AnimatePresence mode="popLayout">
            {requests.map(ticket => {
              const appt   = ticket.appointments
              const client = ticket.profiles
              const msgs   = ticket.ticket_messages || []
              const clientMsg = msgs
                .filter(m => !m.is_from_admin)
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]
              const name     = client?.full_name || client?.email || 'Client'
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              const apptDate = appt?.date
                ? new Date(appt.date + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long', month: 'long', day: 'numeric' })
                : null
              const isCredit = creditWorking === ticket.id
              const timeAgo  = ticket.created_at
                ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })
                : ''

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="req-card"
                  style={{ borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>

                  {/* Amber accent bar */}
                  <div style={{ height: 3, background: 'linear-gradient(90deg, #f59e0b 0%, rgba(245,158,11,0.35) 100%)' }} />

                  <div className="req-card-body" style={{ padding: '1.25rem 1.5rem' }}>

                    {/* ── Info grid: client | appointment ── */}
                    <div className="req-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', alignItems: 'start' }}>

                      {/* Client */}
                      <div>
                        <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 10 }}>Client</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: AMBER.bg, border: `1px solid ${AMBER.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, color: AMBER.color, fontFamily: '"Cormorant Garamond",serif', fontWeight: 700 }}>{initials}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.88rem', color: C.white, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{name}</p>
                            {client?.email && (
                              <p style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', opacity: 0.7 }}>{client.email}</p>
                            )}
                            {client?.phone && (
                              <p style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'DM Sans,sans-serif', opacity: 0.7 }}>{client.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Appointment */}
                      <div style={{ padding: '0.875rem 1rem', borderRadius: 10, background: 'rgba(var(--rgb-hi),0.03)', border: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 9 }}>Appointment</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {apptDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <Calendar size={11} color={C.gold} style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.78rem', color: C.white, fontFamily: 'DM Sans,sans-serif' }}>{apptDate}</span>
                            </div>
                          )}
                          {appt?.time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <Clock size={11} color={C.muted} style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.78rem', color: C.dim, fontFamily: 'DM Sans,sans-serif' }}>
                                {appt.time.slice(0, 5)}{appt.services?.duration ? ` · ${appt.services.duration} min` : ''}
                              </span>
                            </div>
                          )}
                          {appt?.services?.name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <Scissors size={11} color={C.muted} style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '0.78rem', color: C.dim, fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {appt.services.name}{appt.stylists?.name ? ` · ${appt.stylists.name}` : ''}
                              </span>
                            </div>
                          )}
                          {appt?.payment_status && (
                            <div style={{ marginTop: 2, display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 6, background: appt.payment_status === 'paid' ? GREEN.bg : 'rgba(245,158,11,0.08)', border: `1px solid ${appt.payment_status === 'paid' ? GREEN.border : AMBER.border}` }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: appt.payment_status === 'paid' ? GREEN.color : AMBER.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '0.65rem', color: appt.payment_status === 'paid' ? GREEN.color : AMBER.color, fontFamily: 'DM Sans,sans-serif', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                {appt.payment_status === 'paid'
                                  ? `Paid online${appt.services?.price ? ` · $${appt.services.price}` : ''}`
                                  : 'Pay in store'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Client message (quoted) ── */}
                    {clientMsg && (
                      <div style={{ display: 'flex', gap: 0, marginBottom: '1rem', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}`, borderLeft: `3px solid ${AMBER.color}` }}>
                        <div style={{ flex: 1, padding: '0.75rem 1rem', background: 'rgba(var(--rgb-hi),0.025)' }}>
                          <p style={{ fontSize: '0.82rem', color: C.white, fontFamily: 'DM Sans,sans-serif', lineHeight: 1.65, fontStyle: 'italic', opacity: 0.85, margin: 0 }}>
                            "{clientMsg.content}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Footer: time + actions ── */}
                    <div className="req-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'DM Sans,sans-serif', opacity: 0.55, flexShrink: 0 }}>
                        Received {timeAgo}
                      </span>

                      <div className="req-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* View chat → */}
                        <button
                          onClick={() => navigate(`/studio/messages?ticket=${ticket.id}`)}
                          className="req-chat"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: BLUE.bg, border: `1px solid ${BLUE.border}`, color: BLUE.color, fontSize: '0.75rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.04em', flexShrink: 0 }}>
                          <MessageSquare size={12} />
                          View Chat
                          <ChevronRight size={11} />
                        </button>

                        {/* Cancel (with credit if paid online, plain cancel if pay in store) */}
                        {appt?.payment_status === 'paid' ? (
                          <button
                            onClick={() => handleIssueCredit(ticket)}
                            disabled={!!isCredit}
                            className="req-act"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: GREEN.bg, border: `1px solid ${GREEN.border}`, color: GREEN.color, fontSize: '0.75rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: isCredit ? 'not-allowed' : 'pointer', opacity: isCredit ? 0.6 : 1, transition: 'all .15s', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {isCredit
                              ? <><div style={{ width: 11, height: 11, border: `2px solid ${GREEN.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Processing…</>
                              : <><Tag size={12} /> Cancel & Credit</>}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCancelOnly(ticket)}
                            disabled={!!isCredit}
                            className="req-act"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.22)', color: '#f87171', fontSize: '0.75rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: isCredit ? 'not-allowed' : 'pointer', opacity: isCredit ? 0.6 : 1, transition: 'all .15s', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {isCredit
                              ? <><div style={{ width: 11, height: 11, border: '2px solid #f87171', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Cancelling…</>
                              : <><X size={12} /> Cancel</>}
                          </button>
                        )}

                        {/* Reschedule */}
                        <button
                          onClick={() => {
                            setReschedModal({ ticket })
                            setReschedDate(appt?.date || '')
                            setReschedTime(appt?.time?.slice(0, 5) || '')
                            setReschedStylist(appt?.stylists?.id || '')
                            setReschedMonth(appt?.date ? parseISO(appt.date) : new Date())
                            setRTakenSlots([])
                            setRBlockedHours([])
                          }}
                          className="req-act"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: '0.75rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.04em', flexShrink: 0 }}>
                          <RefreshCw size={12} />
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Reschedule modal ── */}
      <AnimatePresence>
        {reschedModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            onMouseDown={e => { if (e.target === e.currentTarget) setReschedModal(null) }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 540, background: 'var(--col-modal)', border: `1px solid ${C.goldBorder}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.75)', maxHeight: '92dvh', overflowY: 'auto' }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg, var(--col-acc3), var(--col-acc))' }} />

              <div className="req-modal-pad" style={{ padding: '1.75rem' }}>
                {/* Modal header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.gold, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 5 }}>
                      Action
                    </p>
                    <h3 className="font-display" style={{ color: C.white, fontSize: '1.55rem', fontWeight: 400, lineHeight: 1.1, marginBottom: 4 }}>
                      Reschedule Appointment
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'DM Sans,sans-serif', opacity: 0.7 }}>
                      {reschedModal.ticket.profiles?.full_name || 'Client'}
                    </p>
                  </div>
                  <button onClick={() => setReschedModal(null)}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(var(--rgb-hi),0.05)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>

                {/* Current booking pill */}
                {reschedModal.ticket.appointments && (
                  <div style={{ padding: '0.875rem 1rem', borderRadius: 10, background: 'rgba(var(--rgb-hi),0.03)', border: `1px solid ${C.border}`, marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 6 }}>
                      Currently booked
                    </p>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      {reschedModal.ticket.appointments.services?.name && (
                        <span style={{ fontSize: '0.85rem', color: C.white, fontFamily: 'DM Sans,sans-serif', fontWeight: 500 }}>
                          {reschedModal.ticket.appointments.services.name}
                        </span>
                      )}
                      {reschedModal.ticket.appointments.date && (
                        <span style={{ fontSize: '0.8rem', color: C.muted, fontFamily: 'DM Sans,sans-serif' }}>
                          {format(parseISO(reschedModal.ticket.appointments.date), 'EEE, MMM d')}
                          {reschedModal.ticket.appointments.time ? ` · ${reschedModal.ticket.appointments.time.slice(0, 5)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stylist selector */}
                {stylists.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 6 }}>Stylist</p>
                    <select
                      value={reschedStylist}
                      onChange={e => { setReschedStylist(e.target.value); setReschedDate(''); setReschedTime('') }}
                      style={{ width: '100%', padding: '0.7rem 0.875rem', borderRadius: 9, background: 'var(--col-modal)', border: `1px solid ${C.border}`, color: C.white, fontSize: '0.85rem', fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', boxSizing: 'border-box' }}>
                      <option value="">Keep current stylist</option>
                      {stylists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Calendar */}
                {(() => {
                  const rIsOff = d =>
                    isBefore(d, startOfDay(new Date())) ||
                    getDay(d) === 0 ||
                    rBlockedDates.includes(format(d, 'yyyy-MM-dd')) ||
                    (reschedStylist && rStylistDayOffs.includes(format(d, 'yyyy-MM-dd')))
                  const isSlotUnavailable = slot => {
                    if (rTakenSlots.includes(slot)) return true
                    return rBlockedHours.some(bh => bh.slice(0, 5) === slot)
                  }
                  const monthStart = startOfMonth(reschedMonth)
                  const monthEnd   = endOfMonth(reschedMonth)
                  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
                  const startPad   = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1
                  const morning    = SLOTS.filter(s => parseInt(s) < 13)
                  const afternoon  = SLOTS.filter(s => parseInt(s) >= 13)
                  const selDateObj = reschedDate ? parseISO(reschedDate) : null

                  return (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 8 }}>New Date</p>

                      {/* Month navigation */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <button onClick={() => setReschedMonth(m => subMonths(m, 1))}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(var(--rgb-hi),0.06)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <ChevronLeft size={13} />
                        </button>
                        <span style={{ fontSize: '0.85rem', color: C.white, fontFamily: 'DM Sans,sans-serif', fontWeight: 500 }}>
                          {format(reschedMonth, 'MMMM yyyy')}
                        </span>
                        <button onClick={() => setReschedMonth(m => addMonths(m, 1))}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(var(--rgb-hi),0.06)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      {/* Day-of-week headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
                        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, letterSpacing: '0.06em', paddingBottom: 2 }}>{d}</div>
                        ))}
                      </div>

                      {/* Day grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                        {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
                        {days.map(day => {
                          const ds       = format(day, 'yyyy-MM-dd')
                          const off      = rIsOff(day)
                          const isSel    = selDateObj && isSameDay(day, selDateObj)
                          const isSun    = getDay(day) === 6
                          return (
                            <button key={ds} disabled={off}
                              onClick={() => { setReschedDate(ds); setReschedTime('') }}
                              style={{
                                padding: '5px 2px', borderRadius: 6, border: isSel ? `1px solid rgba(var(--rgb-acc),0.5)` : '1px solid transparent',
                                background: isSel ? 'linear-gradient(135deg, var(--col-acc3), var(--col-acc))' : isSun ? 'rgba(var(--rgb-hi),0.015)' : 'transparent',
                                color: isSel ? 'var(--col-bg)' : off ? 'rgba(var(--rgb-hi),0.2)' : isSun ? 'rgba(var(--rgb-hi),0.4)' : C.white,
                                fontSize: '0.75rem', fontFamily: 'DM Sans,sans-serif', fontWeight: isSel ? 700 : 400,
                                cursor: off ? 'not-allowed' : 'pointer', textAlign: 'center', transition: 'all .12s',
                              }}>
                              {format(day, 'd')}
                            </button>
                          )
                        })}
                      </div>

                      {/* Time slots */}
                      {reschedDate && (
                        <div style={{ marginTop: '1.1rem' }}>
                          <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 8 }}>New Time</p>
                          {[{ label: 'Morning', slots: morning }, { label: 'Afternoon', slots: afternoon }].map(({ label, slots }) => (
                            <div key={label} style={{ marginBottom: 10 }}>
                              <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'DM Sans,sans-serif', opacity: 0.6, marginBottom: 5 }}>{label}</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                                {slots.map(slot => {
                                  const unavail = isSlotUnavailable(slot)
                                  const isSel   = reschedTime === slot
                                  return (
                                    <button key={slot} disabled={unavail}
                                      onClick={() => setReschedTime(slot)}
                                      style={{
                                        padding: '6px 4px', borderRadius: 7,
                                        border: isSel ? `1px solid rgba(var(--rgb-acc),0.5)` : `1px solid ${C.border}`,
                                        background: isSel ? 'linear-gradient(135deg, var(--col-acc3), var(--col-acc))' : unavail ? 'rgba(var(--rgb-hi),0.02)' : 'rgba(var(--rgb-hi),0.04)',
                                        color: isSel ? 'var(--col-bg)' : unavail ? 'rgba(var(--rgb-hi),0.18)' : C.white,
                                        fontSize: '0.73rem', fontFamily: 'DM Sans,sans-serif', fontWeight: isSel ? 700 : 400,
                                        textDecoration: unavail ? 'line-through' : 'none',
                                        cursor: unavail ? 'not-allowed' : 'pointer', transition: 'all .12s',
                                      }}>
                                      {slot}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setReschedModal(null)}
                    style={{ flex: 1, padding: '0.7rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.82rem', fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', transition: 'all .15s' }}>
                    Cancel
                  </button>
                  <button onClick={handleReschedule} disabled={!reschedDate || !reschedTime || reschedWorking}
                    style={{ flex: 2, padding: '0.7rem', borderRadius: 9, border: 'none', background: reschedDate && reschedTime ? 'linear-gradient(135deg, var(--col-acc3), var(--col-acc))' : 'rgba(var(--rgb-hi),0.06)', color: reschedDate && reschedTime ? 'var(--col-bg)' : C.muted, fontSize: '0.82rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: reschedDate && reschedTime && !reschedWorking ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: reschedWorking ? 0.6 : 1, transition: 'all .2s' }}>
                    {reschedWorking
                      ? <><div style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Saving…</>
                      : <><RefreshCw size={13} /> Confirm Reschedule</>}
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
