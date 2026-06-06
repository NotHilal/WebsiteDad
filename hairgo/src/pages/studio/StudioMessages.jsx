import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, MessageSquare, CheckCircle, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, isToday, isYesterday } from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)',
  goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)',
  border: 'rgba(255,255,255,0.07)',
}

function timeFmt(d) {
  const date = new Date(d)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

const FILTERS = ['All', 'Open', 'Closed']

export default function StudioMessages() {
  const { user, profile } = useAuth()
  const [tickets,   setTickets]   = useState([])
  const [selected,  setSelected]  = useState(null)
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [filter,     setFilter]    = useState('All')
  const [sending,    setSending]   = useState(false)
  const [toggling,   setToggling]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]  = useState(false)
  const bottomRef  = useRef(null)
  const selectedRef = useRef(null)

  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => {
    loadTickets()
    const sub = supabase.channel('studio-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadTickets)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, payload => {
        const msg = payload.new
        if (selectedRef.current?.id === msg.ticket_id) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          supabase.from('ticket_messages').update({ read: true }).eq('id', msg.id)
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
        loadTickets()
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.id)
  }, [selected?.id])

  async function loadTickets(role = profile?.role) {
    let query = supabase
      .from('tickets')
      .select('*, user:profiles!user_id(full_name), recipient:profiles!recipient_id(full_name)')
      .order('updated_at', { ascending: false })
    if (role === 'employee') query = query.or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
    const { data: tkts } = await query
    if (!tkts?.length) { setTickets([]); setLoading(false); return }

    const ids = tkts.map(t => t.id)
    const { data: msgs } = await supabase
      .from('ticket_messages')
      .select('ticket_id, content, created_at, read, is_from_admin')
      .in('ticket_id', ids)
      .order('created_at', { ascending: false })

    const meta = {}
    for (const m of (msgs || [])) {
      if (!meta[m.ticket_id]) meta[m.ticket_id] = { lastMsg: m.content, lastTime: m.created_at, unread: 0 }
      if (!m.read && !m.is_from_admin) meta[m.ticket_id].unread++
    }
    setTickets(tkts.map(t => ({ ...t, ...(meta[t.id] || {}) })))
    setLoading(false)
  }

  async function loadMessages(ticketId) {
    const { data } = await supabase
      .from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at')
    setMessages(data || [])
    await supabase.from('ticket_messages')
      .update({ read: true }).eq('ticket_id', ticketId).eq('is_from_admin', false).eq('read', false)
    loadTickets()
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || !selected || sending) return
    setSending(true)
    const content = input.trim(); setInput('')
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({ ticket_id: selected.id, sender_id: user.id, content, is_from_admin: true, read: false })
      .select().single()
    if (error) { setInput(content); toast.error('Failed to send') }
    else if (data) {
      setMessages(prev => [...prev, data])
      await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', selected.id)
      loadTickets()
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
    setSending(false)
  }

  async function toggleStatus() {
    if (!selected || toggling) return
    setToggling(true)
    const newStatus = selected.status === 'open' ? 'closed' : 'open'
    const { error } = await supabase.from('tickets').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', selected.id)
    if (!error) {
      setSelected(prev => ({ ...prev, status: newStatus }))
      toast.success(`Ticket ${newStatus === 'closed' ? 'closed' : 'reopened'}`)
      loadTickets()
    }
    setToggling(false)
  }

  async function deleteTicket() {
    if (!selected || deleting) return
    setDeleting(true)
    const { error } = await supabase.from('tickets').delete().eq('id', selected.id)
    if (!error) {
      setConfirmDel(false)
      setSelected(null)
      setMessages([])
      toast.success('Ticket deleted')
      loadTickets()
    } else {
      toast.error('Failed to delete ticket')
    }
    setDeleting(false)
  }

  const totalUnread = tickets.reduce((sum, t) => sum + (t.unread || 0), 0)
  const filtered = tickets.filter(t => filter === 'All' || t.status === filter.toLowerCase())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .send-inp:focus { border-color: ${C.goldBorder} !important; outline: none; box-shadow: 0 0 0 3px rgba(201,168,76,0.07); }
        .send-inp::placeholder { color: rgba(255,255,255,0.18); }
        .tk-row:hover { background: rgba(255,255,255,0.025) !important; }
        .btn-g:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(201,168,76,0.25); }
        @media (max-width: 767px) {
          .msg-layout { grid-template-columns: 1fr !important; grid-template-rows: 1fr; }
          .msg-list-panel, .msg-chat-panel { grid-row: 1; }
          .msg-has-chat .msg-list-panel { display: none !important; }
          .msg-layout:not(.msg-has-chat) .msg-chat-panel { display: none !important; }
          .msg-back-btn { display: flex !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1 }}>Messages</h1>
            {totalUnread > 0 && (
              <span style={{ padding: '2px 9px', borderRadius: 20, background: '#ef4444', fontSize: 9, color: '#fff', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
                {totalUnread} new
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{tickets.length} tickets</p>
        </div>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', background: filter === f ? C.goldBg : 'transparent', border: `1px solid ${filter === f ? C.goldBorder : C.border}`, color: filter === f ? C.gold : C.muted }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className={`msg-layout${selected ? ' msg-has-chat' : ''}`} style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '0.75rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Ticket list ──────────────────────────────────── */}
        <div className="msg-list-panel" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0.65rem 0.875rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
              {filter === 'All' ? `${filtered.length} tickets` : `${filtered.length} ${filter.toLowerCase()}`}
            </p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {loading ? (
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 60, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1.5rem', textAlign: 'center' }}>
                <MessageSquare size={20} color={C.border} style={{ marginBottom: 8 }} />
                <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif' }}>No {filter !== 'All' ? filter.toLowerCase() + ' ' : ''}tickets</p>
              </div>
            ) : filtered.map(tk => {
              const isActive = selected?.id === tk.id
              const isOpen = tk.status === 'open'
              const clientInitial = (tk.user?.full_name || 'U')[0].toUpperCase()
              return (
                <button key={tk.id} className="tk-row" onClick={() => setSelected(tk)}
                  style={{ width: '100%', textAlign: 'left', padding: '0.65rem 0.75rem', display: 'flex', alignItems: 'flex-start', gap: 9, background: isActive ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: `2px solid ${isActive ? C.gold : 'transparent'}`, borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background .15s' }}>
                  {/* Client avatar with status ring */}
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: 1 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(96,165,250,0.22), rgba(139,92,246,0.12))', border: `1px solid ${isActive ? 'rgba(96,165,250,0.3)' : 'rgba(96,165,250,0.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(96,165,250,0.85)', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{clientInitial}</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#34d399' : 'rgba(255,255,255,0.18)', border: '1.5px solid #161620', boxShadow: isOpen ? '0 0 5px rgba(52,211,153,0.4)' : 'none' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <p style={{ fontSize: '0.77rem', color: isActive ? C.white : 'rgba(255,255,255,0.82)', fontFamily: 'Jost,sans-serif', fontWeight: isActive ? 600 : 400, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                        {tk.user?.full_name || 'User'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4, flexShrink: 0 }}>
                        {tk.unread > 0 && (
                          <span style={{ minWidth: 15, height: 15, borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, padding: '0 4px' }}>
                            {tk.unread}
                          </span>
                        )}
                        {tk.lastTime && <span style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', whiteSpace: 'nowrap' }}>{timeFmt(tk.lastTime)}</span>}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: C.goldDim, fontFamily: 'Jost,sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: 4 }}>{tk.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{tk.lastMsg || '—'}</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 20, marginLeft: 6, flexShrink: 0, background: tk.recipient_id ? 'rgba(52,211,153,0.07)' : 'rgba(201,168,76,0.07)', border: `1px solid ${tk.recipient_id ? 'rgba(52,211,153,0.18)' : 'rgba(201,168,76,0.15)'}` }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: tk.recipient_id ? '#34d399' : C.gold, flexShrink: 0 }} />
                        <span style={{ fontSize: 8, fontFamily: 'Jost,sans-serif', fontWeight: 600, color: tk.recipient_id ? 'rgba(52,211,153,0.75)' : C.goldDim, whiteSpace: 'nowrap' }}>
                          {tk.recipient?.full_name || 'Store'}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Thread ───────────────────────────────────────── */}
        <div className="msg-chat-panel" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: '2rem' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={18} color={C.border} />
              </div>
              <p style={{ color: C.dim, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>Select a ticket</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <button onClick={() => setSelected(null)} className="msg-back-btn"
                    style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.dim, cursor: 'pointer', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.white, fontSize: '0.88rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: 5 }}>{selected.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: selected.recipient_id ? 'rgba(52,211,153,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${selected.recipient_id ? 'rgba(52,211,153,0.3)' : 'rgba(201,168,76,0.22)'}` }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: selected.recipient_id ? '#34d399' : C.gold, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, color: selected.recipient_id ? '#34d399' : C.gold, letterSpacing: '0.04em' }}>
                          {selected.recipient?.full_name || 'Store'}
                        </span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: selected.status === 'open' ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selected.status === 'open' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: selected.status === 'open' ? '#34d399' : 'rgba(255,255,255,0.2)', boxShadow: selected.status === 'open' ? '0 0 5px rgba(52,211,153,0.4)' : 'none', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: selected.status === 'open' ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{selected.status}</span>
                      </span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif' }}>{format(new Date(selected.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button onClick={toggleStatus} disabled={toggling} className="btn-g"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: toggling ? 'not-allowed' : 'pointer', transition: 'all .2s', opacity: toggling ? 0.6 : 1, ...(selected.status === 'open' ? { background: 'rgba(248,113,113,0.12)', color: '#f87171' } : { background: 'rgba(52,211,153,0.1)', color: '#34d399' }) }}>
                      {selected.status === 'open' ? <><CheckCircle size={11} /> Close</> : <><RotateCcw size={11} /> Reopen</>}
                    </button>
                    <button onClick={() => setConfirmDel(true)} className="btn-g"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', transition: 'all .2s', flexShrink: 0 }}
                      title="Delete ticket">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', background: '#0f0f16' }}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontStyle: 'italic' }}>No messages yet</p>
                  </div>
                ) : messages.map((msg, i) => {
                  const isMe = msg.is_from_admin
                  const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
                  const prevSame = i > 0 && !!messages[i-1].is_from_admin === !!msg.is_from_admin
                  const clientInitial = (selected.user?.full_name || 'C')[0].toUpperCase()
                  return (
                    <div key={msg.id} style={{ marginBottom: 2 }}>
                      {showDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0.75rem 0' }}>
                          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {isToday(new Date(msg.created_at)) ? 'Today' : isYesterday(new Date(msg.created_at)) ? 'Yesterday' : format(new Date(msg.created_at), 'MMMM d')}
                          </span>
                          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                        </div>
                      )}
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                        style={{ display: 'flex', alignItems: 'flex-end', gap: 7, justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: prevSame ? 2 : 8 }}>
                        {!isMe && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, rgba(96,165,250,0.22), rgba(139,92,246,0.12))', border: '1px solid rgba(96,165,250,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 10, color: 'rgba(96,165,250,0.85)', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{clientInitial}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 4, maxWidth: '68%' }}>
                          {!isMe && !prevSame && (
                            <span style={{ fontSize: 9, color: 'rgba(96,165,250,0.6)', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.06em', paddingLeft: 3 }}>{selected.user?.full_name || 'Client'}</span>
                          )}
                          <div style={{ padding: '0.55rem 0.95rem', borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px', fontSize: '0.82rem', lineHeight: 1.6, fontFamily: 'Jost,sans-serif', ...(isMe ? { background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontWeight: 500, boxShadow: '0 4px 14px rgba(201,168,76,0.2)' } : { background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.14)', color: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)' }) }}>
                            {msg.content}
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif', paddingLeft: isMe ? 0 : 3, paddingRight: isMe ? 3 : 0 }}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '0.75rem 0.875rem', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                {selected.status === 'closed' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={13} color="rgba(255,255,255,0.2)" />
                    <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>This ticket is closed. Reopen to reply.</p>
                  </div>
                ) : (
                  <form onSubmit={send} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 11, padding: '0.3rem 0.3rem 0.3rem 0.75rem', transition: 'border-color .2s' }}
                    onFocus={e => e.currentTarget.style.borderColor = C.goldBorder}
                    onBlur={e => e.currentTarget.style.borderColor = C.border}>
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Reply to ${selected.user?.full_name || 'client'}…`} className="send-inp"
                      style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.3rem 0', fontSize: '0.82rem', color: C.white, fontFamily: 'Jost,sans-serif', outline: 'none' }} />
                    <button type="submit" disabled={!input.trim() || sending} className="btn-g"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.8rem', borderRadius: 8, background: input.trim() ? `linear-gradient(135deg,${C.gold},#C4956A)` : 'rgba(255,255,255,0.06)', color: input.trim() ? '#000' : 'rgba(255,255,255,0.22)', fontSize: 11, fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: !input.trim() || sending ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'all .2s', letterSpacing: '0.08em' }}>
                      {sending ? <div style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <><Send size={11} /> Send</>}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ──────────────────── */}
      <AnimatePresence>
        {confirmDel && selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            onClick={() => !deleting && setConfirmDel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 380, background: '#111118', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
            >
              {/* Red top bar */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #f87171, rgba(248,113,113,0.3))' }} />

              <div style={{ padding: '1.5rem' }}>
                {/* Icon + title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={17} color="#f87171" />
                  </div>
                  <div>
                    <p style={{ color: C.white, fontSize: '0.9rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 2 }}>Delete ticket?</p>
                    <p style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>This action cannot be undone</p>
                  </div>
                </div>

                {/* Ticket name */}
                <div style={{ padding: '0.7rem 0.875rem', borderRadius: 9, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'Jost,sans-serif' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>Ticket: </span>{selected.title}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'Jost,sans-serif', marginTop: 3 }}>
                    All messages in this thread will be permanently removed.
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setConfirmDel(false)} disabled={deleting}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: deleting ? 'not-allowed' : 'pointer', transition: 'all .2s' }}>
                    Cancel
                  </button>
                  <button onClick={deleteTicket} disabled={deleting}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .2s', opacity: deleting ? 0.5 : 1 }}>
                    {deleting
                      ? <div style={{ width: 13, height: 13, border: '2px solid rgba(248,113,113,0.3)', borderTopColor: '#f87171', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                      : <><Trash2 size={13} /> Delete</>}
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
