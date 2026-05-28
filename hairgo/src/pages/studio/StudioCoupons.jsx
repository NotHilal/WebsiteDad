import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Tag, X, Save, Gift, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const EMPTY = { code: '', discount_type: 'percentage', discount_value: '', min_points_required: 0, max_uses: '', expiry_date: '', active: true }

export default function StudioCoupons() {
  const [coupons, setCoupons] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [grantModal, setGrantModal] = useState(null)
  const [grantUser, setGrantUser] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, points').eq('role', 'user').order('full_name'),
    ])
    setCoupons(c || [])
    setUsers(u || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        discount_value: parseFloat(form.discount_value) || 0,
        min_points_required: parseInt(form.min_points_required) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expiry_date: form.expiry_date || null,
      }
      if (modal === 'add') {
        const { error } = await supabase.from('coupons').insert(payload)
        if (error) throw error
        toast.success('Coupon created')
      } else {
        const { error } = await supabase.from('coupons').update(payload).eq('id', form.id)
        if (error) throw error
        toast.success('Coupon updated')
      }
      setModal(null)
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function grant() {
    if (!grantUser || !grantModal) return
    setSaving(true)
    try {
      const { error } = await supabase.from('user_coupons').insert({ user_id: grantUser, coupon_id: grantModal.id, granted_by: 'admin', used: false })
      if (error) throw error
      toast.success('Coupon granted to user')
      setGrantModal(null)
      setGrantUser('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteCoupon(id) {
    if (!confirm('Delete this coupon?')) return
    await supabase.from('coupons').delete().eq('id', id)
    toast.success('Coupon deleted')
    load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-white">Coupons</h1>
        <button onClick={() => { setForm(EMPTY); setModal('add') }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 shimmer rounded-xl" />) :
          coupons.length === 0 ? <div className="text-center py-20 text-white/25">No coupons yet.</div> :
          coupons.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                  <Tag size={16} className="text-[#C9A84C]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#C9A84C] text-sm tracking-wider">{c.code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`} off
                    {c.min_points_required > 0 && ` · ${c.min_points_required} pts min`}
                    {c.expiry_date && ` · Expires ${format(new Date(c.expiry_date), 'MMM d, yyyy')}`}
                    {c.max_uses && ` · ${c.current_uses}/${c.max_uses} uses`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setGrantModal(c) }} className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors flex items-center justify-center" title="Grant to user">
                  <Gift size={13} />
                </button>
                <button onClick={() => { setForm({ ...c, expiry_date: c.expiry_date || '' }); setModal('edit') }} className="w-8 h-8 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors flex items-center justify-center">
                  <Tag size={13} />
                </button>
                <button onClick={() => deleteCoupon(c.id)} className="w-8 h-8 rounded-lg bg-red-400/5 text-red-400/60 hover:text-red-400 transition-colors flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))
        }
      </div>

      {/* Create / edit modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#111] border border-white/8 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl text-white">{modal === 'add' ? 'Create Coupon' : 'Edit Coupon'}</h2>
                <button onClick={() => setModal(null)} className="p-1.5 text-white/30 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Code</label>
                  <input value={form.code} onChange={set('code')} placeholder="SAVE20"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Type</label>
                    <select value={form.discount_type} onChange={set('discount_type')} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Value</label>
                    <input type="number" value={form.discount_value} onChange={set('discount_value')} placeholder="20"
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Min Points</label>
                    <input type="number" value={form.min_points_required} onChange={set('min_points_required')} placeholder="0"
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Max Uses</label>
                    <input type="number" value={form.max_uses} onChange={set('max_uses')} placeholder="Unlimited"
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={set('expiry_date')}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="accent-[#C9A84C]" />
                  <span className="text-sm text-white/60">Active</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/40 text-sm hover:text-white">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Save size={14} /> Save</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {grantModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setGrantModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-[#111] border border-white/8 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-xl text-white">Grant Coupon</h2>
                <button onClick={() => setGrantModal(null)} className="p-1.5 text-white/30 hover:text-white"><X size={16} /></button>
              </div>
              <p className="text-white/40 text-sm mb-4">Grant <span className="text-[#C9A84C] font-mono">{grantModal.code}</span> to:</p>
              <select value={grantUser} onChange={e => setGrantUser(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 mb-5">
                <option value="">Select a user...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.points} pts)</option>)}
              </select>
              <button onClick={grant} disabled={!grantUser || saving} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Gift size={14} /> Grant Coupon
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
