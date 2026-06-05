import { useState, useEffect } from 'react'
import { Plus, Trash2, Image, X, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)', modal: '#1a1a24',
}

const CATEGORIES = ['cut', 'color', 'treatment', 'style']
const CAT_STYLE = {
  cut:       { bg: 'rgba(96,165,250,.18)',  color: '#60a5fa' },
  color:     { bg: 'rgba(192,132,252,.18)', color: '#c084fc' },
  treatment: { bg: 'rgba(52,211,153,.18)',  color: '#34d399' },
  style:     { bg: 'rgba(201,168,76,.18)',  color: '#C9A84C' },
}

const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }

export default function StudioGallery() {
  const [images,     setImages]     = useState([])
  const [stylists,   setStylists]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState({ image_url: '', title: '', category: 'cut', stylist_id: '' })
  const [saving,     setSaving]     = useState(false)
  const [file,       setFile]       = useState(null)
  const [filePreview, setFilePreview] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: imgs }, { data: stys }] = await Promise.all([
      supabase.from('gallery').select('*, stylists(name)').order('display_order'),
      supabase.from('stylists').select('id, name'),
    ])
    setImages(imgs || []); setStylists(stys || []); setLoading(false)
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setFilePreview(URL.createObjectURL(f))
  }

  function closeModal() {
    setModal(false)
    setForm({ image_url: '', title: '', category: 'cut', stylist_id: '' })
    setFile(null)
    setFilePreview('')
  }

  async function add() {
    if (!file && !form.image_url) return toast.error('Upload a photo or enter an image URL')
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

      const { error } = await supabase.from('gallery').insert({ ...form, image_url: imageUrl, display_order: images.length })
      if (error) throw error
      toast.success('Photo added')
      closeModal()
      load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this photo?')) return
    await supabase.from('gallery').delete().eq('id', id)
    toast.success('Photo removed'); load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .gallery-img { transition: transform .45s ease; display: block; width: 100%; }
        .gal-item:hover .gallery-img { transform: scale(1.05); }
        .gal-overlay { opacity: 0; transition: opacity .25s; }
        .gal-item:hover .gal-overlay { opacity: 1; }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.3); }
        @media (max-width:600px)  { .gal-cols { columns: 2 !important; } }
        @media (min-width:601px) and (max-width:900px) { .gal-cols { columns: 3 !important; } }
        @media (min-width:901px) { .gal-cols { columns: 4 !important; } }
      `}</style>

      <div style={{ flexShrink: 0, marginBottom: '1.1rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Gallery</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{images.length} photos</p>
        </div>
        <button onClick={() => { setFile(null); setFilePreview(''); setForm({ image_url: '', title: '', category: 'cut', stylist_id: '' }); setModal(true) }} className="btn-g"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s' }}>
          <Plus size={13} /> Add Photo
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div className="gal-cols" style={{ gap: '0.75rem' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: '0.75rem', borderRadius: 10, height: [200, 280, 240, 320][i % 4], background: C.card, border: `1px solid ${C.border}` }} />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Image size={22} color={C.border} />
            </div>
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>No photos yet</p>
          </div>
        ) : (
          <div className="gal-cols" style={{ gap: '0.75rem' }}>
            {images.map(img => {
              const catStyle = CAT_STYLE[img.category] || { bg: C.subtle, color: C.muted }
              return (
                <div key={img.id} className="gal-item"
                  style={{ breakInside: 'avoid', marginBottom: '0.75rem', borderRadius: 10, overflow: 'hidden', position: 'relative', border: `1px solid ${C.border}`, cursor: 'default' }}>
                  {img.image_url
                    ? <img src={img.image_url} alt={img.title || ''} className="gallery-img" />
                    : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e14' }}>
                        <Image size={28} color={C.border} />
                      </div>
                  }
                  <div className="gal-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.15) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => remove(img.id)}
                        style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,.65)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div>
                      {img.title && <p style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', marginBottom: 4, fontWeight: 500 }}>{img.title}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {img.category && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Jost,sans-serif', fontWeight: 700, background: catStyle.bg, color: catStyle.color }}>{img.category}</span>}
                        {img.stylists?.name && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontFamily: 'Jost,sans-serif' }}>{img.stylists.name}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ width: '100%', maxWidth: 460, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 className="font-display" style={{ fontSize: '1.5rem', color: C.white, marginBottom: 3 }}>Add Photo</h2>
                <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Upload a file or paste a URL</p>
              </div>
              <button onClick={closeModal} style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* File upload zone */}
              <div>
                <label style={lbl}>Photo</label>
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                  <div style={{
                    border: `2px dashed ${filePreview ? C.goldBorder : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 10, padding: filePreview ? 0 : '1.5rem',
                    textAlign: 'center', transition: 'border-color .2s', overflow: 'hidden',
                    background: filePreview ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    {filePreview
                      ? <img src={filePreview} alt="preview" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                      : <>
                          <Image size={22} style={{ color: 'rgba(255,255,255,0.18)', margin: '0 auto 8px' }} />
                          <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Click to upload</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif', marginTop: 3 }}>JPG, PNG, WEBP</p>
                        </>
                    }
                  </div>
                </label>
                {filePreview && (
                  <button onClick={() => { setFile(null); setFilePreview('') }}
                    style={{ marginTop: 6, fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost,sans-serif' }}>
                    Remove file
                  </button>
                )}
              </div>
              {/* URL fallback */}
              {!file && (
                <div>
                  <label style={lbl}>Or image URL</label>
                  <input value={form.image_url} onChange={set('image_url')} placeholder="https://…" className="m-inp" style={inp} />
                  {form.image_url && <img src={form.image_url} alt="preview" style={{ marginTop: 8, height: 80, width: '100%', objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />}
                </div>
              )}
              <div><label style={lbl}>Title <span style={{ textTransform: 'none', letterSpacing: 0, color: C.muted, fontSize: 9 }}>(optional)</span></label><input value={form.title} onChange={set('title')} placeholder="Photo title…" className="m-inp" style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={form.category} onChange={set('category')} className="m-inp" style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1a1a24' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Stylist <span style={{ textTransform: 'none', letterSpacing: 0, color: C.muted, fontSize: 9 }}>(optional)</span></label>
                  <select value={form.stylist_id} onChange={set('stylist_id')} className="m-inp" style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
                    <option value="" style={{ background: '#1a1a24' }}>None</option>
                    {stylists.map(s => <option key={s.id} value={s.id} style={{ background: '#1a1a24' }}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
              <button onClick={closeModal} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>Cancel</button>
              <button onClick={add} disabled={saving || (!file && !form.image_url)} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: (saving || (!file && !form.image_url)) ? 'not-allowed' : 'pointer', opacity: (saving || (!file && !form.image_url)) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <><Save size={13} /> Add Photo</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
