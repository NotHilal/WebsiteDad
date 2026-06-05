import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Package, Save, Image, AlertTriangle, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)',
  goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)',
  subtle: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.07)', modal: '#1a1a24',
  green: '#34d399', greenBg: 'rgba(52,211,153,0.1)', greenBorder: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b', amberBg: 'rgba(245,158,11,0.1)', amberBorder: 'rgba(245,158,11,0.2)',
  red: '#f87171',   redBg:   'rgba(248,113,113,0.1)', redBorder:   'rgba(248,113,113,0.2)',
}

const EMPTY = { name: '', description: '', price: '', category: '', tags: [], stock: '', available: true, image_url: '' }

const CATEGORIES = [
  'Shampoo', 'Conditioner', 'Hair Mask', 'Styling Cream', 'Hair Oil',
  'Color', 'Treatment', 'Spray', 'Serum', 'Wax', 'Tools', 'Accessories',
  'Beard', 'Skincare', 'Gift Set',
]
const inp   = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }
const lbl   = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }

function stockLevel(stock) {
  if (stock === 0)  return { color: C.red,   bg: C.redBg,   border: C.redBorder,   label: 'Out of stock', key: 'out'  }
  if (stock < 5)    return { color: C.amber, bg: C.amberBg, border: C.amberBorder, label: 'Low stock',    key: 'low'  }
  return              { color: C.green, bg: C.greenBg, border: C.greenBorder, label: 'In stock',     key: 'good' }
}

const STATUS_FILTERS = [
  { key: 'all',  label: 'All'          },
  { key: 'good', label: 'In Stock'     },
  { key: 'low',  label: 'Low Stock'    },
  { key: 'out',  label: 'Out of Stock' },
]

