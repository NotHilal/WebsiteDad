import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, MessageSquare, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'

export default function StudioMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.sender_id)

    const sub = supabase
      .channel(`admin-chat-${selected.sender_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadMessages(selected.sender_id)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [selected])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages])

  async function loadConversations() {
    // Get latest message per user
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, id)')
      .order('created_at', { ascending: false })

    if (!data) return setLoading(false)

    // Group by sender
    const seen = new Set()
    const convs = []
    for (const msg of data) {
      const uid = msg.sender_id
      if (!seen.has(uid) && msg.profiles?.id) {
        seen.add(uid)
        convs.push({ sender_id: uid, name: msg.profiles?.full_name || 'User', lastMessage: msg.content, lastTime: msg.created_at, unread: !msg.read })
      }
    }
    setConversations(convs)
    setLoading(false)
  }

  async function loadMessages(senderId) {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, role)')
      .or(`sender_id.eq.${senderId},recipient_id.eq.${senderId}`)
      .order('created_at')
      .limit(100)
    setMessages(data || [])

    // Mark as read
    await supabase.from('messages').update({ read: true }).eq('sender_id', senderId).eq('read', false)
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || !selected) return
    const content = input.trim()
    setInput('')
    await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: selected.sender_id,
      content,
      read: false,
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-4xl text-white">Messages</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 h-[65vh]">
        {/* Conversations list */}
        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs uppercase tracking-widest text-white/30">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-white/25 text-sm">No messages yet.</div>
            ) : conversations.map(conv => (
              <button
                key={conv.sender_id}
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-white/3 transition-colors ${
                  selected?.sender_id === conv.sender_id ? 'bg-[#C9A84C]/5 border-l-2 border-[#C9A84C]' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A84C]/20 to-[#C4956A]/20 flex items-center justify-center shrink-0">
                  <User size={14} className="text-[#C9A84C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white truncate">{conv.name}</p>
                    {conv.unread && <div className="w-2 h-2 rounded-full bg-[#C9A84C] shrink-0" />}
                  </div>
                  <p className="text-xs text-white/30 truncate mt-0.5">{conv.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/25 text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-sm text-white">{selected.name}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => {
                  const isAdmin = msg.profiles?.role === 'admin'
                  const isMe = msg.sender_id === user.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3.5 py-2.5 rounded-2xl text-sm ${
                        isMe ? 'bg-gradient-to-br from-[#C9A84C] to-[#C4956A] text-black rounded-tr-sm' : 'bg-white/6 text-white/80 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-white/5 p-4">
                <form onSubmit={send} className="flex gap-2">
                  <input value={input} onChange={e => setInput(e.target.value)} placeholder="Reply..."
                    className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/30" />
                  <button type="submit" disabled={!input.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black disabled:opacity-40 flex items-center gap-1.5 text-sm font-medium">
                    <Send size={14} /> Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
