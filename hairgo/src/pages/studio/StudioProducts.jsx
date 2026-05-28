import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Package, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const EMPTY = { name: '', description: '', price: '', category: '', stock: '', available: true, image_url: '' }

export default function StudioProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY); setModal('add') }
  function openEdit(p) { setForm({ ...p }); setModal('edit') }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0 }
      if (modal === 'add') {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        toast.success('Product added')
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', form.id)
        if (error) throw error
        toast.success('Product updated')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    toast.success('Product deleted')
    load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-white">Products</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-48 shimmer rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden group">
              <div className="aspect-square bg-[#1a1a1a] relative">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-white/10" /></div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg bg-black/60 text-white/60 hover:text-white flex items-center justify-center backdrop-blur-sm"><Edit2 size={12} /></button>
                  <button onClick={() => deleteProduct(p.id)} className="w-7 h-7 rounded-lg bg-black/60 text-red-400/60 hover:text-red-400 flex items-center justify-center backdrop-blur-sm"><Trash2 size={12} /></button>
                </div>
                {!p.available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-xs text-white/60 uppercase tracking-widest">Unavailable</span></div>}
              </div>
              <div className="p-3">
                <p className="text-white text-sm line-clamp-1">{p.name}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-[#C9A84C] text-xs">€{p.price}</span>
                  <span className="text-white/30 text-xs">Stock: {p.stock}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-[#111] border border-white/8 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl text-white">{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
                <button onClick={() => setModal(null)} className="p-1.5 text-white/30 hover:text-white"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                {[
                  { k: 'name', label: 'Name', placeholder: 'Product name' },
                  { k: 'category', label: 'Category', placeholder: 'Shampoo, Conditioner...' },
                  { k: 'price', label: 'Price (€)', placeholder: '0.00', type: 'number' },
                  { k: 'stock', label: 'Stock', placeholder: '0', type: 'number' },
                  { k: 'image_url', label: 'Image URL', placeholder: 'https://...' },
                ].map(({ k, label, placeholder, type = 'text' }) => (
                  <div key={k}>
                    <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">{label}</label>
                    <input type={type} value={form[k] || ''} onChange={set(k)} placeholder={placeholder}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 transition-colors" />
                  </div>
                ))}
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Description</label>
                  <textarea value={form.description || ''} onChange={set('description')} rows={3} placeholder="Product description..."
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 transition-colors resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.available} onChange={e => setForm(p => ({ ...p, available: e.target.checked }))} className="accent-[#C9A84C]" />
                  <span className="text-sm text-white/60">Available for preorder</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/40 text-sm hover:text-white hover:border-white/20 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Save size={14} /> Save</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
