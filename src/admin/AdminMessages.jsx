import { useEffect, useState, useRef } from 'react';
import { Send, User, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { format } from 'date-fns';

export default function AdminMessages() {
  const [threads, setThreads]   = useState([]);
  const [active, setActive]     = useState(null);
  const [client, setClient]     = useState(null);
  const [replies, setReplies]   = useState([]);
  const [replyText, setReply]   = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => {
    if (active) { loadReplies(active.id); loadClient(active.user_id); markRead(active.id); }
  }, [active]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

  async function loadThreads() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name, email, phone)')
      .order('created_at', { ascending: false });
    setThreads(data ?? []);
  }

  async function loadReplies(msgId) {
    const { data } = await supabase
      .from('message_replies')
      .select('*')
      .eq('message_id', msgId)
      .order('created_at', { ascending: true });
    setReplies(data ?? []);
  }

  async function loadClient(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('name, email, phone, points, created_at')
      .eq('id', userId)
      .single();
    setClient(data);
  }

  async function markRead(msgId) {
    await supabase.from('messages').update({ unread_admin: false }).eq('id', msgId);
    setThreads(prev => prev.map(t => t.id === msgId ? { ...t, unread_admin: false } : t));
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    const { data } = await supabase.from('message_replies').insert({
      message_id:  active.id,
      sender_role: 'admin',
      body:        replyText.trim(),
    }).select().single();
    await supabase.from('messages').update({ unread_user: true }).eq('id', active.id);
    setReply('');
    setReplies(prev => [...prev, data]);
  }

  async function closeThread(id) {
    await supabase.from('messages').update({ status: 'closed' }).eq('id', id);
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status: 'closed' } : t));
    if (active?.id === id) setActive(a => ({ ...a, status: 'closed' }));
  }

  return (
    <div className="p-6 h-full">
      <h1 className="font-display text-2xl text-white mb-5">Messages</h1>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-160px)]">
        {/* Thread list */}
        <div className="col-span-4 overflow-y-auto space-y-1.5 pe-1">
          {threads.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No messages</p>
          ) : threads.map(th => (
            <button key={th.id} onClick={() => setActive(th)}
                    className="w-full text-left p-3 rounded-xl border transition-all"
                    style={{
                      borderColor: active?.id === th.id ? 'var(--gold)40' : 'rgba(255,255,255,0.07)',
                      background:  active?.id === th.id ? 'rgba(201,169,97,0.08)' : 'rgba(255,255,255,0.02)',
                    }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-white truncate">{th.subject}</span>
                {th.unread_admin && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: 'var(--gold)' }} />
                )}
              </div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {th.profiles?.name || th.profiles?.email}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {format(new Date(th.created_at), 'dd/MM/yy')}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: th.status === 'open' ? 'rgba(140,154,126,0.2)' : 'rgba(255,255,255,0.05)',
                        color:      th.status === 'open' ? 'var(--sage)' : 'rgba(255,255,255,0.3)',
                      }}>
                  {th.status}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Thread detail */}
        <div className="col-span-5 flex flex-col rounded-2xl border overflow-hidden"
             style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {active ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between"
                   style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div>
                  <div className="font-medium text-white text-sm">{active.subject}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {active.profiles?.name}
                  </div>
                </div>
                {active.status === 'open' && (
                  <button onClick={() => closeThread(active.id)}
                          className="text-xs px-3 py-1.5 rounded-xl border transition-colors"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                    Close
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
                       style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}>
                    {active.body}
                  </div>
                </div>
                {replies.map(r => (
                  <div key={r.id} className={`flex ${r.sender_role === 'admin' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                         style={{
                           background: r.sender_role === 'admin' ? 'rgba(201,169,97,0.15)' : 'rgba(255,255,255,0.08)',
                           color:      r.sender_role === 'admin' ? 'var(--gold)' : 'rgba(255,255,255,0.85)',
                           borderRadius: r.sender_role === 'admin' ? '1rem 1rem 1rem 0.25rem' : '1rem 1rem 0.25rem 1rem',
                         }}>
                      {r.body}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {active.status === 'open' && (
                <form onSubmit={handleReply}
                      className="flex gap-2 p-3 border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <input value={replyText} onChange={e => setReply(e.target.value)}
                         placeholder="Reply…"
                         className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                         style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                  <button type="submit" disabled={!replyText.trim()}
                          className="p-2 rounded-xl disabled:opacity-40"
                          style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                    <Send size={16} />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Select a conversation</p>
            </div>
          )}
        </div>

        {/* Client info panel */}
        <div className="col-span-3 space-y-3">
          {client && (
            <div className="rounded-2xl border p-4 space-y-4"
                 style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                     style={{ background: 'rgba(201,169,97,0.15)', color: 'var(--gold)' }}>
                  {client.name?.[0]?.toUpperCase() ?? <User size={16} />}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{client.name || '—'}</div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Member since {format(new Date(client.created_at), 'MMM yyyy')}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <Mail size={12} />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <Phone size={12} />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Loyalty points</div>
                <div className="font-display text-2xl mt-0.5" style={{ color: 'var(--gold)' }}>
                  {client.points ?? 0}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
