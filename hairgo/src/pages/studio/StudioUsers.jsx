import { useState, useEffect } from 'react'
import { Users, Star, Search, ChevronDown, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
}

export default function StudioUsers() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Could not load users: ' + error.message)
    setUsers(data || []); setLoading(false)
  }

  async function changeRole(id, newRole) {
    if (newRole === 'admin' && !confirm('Grant admin access to this user?')) return
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    if (error) return toast.error(error.message)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u))
    toast.success(`Role changed to ${newRole}`)
  }

  async function adjustPoints(id, delta, current) {
    const newPts = Math.max(0, (current || 0) + delta)
    const { error } = await supabase.from('profiles').update({ points: newPts }).eq('id', id)
    if (error) return toast.error(error.message)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, points: newPts } : u))
    toast.success(delta > 0 ? `+${delta} points added` : `${Math.abs(delta)} points removed`)
  }

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)
  )
  const adminCount = users.filter(u => u.role === 'admin').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div style={{ flexShrink: 0, marginBottom: '1.1rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Users</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{users.length} registered clients</p>
        </div>
        {adminCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: C.goldBg, border: `1px solid ${C.goldBorder}` }}>
            <Shield size={10} color={C.gold} />
            <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{adminCount} admin{adminCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, marginBottom: '0.75rem', position: 'relative', maxWidth: 260 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.48rem 0.75rem 0.48rem 2rem', fontSize: '0.8rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', boxSizing: 'border-box', transition: 'border-color .2s' }}
          className="usr-search" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${C.border}` }}>
                {['Client', 'Phone', 'Points', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1.1rem', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, textAlign: 'left', fontFamily: 'Jost,sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: '0.7rem 1.1rem' }}>
                        <div style={{ height: 10, borderRadius: 4, width: j === 0 ? 110 : j === 4 ? 60 : 70, background: C.subtle }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>
                  <Users size={28} style={{ margin: '0 auto 0.6rem', color: C.border }} />
                  <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>{search ? 'No users match your search' : 'No users yet'}</p>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }} className="usr-row">
                  <td style={{ padding: '0.7rem 1.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{u.full_name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div>
                        <p style={{ color: u.full_name ? C.white : C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontStyle: u.full_name ? 'normal' : 'italic' }}>{u.full_name || 'No name'}</p>
                        {u.role === 'admin' && <p style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', marginTop: 1 }}>Admin</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.7rem 1.1rem', color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '0.7rem 1.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Star size={11} color={C.gold} />
                      <span style={{ color: C.dim, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>{u.points || 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.7rem 1.1rem' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <select value={u.role || 'user'} onChange={e => changeRole(u.id, e.target.value)}
                        style={{ appearance: 'none', padding: '3px 22px 3px 8px', borderRadius: 20, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', outline: 'none', transition: 'all .15s', border: `1px solid ${u.role === 'admin' ? C.goldBorder : C.border}`, background: u.role === 'admin' ? C.goldBg : C.subtle, color: u.role === 'admin' ? C.gold : C.muted }}>
                        <option value="user" style={{ background: '#1a1a24', color: '#f0f0f0' }}>user</option>
                        <option value="admin" style={{ background: '#1a1a24', color: '#f0f0f0' }}>admin</option>
                      </select>
                      <ChevronDown size={8} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.muted }} />
                    </div>
                  </td>
                  <td style={{ padding: '0.7rem 1.1rem', color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>{u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}</td>
                  <td style={{ padding: '0.7rem 1.1rem' }}>
                    <div style={{ display: 'flex', gap: 4 }} className="usr-actions">
                      <button onClick={() => adjustPoints(u.id, 10, u.points)} className="usr-pts-add"
                        style={{ padding: '3px 9px', borderRadius: 7, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.goldDim, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>+10</button>
                      <button onClick={() => adjustPoints(u.id, -10, u.points)} className="usr-pts-sub"
                        style={{ padding: '3px 9px', borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>−10</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.7rem', color: C.muted, textAlign: 'center', marginTop: '0.75rem', fontFamily: 'Jost,sans-serif', opacity: 0.6 }}>
          Role change takes effect after next sign-in.
        </p>
      </div>

      <style>{`
        .usr-search:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .usr-row:hover { background: rgba(255,255,255,0.02); }
        .usr-row .usr-actions { opacity: 0; transition: opacity .15s; }
        .usr-row:hover .usr-actions { opacity: 1; }
        .usr-pts-add:hover { background: ${C.goldBg} !important; color: ${C.gold} !important; box-shadow: 0 2px 12px rgba(201,168,76,0.2); }
        .usr-pts-sub:hover { color: ${C.dim} !important; border-color: rgba(255,255,255,0.18) !important; }
      `}</style>
    </div>
  )
}
