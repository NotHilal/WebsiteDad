import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Package, Save, Image } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)', modal: '#1a1a24',
}

const EMPTY = { name: '', description: '', price: '', category: '', stock: '', available: true, image_url: '' }
const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }

function stockBadge(stock) {
  if (stock === 0) return { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: 'Out of stock' }
  if (stock < 5)  return { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: `${stock} left` }
  return { bg: 'rgba(52,211,153,0.12)', color: '#34d399', label: `${stock} in stock` }
}

export default function StudioProducts() {
  const [products,     setProducts]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)
  const [file,         setFile]         = useState(null)
  const [filePreview,  setFilePreview]  = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || []); setLoading(false)
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setFilePreview(URL.createObjectURL(f))
  }

  function openModal(mode, product = null) {
    setFile(null)
    setFilePreview('')
    setForm(product ? { ...product } : EMPTY)
    setModal(mode)
  }

  function closeModal() {
    setModal(null)
    setFile(null)
    setFilePreview('')
  }

  async function save() {
    if (!form.name?.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      let imageUrl = form.image_url

      if (file) {
        const ext  = file.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('products').upload(path, file, { upsert: true })
        if (uploadErr) throw new Error('Upload failed: ' + uploadErr.message)
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path)
        imageUrl = publicUrl
      }

      const payload = { ...form, image_url: imageUrl, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0 }
      const { error } = modal === 'add'
        ? await supabase.from('products').insert(payload)
        : await supabase.from('products').update(payload).eq('id', form.id)
      if (error) throw error
      toast.success(modal === 'add' ? 'Product added' : 'Product updated')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    toast.success('Product deleted'); load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .prod-img { transition: transform .45s ease; }
        .prod-card:hover .prod-img { transform: scale(1.05); }
        .prod-overlay { opacity: 0; transition: opacity .2s; }
        .prod-card:hover .prod-overlay { opacity: 1; }
        .prod-card:hover { border-color: rgba(201,168,76,0.2) !important; }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.3); }
      `}</style>

      <div style={{ flexShrink: 0, marginBottom: '1.1rem', paddingBottom: '1.1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Products</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>{products.length} in catalogue</p>
        </div>
        <button onClick={() => openModal('add')} className="btn-g"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s' }}>
          <Plus size={13} /> Add Product
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '1rem' }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ height: 240, borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Package size={22} color={C.border} />
            </div>
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>No products yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '1rem' }}>
            {products.map(p => {
              const badge = stockBadge(p.stock ?? 0)
              return (
                <div key={p.id} className="prod-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', cursor: 'default', transition: 'border-color .2s' }}>
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#0e0e14', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="prod-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={28} color={C.border} />
                          </div>
                      }
                    </div>
                    <div className="prod-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '0.5rem', gap: 4 }}>
                      <button onClick={() => openModal('edit', p)}
                        style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,.65)', border: `1px solid ${C.border}`, color: C.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => deleteProduct(p.id)}
                        style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,.65)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {!p.available && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, background: 'rgba(0,0,0,.5)', padding: '0.25rem 0.75rem', borderRadius: 20, border: `1px solid ${C.border}`, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Unavailable</span>
                      </div>
                    )}
                    {p.stock !== undefined && p.stock !== null && (
                      <div style={{ position: 'absolute', bottom: 7, left: 7 }}>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: badge.bg, color: badge.color, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{badge.label}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '0.65rem 0.875rem' }}>
                    <p style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: C.gold, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>€{p.price}</span>
                      {p.category && <span style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Jost,sans-serif' }}>{p.category}</span>}
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
          onClick={closeModal}>
          <div style={{ width: '100%', maxWidth: 460, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 className="font-display" style={{ fontSize: '1.5rem', color: C.white, marginBottom: 3 }}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
                <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Product details</p>
              </div>
              <button onClick={closeModal} style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={lbl}>Name *</label><input value={form.name || ''} onChange={set('name')} placeholder="Product name" className="m-inp" style={inp} /></div>
              <div><label style={lbl}>Description</label><textarea value={form.description || ''} onChange={set('description')} rows={3} placeholder="Product description…" className="m-inp" style={{ ...inp, resize: 'none' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={lbl}>Price (€)</label><input type="number" value={form.price || ''} onChange={set('price')} placeholder="0.00" className="m-inp" style={inp} /></div>
                <div><label style={lbl}>Stock</label><input type="number" value={form.stock || ''} onChange={set('stock')} placeholder="0" className="m-inp" style={inp} /></div>
              </div>
              <div><label style={lbl}>Category</label><input value={form.category || ''} onChange={set('category')} placeholder="Shampoo, Conditioner…" className="m-inp" style={inp} /></div>
              {/* File upload */}
              <div>
                <label style={lbl}>Photo</label>
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                  <div style={{
                    border: `2px dashed ${(filePreview || form.image_url) ? C.goldBorder : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 10, padding: (filePreview || form.image_url) ? 0 : '1.5rem',
                    textAlign: 'center', transition: 'border-color .2s', overflow: 'hidden',
                    background: (filePreview || form.image_url) ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    {(filePreview || form.image_url)
                      ? <img src={filePreview || form.image_url} alt="preview" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
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
                  <input value={form.image_url || ''} onChange={set('image_url')} placeholder="https://…" className="m-inp" style={inp} />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ width: 38, height: 20, borderRadius: 10, background: form.available ? '#C9A84C' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}
                  onClick={() => setForm(p => ({ ...p, available: !p.available }))}>
                  <div style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', left: form.available ? 19 : 2 }} />
                </div>
                <span style={{ fontSize: '0.82rem', color: C.dim, fontFamily: 'Jost,sans-serif' }}>Available for preorder</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
              <button onClick={closeModal} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, background: 'linear-gradient(135deg,#C9A84C,#C4956A)', color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
                {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <><Save size={13} /> Save Product</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
