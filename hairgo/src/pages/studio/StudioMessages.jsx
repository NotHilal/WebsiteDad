import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
}

export default function StudioMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selected,      setSelected]      = useState(null)
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.sender_id)
    const sub = supabase.channel(`admin-chat-${selected.sender_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadMessages(selected.sender_id))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [selected])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages])

  async function loadConversations() {
    const { data } = await supabase.from('messages').select('*, profiles(full_name, id)').order('created_at', { ascending: false })
    if (!data) return setLoading(false)
    const seen = new Set(); const convs = []
    for (const msg of data) {
      const uid = msg.sender_id
      if (!seen.has(uid) && msg.profiles?.id) {
        seen.add(uid)
        convs.push({ sender_id: uid, name: msg.profiles?.full_name || 'User', lastMessage: msg.content, lastTime: msg.created_at, unread: !msg.read })
      }
    }
    setConversations(convs); setLoading(false)
  }

  async function loadMessages(senderId) {
    const { data } = await supabase.from('messages').select('*, profiles(full_name, role)')
      .or(`sender_id.eq.${senderId},recipient_id.eq.${senderId}`).order('created_at').limit(100)
    setMessages(data || [])
    await supabase.from('messages').update({ read: true }).eq('sender_id', senderId).eq('read', false)
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || !selected) return
    const content = input.trim(); setInput('')
    await supabase.from('messages').insert({ sender_id: user.id, recipient_id: selected.sender_id, content, read: false })
  }

  const unreadCount = conversations.filter(c => c.unread).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        .send-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); outline: none; }
        .conv-btn:hover { background: rgba(255,255,255,0.025) !important; }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(201,168,76,0.25); }
      `}</style>

      <div style={{ flexShrink: 0, marginBottom: '1.1rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.15rem' }}>
            <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1 }}>Messages</h1>
            {unreadCount > 0 && (
              <span style={{ padding: '2px 9px', borderRadius: 20, background: C.goldBg, border: `1px solid ${C.goldBorder}`, fontSize: 9, color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, animation: 'badge-pulse 1.3s ease-in-out infinite' }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{conversations.length} conversations</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.75rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Conversations panel */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0.7rem 0.9rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 2 }}>Conversations</p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif' }}>{conversations.length} clients</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {loading ? (
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: C.subtle }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ height: 9, borderRadius: 5, width: '60%', background: C.subtle }} />
                      <div style={{ height: 7, borderRadius: 5, width: '80%', background: C.subtle }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '1.5rem' }}>
                <MessageSquare size={22} color={C.border} style={{ marginBottom: 8 }} />
                <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif' }}>No messages yet</p>
              </div>
            ) : conversations.map(conv => {
              const isActive = selected?.sender_id === conv.sender_id
              return (
                <button key={conv.sender_id} className="conv-btn"
                  onClick={() => setSelected(conv)}
                  style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: 9, background: isActive ? C.goldBg : 'transparent', borderLeft: isActive ? `2px solid ${C.gold}` : '2px solid transparent', border: 'none', cursor: 'pointer', transition: 'background .15s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isActive ? `linear-gradient(135deg,${C.gold},#C4956A)` : C.subtle, border: `1px solid ${isActive ? C.gold : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: isActive ? '#000' : C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{conv.name[0]?.toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <p style={{ fontSize: '0.78rem', color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: isActive ? 500 : 400, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{conv.name}</p>
                      {conv.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, flexShrink: 0, marginLeft: 4 }} />}
                    </div>
                    <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'Jost,sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{conv.lastMessage}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '2rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={20} color={C.border} />
              </div>
              <div>
                <p style={{ color: C.dim, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', marginBottom: 4 }}>Select a conversation</p>
                <p style={{ color: C.muted, fontSize: '0.73rem', fontFamily: 'Jost,sans-serif' }}>Choose a client from the left panel</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '0.7rem 0.9rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},#C4956A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: '#000', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{selected.name[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{selected.name}</p>
                  <p style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif' }}>Client</p>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', background: '#0f0f16' }}>
                {messages.map(msg => {
                  const isMe = msg.sender_id === user.id
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3, maxWidth: '72%' }}>
                        <div style={{ padding: '0.45rem 0.75rem', borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px', fontSize: '0.8rem', lineHeight: 1.55, fontFamily: 'Jost,sans-serif', ...(isMe ? { background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontWeight: 500 } : { background: C.card, color: C.dim, border: `1px solid ${C.border}` }) }}>
                          {msg.content}
                        </div>
                        <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', padding: '0 2px' }}>
                          {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '0.65rem 0.9rem', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                <form onSubmit={send} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Reply to ${selected.name}…`} className="send-inp"
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.5rem 0.875rem', fontSize: '0.82rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', transition: 'border-color .2s' }} />
                  <button type="submit" disabled={!input.trim()} className="btn-g"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.5rem 1rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.3, flexShrink: 0, transition: 'all .2s' }}>
                    <Send size={13} /> Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes badge-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }`}</style>
    </div>
  )
}
