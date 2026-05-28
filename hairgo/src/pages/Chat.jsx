import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'

export default function Chat() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) return
    loadMessages()

    const sub = supabase
      .channel('messages-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [user])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, role)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id},is_admin_broadcast.eq.true`)
      .order('created_at')
      .limit(100)
    setMessages(data || [])
    setLoading(false)
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      content,
      read: false,
    })
    if (error) setInput(content)
    setSending(false)
  }

  return (
    <div className="min-h-screen pt-24 pb-6 px-6 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-4xl text-white">Messages</h1>
          <p className="text-white/40 text-sm mt-1">Chat with the HairGo team</p>
        </motion.div>

        <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden" style={{ minHeight: '60vh', maxHeight: '70vh' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle size={32} className="text-white/10 mb-3" />
                <p className="text-white/30 text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === user.id
                const isAdmin = msg.profiles?.role === 'admin'
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {!isMe && (
                        <span className={`text-xs ${isAdmin ? 'text-[#C9A84C]' : 'text-white/30'} ml-1`}>
                          {isAdmin ? 'HairGo Team' : msg.profiles?.full_name || 'User'}
                        </span>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-br from-[#C9A84C] to-[#C4956A] text-black rounded-tr-sm'
                          : isAdmin
                          ? 'bg-white/8 border border-[#C9A84C]/20 text-white rounded-tl-sm'
                          : 'bg-white/5 text-white/80 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-white/20 mx-1">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </motion.div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/5 p-4">
            <form onSubmit={send} className="flex items-center gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#C4956A] flex items-center justify-center text-black hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
