import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Edit2, Trash2, X, Save, Scissors, Clock, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', modal: '#1a1a24',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
}

const CATS = ['cut', 'color', 'treatment', 'style', 'other']

const CAT = {
  cut:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   gradient: 'rgba(96,165,250,0.15)',   label: 'Cut' },
  color:     { color: '#c084fc', bg: 'rgba(192,132,252,0.1)',  gradient: 'rgba(192,132,252,0.15)',  label: 'Color' },
  treatment: { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   gradient: 'rgba(52,211,153,0.15)',   label: 'Treatment' },
  style:     { color: '#C9A84C', bg: 'rgba(201,168,76,0.1)',   gradient: 'rgba(201,168,76,0.15)',   label: 'Style' },
  other:     { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', gradient: 'rgba(255,255,255,0.06)', label: 'Other' },
}

const EMPTY = { name: '', description: '', price: '', duration: '', category: '', active: true }

const inp = (extra = {}) => ({
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none',
  fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s, box-shadow .2s',
  boxSizing: 'border-box', ...extra,
})
const lbl = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }

export default function StudioServices() {
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [catFilter, setCatFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('services').select('*').order('category').order('name')
    setServices(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, duration: parseInt(form.duration) || 0 }
      const { error } = modal === 'add'
        ? await supabase.from('services').insert(payload)
        : await supabase.from('services').update(payload).eq('id', form.id)
      if (error) throw error
      toast.success(modal === 'add' ? 'Service added' : 'Service updated')
      setModal(null); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('Delete this service?')) return
    await supabase.from('services').delete().eq('id', id)
    toast.success('Service deleted'); load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const filtered = catFilter === 'all' ? services : services.filter(s => s.category === catFilter)

  const catCounts = CATS.reduce((acc, c) => {
    acc[c] = services.filter(s => s.category === c).length
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .svc-card { transition: all .22s ease; }
        .svc-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,0.4) !important; }
        .svc-card:hover .svc-actions { opacity: 1 !important; }
        .svc-card:hover .svc-edit-btn:hover { background: rgba(255,255,255,0.15) !important; color: ${C.white} !important; }
        .svc-card:hover .svc-del-btn:hover  { background: rgba(248,113,113,0.2) !important; color: #f87171 !important; }
        .cat-filter:hover { border-color: rgba(255,255,255,0.18) !important; color: ${C.dim} !important; }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(201,168,76,0.3); }
        .modal-close:hover { background: rgba(255,255,255,0.1) !important; }
        .modal-cancel:hover { border-color: rgba(255,255,255,0.2) !important; }
      `}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: '1.25rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Services</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{services.length} services · {services.filter(s => s.active).length} active</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal('add') }} className="btn-g"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.55rem 1.1rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s', letterSpacing: '0.04em' }}>
          <Plus size={14} /> New Service
        </button>
      </div>

      {/* Category filter bar */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 6, marginBottom: '1.1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setCatFilter('all')}
          style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${catFilter === 'all' ? C.goldBorder : C.border}`, background: catFilter === 'all' ? C.goldBg : 'transparent', color: catFilter === 'all' ? C.gold : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          className="cat-filter">
          All · {services.length}
        </button>
        {CATS.filter(c => catCounts[c] > 0).map(c => {
          const cat = CAT[c]
          return (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{ padding: '5px 14px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${catFilter === c ? cat.color + '55' : C.border}`, background: catFilter === c ? cat.bg : 'transparent', color: catFilter === c ? cat.color : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              className="cat-filter">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: catFilter === c ? cat.color : C.border, transition: 'background .15s' }} />
              {cat.label} · {catCounts[c]}
            </button>
          )
        })}
      </div>

      {/* Card grid */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 180, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
            <Scissors size={30} color={C.border} />
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>No services found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {filtered.map(s => {
              const cat = CAT[s.category] || CAT.other
              return (
                <div key={s.id} className="svc-card"
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', position: 'relative' }}>

                  {/* Top color bar */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}44)` }} />

                  {/* Card content */}
                  <div style={{ padding: '1.1rem 1.25rem 1rem' }}>

                    {/* Category + active badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, padding: '3px 9px', borderRadius: 20, background: cat.bg, color: cat.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', border: `1px solid ${cat.color}30` }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color }} />
                        {cat.label}
                      </span>
                      {!s.active && (
                        <span style={{ fontSize: 9, padding: '3px 9px', borderRadius: 20, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(248,113,113,0.2)' }}>
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Service name */}
                    <h3 className="font-display" style={{ fontSize: '1.35rem', color: C.white, lineHeight: 1.15, marginBottom: '0.5rem' }}>
                      {s.name}
                    </h3>

                    {/* Description */}
                    {s.description && (
                      <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', lineHeight: 1.6, marginBottom: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {s.description}
                      </p>
                    )}

                    {/* Price + duration */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: s.description ? 0 : '0.5rem' }}>
                      <span className="font-display" style={{ fontSize: '1.6rem', color: cat.color, lineHeight: 1 }}>
                        €{s.price}
                      </span>
                      {s.duration > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: C.subtle, border: `1px solid ${C.border}` }}>
                          <Clock size={10} color={C.muted} strokeWidth={1.5} />
                          <span style={{ fontSize: 10, color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{s.duration} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="svc-actions"
                    style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4, opacity: 0, transition: 'opacity .2s' }}>
                    <button onClick={() => { setForm({ ...s }); setModal('edit') }} className="svc-edit-btn"
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.6)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all .15s' }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => del(s.id)} className="svc-del-btn"
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all .15s' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Bottom glow */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(to top, ${cat.gradient}, transparent)`, pointerEvents: 'none' }} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setModal(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 480, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.65)', maxHeight: '90vh', overflowY: 'auto' }}>

              {/* Gold top bar */}
              <div style={{ height: 3, background: `linear-gradient(90deg,${C.gold},#C4956A,rgba(201,168,76,0.15))` }} />

              <div style={{ padding: '1.75rem' }}>
                {/* Modal header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 700, marginBottom: 5 }}>
                      {modal === 'add' ? 'New Service' : 'Edit Service'}
                    </p>
                    <h2 className="font-display font-light" style={{ fontSize: '1.8rem', color: C.white, lineHeight: 1 }}>
                      {modal === 'add' ? 'Add a Service' : form.name || 'Edit Service'}
                    </h2>
                  </div>
                  <button onClick={() => setModal(null)} className="modal-close"
                    style={{ width: 32, height: 32, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s', flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={lbl}>Name <span style={{ color: C.gold }}>*</span></label>
                    <input value={form.name} onChange={set('name')} placeholder="e.g. Precision Cut" style={inp()} className="m-inp" />
                  </div>

                  <div>
                    <label style={lbl}>Description</label>
                    <textarea value={form.description || ''} onChange={set('description')} rows={2} placeholder="Short description of the service…" style={{ ...inp(), resize: 'none' }} className="m-inp" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={lbl}>Price (€)</label>
                      <input type="number" value={form.price} onChange={set('price')} placeholder="45" style={inp()} className="m-inp" />
                    </div>
                    <div>
                      <label style={lbl}>Duration (min)</label>
                      <input type="number" value={form.duration} onChange={set('duration')} placeholder="60" style={inp()} className="m-inp" />
                    </div>
                  </div>

                  {/* Category selector */}
                  <div>
                    <label style={lbl}>Category</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {CATS.map(c => {
                        const cat = CAT[c]
                        const sel = form.category === c
                        return (
                          <button key={c} type="button" onClick={() => setForm(p => ({ ...p, category: c }))}
                            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${sel ? cat.color + '66' : C.border}`, background: sel ? cat.bg : 'transparent', color: sel ? cat.color : C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: sel ? cat.color : C.border, transition: 'background .15s' }} />
                            {cat.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Active toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderRadius: 10, background: C.subtle, border: `1px solid ${C.border}` }}>
                    <div>
                      <p style={{ fontSize: '0.83rem', color: C.dim, fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 2 }}>Active</p>
                      <p style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Visible in the booking wizard</p>
                    </div>
                    <div style={{ width: 42, height: 24, borderRadius: 12, background: form.active ? C.gold : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background .25s', flexShrink: 0, cursor: 'pointer', boxShadow: form.active ? `0 0 12px rgba(201,168,76,0.35)` : 'none' }}
                      onClick={() => setForm(p => ({ ...p, active: !p.active }))}>
                      <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transition: 'left .25s', left: form.active ? 21 : 3 }} />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
                  <button onClick={() => setModal(null)} className="modal-cancel"
                    style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                    Cancel
                  </button>
                  <button onClick={save} disabled={saving} className="btn-g"
                    style={{ flex: 1.5, padding: '0.7rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: saving ? 0.6 : 1, transition: 'all .2s' }}>
                    {saving
                      ? <div style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                      : <><Save size={14} /> {modal === 'add' ? 'Add Service' : 'Save Changes'}</>
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
