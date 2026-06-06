import { useState, useEffect, useRef, useMemo } from 'react'
import Pager from '../../lib/Pager'
import { Plus, Trash2, Image, X, Save, Edit2, Eye, EyeOff, ShieldAlert, ChevronDown, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getOrFetch, invalidate } from '../../lib/cache'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)',
  goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)',
  subtle: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.07)', modal: '#1a1a24',
  red: '#f87171', redBg: 'rgba(248,113,113,0.1)', redBorder: 'rgba(248,113,113,0.2)',
}

const CATEGORIES = ['cut', 'color', 'treatment', 'style']
const CAT = {
  cut:       { bg: 'rgba(96,165,250,.15)',  color: '#60a5fa', label: 'Cut'       },
  color:     { bg: 'rgba(192,132,252,.15)', color: '#c084fc', label: 'Color'     },
  treatment: { bg: 'rgba(52,211,153,.15)',  color: '#34d399', label: 'Treatment' },
  style:     { bg: 'rgba(201,168,76,.15)',  color: '#C9A84C', label: 'Style'     },
}
const FILTERS = [
  { key: 'all',    label: 'All'       },
  { key: 'cut',    label: 'Cut'       },
  { key: 'color',  label: 'Color'     },
  { key: 'treatment', label: 'Treatment' },
  { key: 'style',  label: 'Style'     },
  { key: 'hidden', label: 'Hidden'    },
]

const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }
const EMPTY = { image_url: '', title: '', category: 'cut', stylist_id: '', visible: true }

