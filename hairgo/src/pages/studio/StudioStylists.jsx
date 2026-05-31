import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, X, Save, User, AtSign, Upload, ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)', modal: '#1a1a24',
}

const EMPTY = { name: '', title: '', bio: '', photo_url: '', specialties: '', instagram: '' }
const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }

export default function StudioStylists() {
  const [stylists,     setStylists]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [localPreview, setLocalPreview] = useState(null)
  const [dragOver,     setDragOver]     = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('stylists').select('*').order('display_order')
    setStylists(data || []); setLoading(false)
  }

  async function uploadPhoto(file) {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return null }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return null }
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('stylists').upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('stylists').getPublicUrl(path)
      return data.publicUrl
    } catch (err) { toast.error('Upload failed: ' + err.message); return null }
    finally { setUploading(false) }
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setLocalPreview(URL.createObjectURL(file))
    setForm(p => ({ ...p, _pendingFile: file }))
  }

  async function save() {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      let photo_url = form.photo_url || ''
      if (form._pendingFile) {
        const url = await uploadPhoto(form._pendingFile)
        if (!url) { setSaving(false); return }
        photo_url = url
      }
      const { _pendingFile, ...rest } = form
      const specialtiesArr = rest.specialties ? rest.specialties.split(',').map(s => s.trim()).filter(Boolean) : []
      const payload = { ...rest, photo_url, specialties: specialtiesArr }
      const { error } = modal === 'add'
        ? await supabase.from('stylists').insert({ ...payload, display_order: stylists.length })
        : await supabase.from('stylists').update(payload).eq('id', form.id)
      if (error) throw error
      toast.success(modal === 'add' ? 'Stylist added' : 'Stylist updated')
      setModal(null); setLocalPreview(null); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('Delete this stylist?')) return
    await supabase.from('stylists').delete().eq('id', id)
    toast.success('Stylist removed'); load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); outline: none; }
        .sty-card-actions { opacity: 0; transition: opacity .2s; }
        .sty-card:hover .sty-card-actions { opacity: 1; }
        .sty-img { transition: transform .5s ease; }
        .sty-card:hover .sty-img { transform: scale(1.05); }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.3); }
      `}</style>

      <div style={{ flexShrink: 0, marginBottom: '1.1rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Stylists</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{stylists.length} team members</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setLocalPreview(null); setModal('add') }} className="btn-g"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s' }}>
          <Plus size={13} /> Add Stylist
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '1rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '3/4', borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }} />
            ))}
          </div>
        ) : stylists.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: '0.5rem' }}>
            <User size={28} color={C.border} />
            <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No stylists yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '1rem' }}>
            {stylists.map(s => (
              <div key={s.id} className="sty-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', cursor: 'default', transition: 'border-color .2s' }}>
                <div style={{ aspectRatio: '3/4', background: '#0e0e14', position: 'relative', overflow: 'hidden' }}>
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} className="sty-img" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={40} color={C.border} />
                      </div>
                  }
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)' }} />
                  <div className="sty-card-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                    <button onClick={() => { setForm({ ...s, specialties: Array.isArray(s.specialties) ? s.specialties.join(', ') : (s.specialties || '') }); setLocalPreview(null); setModal('edit') }}
                      style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,.65)', border: `1px solid ${C.border}`, color: C.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                      <Edit2 size={11} />
                    </button>
                    <button onClick={() => del(s.id)}
                      style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,.65)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {s.instagram && (
                    <div className="sty-card-actions" style={{ position: 'absolute', top: 8, left: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 7, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
                        <AtSign size={9} color={C.muted} />
                        <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif' }}>{s.instagram}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '0.75rem' }}>
                  <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 2 }}>{s.name}</p>
                  {s.title && <p style={{ color: C.goldDim, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', marginBottom: 6 }}>{s.title}</p>}
                  {s.specialties?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.specialties.slice(0, 2).map(sp => (
                        <span key={sp} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 20, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{sp}</span>
                      ))}
                      {s.specialties.length > 2 && <span style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif' }}>+{s.specialties.length - 2}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => { setModal(null); setLocalPreview(null) }}>
          <div style={{ width: '100%', maxWidth: 460, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 className="font-display" style={{ fontSize: '1.5rem', color: C.white, marginBottom: 3 }}>{modal === 'add' ? 'Add Stylist' : 'Edit Stylist'}</h2>
                <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Team member details</p>
              </div>
              <button onClick={() => { setModal(null); setLocalPreview(null) }} style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={lbl}>Name *</label><input value={form.name} onChange={set('name')} placeholder="Sophie Laurent" className="m-inp" style={inp} /></div>
                <div><label style={lbl}>Title</label><input value={form.title || ''} onChange={set('title')} placeholder="Head Stylist" className="m-inp" style={inp} /></div>
              </div>
              <div><label style={lbl}>Bio</label><textarea value={form.bio || ''} onChange={set('bio')} rows={3} placeholder="Short bio…" className="m-inp" style={{ ...inp, resize: 'none' }} /></div>
              <div>
                <label style={lbl}>Photo</label>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />

                {(localPreview || form.photo_url) ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 72, height: 96, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
                      <img src={localPreview || form.photo_url} alt="preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.dim, fontSize: 10, fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .15s' }}>
                        <Upload size={11} /> Change photo
                      </button>
                      <button type="button" onClick={() => { setLocalPreview(null); setForm(p => ({ ...p, photo_url: '', _pendingFile: undefined })) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 10, fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .15s' }}>
                        <X size={11} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    style={{
                      border: `1.5px dashed ${dragOver ? C.gold : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 12, padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer',
                      background: dragOver ? C.goldBg : 'rgba(255,255,255,0.02)', transition: 'all .2s',
                    }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: dragOver ? C.goldBg : C.subtle, border: `1px solid ${dragOver ? C.goldBorder : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.625rem', transition: 'all .2s' }}>
                      <Upload size={16} color={dragOver ? C.gold : 'rgba(255,255,255,0.2)'} />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: dragOver ? C.gold : C.muted, fontFamily: 'Jost,sans-serif', marginBottom: 3, transition: 'color .2s' }}>
                      Click to upload or drag & drop
                    </p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif' }}>
                      JPG, PNG, WebP · max 5 MB
                    </p>
                  </div>
                )}

                {uploading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: C.goldDim, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif' }}>
                    <div style={{ width: 12, height: 12, border: `2px solid ${C.goldBorder}`, borderTopColor: C.gold, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                    Uploading…
                  </div>
                )}
              </div>
              <div><label style={lbl}>Specialties <span style={{ textTransform: 'none', letterSpacing: 0, color: C.muted, fontSize: 9 }}>(comma separated)</span></label><input value={form.specialties || ''} onChange={set('specialties')} placeholder="Balayage, Precision Cut" className="m-inp" style={inp} /></div>
              <div><label style={lbl}>Instagram</label><input value={form.instagram || ''} onChange={set('instagram')} placeholder="username" className="m-inp" style={inp} /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
              <button onClick={() => { setModal(null); setLocalPreview(null) }} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .2s' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
                {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <><Save size={13} /> Save Stylist</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
