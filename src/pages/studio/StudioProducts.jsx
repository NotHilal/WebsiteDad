import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Package, Save, Image, AlertTriangle, EyeOff, ShieldAlert, Search, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getOrFetch, invalidate } from '../../lib/cache'
import { useLogAction } from '../../hooks/useLogAction'
import Pager from '../../lib/Pager'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#B8D4E8', goldDim: 'rgba(184,212,232,0.55)',
  goldBg: 'rgba(184,212,232,0.08)', goldBorder: 'rgba(184,212,232,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)',
  subtle: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.07)', modal: '#1a1a24',
  green: '#34d399', greenBg: 'rgba(52,211,153,0.1)', greenBorder: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b', amberBg: 'rgba(245,158,11,0.1)', amberBorder: 'rgba(245,158,11,0.2)',
  red: '#f87171',   redBg:   'rgba(248,113,113,0.1)', redBorder:   'rgba(248,113,113,0.2)',
}

const COLOR_PRESETS = [
  '#60a5fa', '#818cf8', '#c084fc', '#f472b6', '#fb7185',
  '#f87171', '#fb923c', '#f59e0b', '#B8D4E8', '#a3e635',
  '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#94a3b8',
]

const EMPTY = { name: '', description: '', price: '', category: '', tags: [], stock: '', available: true, image_url: '' }

const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: '#f0f0f0', outline: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 300, transition: 'border-color .2s', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }

function stockLevel(stock) {
  if (stock === 0) return { color: C.red,   bg: C.redBg,   border: C.redBorder,   label: 'Out of stock', key: 'out'  }
  if (stock < 5)   return { color: C.amber, bg: C.amberBg, border: C.amberBorder, label: 'Low stock',    key: 'low'  }
  return             { color: C.green, bg: C.greenBg, border: C.greenBorder, label: 'In stock',     key: 'good' }
}

const STATUS_FILTERS = [
  { key: 'all',  label: 'All'          },
  { key: 'good', label: 'In Stock'     },
  { key: 'low',  label: 'Low Stock'    },
  { key: 'out',  label: 'Out of Stock' },
]

