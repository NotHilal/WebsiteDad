import { useState, useEffect } from 'react'
import { Plus, Tag, X, Save, Gift, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)', modal: '#1a1a24',
}

const EMPTY = { code: '', discount_type: 'percentage', discount_value: '', min_points_required: 0, max_uses: '', expiry_date: '', active: true }
const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }

export default function StudioCoupons() {
  const [coupons,    setCoupons]    = useState([])
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [form,       setForm]       = useState(EMPTY)
  const [grantModal, setGrantModal] = useState(null)
  const [grantUser,  setGrantUser]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [hoveredId,  setHoveredId]  = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, points').eq('role', 'user').order('full_name'),
    ])
    setCoupons(c || []); setUsers(u || []); setLoading(false)
  }

  async function save() {
    if (!form.code.trim()) return toast.error('Code is required')
    setSaving(true)
    try {
      const payload = { ...form, code: form.code.toUpperCase(), discount_value: parseFloat(form.discount_value) || 0, min_points_required: parseInt(form.min_points_required) || 0, max_uses: form.max_uses ? parseInt(form.max_uses) : null, expiry_date: form.expiry_date || null }
      const { error } = modal === 'add'
        ? await supabase.from('coupons').insert(payload)
        : await supabase.from('coupons').update(payload).eq('id', form.id)
      if (error) throw error
      toast.success(modal === 'add' ? 'Coupon created' : 'Coupon updated')
      setModal(null); setForm(EMPTY); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function grant() {
    if (!grantUser || !grantModal) return
    setSaving(true)
    try {
      const { error } = await supabase.from('user_coupons').insert({ user_id: grantUser, coupon_id: grantModal.id, granted_by: 'admin', used: false })
      if (error) throw error
      toast.success('Coupon granted'); setGrantModal(null); setGrantUser('')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function deleteCoupon(id) {
    if (!confirm('Delete this coupon?')) return
    await supabase.from('coupons').delete().eq('id', id)
    toast.success('Coupon deleted'); load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const Modal = ({ children, onClose }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 460, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.3); }
      `}</style>

      <div style={{ flexShrink: 0, marginBottom: '1.1rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Coupons</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{coupons.length} coupons</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-g"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s' }}>
          <Plus size={13} /> Create Coupon
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 68, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }} />)}
          </div>
        ) : coupons.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: '0.5rem' }}>
            <Tag size={28} color={C.border} />
            <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No coupons yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {coupons.map(c => (
              <div key={c.id} onMouseEnter={() => setHoveredId(c.id)} onMouseLeave={() => setHoveredId(null)}
                style={{ background: C.card, border: `1px solid ${hoveredId === c.id ? C.goldBorder : C.border}`, borderRadius: 14, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', transition: 'border-color .2s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Tag size={14} color={C.gold} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', color: C.white, fontSize: '0.85rem', letterSpacing: '0.12em', fontWeight: 700 }}>{c.code}</span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: c.active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: c.active ? '#34d399' : '#f87171', fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.375rem' }}>
                    <span style={{ color: C.gold, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`} off
                    </span>
                    {c.min_points_required > 0 && <span style={{ color: C.muted, fontSize: '0.73rem', fontFamily: 'Jost,sans-serif' }}>· {c.min_points_required} pts min</span>}
                    {c.expiry_date && <span style={{ color: C.muted, fontSize: '0.73rem', fontFamily: 'Jost,sans-serif' }}>· Expires {format(new Date(c.expiry_date), 'MMM d, yyyy')}</span>}
                    {c.max_uses && <span style={{ color: C.muted, fontSize: '0.73rem', fontFamily: 'Jost,sans-serif' }}>· {c.current_uses || 0}/{c.max_uses} uses</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: hoveredId === c.id ? 1 : 0, transition: 'opacity .15s' }}>
                  <button onClick={() => setGrantModal(c)} style={{ width: 28, height: 28, borderRadius: 7, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gift size={12} /></button>
                  <button onClick={() => { setForm({ ...c, expiry_date: c.expiry_date || '' }); setModal('edit') }} style={{ width: 28, height: 28, borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={12} /></button>
                  <button onClick={() => deleteCoupon(c.id)} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.5rem', color: C.white, marginBottom: 3 }}>{modal === 'add' ? 'Create Coupon' : 'Edit Coupon'}</h2>
              <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Discount code details</p>
            </div>
            <button onClick={() => setModal(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={lbl}>Code</label><input value={form.code} onChange={set('code')} placeholder="SAVE20" className="m-inp" style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={lbl}>Type</label><select value={form.discount_type} onChange={set('discount_type')} className="m-inp" style={{ ...inp, appearance: 'none', cursor: 'pointer' }}><option value="percentage" style={{ background: '#1a1a24' }}>Percentage (%)</option><option value="fixed" style={{ background: '#1a1a24' }}>Fixed (€)</option></select></div>
              <div><label style={lbl}>Value</label><input type="number" value={form.discount_value} onChange={set('discount_value')} placeholder="20" className="m-inp" style={inp} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={lbl}>Min Points</label><input type="number" value={form.min_points_required} onChange={set('min_points_required')} placeholder="0" className="m-inp" style={inp} /></div>
              <div><label style={lbl}>Max Uses</label><input type="number" value={form.max_uses} onChange={set('max_uses')} placeholder="Unlimited" className="m-inp" style={inp} /></div>
            </div>
            <div><label style={lbl}>Expiry Date</label><input type="date" value={form.expiry_date} onChange={set('expiry_date')} className="m-inp" style={inp} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{ width: 38, height: 20, borderRadius: 10, background: form.active ? '#C9A84C' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background .2s', flexShrink: 0 }} onClick={() => setForm(p => ({ ...p, active: !p.active }))}>
                <div style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', left: form.active ? 19 : 2 }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: C.dim, fontFamily: 'Jost,sans-serif' }}>Active — visible to users</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
              {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <><Save size={13} /> Save</>}
            </button>
          </div>
        </Modal>
      )}

      {grantModal && (
        <Modal onClose={() => setGrantModal(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.5rem', color: C.white, marginBottom: 3 }}>Grant Coupon</h2>
              <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Send <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700 }}>{grantModal.code}</span> to a client</p>
            </div>
            <button onClick={() => setGrantModal(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={lbl}>Select Client</label>
            <select value={grantUser} onChange={e => setGrantUser(e.target.value)} className="m-inp" style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
              <option value="" style={{ background: '#1a1a24' }}>Choose a client…</option>
              {users.map(u => <option key={u.id} value={u.id} style={{ background: '#1a1a24' }}>{u.full_name || 'Unknown'} ({u.points || 0} pts)</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={() => setGrantModal(null)} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>Cancel</button>
            <button onClick={grant} disabled={!grantUser || saving} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: !grantUser || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !grantUser || saving ? 0.4 : 1 }}>
              {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <><Gift size={13} /> Grant</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
