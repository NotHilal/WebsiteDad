import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Image, X, Save, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const CATEGORIES = ['cut', 'color', 'treatment', 'style']

export default function StudioGallery() {
  const [images, setImages] = useState([])
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ image_url: '', title: '', category: 'cut', stylist_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: imgs }, { data: stys }] = await Promise.all([
      supabase.from('gallery').select('*, stylists(name)').order('display_order'),
      supabase.from('stylists').select('id, name'),
    ])
    setImages(imgs || [])
    setStylists(stys || [])
    setLoading(false)
  }

  async function add() {
    setSaving(true)
    try {
      const { error } = await supabase.from('gallery').insert({ ...form, display_order: images.length })
      if (error) throw error
      toast.success('Photo added')
      setModal(false)
      setForm({ image_url: '', title: '', category: 'cut', stylist_id: '' })
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this photo?')) return
    await supabase.from('gallery').delete().eq('id', id)
    toast.success('Photo removed')
    load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-white">Gallery</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Add Photo
        </button>
      </div>

      {loading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`break-inside-avoid mb-3 shimmer rounded-2xl ${['h-48', 'h-64', 'h-56', 'h-72'][i % 4]}`} />)}
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {images.map(img => (
            <motion.div key={img.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="break-inside-avoid mb-3 relative group rounded-2xl overflow-hidden">
              {img.image_url ? (
                <img src={img.image_url} alt={img.title || ''} className="w-full object-cover rounded-2xl" />
              ) : (
                <div className="h-48 bg-[#1a1a1a] rounded-2xl flex items-center justify-center">
                  <Image size={28} className="text-white/10" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-start justify-end p-3">
                <button onClick={() => remove(img.id)} className="w-8 h-8 rounded-lg bg-red-400/20 text-red-400 hover:bg-red-400/30 transition-colors flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </div>
              {img.category && (
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-0.5 rounded-full bg-black/60 text-[#C9A84C] text-[10px] uppercase tracking-widest backdrop-blur-sm">
                    {img.category}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
          {images.length === 0 && (
            <div className="col-span-4 text-center py-20 text-white/25">No gallery images yet.</div>
          )}
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#111] border border-white/8 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-2xl text-white">Add Photo</h2>
                <button onClick={() => setModal(false)} className="p-1.5 text-white/30 hover:text-white"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Image URL</label>
                  <input value={form.image_url} onChange={set('image_url')} placeholder="https://..."
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Title (optional)</label>
                  <input value={form.title} onChange={set('title')} placeholder="Photo title..."
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Category</label>
                  <select value={form.category} onChange={set('category')}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 transition-colors">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/30 mb-1.5 block">Stylist (optional)</label>
                  <select value={form.stylist_id} onChange={set('stylist_id')}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 transition-colors">
                    <option value="">None</option>
                    {stylists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/40 text-sm hover:text-white">Cancel</button>
                <button onClick={add} disabled={saving || !form.image_url} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#C4956A] text-black font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Save size={14} /> Add</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