export default function StudioProducts() {
  const log = useLogAction()
  const [products,      setProducts]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(null)
  const [form,          setForm]          = useState(EMPTY)
  const [saving,        setSaving]        = useState(false)
  const [file,          setFile]          = useState(null)
  const [filePreview,   setFilePreview]   = useState('')
  const [search,        setSearch]        = useState('')
  const [catFilter,     setCatFilter]     = useState('All')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [adjusting,     setAdjusting]     = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleting,      setDeleting]      = useState(false)

  // categories management
  const [prodCats,      setProdCats]      = useState([])
  const [catModal,      setCatModal]      = useState(false)
  const [newCatName,    setNewCatName]    = useState('')
  const [newCatColor,   setNewCatColor]   = useState(COLOR_PRESETS[0])
  const [addingCat,     setAddingCat]     = useState(false)
  const [catDelId,      setCatDelId]      = useState(null)
  const [catDeleting,   setCatDeleting]   = useState(false)

  useEffect(() => { load(); loadCategories() }, [])

  async function load() {
    const data = await getOrFetch('studio_products', async () => {
      const { data } = await supabase.from('products').select('*').order('category').order('name')
      return data || []
    }, 5 * 60_000)
    setProducts(data)
    setLoading(false)
  }

  async function loadCategories() {
    const { data } = await supabase.from('product_categories').select('*').order('name')
    setProdCats(data || [])
  }

  async function saveCategory() {
    if (!newCatName.trim()) return toast.error('Category name is required')
    setAddingCat(true)
    const { error } = await supabase.from('product_categories').insert({ name: newCatName.trim(), color: newCatColor })
    setAddingCat(false)
    if (error) { toast.error(error.message); return }
    toast.success('Category added')
    setNewCatName('')
    setNewCatColor(COLOR_PRESETS[0])
    loadCategories()
  }

  async function deleteCategory() {
    setCatDeleting(true)
    const { error } = await supabase.from('product_categories').delete().eq('id', catDelId)
    setCatDeleting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Category deleted')
    setCatDelId(null)
    loadCategories()
  }

  function closeCatModal() {
    setCatModal(false); setCatDelId(null)
    setNewCatName(''); setNewCatColor(COLOR_PRESETS[0])
  }

  async function adjustStock(id, delta, current) {
    const newStock = Math.max(0, (current ?? 0) + delta)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id)
    if (error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: current } : p))
      toast.error(error.message)
    }
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

  function toggleCat(catName) {
    setForm(p => {
      const tags = p.tags || []
      if (tags.includes(catName)) return { ...p, tags: tags.filter(t => t !== catName) }
      if (tags.length >= 3) return p
      return { ...p, tags: [...tags, catName] }
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
      log(modal === 'add' ? 'product.created' : 'product.edited', { entityType: 'product', details: { message: `${modal === 'add' ? 'created' : 'edited'} product "${form.name}"` } })
      closeModal(); invalidate('studio_products'); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  function openDelete(p) {
    setDeleteTarget({ id: p.id, name: p.name })
  }

  async function confirmDelete() {
    setDeleting(true)
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Product deleted')
    log('product.deleted', { entityType: 'product', entityId: deleteTarget.id, details: { message: `deleted product "${deleteTarget.name}"` } })
    setDeleteTarget(null)
    setDeleting(false)
    invalidate('studio_products'); load()
  }

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products])
  const outOfStock = products.filter(p => (p.stock ?? 0) === 0 && p.available)
  const lowStock   = products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5)

  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(() => window.innerWidth <= 640 ? 3 : 6)
  useEffect(() => {
    const handler = () => setPerPage(window.innerWidth <= 640 ? 3 : 6)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const filtered = products.filter(p => {
    const catOk    = catFilter === 'All' || p.category === catFilter
    const level    = stockLevel(p.stock ?? 0).key
    const statusOk = statusFilter === 'all' || level === statusFilter
    const q        = search.trim().toLowerCase()
    const searchOk = !q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))
    return catOk && statusOk && searchOk
  })
  const paged = filtered.slice(page * perPage, (page + 1) * perPage)
  useEffect(() => setPage(0), [catFilter, statusFilter, search, perPage])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.875rem' }}>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes modalIn  { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .m-inp:focus { border-color: ${C.goldBorder} !important; box-shadow: 0 0 0 3px rgba(184,212,232,0.08); }
        .prod-card { transition: border-color .2s, box-shadow .2s; }
        .prod-card:hover { border-color: rgba(184,212,232,0.22) !important; box-shadow: 0 4px 24px rgba(0,0,0,0.35); }
        .prod-img { transition: transform .4s ease; }
        .prod-card:hover .prod-img { transform: scale(1.07); }
        .btn-g:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(184,212,232,0.3); }
        .btn-cat:hover { border-color: rgba(255,255,255,0.18) !important; color: ${C.white} !important; background: rgba(255,255,255,0.08) !important; }
        .cat-chip:hover  { border-color: ${C.goldBorder} !important; color: ${C.white} !important; }
        .stat-chip:hover { border-color: rgba(255,255,255,0.18) !important; color: ${C.dim} !important; }
        .stock-minus:not(:disabled):hover { background: rgba(248,113,113,0.2) !important; border-color: rgba(248,113,113,0.5) !important; color: ${C.red} !important; }
        .stock-plus:not(:disabled):hover  { background: rgba(184,212,232,0.2) !important; border-color: ${C.gold} !important; }
        .prod-edit-btn:hover { border-color: ${C.goldBorder} !important; color: ${C.gold} !important; background: ${C.goldBg} !important; }
        .prod-del-btn:hover  { background: rgba(248,113,113,0.15) !important; border-color: rgba(248,113,113,0.4) !important; color: ${C.red} !important; }
        .sp-search:focus { border-color: ${C.goldBorder} !important; background: rgba(255,255,255,0.07) !important; }
        .sp-search::placeholder { color: rgba(255,255,255,0.2); }
        .sp-filters { display: flex; gap: 5px; flex-wrap: wrap; }
        .sp-modal-close:hover { background: rgba(255,255,255,0.1) !important; color: rgba(255,255,255,0.6) !important; }
        .sp-tag-btn:hover:not(:disabled) { border-color: var(--tag-color, ${C.gold}) !important; color: var(--tag-color, ${C.gold}) !important; }
        .sp-newcat-btn:hover { border-color: ${C.goldBorder} !important; color: ${C.gold} !important; background: ${C.goldBg} !important; }
        .cat-del-row-btn:hover { background: rgba(248,113,113,0.18) !important; border-color: rgba(248,113,113,0.45) !important; color: ${C.red} !important; }
        .color-swatch:hover { transform: scale(1.18); }
        @media (max-width: 480px) {
          .sp-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .sp-header-btns { align-self: flex-end; }
        }
        @media (max-width: 640px) {
          .sp-modal-head  { padding: 1rem 1.25rem 0.875rem !important; }
          .sp-modal-body  { padding: 1rem 1.25rem !important; gap: 0.875rem !important; overflow-y: visible !important; flex: none !important; }
          .sp-modal-foot  { padding: 0.75rem 1.25rem 1.1rem !important; }
          .sp-modal-photo { width: 72px !important; height: 72px !important; border-radius: 11px !important; }
          .sp-modal-dlbl  { display: none !important; }
          .sp-modal-avail { padding: 0.6rem 0.875rem !important; border-radius: 10px !important; }
          .sp-tag-btn     { padding: 4px 10px !important; font-size: 9px !important; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="sp-header" style={{ flexShrink: 0, paddingBottom: '0.875rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Store</p>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.25rem' }}>Products</h1>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: C.white, fontWeight: 600 }}>{products.length}</span> products</span>
            {outOfStock.length > 0 && <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: C.red, fontWeight: 600 }}>{outOfStock.length}</span> out of stock</span>}
            {lowStock.length > 0 && <span style={{ fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}><span style={{ color: C.amber, fontWeight: 600 }}>{lowStock.length}</span> low stock</span>}
          </div>
        </div>
        <div className="sp-header-btns" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => setCatModal(true)} className="btn-cat"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.dim, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}>
            <Tag size={13} /> Categories
          </button>
          <button onClick={() => openModal('add')} className="btn-g"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.55rem 1.1rem', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},#7AAFC9)`, color: '#000', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* ── Out-of-stock alert ───────────────────────────────── */}
      {outOfStock.length > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 1rem', borderRadius: 12, background: C.redBg, border: `1px solid ${C.redBorder}` }}>
          <AlertTriangle size={13} color={C.red} style={{ flexShrink: 0 }} />
          <p style={{ color: C.red, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>
            <strong>{outOfStock.length} product{outOfStock.length > 1 ? 's' : ''}</strong> out of stock: {outOfStock.map(p => p.name).join(', ')}
          </p>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.22)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Search by name, category or tag…" value={search} onChange={e => setSearch(e.target.value)} className="sp-search"
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 36px 0.6rem 38px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 11, color: C.white, fontSize: '0.83rem', fontFamily: 'Jost,sans-serif', outline: 'none', transition: 'border-color .2s, background .2s' }} />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={10} />
          </button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div className="sp-filters">
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.key
            const colors = f.key === 'out'  ? { c: C.red,   bg: C.redBg,   border: C.redBorder   }
                         : f.key === 'low'  ? { c: C.amber, bg: C.amberBg, border: C.amberBorder }
                         : f.key === 'good' ? { c: C.green, bg: C.greenBg, border: C.greenBorder }
                         : { c: C.goldDim, bg: C.goldBg, border: C.goldBorder }
            return (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} className="stat-chip"
                style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${active ? colors.border : C.border}`, background: active ? colors.bg : 'transparent', color: active ? colors.c : C.muted, flexShrink: 0 }}>
                {f.label}
                {f.key !== 'all' && <span style={{ marginLeft: 5, opacity: 0.7 }}>{f.key === 'out' ? outOfStock.length : f.key === 'low' ? lowStock.length : products.filter(p => (p.stock ?? 0) >= 5).length}</span>}
              </button>
            )
          })}
        </div>
        {categories.length > 2 && (
          <div className="sp-filters">
            {categories.map(cat => {
              const catDef = prodCats.find(c => c.name === cat)
              const activeColor = catDef?.color || C.gold
              return (
                <button key={cat} onClick={() => setCatFilter(cat)} className="cat-chip"
                  style={{ padding: '3px 9px', borderRadius: 20, fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${catFilter === cat ? activeColor + '55' : C.border}`, background: catFilter === cat ? activeColor + '18' : 'transparent', color: catFilter === cat ? activeColor : C.muted, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {cat !== 'All' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: catFilter === cat ? activeColor : C.muted, display: 'inline-block', transition: 'background .15s' }} />}
                  {cat}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Results count ────────────────────────────────────── */}
      {!loading && (search || statusFilter !== 'all' || catFilter !== 'All') && (
        <p style={{ flexShrink: 0, fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif', marginTop: -4 }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {search && <span style={{ color: C.dim }}> for "<em style={{ fontStyle: 'normal' }}>{search}</em>"</span>}
        </p>
      )}

      {/* ── Product list ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="shimmer" style={{ height: 96, borderRadius: 16, background: C.card }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: '0.75rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} color="rgba(255,255,255,0.15)" strokeWidth={1} />
            </div>
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>
              {products.length === 0 ? 'No products yet' : search ? `No products match "${search}"` : 'No products match the filter'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {paged.map(p => {
                const stock = p.stock ?? 0
                const level = stockLevel(stock)
                const isAdj = adjusting === p.id
                return (
                  <div key={p.id} className="prod-card"
                    style={{ background: C.card, border: `1px solid ${stock === 0 && p.available ? C.redBorder : C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <div style={{ width: 76, height: 76, flexShrink: 0, background: '#0d0d12', position: 'relative', overflow: 'hidden' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="prod-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={20} color="rgba(255,255,255,0.1)" strokeWidth={1} />
                            </div>
                        }
                        {!p.available && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <EyeOff size={12} color="rgba(255,255,255,0.3)" />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, padding: '10px 13px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{ color: C.white, fontSize: '0.875rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{p.name}</p>
                          <span className="font-display" style={{ color: C.gold, fontSize: '0.92rem', flexShrink: 0 }}>${p.price}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
                            {(p.tags?.length ? p.tags : p.category ? [p.category] : []).map(tag => {
                              const tagDef = prodCats.find(c => c.name === tag)
                              const tagColor = tagDef?.color || C.goldDim
                              return (
                                <span key={tag} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 9999, background: tagColor + '22', border: `1px solid ${tagColor}44`, color: tagColor, fontFamily: 'Jost,sans-serif', fontWeight: 500, letterSpacing: '0.06em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: tagColor, display: 'inline-block' }} />
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                          <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 9999, background: level.bg, border: `1px solid ${level.border}`, color: level.color, fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, whiteSpace: 'nowrap' }}>{level.label}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.14)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <button onClick={() => adjustStock(p.id, -1, stock)} disabled={stock === 0 || isAdj} className="stock-minus"
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${stock === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(248,113,113,0.25)'}`, background: stock === 0 ? 'transparent' : 'rgba(248,113,113,0.07)', color: stock === 0 ? 'rgba(255,255,255,0.15)' : C.red, cursor: stock === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, lineHeight: 1, fontFamily: 'Jost,sans-serif', transition: 'all .18s', opacity: isAdj ? 0.4 : 1, flexShrink: 0 }}>−</button>
                        <div style={{ minWidth: 38, textAlign: 'center' }}>
                          <span style={{ fontSize: '1rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, color: level.color, display: 'block', lineHeight: 1 }}>{isAdj ? '…' : stock}</span>
                          <span style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.05em' }}>units</span>
                        </div>
                        <button onClick={() => adjustStock(p.id, 1, stock)} disabled={isAdj} className="stock-plus"
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.goldBorder}`, background: C.goldBg, color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, lineHeight: 1, fontFamily: 'Jost,sans-serif', transition: 'all .18s', opacity: isAdj ? 0.4 : 1, flexShrink: 0 }}>+</button>
                      </div>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <button onClick={() => openModal('edit', p)} className="prod-edit-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .18s' }}>
                          <Edit2 size={9} /> Edit
                        </button>
                        <button onClick={() => openDelete(p)} className="prod-del-btn"
                          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.13)', color: 'rgba(248,113,113,0.38)', cursor: 'pointer', transition: 'all .18s' }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pager page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
          </>
        )}
      </div>

      {/* ── Add / Edit Product Modal ─────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ width: '100%', maxWidth: 480, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 24, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 48px 120px rgba(0,0,0,.7)', animation: 'modalIn .2s ease' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ height: 3, background: 'linear-gradient(90deg,#B8D4E8,#7AAFC9,rgba(184,212,232,0.1))', flexShrink: 0 }} />

            <div className="sp-modal-head" style={{ padding: '1.5rem 1.75rem 1.25rem', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 6 }}>
                  {modal === 'add' ? 'New Product' : 'Edit Product'}
                </p>
                <h2 className="font-display font-light" style={{ fontSize: '1.75rem', color: C.white, lineHeight: 1.05 }}>
                  {modal === 'add' ? 'Add Product' : form.name || 'Edit'}
                </h2>
              </div>
              <button onClick={closeModal} className="sp-modal-close"
                style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .18s', marginTop: 2 }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ height: 1, background: C.border, flexShrink: 0 }} />

            <div className="sp-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Photo + Name / Price / Stock */}
                <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0 }}>
                    <label style={lbl}>Photo</label>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                      <div className="sp-modal-photo" style={{ width: 90, height: 90, borderRadius: 14, overflow: 'hidden', border: `2px dashed ${(filePreview || form.image_url) ? C.goldBorder : 'rgba(255,255,255,0.1)'}`, background: '#0d0d12', position: 'relative', transition: 'border-color .2s' }}>
                        {(filePreview || form.image_url)
                          ? <img src={filePreview || form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                              <Image size={20} color="rgba(255,255,255,0.15)" />
                              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Upload</span>
                            </div>
                        }
                      </div>
                    </label>
                    <p style={{ marginTop: 5, fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', textAlign: 'center', display: 'block', letterSpacing: '0.03em', lineHeight: 1.4 }}>
                      {(filePreview || form.image_url) ? 'Tap to change' : 'Tap to add photo'}
                    </p>
                    {filePreview && (
                      <button onClick={() => { setFile(null); setFilePreview('') }}
                        style={{ marginTop: 5, fontSize: 9, color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost,sans-serif', padding: 0, letterSpacing: '0.04em', display: 'block', width: '100%', textAlign: 'center' }}>
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={lbl}>Name <span style={{ color: C.gold }}>*</span></label>
                      <input value={form.name || ''} onChange={set('name')} placeholder="Product name" className="m-inp" style={inp} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                      <div>
                        <label style={lbl}>Price ($)</label>
                        <input type="number" min="0" step="0.01" value={form.price || ''} onChange={set('price')} placeholder="0.00" className="m-inp" style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Stock</label>
                        <input type="number" min="0" value={form.stock || ''} onChange={set('stock')} placeholder="0" className="m-inp" style={inp} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="sp-modal-dlbl" style={lbl}>Description</label>
                  <textarea value={form.description || ''} onChange={set('description')} rows={1} placeholder="Description (optional)" className="m-inp" style={{ ...inp, resize: 'none' }} />
                </div>

                {/* Category */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                    <label style={{ ...lbl, marginBottom: 0 }}>Category</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, fontFamily: 'Jost,sans-serif', color: (form.tags || []).length >= 3 ? C.gold : C.muted }}>{(form.tags || []).length}/3 selected</span>
                      <button type="button" onClick={() => setCatModal(true)} className="sp-newcat-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                        <Plus size={9} /> New
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {prodCats.length === 0 ? (
                      <button type="button" onClick={() => setCatModal(true)}
                        style={{ padding: '5px 13px', borderRadius: 9999, fontSize: 10, fontFamily: 'Jost,sans-serif', cursor: 'pointer', border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Plus size={9} /> Add your first category
                      </button>
                    ) : prodCats.map(cat => {
                      const selected = (form.tags || []).includes(cat.name)
                      const maxed    = (form.tags || []).length >= 3 && !selected
                      return (
                        <button key={cat.id} type="button" onClick={() => toggleCat(cat.name)} disabled={maxed} className="sp-tag-btn"
                          style={{ '--tag-color': cat.color, padding: '5px 13px', borderRadius: 9999, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 500, letterSpacing: '0.05em', cursor: maxed ? 'not-allowed' : 'pointer', transition: 'all .15s', border: `1px solid ${selected ? cat.color + '88' : 'rgba(255,255,255,0.1)'}`, background: selected ? cat.color + '22' : 'rgba(255,255,255,0.03)', color: selected ? cat.color : maxed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.38)', outline: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: selected ? cat.color : 'rgba(255,255,255,0.2)', flexShrink: 0, display: 'inline-block', transition: 'background .15s' }} />
                          {cat.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Available toggle */}
                <div className="sp-modal-avail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.1rem', borderRadius: 13, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontSize: '0.83rem', color: C.dim, fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 2 }}>Available to order</p>
                    <p style={{ fontSize: '0.72rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>Visible to customers in the store</p>
                  </div>
                  <div style={{ width: 44, height: 26, borderRadius: 13, background: form.available ? C.gold : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background .22s', flexShrink: 0, cursor: 'pointer', boxShadow: form.available ? '0 0 14px rgba(184,212,232,0.4)' : 'none' }}
                    onClick={() => setForm(p => ({ ...p, available: !p.available }))}>
                    <div style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', transition: 'left .22s', left: form.available ? 21 : 3 }} />
                  </div>
                </div>

              </div>
            </div>

            <div style={{ height: 1, background: C.border, flexShrink: 0 }} />
            <div className="sp-modal-foot" style={{ padding: '1.1rem 1.75rem 1.5rem', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
              <button onClick={closeModal}
                style={{ flex: 1, padding: '0.72rem', borderRadius: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{ flex: 2, padding: '0.72rem', borderRadius: 12, background: `linear-gradient(135deg,${C.gold},#7AAFC9)`, color: '#000', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: saving ? 0.6 : 1, transition: 'opacity .2s, box-shadow .2s', boxShadow: saving ? 'none' : '0 4px 20px rgba(184,212,232,0.28)' }}>
                {saving
                  ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  : <><Save size={13} /> {modal === 'add' ? 'Add Product' : 'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Categories Modal ──────────────────────────── */}
      {catModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeCatModal() }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, background: C.modal, border: `1px solid ${C.goldBorder}`, borderRadius: 22, overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,.75)', animation: 'modalIn .2s ease' }}>

            <div style={{ height: 3, background: 'linear-gradient(90deg,#B8D4E8,#7AAFC9,rgba(184,212,232,0.1))', flexShrink: 0 }} />

            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 3 }}>Products</p>
                <h2 className="font-display font-light" style={{ fontSize: '1.55rem', color: C.white, lineHeight: 1 }}>Categories</h2>
              </div>
              <button onClick={closeCatModal} className="sp-modal-close"
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .18s' }}>
                <X size={14} />
              </button>
            </div>

            {/* Category list */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {prodCats.length === 0 ? (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No categories yet — add one below.</p>
                </div>
              ) : (
                <div style={{ padding: '0.375rem 0' }}>
                  {prodCats.map(cat => (
                    <div key={cat.id}>
                      {/* Row */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0.625rem 1.5rem', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color, flexShrink: 0, boxShadow: `0 0 8px ${cat.color}66` }} />
                        <span style={{ flex: 1, color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>{cat.name}</span>
                        {catDelId !== cat.id && (
                          <button onClick={() => setCatDelId(cat.id)}
                            className="cat-del-row-btn"
                            style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .15s' }}>
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      {/* Inline delete confirmation */}
                      {catDelId === cat.id && (
                        <div style={{ margin: '0 1rem 0.75rem', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 11, padding: '0.875rem' }}>
                          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Jost,sans-serif', marginBottom: 10, lineHeight: 1.5 }}>
                            Delete <span style={{ color: C.white, fontWeight: 500 }}>{cat.name}</span>? This cannot be undone.
                          </p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setCatDelId(null)}
                              style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>
                              Cancel
                            </button>
                            <button onClick={deleteCategory} disabled={catDeleting}
                              style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.35)', color: C.red, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: catDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .15s' }}>
                              {catDeleting
                                ? <div style={{ width: 12, height: 12, border: '2px solid rgba(248,113,113,0.3)', borderTopColor: C.red, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                                : <><Trash2 size={11} /> Delete</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add category form */}
            <div style={{ borderTop: `1px solid ${C.border}`, padding: '1.25rem 1.5rem 1.5rem', flexShrink: 0 }}>
              <label style={{ ...lbl, marginBottom: 10 }}>New Category</label>

              {/* Color swatches */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                {COLOR_PRESETS.map(color => (
                  <button key={color} type="button" onClick={() => setNewCatColor(color)} className="color-swatch"
                    style={{ width: 22, height: 22, borderRadius: '50%', background: color, border: newCatColor === color ? '2.5px solid #fff' : '2.5px solid transparent', cursor: 'pointer', flexShrink: 0, boxShadow: newCatColor === color ? `0 0 10px ${color}99` : 'none', transition: 'all .15s', outline: 'none' }} />
                ))}
              </div>

              {/* Name + Add button */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 10, width: 10, height: 10, borderRadius: '50%', background: newCatColor, boxShadow: `0 0 6px ${newCatColor}99`, pointerEvents: 'none', flexShrink: 0 }} />
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveCategory()}
                    placeholder="Category name…" className="m-inp"
                    style={{ ...inp, paddingLeft: '1.75rem' }} />
                </div>
                <button onClick={saveCategory} disabled={addingCat || !newCatName.trim()}
                  style={{ padding: '0.55rem 1rem', borderRadius: 9, background: newCatName.trim() ? `linear-gradient(135deg,${C.gold},#7AAFC9)` : 'rgba(255,255,255,0.06)', color: newCatName.trim() ? '#000' : C.muted, border: 'none', fontFamily: 'Jost,sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: (addingCat || !newCatName.trim()) ? 'not-allowed' : 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {addingCat
                    ? <div style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    : <><Plus size={12} /> Add</>}
                </button>
              </div>

              {/* Preview chip */}
              {newCatName.trim() && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif' }}>Preview:</span>
                  <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 500, border: `1px solid ${newCatColor}55`, background: newCatColor + '22', color: newCatColor, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: newCatColor, display: 'inline-block' }} />
                    {newCatName}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Delete Product confirmation ───────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, background: C.modal, border: '1px solid rgba(248,113,113,0.25)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7)', animation: 'modalIn .2s ease' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,#f87171,#ef4444,rgba(248,113,113,0.15))' }} />
            <div style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.redBg, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <ShieldAlert size={22} color={C.red} strokeWidth={1.5} />
                </div>
                <h2 className="font-display font-light" style={{ fontSize: '1.55rem', color: C.white, lineHeight: 1.1, marginBottom: '0.4rem' }}>Delete Product</h2>
                <p style={{ fontSize: '0.78rem', color: C.muted, fontFamily: 'Jost,sans-serif', lineHeight: 1.6 }}>
                  Permanently delete <span style={{ color: C.white }}>{deleteTarget.name}</span>?<br />This action cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '0.65rem', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmDelete} disabled={deleting} style={{ flex: 2, padding: '0.65rem', borderRadius: 10, background: 'linear-gradient(135deg,#f87171,#ef4444)', color: '#fff', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> : <><Trash2 size={13} /> Delete Product</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