function Select({ value, onChange, options }) {
  const [open, setOpen]   = useState(false)
  const [rect, setRect]   = useState(null)
  const btnRef  = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (!btnRef.current?.contains(e.target) && !panelRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle() {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(p => !p)
  }

  const selected = options.find(o => o.value === value)

  return (
    <div>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${open ? C.goldBorder : 'rgba(255,255,255,0.1)'}`, borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', fontFamily: 'Jost,sans-serif', fontWeight: 300, cursor: 'pointer', transition: 'all .18s', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected?.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: selected.dot, flexShrink: 0 }} />}
          <span>{selected?.label || '—'}</span>
        </div>
        <ChevronDown size={13} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {open && rect && (
        <div ref={panelRef}
          style={{ position: 'fixed', top: rect.bottom + 5, left: rect.left, width: rect.width, background: '#1e1e2a', border: `1px solid ${C.goldBorder}`, borderRadius: 11, overflow: 'hidden', zIndex: 9999, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', animation: 'dropIn .14s ease' }}>
          {options.map(o => {
            const active = value === o.value
            return (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '0.6rem 0.9rem', background: active ? 'rgba(201,168,76,0.1)' : 'transparent', border: 'none', borderBottom: `1px solid rgba(255,255,255,0.04)`, color: active ? C.gold : 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                {o.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot, flexShrink: 0 }} />}
                <span style={{ flex: 1 }}>{o.label}</span>
                {active && <Check size={12} color={C.gold} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function StudioGallery() {
  const [images,      setImages]      = useState([])
  const [stylists,    setStylists]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('all')
  const [modal,       setModal]       = useState(null)   // null | 'add' | 'edit'
  const [editing,     setEditing]     = useState(null)
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [file,        setFile]        = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletePwd,   setDeletePwd]   = useState('')
  const [deleteErr,   setDeleteErr]   = useState('')
  const [deleting,    setDeleting]    = useState(false)
  const [showPwd,     setShowPwd]     = useState(false)
  const [page,        setPage]        = useState(0)
  const [perPage,     setPerPage]     = useState(() => window.innerWidth <= 640 ? 6 : 12)

  useEffect(() => {
    load()
    const handler = () => setPerPage(window.innerWidth <= 640 ? 6 : 12)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  async function load() {
    const [imgs, stys] = await getOrFetch('studio_gallery', async () => {
      const [{ data: imgs }, { data: stys }] = await Promise.all([
        supabase.from('gallery').select('*, stylists(name)').order('display_order'),
        supabase.from('stylists').select('id, name'),
      ])
      return [imgs || [], stys || []]
    }, 5 * 60_000)
    setImages(imgs); setStylists(stys); setLoading(false)
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setFilePreview(URL.createObjectURL(f))
  }

  function openAdd() {
    setEditing(null); setFile(null); setFilePreview(''); setForm(EMPTY); setModal('add')
  }

  function openEdit(img) {
    setEditing(img)
    setFile(null); setFilePreview('')
    setForm({ image_url: img.image_url || '', title: img.title || '', category: img.category || 'cut', stylist_id: img.stylist_id || '', visible: img.visible !== false })
    setModal('edit')
  }

  function closeModal() { setModal(null); setEditing(null); setFile(null); setFilePreview('') }

  async function save() {
    if (!file && !form.image_url) return toast.error('Add a photo first')
    setSaving(true)
    try {
      let imageUrl = form.image_url
      if (file) {
        const ext  = file.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('gallery').upload(path, file, { upsert: true })
        if (uploadErr) throw new Error('Upload failed: ' + uploadErr.message)
        const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)
        imageUrl = publicUrl
      }
      const payload = { ...form, image_url: imageUrl }
      const { error } = modal === 'add'
        ? await supabase.from('gallery').insert({ ...payload, display_order: images.length })
        : await supabase.from('gallery').update(payload).eq('id', editing.id)
      if (error) throw error
      toast.success(modal === 'add' ? 'Photo added' : 'Photo updated')
      closeModal(); invalidate('studio_gallery'); invalidate('studio_home_display'); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function toggleVisible(id, current) {
    const next = !current
    setImages(prev => prev.map(img => img.id === id ? { ...img, visible: next } : img))
    const { error } = await supabase.from('gallery').update({ visible: next }).eq('id', id)
    if (error) {
      setImages(prev => prev.map(img => img.id === id ? { ...img, visible: current } : img))
      toast.error(error.message)
    } else {
      invalidate('studio_gallery'); invalidate('studio_home_display')
    }
  }

  function openDelete(img) {
    setDeleteTarget({ id: img.id, title: img.title || 'this photo' })
    setDeletePwd(''); setDeleteErr(''); setShowPwd(false)
  }

  async function confirmDelete() {
    if (!deletePwd) { setDeleteErr('Enter the admin password'); return }
    if (deletePwd !== 'hairgo24') { setDeleteErr('Incorrect admin password'); return }
    setDeleting(true)
    const { error } = await supabase.from('gallery').delete().eq('id', deleteTarget.id)
    if (error) { setDeleteErr(error.message); setDeleting(false); return }
    toast.success('Photo deleted')
    setDeleteTarget(null); setDeleting(false)
    invalidate('studio_gallery'); invalidate('studio_home_display'); load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const hidden = images.filter(img => img.visible === false)
  const filtered = useMemo(() => {
    if (filter === 'hidden') return images.filter(img => img.visible === false)
    if (filter === 'all')    return images
    return images.filter(img => img.category === filter)
  }, [images, filter])

  const paged = filtered.slice(page * perPage, (page + 1) * perPage)
  useEffect(() => setPage(0), [filter, perPage])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.875rem' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes modalIn { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes dropIn  { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .gal-card  { transition: transform .22s ease, box-shadow .22s ease; }
        .gal-card:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(0,0,0,0.45); }
        .gal-img   { transition: transform .45s ease; }
        .gal-card:hover .gal-img { transform: scale(1.05); }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.3); }
        .gal-filter:hover { border-color: rgba(255,255,255,0.2) !important; color: rgba(255,255,255,0.55) !important; }
        .sp-modal-close:hover { background: rgba(255,255,255,0.1) !important; }
        .gal-vis-btn  { transition: all .18s; }
        .gal-edit-btn { transition: all .18s; }
        .gal-del-btn  { transition: all .18s; }
        .gal-vis-btn:hover  { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .gal-edit-btn:hover { background: ${C.goldBg} !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .gal-del-btn:hover  { background: rgba(248,113,113,0.18) !important; border-color: rgba(248,113,113,0.5) !important; color: ${C.red} !important; }
        @media (max-width: 640px) {
          .gal-grid    { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; }
          .gal-hdr     { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .gal-hdr-btn { align-self: flex-end; }
          .gal-vis-btn, .gal-edit-btn, .gal-del-btn { width: 40px !important; height: 40px !important; border-radius: 10px !important; }
          .gal-act-bar { padding: 8px !important; gap: 5px !important; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .gal-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="gal-hdr" style={{ flexShrink: 0, paddingBottom: '0.875rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Studio</p>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.2rem' }}>Gallery</h1>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: C.white, fontWeight: 600 }}>{images.length}</span> photos</span>
            {hidden.length > 0 && <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{hidden.length}</span> hidden</span>}
          </div>
        </div>
        <div className="gal-hdr-btn">
          <button onClick={openAdd} className="btn-g"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.1rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Add Photo
          </button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f.key
          const cat    = CAT[f.key]
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} className="gal-filter"
              style={{ padding: '3px 11px', borderRadius: 20, fontSize: 9, letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${active ? (cat?.color ? cat.color + '55' : C.goldBorder) : C.border}`, background: active ? (cat?.bg || C.goldBg) : 'transparent', color: active ? (cat?.color || C.gold) : C.muted, flexShrink: 0 }}>
              {f.label}
              {f.key !== 'all' && <span style={{ marginLeft: 4, opacity: 0.65 }}>{f.key === 'hidden' ? hidden.length : images.filter(i => i.category === f.key).length}</span>}
            </button>
          )
        })}
      </div>

      {/* ── Grid ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div className="gal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ aspectRatio: '4/5', borderRadius: 12, background: C.card }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: '0.75rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image size={20} color="rgba(255,255,255,0.12)" strokeWidth={1} />
            </div>
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>
              {filter === 'hidden' ? 'No hidden photos' : filter === 'all' ? 'No photos yet' : `No ${filter} photos`}
            </p>
          </div>
        ) : (
          <>
            <div className="gal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {paged.map(img => {
                const isHidden = img.visible === false
                const cat = CAT[img.category]
                return (
                  <div key={img.id} className="gal-card"
                    style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isHidden ? 'rgba(255,255,255,0.05)' : C.border}`, background: C.card }}>

                    {/* Image */}
                    <div style={{ aspectRatio: '4/5', overflow: 'hidden', position: 'relative' }}>
                      {img.image_url
                        ? <img src={img.image_url} alt={img.title || ''} className="gal-img"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', objectPosition: 'top center', filter: isHidden ? 'brightness(0.3) saturate(0.4)' : 'none', transition: 'filter .25s' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d12' }}>
                            <Image size={24} color="rgba(255,255,255,0.1)" strokeWidth={1} />
                          </div>
                      }
                      {isHidden && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <EyeOff size={26} color="rgba(255,255,255,0.22)" />
                        </div>
                      )}
                      {img.category && cat && (
                        <div style={{ position: 'absolute', top: 8, left: 8 }}>
                          <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', color: cat.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{cat.label}</span>
                        </div>
                      )}
                    </div>

                    {/* ── Permanent action bar ── */}
                    <div className="gal-act-bar" style={{ padding: '8px 9px', borderTop: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, marginRight: 4 }}>
                        {img.title
                          ? <p style={{ color: C.dim, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.title}</p>
                          : <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.68rem', fontFamily: 'Jost,sans-serif', fontStyle: 'italic' }}>No title</p>
                        }
                        {img.stylists?.name && <p style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{img.stylists.name}</p>}
                      </div>

                      {/* Visibility toggle */}
                      <button onClick={() => toggleVisible(img.id, img.visible !== false)} className="gal-vis-btn"
                        title={isHidden ? 'Make visible' : 'Hide'}
                        style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${isHidden ? C.goldBorder : C.border}`, background: isHidden ? C.goldBg : 'rgba(255,255,255,0.04)', color: isHidden ? C.gold : C.muted }}>
                        {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>

                      {/* Edit */}
                      <button onClick={() => openEdit(img)} className="gal-edit-btn"
                        title="Edit"
                        style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.muted }}>
                        <Edit2 size={14} />
                      </button>

                      {/* Delete */}
                      <button onClick={() => openDelete(img)} className="gal-del-btn"
                        title="Delete"
                        style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)', color: 'rgba(248,113,113,0.5)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pager page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ width: '100%', maxWidth: 480, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 24, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 48px 120px rgba(0,0,0,.7)', animation: 'modalIn .2s ease' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ height: 3, background: 'linear-gradient(90deg,#C9A84C,#C4956A,rgba(201,168,76,0.1))', flexShrink: 0 }} />

            {/* Header */}
            <div style={{ padding: '1.5rem 1.75rem 1.25rem', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }}>
                  {modal === 'add' ? 'New Photo' : 'Edit Photo'}
                </p>
                <h2 className="font-display font-light" style={{ fontSize: '1.75rem', color: C.white, lineHeight: 1.05 }}>
                  {modal === 'add' ? 'Add Photo' : editing?.title || 'Edit Photo'}
                </h2>
              </div>
              <button onClick={closeModal} className="sp-modal-close"
                style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .18s', marginTop: 2 }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ height: 1, background: C.border, flexShrink: 0 }} />

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Photo upload */}
              <div>
                <label style={lbl}>Photo</label>
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                  <div style={{ borderRadius: 14, overflow: 'hidden', border: `2px dashed ${(filePreview || form.image_url) ? C.goldBorder : 'rgba(255,255,255,0.1)'}`, background: '#0d0d12', transition: 'border-color .2s', aspectRatio: '16/7', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {(filePreview || form.image_url)
                      ? <img src={filePreview || form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', objectPosition: 'top center' }} />
                      : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <Image size={24} color="rgba(255,255,255,0.15)" />
                          <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Click to upload</p>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>JPG · PNG · WEBP</p>
                        </div>
                    }
                  </div>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <p style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif' }}>{(filePreview || form.image_url) ? 'Click to change photo' : ''}</p>
                  {filePreview && <button onClick={() => { setFile(null); setFilePreview('') }} style={{ fontSize: 9, color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost,sans-serif', padding: 0 }}>Remove</button>}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={lbl}>Title <span style={{ textTransform: 'none', letterSpacing: 0, color: C.muted, fontSize: 9 }}>(optional)</span></label>
                <input value={form.title} onChange={set('title')} placeholder="e.g. Summer balayage" className="m-inp" style={inp} />
              </div>

              {/* Category + Stylist */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>Category</label>
                  <Select
                    value={form.category}
                    onChange={v => setForm(p => ({ ...p, category: v }))}
                    options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1), dot: CAT[c]?.color }))}
                  />
                </div>
                <div>
                  <label style={lbl}>Stylist <span style={{ textTransform: 'none', letterSpacing: 0, color: C.muted, fontSize: 9 }}>(optional)</span></label>
                  <Select
                    value={form.stylist_id}
                    onChange={v => setForm(p => ({ ...p, stylist_id: v }))}
                    options={[{ value: '', label: 'None' }, ...stylists.map(s => ({ value: s.id, label: s.name }))]}
                  />
                </div>
              </div>

              {/* Visible toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.1rem', borderRadius: 13, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                <div>
                  <p style={{ fontSize: '0.83rem', color: C.dim, fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 2 }}>Visible to visitors</p>
                  <p style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Shown in the public gallery</p>
                </div>
                <div style={{ width: 44, height: 26, borderRadius: 13, background: form.visible ? C.gold : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background .22s', flexShrink: 0, cursor: 'pointer', boxShadow: form.visible ? '0 0 14px rgba(201,168,76,0.4)' : 'none' }}
                  onClick={() => setForm(p => ({ ...p, visible: !p.visible }))}>
                  <div style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', transition: 'left .22s', left: form.visible ? 21 : 3 }} />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ height: 1, background: C.border, flexShrink: 0 }} />
            <div style={{ padding: '1.1rem 1.75rem 1.5rem', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
              <button onClick={closeModal}
                style={{ flex: 1, padding: '0.72rem', borderRadius: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving || (!file && !form.image_url)}
                style={{ flex: 2, padding: '0.72rem', borderRadius: 12, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: (saving || (!file && !form.image_url)) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: (saving || (!file && !form.image_url)) ? 0.5 : 1, boxShadow: (saving || (!file && !form.image_url)) ? 'none' : '0 4px 20px rgba(201,168,76,0.28)', transition: 'opacity .2s, box-shadow .2s' }}>
                {saving
                  ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  : <><Save size={13} /> {modal === 'add' ? 'Add Photo' : 'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, background: C.modal, border: '1px solid rgba(248,113,113,0.25)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7)', animation: 'modalIn .2s ease' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,#f87171,#ef4444,rgba(248,113,113,0.1))' }} />
            <div style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.redBg, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <ShieldAlert size={22} color={C.red} strokeWidth={1.5} />
                </div>
                <h2 className="font-display font-light" style={{ fontSize: '1.55rem', color: C.white, lineHeight: 1.1, marginBottom: '0.4rem' }}>Delete Photo</h2>
                <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif', lineHeight: 1.6 }}>
                  Permanently delete <span style={{ color: C.white }}>{deleteTarget.title}</span>?<br />Enter the admin password to confirm.
                </p>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ ...lbl }}>Admin Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={deletePwd} onChange={e => { setDeletePwd(e.target.value); setDeleteErr('') }} onKeyDown={e => e.key === 'Enter' && confirmDelete()} placeholder="Enter admin password…" autoFocus className="m-inp"
                    style={{ ...inp, borderColor: deleteErr ? C.redBorder : undefined, paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {deleteErr && <p style={{ fontSize: '0.72rem', color: C.red, fontFamily: 'Jost,sans-serif', marginTop: 5 }}>{deleteErr}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmDelete} disabled={deleting} style={{ flex: 2, padding: '0.65rem', borderRadius: 10, background: 'linear-gradient(135deg,#f87171,#ef4444)', color: '#fff', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <><Trash2 size={13} /> Delete Photo</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
