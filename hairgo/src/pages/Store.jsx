import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Package, CheckCircle, ShoppingCart, ChevronRight, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useNavigate } from 'react-router-dom'


/* Per-card quantity state lives here so each card tracks its own qty */
function ProductCard({ p, inCart, cartItems, onAddToCart, onViewDetail }) {
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const outOfStock = (p.stock || 0) === 0

  async function handleAdd(e) {
    e.stopPropagation()
    if (outOfStock || adding) return
    setAdding(true)
    await onAddToCart(p, qty)
    setAdding(false)
    setQty(1)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#111116',
        border: inCart ? '1.5px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: outOfStock ? 0.55 : 1,
        transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
      }}
      whileHover={{ y: outOfStock ? 0 : -3, boxShadow: outOfStock ? 'none' : '0 12px 40px rgba(0,0,0,0.5)' }}
    >
      {/* ── Image ──────────────────────────────── */}
      <div
        onClick={() => onViewDetail(p)}
        style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#0d0d12', cursor: 'pointer', flexShrink: 0 }}
      >
        {p.image_url
          ? <img src={p.image_url} alt={p.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.55s ease', display: 'block' }}
              onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={40} color="rgba(255,255,255,0.06)" />
            </div>
        }

        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {inCart && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: 'rgba(52,211,153,0.9)', fontSize: 9, color: '#fff', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              <CheckCircle size={9} /> In Cart
            </span>
          )}
          {!inCart && p.stock > 0 && p.stock < 5 && (
            <span style={{ padding: '3px 9px', borderRadius: 6, background: 'rgba(245,158,11,0.85)', fontSize: 9, color: '#fff', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Only {p.stock} left
            </span>
          )}
          {outOfStock && (
            <span style={{ padding: '3px 9px', borderRadius: 6, background: 'rgba(0,0,0,0.75)', fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'Jost,sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Out of stock
            </span>
          )}
        </div>

        {/* Quick-view hint */}
        <div style={{ position: 'absolute', bottom: 10, right: 10, opacity: 0, transition: 'opacity 0.25s' }} className="qv-btn">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', fontSize: 9, color: 'rgba(255,255,255,0.7)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Details <ChevronRight size={9} />
          </span>
        </div>
      </div>

      {/* ── Info ───────────────────────────────── */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Category */}
        {p.category && (
          <span style={{ fontSize: 9, color: 'rgba(201,168,76,0.55)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 5 }}>
            {p.category}
          </span>
        )}

        {/* Name */}
        <p
          onClick={() => onViewDetail(p)}
          style={{ color: '#f0f0f0', fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.35, marginBottom: 10, cursor: 'pointer', transition: 'color 0.2s', flex: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.color = '#f0f0f0'}>
          {p.name}
        </p>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
          <span className="font-display" style={{ fontSize: '1.45rem', color: '#C9A84C', lineHeight: 1 }}>€{parseFloat(p.price).toFixed(2)}</span>
          {qty > 1 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif' }}>×{qty} = €{(p.price * qty).toFixed(2)}</span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 14 }} />

        {/* Qty + Add row */}
        {/* In-cart count badge */}
        {inCart && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <CheckCircle size={11} color="#34d399" />
            <span style={{ fontSize: 10, color: '#34d399', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
              {cartItems.find(i => i.product_id === p.id)?.quantity ?? 0} in cart
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Qty selector */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)) }}
              disabled={outOfStock}
              style={{ width: 34, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', borderRadius: '10px 0 0 10px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <Minus size={11} />
            </button>
            <span style={{ width: 28, textAlign: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Jost,sans-serif', userSelect: 'none' }}>
              {qty}
            </span>
            <button
              onClick={e => { e.stopPropagation(); setQty(q => Math.min(p.stock || 10, q + 1)) }}
              disabled={outOfStock || qty >= (p.stock || 10)}
              style={{ width: 34, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qty >= (p.stock || 10) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: qty >= (p.stock || 10) ? 'not-allowed' : 'pointer', transition: 'color 0.15s', borderRadius: '0 10px 10px 0' }}
              onMouseEnter={e => { if (qty < (p.stock || 10)) e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => e.currentTarget.style.color = qty >= (p.stock || 10) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'}>
              <Plus size={11} />
            </button>
          </div>

          {/* Add / Add more button */}
          <button
            onClick={handleAdd}
            disabled={outOfStock || adding}
            style={{
              flex: 1, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: outOfStock ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #C9A84C, #C4956A)',
              color: outOfStock ? 'rgba(255,255,255,0.2)' : '#000',
              border: outOfStock ? '1px solid rgba(255,255,255,0.07)' : 'none',
              cursor: outOfStock ? 'not-allowed' : 'pointer',
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700,
              boxShadow: outOfStock ? 'none' : '0 4px 16px rgba(201,168,76,0.25)',
              transition: 'all 0.25s',
            }}
            onMouseEnter={e => { if (!outOfStock) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(201,168,76,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = outOfStock ? 'none' : '0 4px 16px rgba(201,168,76,0.25)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            {adding
              ? <div style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              : <><ShoppingCart size={12} /> {inCart ? 'Add More' : 'Add'}</>
            }
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Main component ──────────────────────────────────── */
export default function Store() {
  const { user }                 = useAuth()
  const { cartItems, addToCart } = useCart()
  const navigate                 = useNavigate()
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activecat, setActivecat] = useState('All')
  const [detail,    setDetail]    = useState(null)
  const [dQty,      setDQty]      = useState(1)
  const [dAdding,   setDAdding]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('products').select('*').eq('available', true).order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const categories = ['All', ...new Set(products.flatMap(p => p.tags?.length ? p.tags : p.category ? [p.category] : []))]
  const filtered   = activecat === 'All' ? products : products.filter(p => {
    const cats = p.tags?.length ? p.tags : p.category ? [p.category] : []
    return cats.some(c => c.toLowerCase() === activecat.toLowerCase())
  })

  function inCart(id) { return cartItems.some(i => i.product_id === id) }
  const cartQty = cartItems.reduce((s, i) => s + i.quantity, 0)

  async function handleAddFromCard(product, qty) {
    if (!user) return
    await addToCart(product, qty)
  }

  async function handleAddFromDetail() {
    if (!detail || !user) return
    setDAdding(true)
    await addToCart(detail, dQty)
    setDAdding(false)
    setDetail(null); setDQty(1)
  }

  function openDetail(p) { setDetail(p); setDQty(1) }
  function closeDetail() { setDetail(null); setDQty(1) }

  return (
    <div className="page-root" style={{ minHeight: '100vh', paddingTop: 96, paddingBottom: 80, background: '#0a0a0a' }}>
      <div className="wrap">

        {/* ── Header ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          <div>
            <h1 className="font-display font-light" style={{ color: '#fff', fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, marginBottom: 6 }}>
              Store
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.83rem', fontFamily: 'Jost,sans-serif' }}>
              {products.length} product{products.length !== 1 ? 's' : ''} · Pay online, pick up in-salon
            </p>
          </div>

          {/* Cart summary */}
          {user && (
            <button onClick={() => navigate('/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 12, background: cartQty > 0 ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cartQty > 0 ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ position: 'relative' }}>
                <ShoppingCart size={16} color={cartQty > 0 ? '#C9A84C' : 'rgba(255,255,255,0.35)'} />
                {cartQty > 0 && (
                  <span style={{ position: 'absolute', top: -7, right: -7, width: 15, height: 15, borderRadius: '50%', background: '#C9A84C', color: '#000', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Jost,sans-serif' }}>{cartQty}</span>
                )}
              </div>
              <span style={{ fontSize: 12, color: cartQty > 0 ? '#C9A84C' : 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                {cartQty > 0 ? `Cart (${cartQty})` : 'Cart'}
              </span>
            </button>
          )}
        </div>

        {/* ── Category filters ──────────────────── */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16, flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const isActive = activecat === cat
              const count = cat === 'All' ? products.length : products.filter(p => (p.tags?.length ? p.tags : p.category ? [p.category] : []).some(c => c.toLowerCase() === cat.toLowerCase())).length
              return (
                <button key={cat} onClick={() => setActivecat(cat)} style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                  fontFamily: 'Jost,sans-serif', fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                  background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
                  color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.35)',
                  border: isActive ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                  transition: 'all 0.18s',
                }}>
                  {cat}
                  <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.6 }}>({count})</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Product grid ─────────────────────── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '1.25rem' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="shimmer" style={{ aspectRatio: '1/1' }} />
                <div style={{ padding: '14px 16px' }}>
                  <div className="shimmer" style={{ height: 8, borderRadius: 4, width: '35%', marginBottom: 8 }} />
                  <div className="shimmer" style={{ height: 12, borderRadius: 4, width: '80%', marginBottom: 12 }} />
                  <div className="shimmer" style={{ height: 16, borderRadius: 4, width: '30%', marginBottom: 14 }} />
                  <div className="shimmer" style={{ height: 38, borderRadius: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontFamily: 'Jost,sans-serif' }}>
            No products in this category yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '1.25rem' }}>
            {filtered.map((p, i) => (
              <ProductCard
                key={p.id}
                p={p}
                inCart={inCart(p.id)}
                cartItems={cartItems}
                onAddToCart={handleAddFromCard}
                onViewDetail={openDetail}
              />
            ))}
          </div>
        )}

        {!user && !loading && filtered.length > 0 && (
          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em' }}>
            Sign in to add items to your cart
          </p>
        )}
      </div>

      {/* ── Product detail modal ───────────────── */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={e => { if (e.target === e.currentTarget) closeDetail() }}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              className="store-detail-modal"
              style={{ width: '100%', maxWidth: 780, background: '#111116', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', display: 'grid', gridTemplateColumns: '1fr 1fr', maxHeight: '90vh' }}>

              {/* Image */}
              <div style={{ position: 'relative', background: '#0d0d12', minHeight: 380 }}>
                {detail.image_url
                  ? <img src={detail.image_url} alt={detail.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={56} color="rgba(255,255,255,0.05)" />
                    </div>
                }
                {detail.category && (
                  <div style={{ position: 'absolute', top: 16, left: 16, padding: '4px 12px', borderRadius: 6, background: '#C9A84C' }}>
                    <span style={{ fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 700, color: '#000', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{detail.category}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                  <button onClick={closeDetail} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} />
                  </button>
                </div>

                <h2 className="font-display font-light" style={{ color: '#fff', fontSize: '2rem', lineHeight: 1.1, marginBottom: '0.5rem' }}>{detail.name}</h2>

                <p className="font-display gold-gradient" style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '1.25rem' }}>
                  €{(parseFloat(detail.price) * dQty).toFixed(2)}
                  {dQty > 1 && <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif', backgroundImage: 'none', WebkitTextFillColor: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>×{dQty}</span>}
                </p>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: '1.25rem' }} />

                {detail.description && (
                  <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.84rem', lineHeight: 1.85, fontFamily: 'Jost,sans-serif', fontWeight: 300, marginBottom: '1.5rem', flex: 1 }}>{detail.description}</p>
                )}

                {/* Stock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: detail.stock === 0 ? '#f87171' : detail.stock < 5 ? '#f59e0b' : '#34d399' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost,sans-serif' }}>
                    {detail.stock === 0 ? 'Out of stock' : detail.stock < 5 ? `Only ${detail.stock} left` : `In stock`}
                  </span>
                </div>

                {/* Qty */}
                {!inCart(detail.id) && detail.stock > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', marginRight: 4 }}>Qty</span>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}>
                      <button onClick={() => setDQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={12} /></button>
                      <span style={{ width: 30, textAlign: 'center', color: '#fff', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{dQty}</span>
                      <button onClick={() => setDQty(q => Math.min(detail.stock || 10, q + 1))} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={12} /></button>
                    </div>
                  </div>
                )}

                {inCart(detail.id) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <CheckCircle size={12} color="#34d399" />
                    <span style={{ fontSize: 11, color: '#34d399', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                      {cartItems.find(i => i.product_id === detail.id)?.quantity ?? 0} already in cart
                    </span>
                  </div>
                )}
                <button onClick={handleAddFromDetail} disabled={dAdding || !user || detail.stock === 0} className="btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                  {dAdding
                    ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    : <><ShoppingCart size={14} /> {inCart(detail.id) ? 'Add More' : 'Add to Cart'} · €{(parseFloat(detail.price) * dQty).toFixed(2)}</>
                  }
                </button>

                {!user && <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 10, fontFamily: 'Jost,sans-serif' }}>Sign in to add to cart</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .product-card:hover .qv-btn { opacity: 1 !important; }
        @media (max-width: 600px) {
          .store-detail-modal {
            grid-template-columns: 1fr !important;
            max-height: 92vh;
            overflow-y: auto;
          }
          .store-detail-modal > div:first-child {
            min-height: 240px !important;
            max-height: 260px;
          }
        }
      `}</style>
    </div>
  )
}
