import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Minus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'

export default function ChatWidget() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user || !open) return
    loadMessages()

    const sub = supabase
      .channel(`widget-messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new])
        if (!open) setUnread(n => n + 1)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [user, open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [open])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, role)')
      .or(`sender_id.eq.${user.id},is_admin_broadcast.eq.true`)
      .order('created_at')
      .limit(50)
    setMessages(data || [])
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    await supabase.from('messages').insert({ sender_id: user.id, content, read: false })
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Chat panel */}
      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="absolute bottom-16 right-0 w-80 glass rounded-2xl shadow-2xl overflow-hidden"
            style={{ height: '420px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-white font-medium">HairGo Team</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimized(true)} className="p-1 text-white/30 hover:text-white transition-colors">
                  <Minus size={14} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1 text-white/30 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col h-[calc(100%-100px)] overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/25 text-xs text-center">Say hello to the team!</p>
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === user.id
                const isAdmin = msg.profiles?.role === 'admin'
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      isMe ? 'bg-gradient-to-br from-[#C9A84C] to-[#C4956A] text-black' :
                      isAdmin ? 'bg-white/8 border border-[#C9A84C]/15 text-white' : 'bg-white/5 text-white/80'
                    }`}>
                      {!isMe && isAdmin && <div className="text-[#C9A84C] text-[10px] mb-0.5">Team</div>}
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/5 px-3 py-2.5">
              <form onSubmit={send} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none border border-white/8 focus:border-[#C9A84C]/30 transition-colors"
                />
                <button type="submit" disabled={!input.trim()} className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#C4956A] flex items-center justify-center text-black disabled:opacity-40 shrink-0">
                  <Send size={11} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); setMinimized(false) }}
        className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#C4956A] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={18} className="text-black" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={18} className="text-black" />
            </motion.div>
          )}
        </AnimatePresence>
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    </div>
  )
}