export default function StudioProducts() {
  const [products,    setProducts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [file,        setFile]        = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [catFilter,     setCatFilter]     = useState('All')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [adjusting,     setAdjusting]     = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null) // { id, name }
  const [deletePwd,     setDeletePwd]     = useState('')
  const [deleteErr,     setDeleteErr]     = useState('')
  const [deleting,      setDeleting]      = useState(false)
  const [showDeletePwd, setShowDeletePwd] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('products').select('*').order('category').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function adjustStock(id, delta, current) {
    const newStock = Math.max(0, (current ?? 0) + delta)
    setAdjusting(id)
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id)
    if (error) toast.error(error.message)
    else setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
    setAdjusting(null)
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setFilePreview(URL.createObjectURL(f))
  }

  function openModal(mode, product = null) {
    setFile(null); setFilePreview('')
    setForm(product ? { ...product, tags: product.tags || [] } : EMPTY)
    setModal(mode)
  }

  function toggleCat(cat) {
    setForm(p => {
      const tags = p.tags || []
      if (tags.includes(cat)) return { ...p, tags: tags.filter(t => t !== cat) }
      if (tags.length >= 3) return p
      return { ...p, tags: [...tags, cat] }
    })
  }

  function closeModal() { setModal(null); setFile(null); setFilePreview('') }

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
      const tags = form.tags || []
      const payload = { ...form, image_url: imageUrl, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0, tags, category: tags[0] || '' }
      const { error } = modal === 'add'
        ? await supabase.from('products').insert(payload)
        : await supabase.from('products').update(payload).eq('id', form.id)
      if (error) throw error
      toast.success(modal === 'add' ? 'Product added' : 'Product updated')
      closeModal(); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  function openDelete(p) {
    setDeleteTarget({ id: p.id, name: p.name })
    setDeletePwd(''); setDeleteErr(''); setShowDeletePwd(false)
  }

  async function confirmDelete() {
    if (!deletePwd) { setDeleteErr('Enter the admin password'); return }
    if (deletePwd !== 'hairgo24') { setDeleteErr('Incorrect admin password'); return }
    setDeleting(true)
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id)
    if (error) { setDeleteErr(error.message); setDeleting(false); return }
    toast.success('Product deleted')
    setDeleteTarget(null)
    setDeleting(false)
    load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Derived
  const categories  = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products])
  const outOfStock  = products.filter(p => (p.stock ?? 0) === 0 && p.available)
  const lowStock    = products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5)
  const maxStock    = Math.max(...products.map(p => p.stock ?? 0), 20)

  const filtered = products.filter(p => {
    const catOk    = catFilter === 'All' || p.category === catFilter
    const level    = stockLevel(p.stock ?? 0).key
    const statusOk = statusFilter === 'all' || level === statusFilter
    return catOk && statusOk
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .prod-card { transition: border-color .2s, box-shadow .2s; }
        .prod-card:hover { border-color: rgba(201,168,76,0.2) !important; box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
        .prod-img { transition: transform .45s ease; }
        .prod-card:hover .prod-img { transform: scale(1.06); }
        .btn-g:hover       { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.3); }
        .cat-chip:hover    { border-color: ${C.goldBorder} !important; color: ${C.white} !important; }
        .stat-chip:hover   { border-color: rgba(255,255,255,0.18) !important; color: ${C.dim} !important; }
        .stock-minus:not(:disabled):hover { background: rgba(248,113,113,0.22) !important; border-color: rgba(248,113,113,0.5) !important; box-shadow: 0 0 14px rgba(248,113,113,0.25); transform: scale(1.12); }
        .stock-plus:not(:disabled):hover  { background: rgba(201,168,76,0.25) !important; border-color: ${C.gold} !important; box-shadow: 0 0 16px rgba(201,168,76,0.4); transform: scale(1.12); }
        .prod-edit-btn:hover { border-color: ${C.goldBorder} !important; color: ${C.gold} !important; background: ${C.goldBg} !important; }
        .prod-del-btn:hover  { background: rgba(248,113,113,0.15) !important; border-color: rgba(248,113,113,0.4) !important; color: ${C.red} !important; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Store</p>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.25rem' }}>Products</h1>
          <div style={{ display: 'flex', gap: 14 }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: C.white, fontWeight: 600 }}>{products.length}</span> products</span>
            {outOfStock.length > 0 && <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: C.red, fontWeight: 600 }}>{outOfStock.length}</span> out of stock</span>}
            {lowStock.length > 0 && <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: C.amber, fontWeight: 600 }}>{lowStock.length}</span> low stock</span>}
          </div>
        </div>
        <button onClick={() => openModal('add')} className="btn-g"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.55rem 1.1rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s' }}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      {/* ── Low stock alert ──────────────────────────────────── */}
      {outOfStock.length > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', borderRadius: 12, background: C.redBg, border: `1px solid ${C.redBorder}` }}>
          <AlertTriangle size={14} color={C.red} />
          <p style={{ color: C.red, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>
            <strong>{outOfStock.length} product{outOfStock.length > 1 ? 's' : ''}</strong> {outOfStock.length > 1 ? 'are' : 'is'} out of stock: {outOfStock.map(p => p.name).join(', ')}
          </p>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.key
            const colors = f.key === 'out' ? { c: C.red, bg: C.redBg, border: C.redBorder }
                         : f.key === 'low' ? { c: C.amber, bg: C.amberBg, border: C.amberBorder }
                         : f.key === 'good'? { c: C.green, bg: C.greenBg, border: C.greenBorder }
                         : { c: C.goldDim, bg: C.goldBg, border: C.goldBorder }
            return (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} className="stat-chip"
                style={{ padding: '5px 13px', borderRadius: 20, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${active ? colors.border : C.border}`, background: active ? colors.bg : 'transparent', color: active ? colors.c : C.muted }}>
                {f.label}
                {f.key !== 'all' && (
                  <span style={{ marginLeft: 5, opacity: 0.7 }}>
                    {f.key === 'out' ? outOfStock.length : f.key === 'low' ? lowStock.length : products.filter(p => (p.stock ?? 0) >= 5).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {/* Category filter */}
        {categories.length > 2 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} className="cat-chip"
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${catFilter === cat ? C.goldBorder : C.border}`, background: catFilter === cat ? C.goldBg : 'transparent', color: catFilter === cat ? C.gold : C.muted }}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Product list ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="shimmer" style={{ height: 96, borderRadius: 16, background: C.card }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: '0.75rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color="rgba(255,255,255,0.15)" strokeWidth={1} />
            </div>
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>{products.length === 0 ? 'No products yet' : 'No products match the filter'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(p => {
              const stock = p.stock ?? 0
              const level = stockLevel(stock)
              const barW  = Math.min(stock / maxStock, 1)
              const isAdj = adjusting === p.id

              return (
                <div key={p.id} className="prod-card"
                  style={{ background: C.card, border: `1px solid ${stock === 0 && p.available ? C.redBorder : C.border}`, borderRadius: 16, display: 'flex', overflow: 'hidden', minHeight: 96 }}>

                  {/* Image */}
                  <div style={{ width: 96, flexShrink: 0, background: '#0e0e14', position: 'relative', overflow: 'hidden' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="prod-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.04)' }}>
                          <Package size={24} color="rgba(255,255,255,0.1)" strokeWidth={1} />
                        </div>
                    }
                    {!p.available && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', padding: '0 4px' }}>Hidden</span>
                      </div>
                    )}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ color: C.white, fontSize: '0.9rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        {!p.available && (
                          <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 9999, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Hidden</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="font-display" style={{ color: C.gold, fontSize: '1rem' }}>€{p.price}</span>
                        {(p.tags?.length ? p.tags : p.category ? [p.category] : []).map(tag => (
                          <span key={tag} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 9999, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 500, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    {p.description && (
                      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 4 }}>
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* Stock section */}
                  <div style={{ width: 220, flexShrink: 0, borderLeft: `1px solid ${C.border}`, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>

                    {/* Stock number + badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        <span className="font-display" style={{ fontSize: '1.75rem', color: level.color, lineHeight: 1 }}>{stock}</span>
                        <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif' }}>units</span>
                      </div>
                      <span style={{ fontSize: 8, padding: '3px 8px', borderRadius: 9999, background: level.bg, border: `1px solid ${level.border}`, color: level.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {level.label}
                      </span>
                    </div>

                    {/* Stock bar */}
                    <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barW * 100}%`, background: `linear-gradient(90deg, ${level.color}aa, ${level.color})`, borderRadius: 9999, transition: 'width .4s ease' }} />
                    </div>

                    {/* Quick adjust + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                      {/* −  stock  + */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => adjustStock(p.id, -1, stock)}
                          disabled={stock === 0 || isAdj} className="stock-minus"
                          style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, fontFamily: 'Jost,sans-serif', cursor: stock === 0 ? 'not-allowed' : 'pointer', transition: 'all .2s', opacity: isAdj ? 0.4 : 1, background: stock === 0 ? 'transparent' : 'rgba(248,113,113,0.1)', border: `1px solid ${stock === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(248,113,113,0.28)'}`, color: stock === 0 ? 'rgba(255,255,255,0.18)' : C.red }}>
                          −
                        </button>
                        <button onClick={() => adjustStock(p.id, 1, stock)}
                          disabled={isAdj} className="stock-plus"
                          style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .2s', opacity: isAdj ? 0.4 : 1, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, boxShadow: '0 2px 10px rgba(201,168,76,0.18)' }}>
                          +
                        </button>
                      </div>

                      {/* Edit · Delete */}
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => openModal('edit', p)} className="prod-edit-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 11px', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s' }}>
                          <Edit2 size={9} /> Edit
                        </button>
                        <button onClick={() => openDelete(p)} className="prod-del-btn"
                          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.45)', cursor: 'pointer', transition: 'all .2s' }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ width: '100%', maxWidth: 460, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 20, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,.65)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ height: 3, background: 'linear-gradient(90deg,#C9A84C,#C4956A,rgba(201,168,76,0.15))' }} />

            <div style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 5 }}>
                    {modal === 'add' ? 'New Product' : 'Edit Product'}
                  </p>
                  <h2 className="font-display font-light" style={{ fontSize: '1.6rem', color: C.white, lineHeight: 1 }}>
                    {modal === 'add' ? 'Add Product' : form.name || 'Edit'}
                  </h2>
                </div>
                <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label style={lbl}>Name <span style={{ color: C.gold }}>*</span></label><input value={form.name || ''} onChange={set('name')} placeholder="Product name" className="m-inp" style={inp} /></div>
                <div><label style={lbl}>Description</label><textarea value={form.description || ''} onChange={set('description')} rows={2} placeholder="Product description…" className="m-inp" style={{ ...inp, resize: 'none' }} /></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={lbl}>Price (€)</label><input type="number" min="0" step="0.01" value={form.price || ''} onChange={set('price')} placeholder="0.00" className="m-inp" style={inp} /></div>
                  <div><label style={lbl}>Stock</label><input type="number" min="0" value={form.stock || ''} onChange={set('stock')} placeholder="0" className="m-inp" style={inp} /></div>
                </div>

                {/* Category chips — multi-select up to 3 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ ...lbl, marginBottom: 0 }}>Category</label>
                    <span style={{ fontSize: 9, fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em', color: (form.tags || []).length >= 3 ? C.gold : C.muted }}>
                      {(form.tags || []).length}/3
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIES.map(cat => {
                      const selected = (form.tags || []).includes(cat)
                      const maxed    = (form.tags || []).length >= 3 && !selected
                      return (
                        <button key={cat} type="button" onClick={() => toggleCat(cat)}
                          style={{
                            padding: '5px 13px', borderRadius: 9999,
                            fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 500,
                            letterSpacing: '0.06em', cursor: maxed ? 'not-allowed' : 'pointer',
                            transition: 'background .15s, border-color .15s, color .15s',
                            border: `1px solid ${selected ? C.gold : 'rgba(255,255,255,0.1)'}`,
                            background: selected ? C.goldBg : 'rgba(255,255,255,0.03)',
                            color: selected ? C.gold : maxed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.38)',
                            outline: 'none',
                          }}>
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Photo */}
                <div>
                  <label style={lbl}>Photo</label>
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                    <div style={{ border: `2px dashed ${(filePreview || form.image_url) ? C.goldBorder : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: (filePreview || form.image_url) ? 0 : '1.25rem', textAlign: 'center', transition: 'border-color .2s', overflow: 'hidden', background: (filePreview || form.image_url) ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      {(filePreview || form.image_url)
                        ? <img src={filePreview || form.image_url} alt="preview" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                        : <>
                            <Image size={20} style={{ color: 'rgba(255,255,255,0.18)', margin: '0 auto 6px' }} />
                            <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Click to upload</p>
                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>JPG, PNG, WEBP</p>
                          </>
                      }
                    </div>
                  </label>
                  {filePreview && (
                    <button onClick={() => { setFile(null); setFilePreview('') }}
                      style={{ marginTop: 5, fontSize: 10, color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost,sans-serif' }}>
                      Remove file
                    </button>
                  )}
                </div>
                {!file && (
                  <div><label style={lbl}>Or image URL</label><input value={form.image_url || ''} onChange={set('image_url')} placeholder="https://…" className="m-inp" style={inp} /></div>
                )}

                {/* Available toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderRadius: 10, background: C.subtle, border: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontSize: '0.83rem', color: C.dim, fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 2 }}>Available to order</p>
                    <p style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Visible to customers in the store</p>
                  </div>
                  <div style={{ width: 42, height: 24, borderRadius: 12, background: form.available ? C.gold : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background .25s', flexShrink: 0, cursor: 'pointer', boxShadow: form.available ? '0 0 12px rgba(201,168,76,0.35)' : 'none' }}
                    onClick={() => setForm(p => ({ ...p, available: !p.available }))}>
                    <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transition: 'left .25s', left: form.available ? 21 : 3 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
                <button onClick={closeModal} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ flex: 2, padding: '0.65rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#C4956A)`, color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: saving ? 0.6 : 1 }}>
                  {saving ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <><Save size={13} /> {modal === 'add' ? 'Add Product' : 'Save Changes'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ─────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, background: C.modal, border: '1px solid rgba(248,113,113,0.25)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>

            <div style={{ height: 3, background: 'linear-gradient(90deg,#f87171,#ef4444,rgba(248,113,113,0.15))' }} />

            <div style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.redBg, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <ShieldAlert size={22} color={C.red} strokeWidth={1.5} />
                </div>
                <h2 className="font-display font-light" style={{ fontSize: '1.55rem', color: C.white, lineHeight: 1.1, marginBottom: '0.4rem' }}>
                  Delete Product
                </h2>
                <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif', lineHeight: 1.6 }}>
                  You're about to permanently delete <span style={{ color: C.white }}>{deleteTarget.name}</span>.<br />
                  Enter the admin password to confirm.
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }}>
                  Admin Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDeletePwd ? 'text' : 'password'}
                    value={deletePwd}
                    onChange={e => { setDeletePwd(e.target.value); setDeleteErr('') }}
                    onKeyDown={e => e.key === 'Enter' && confirmDelete()}
                    placeholder="Enter admin password…"
                    autoFocus
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${deleteErr ? C.redBorder : 'rgba(255,255,255,0.1)'}`, borderRadius: 9, padding: '0.6rem 2.5rem 0.6rem 0.8rem', fontSize: '0.85rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', boxSizing: 'border-box', transition: 'border-color .2s' }} />
                  <button type="button" onClick={() => setShowDeletePwd(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showDeletePwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {deleteErr && <p style={{ fontSize: '0.72rem', color: C.red, fontFamily: 'Jost,sans-serif', marginTop: 6 }}>{deleteErr}</p>}
              </div>

              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setDeleteTarget(null)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={deleting}
                  style={{ flex: 2, padding: '0.65rem', borderRadius: 10, background: 'linear-gradient(135deg,#f87171,#ef4444)', color: '#fff', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: deleting ? 0.6 : 1 }}>
                  {deleting
                    ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                    : <><Trash2 size={13} /> Delete Product</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
