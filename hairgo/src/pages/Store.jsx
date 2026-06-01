import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Clock, X, Plus, Minus, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDistanceToNow, addHours } from 'date-fns'
import toast from 'react-hot-toast'

const CATS = ['All', 'Shampoo', 'Conditioner', 'Treatment', 'Styling', 'Tools']

export default function Store() {
  const { user } = useAuth()
  const [products,  setProducts]  = useState([])
  const [preorders, setPreorders] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [active,    setActive]    = useState('All')
  const [modal,     setModal]     = useState(null)
  const [qty,       setQty]       = useState(1)
  const [ordering,  setOrdering]  = useState(false)

  useEffect(() => { load() }, [user])

  async function load() {
    const { data:prods } = await supabase.from('products').select('*').eq('available', true).order('created_at', { ascending:false })
    setProducts(prods || [])
    if (user) {
      const { data:orders } = await supabase.from('preorders').select('*, products(name,image_url)').eq('user_id', user.id).eq('status', 'active')
      setPreorders(orders || [])
    }
    setLoading(false)
  }

  const filtered = active === 'All' ? products : products.filter(p => p.category?.toLowerCase() === active.toLowerCase())

  async function preorder() {
    if (!user) return toast.error('Please sign in to preorder')
    setOrdering(true)
    try {
      const { error } = await supabase.from('preorders').insert({
        user_id: user.id, product_id: modal.id, quantity: qty, status: 'active',
        expires_at: addHours(new Date(), 48).toISOString(),
      })
      if (error) throw error
      // decrement stock
      await supabase.from('products')
        .update({ stock: Math.max(0, (modal.stock || 0) - qty) })
        .eq('id', modal.id)
      toast.success('Preorder placed! Pick up within 48 hours.')
      setModal(null); setQty(1); load()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setOrdering(false) }
  }

  async function cancelPreorder(id) {
    const order = preorders.find(p => p.id === id)
    await supabase.from('preorders').update({ status: 'cancelled' }).eq('id', id)
    // restore stock
    if (order?.product_id && order?.quantity) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', order.product_id).single()
      if (prod) await supabase.from('products').update({ stock: (prod.stock || 0) + order.quantity }).eq('id', order.product_id)
    }
    toast.success('Preorder cancelled'); load()
  }

  return (
    <div style={{ minHeight:'100vh', paddingTop:140, paddingBottom:120 }}>
      <div className="wrap">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.75, ease:[0.22,1,0.36,1] }}
          style={{ textAlign:'center', marginBottom:72 }}>
          <span className="sec-label">Premium Products</span>
          <h1 className="font-display font-light"
            style={{ color:'#fff', fontSize:'clamp(3rem,8vw,6rem)', textAlign:'center', marginBottom:'1.5rem' }}>
            Store
          </h1>
          <div className="gold-bar" />
          <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.9rem', lineHeight:1.85, maxWidth:460, margin:'0 auto', textAlign:'center' }}>
            Reserve your favourites online — pick them up in-store within 48 hours. No payment needed upfront.
          </p>
        </motion.div>

        {/* Active preorders */}
        {preorders.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ marginBottom:56 }}>
            <p style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C9A84C', marginBottom:16 }}>Your Active Preorders</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {preorders.map(order => (
                <div key={order.id} className="glass" style={{ borderRadius:16, padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:'rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Package size={16} color="#C9A84C" />
                    </div>
                    <div>
                      <p style={{ color:'#fff', fontSize:'0.9rem', fontWeight:400 }}>{order.products?.name}</p>
                      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.78rem', marginTop:2 }}>Qty: {order.quantity}</p>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'1.25rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(251,191,36,0.7)' }}>
                      <Clock size={12} />
                      <span style={{ fontSize:'0.78rem' }}>Expires {formatDistanceToNow(new Date(order.expires_at), { addSuffix:true })}</span>
                    </div>
                    <button onClick={() => cancelPreorder(order.id)} style={{ color:'rgba(255,255,255,0.22)', cursor:'pointer', padding:4, background:'none', border:'none' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filter */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.65rem', flexWrap:'wrap', marginBottom:56 }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={active === cat ? 'btn-gold' : 'btn-outline'}
              style={active === cat ? { padding:'11px 24px' } : { padding:'10px 24px' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:'1.75rem' }}>
            {Array.from({ length:8 }).map((_,i) => (
              <div key={i}>
                <div className="shimmer" style={{ aspectRatio:'1/1', borderRadius:20, marginBottom:14 }} />
                <div className="shimmer" style={{ height:12, borderRadius:6, width:'75%', marginBottom:8 }} />
                <div className="shimmer" style={{ height:12, borderRadius:6, width:'50%' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', paddingTop:96, paddingBottom:96, color:'rgba(255,255,255,0.22)', fontSize:'0.9rem' }}>
            No products available yet.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:'1.75rem' }}>
            {filtered.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                transition={{ duration:0.45, delay:i * 0.05 }}
                onClick={() => { setModal(p); setQty(1) }}
                style={{ cursor:'pointer' }}>
                <div style={{ aspectRatio:'1/1', borderRadius:20, overflow:'hidden', background:'#1a1a1a', marginBottom:'1.25rem', border:'1px solid rgba(255,255,255,0.05)', position:'relative' }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.7s ease' }}
                        onMouseEnter={e => e.currentTarget.style.transform='scale(1.06)'}
                        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Package size={40} color="rgba(255,255,255,0.07)" />
                      </div>
                  }
                  {p.stock < 5 && p.stock > 0 && (
                    <div style={{ position:'absolute', top:10, left:10, padding:'4px 10px', borderRadius:9999, background:'rgba(251,191,36,0.18)', color:'rgba(251,191,36,0.9)', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase' }}>
                      Low stock
                    </div>
                  )}
                </div>
                <h3 style={{ color:'#f0f0f0', fontSize:'0.9rem', fontWeight:400, marginBottom:'0.35rem', transition:'color 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#C9A84C'}
                  onMouseLeave={e => e.currentTarget.style.color='#f0f0f0'}>
                  {p.name}
                </h3>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:'0.5rem' }}>{p.category}</p>
                <p className="font-display" style={{ color:'#C9A84C', fontSize:'1.3rem' }}>€{p.price}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(16px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'1rem' }}
            className="sm:items-center"
            onClick={() => setModal(null)}>
            <motion.div initial={{ y:80, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:80, opacity:0 }}
              transition={{ type:'spring', damping:28, stiffness:270 }}
              onClick={e => e.stopPropagation()}
              className="glass" style={{ width:'100%', maxWidth:480, borderRadius:28, overflow:'hidden' }}>
              {modal.image_url && (
                <div style={{ aspectRatio:'16/9', overflow:'hidden' }}>
                  <img src={modal.image_url} alt={modal.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              )}
              <div style={{ padding:'2.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
                  <div>
                    <h3 className="font-display" style={{ fontSize:'2rem', color:'#fff', marginBottom:'0.35rem' }}>{modal.name}</h3>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.2em', textTransform:'uppercase' }}>{modal.category}</p>
                  </div>
                  <button onClick={() => setModal(null)} style={{ padding:8, color:'rgba(255,255,255,0.3)', cursor:'pointer', background:'none', border:'none', marginTop:4 }}>
                    <X size={18} />
                  </button>
                </div>
                {modal.description && (
                  <p style={{ color:'rgba(255,255,255,0.42)', fontSize:'0.88rem', lineHeight:1.85, marginBottom:'1.75rem' }}>{modal.description}</p>
                )}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.75rem' }}>
                  <span className="font-display gold-gradient" style={{ fontSize:'2.5rem' }}>€{modal.price}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <button onClick={() => setQty(Math.max(1,qty-1))} className="glass-light" style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', cursor:'pointer', border:'none' }}>
                      <Minus size={13} />
                    </button>
                    <span style={{ color:'#fff', fontSize:'1rem', minWidth:24, textAlign:'center', fontWeight:500 }}>{qty}</span>
                    <button onClick={() => setQty(Math.min(modal.stock||10, qty+1))} className="glass-light" style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', cursor:'pointer', border:'none' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, color:'rgba(251,191,36,0.65)', fontSize:'0.8rem', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.1)', borderRadius:12, padding:'0.875rem 1.25rem', marginBottom:'1.75rem' }}>
                  <Clock size={13} />
                  <span>Reserve now — pick up &amp; pay in-store within 48 hours</span>
                </div>
                <button onClick={preorder} disabled={ordering || !user} className="btn-gold" style={{ width:'100%' }}>
                  {ordering ? <div style={{ width:16, height:16, border:'2px solid rgba(0,0,0,0.25)', borderTopColor:'#000', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                    : <><ShoppingBag size={16} /> Preorder Now</>}
                </button>
                {!user && <p style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.22)', marginTop:10, letterSpacing:'0.12em' }}>Sign in to preorder</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
