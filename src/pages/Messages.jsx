import { useState, useEffect, useRef } from 'react';
import { Send, Plus, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Messages() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [threads, setThreads]   = useState([]);
  const [active, setActive]     = useState(null);
  const [replies, setReplies]   = useState([]);
  const [newSubject, setSubject] = useState('');
  const [newBody, setBody]       = useState('');
  const [replyText, setReply]   = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (!user) return; loadThreads(); }, [user]);
  useEffect(() => { if (active) { loadReplies(active.id); markRead(active.id); } }, [active]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

  async function loadThreads() {
    const { data } = await supabase.from('messages').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setThreads(data ?? []);
  }

  async function loadReplies(msgId) {
    const { data } = await supabase.from('message_replies').select('*').eq('message_id', msgId).order('created_at', { ascending: true });
    setReplies(data ?? []);
  }

  async function markRead(msgId) {
    await supabase.from('messages').update({ unread_user: false }).eq('id', msgId);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newSubject.trim() || !newBody.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from('messages').insert({
      user_id: user.id, subject: newSubject.trim(), body: newBody.trim(),
      status: 'open', unread_admin: true, unread_user: false,
    }).select().single();
    setLoading(false);
    if (!error) { setSubject(''); setBody(''); setCreating(false); setThreads(prev => [data, ...prev]); setActive(data); }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    const { data, error } = await supabase.from('message_replies').insert({
      message_id: active.id, sender_role: 'user', body: replyText.trim(),
    }).select().single();
    if (!error) {
      await supabase.from('messages').update({ unread_admin: true }).eq('id', active.id);
      setReply(''); setReplies(prev => [...prev, data]);
    }
  }

  if (!user) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="page-header"><h1>{t('msg_title')}</h1></div>
        <div style={{ maxWidth: '400px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px' }}>{t('msg_login_required')}</p>
          <button onClick={() => navigate('/signin', { state: { from: '/messages' } })} className="btn">
            {t('nav_signin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>{t('msg_title')}</h1>
        <div className="breadcrumb">
          <span>Home</span><span style={{ color: 'var(--border)' }}>/</span><span>{t('msg_title')}</span>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
        {/* New message button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button onClick={() => setCreating(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={14} /> {t('msg_new')}
          </button>
        </div>

        {/* New message form */}
        {creating && (
          <form onSubmit={handleCreate} style={{ marginBottom: '24px', border: '1px solid var(--border)', padding: '24px' }} className="fade-up">
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{t('msg_subject')}</label>
              <input value={newSubject} onChange={e => setSubject(e.target.value)} required className="field" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{t('msg_body')}</label>
              <textarea value={newBody} onChange={e => setBody(e.target.value)} required rows={4} className="field" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setCreating(false)} style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('cancel')}
              </button>
              <button type="submit" disabled={loading} className="btn" style={{ opacity: loading ? 0.6 : 1 }}>
                {loading ? t('loading') : t('msg_send')}
              </button>
            </div>
          </form>
        )}

        <div className="grid md:grid-cols-5" style={{ gap: '1px', background: 'var(--border)', minHeight: '500px' }}>
          {/* Thread list */}
          <div style={{ gridColumn: 'span 2', background: 'var(--bg)', display: active ? 'none' : 'block' }} className="md:block">
            {threads.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: 'var(--text)' }}>
                {t('msg_no_messages')}
              </div>
            ) : threads.map(th => (
              <button key={th.id} onClick={() => setActive(th)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '16px 20px',
                  background: active?.id === th.id ? 'rgba(201,168,76,0.06)' : 'var(--bg-card)',
                  borderLeft: active?.id === th.id ? '2px solid var(--gold)' : '2px solid transparent',
                  borderBottom: '1px solid var(--border)', border: 'none',
                  borderLeftWidth: '2px', borderLeftStyle: 'solid',
                  borderLeftColor: active?.id === th.id ? 'var(--gold)' : 'transparent',
                  borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{th.subject}</span>
                  <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, color: th.status === 'open' ? 'var(--sage)' : 'var(--text)' }}>
                    {th.status === 'open' ? t('msg_open') : t('msg_closed')}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{th.body}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{format(new Date(th.created_at), 'dd/MM/yyyy')}</div>
              </button>
            ))}
          </div>

          {/* Thread detail */}
          {active ? (
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => setActive(null)} className="md:hidden" style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px' }}>
                  <ChevronLeft size={18} />
                </button>
                <div style={{ flex: 1, fontSize: '14px', fontWeight: 400, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.subject}</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '75%', padding: '10px 14px', background: 'rgba(201,168,76,0.12)', border: '1px solid var(--border-gold)', fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                    {active.body}
                  </div>
                </div>
                {replies.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: r.sender_role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px', fontSize: '13px', lineHeight: 1.7,
                      background: r.sender_role === 'user' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${r.sender_role === 'user' ? 'var(--border-gold)' : 'var(--border)'}`,
                      color: 'rgba(255,255,255,0.8)',
                    }}>
                      {r.body}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {active.status === 'open' && (
                <form onSubmit={handleReply} style={{ display: 'flex', gap: '8px', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                  <input value={replyText} onChange={e => setReply(e.target.value)} placeholder={t('msg_reply') + '...'} className="field" style={{ flex: 1 }} />
                  <button type="submit" disabled={!replyText.trim()} style={{ padding: '10px 14px', background: 'var(--gold)', border: 'none', cursor: replyText.trim() ? 'pointer' : 'not-allowed', opacity: replyText.trim() ? 1 : 0.4, color: '#1a1917', flexShrink: 0 }}>
                    <Send size={15} />
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="hidden md:flex" style={{ gridColumn: 'span 3', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text)' }}>{t('msg_no_messages')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
