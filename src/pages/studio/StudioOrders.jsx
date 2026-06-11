import { useState, useEffect, useMemo } from 'react'
import { useLogAction } from '../../hooks/useLogAction'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Package, Check, X, Trash2, AlertTriangle, ChevronRight, User, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getOrFetch } from '../../lib/cache'
import Pager from '../../lib/Pager'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: 'var(--col-modal)', gold: 'var(--col-acc)', goldDim: 'var(--col-acc)',
  goldBg: 'rgba(var(--rgb-acc),0.08)', goldBorder: 'rgba(var(--rgb-acc),0.18)',
  white: 'var(--col-text)', dim: 'var(--col-text)', muted: 'var(--col-text)',
  subtle: 'rgba(var(--rgb-hi),0.06)', border: 'rgba(var(--rgb-hi),0.07)',
}

const STATUS_STYLE = {
  active:    { color: 'var(--col-acc)', bg: 'var(--col-acc)',  border: 'var(--col-acc)',  label: 'Awaiting Pickup' },
  retrieved: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.22)',  label: 'Retrieved'       },
  expired:   { color: 'var(--col-text)', bg: 'rgba(var(--rgb-hi),0.06)', border: 'rgba(var(--rgb-hi),0.1)', label: 'Expired' },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.22)', label: 'Cancelled'      },
}

const STATUS_TABS = ['All', 'Active', 'Retrieved', 'Expired', 'Cancelled']

export default function StudioOrders() {
  const log = useLogAction()
  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [tab,          setTab]          = useState('All')
  const [updating,     setUpdating]     = useState(null)
  const [details,      setDetails]      = useState(null)   // order shown in details modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [page,         setPage]         = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getOrFetch('studio_orders', async () => {
      const { data, error } = await supabase
        .from('preorders')
        .select('*, products(name, price, image_url, category), profiles(full_name, phone)')
        .order('created_at', { ascending: false })
      if (error) toast.error('Failed to load orders')
      return data || []
    }, 60_000)
    setOrders(data)
    setLoading(false)
  }

  async function markRetrieved(order) {
    setUpdating(order.id)
    const { error } = await supabase.from('preorders').update({ status: 'retrieved' }).eq('id', order.id)
    if (error) { toast.error('Update failed'); setUpdating(null); return }
    toast.success('Marked as retrieved')
    log('order.retrieved', { entityType: 'order', entityId: order.id, details: { message: `marked ${order.profiles?.full_name || 'client'}'s order of "${order.products?.name || 'item'}" as retrieved` } })
    const updated = { ...order, status: 'retrieved' }
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
    setDetails(updated)
    setUpdating(null)
  }

  async function cancelOrder(order) {
    if (!confirm('Cancel this order? Refund the client manually via Stripe.')) return
    setUpdating(order.id)
    const { error } = await supabase.from('preorders').update({ status: 'cancelled' }).eq('id', order.id)
    if (error) { toast.error('Update failed'); setUpdating(null); return }
    log('order.cancelled', { entityType: 'order', entityId: order.id, details: { message: `cancelled ${order.profiles?.full_name || 'client'}'s order of "${order.products?.name || 'item'}"` } })
    if (order.product_id && order.quantity) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', order.product_id).single()
      if (prod) await supabase.from('products').update({ stock: (prod.stock || 0) + order.quantity }).eq('id', order.product_id)
    }
    toast.success('Order cancelled')
    const updated = { ...order, status: 'cancelled' }
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
    setDetails(updated)
    setUpdating(null)
  }

  async function revertToWaiting(order) {
    setUpdating(order.id)
    const { error } = await supabase.from('preorders').update({ status: 'active' }).eq('id', order.id)
    if (error) { toast.error('Update failed'); setUpdating(null); return }
    toast.success('Order reverted to awaiting pickup')
    log('order.reverted', { entityType: 'order', entityId: order.id, details: { message: `reverted ${order.profiles?.full_name || 'client'}'s order of "${order.products?.name || 'item'}" back to awaiting pickup` } })
    const updated = { ...order, status: 'active' }
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
    setDetails(updated)
    setUpdating(null)
  }

  function openDelete(order) { setDeleteTarget(order) }
  function closeDelete() { setDeleteTarget(null) }

  async function confirmDelete() {
    const { error } = await supabase.from('preorders').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Order deleted')
    log('order.deleted', { entityType: 'order', entityId: deleteTarget.id, details: { message: `deleted order from ${deleteTarget.profiles?.full_name || 'client'} (${deleteTarget.products?.name || 'item'})` } })
    setOrders(prev => prev.filter(o => o.id !== deleteTarget.id))
    setDetails(null)
    closeDelete()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders.filter(o => {
      const matchesTab = tab === 'All' || o.status === tab.toLowerCase()
      const matchesSearch = !q
        || o.id.toLowerCase().includes(q)
        || o.profiles?.full_name?.toLowerCase().includes(q)
        || o.profiles?.phone?.toLowerCase().includes(q)
        || o.products?.name?.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [orders, search, tab])

  const counts = useMemo(() => {
    const c = { All: orders.length }
    STATUS_TABS.slice(1).forEach(s => { c[s] = orders.filter(o => o.status === s.toLowerCase()).length })
    return c
  }, [orders])

  const PER_PAGE = window.innerWidth < 768 ? 6 : 10
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .o-search:focus { border-color: ${C.goldBorder} !important; }
        .o-row:hover { background: rgba(var(--rgb-hi),0.018) !important; }
        .o-row:hover .o-details-btn { border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .o-retrieve:hover:not(:disabled) { background: rgba(52,211,153,0.2) !important; border-color: rgba(52,211,153,0.5) !important; }
        .o-cancel:hover:not(:disabled) { background: rgba(248,113,113,0.15) !important; border-color: rgba(248,113,113,0.4) !important; }
        .o-delete:hover { background: rgba(248,113,113,0.15) !important; border-color: rgba(248,113,113,0.4) !important; }
        .o-revert:hover:not(:disabled) { background: rgba(var(--rgb-acc),0.18) !important; border-color: rgba(var(--rgb-acc),0.45) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>Orders</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'DM Sans,sans-serif' }}>All product pre-orders</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by name, phone, product…" autoComplete="off" className="o-search"
            style={{ background: 'rgba(var(--rgb-hi),0.04)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.45rem 0.875rem 0.45rem 2rem', fontSize: '0.8rem', color: C.white, outline: 'none', fontFamily: 'DM Sans,sans-serif', width: 280, maxWidth: '100%', transition: 'border-color .2s' }} />
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(0) }}
            style={{ padding: '0.35rem 0.875rem', borderRadius: 20, fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: tab === t ? 600 : 400, cursor: 'pointer', transition: 'all .18s', border: 'none', background: tab === t ? C.goldBg : 'rgba(var(--rgb-hi),0.04)', color: tab === t ? C.gold : C.muted, outline: tab === t ? `1px solid ${C.goldBorder}` : '1px solid transparent' }}>
            {t}<span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>({counts[t] || 0})</span>
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0.75rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 58, borderRadius: 8, background: 'rgba(var(--rgb-hi),0.04)' }} className="shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color="rgba(var(--rgb-hi),0.12)" strokeWidth={1} />
            </div>
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'DM Sans,sans-serif' }}>
              {search ? 'No orders match your search' : 'No orders yet'}
            </p>
          </div>
        ) : (
          <>
            {paged.map((order, i) => {
              const s = STATUS_STYLE[order.status] || STATUS_STYLE.active
              const total = (parseFloat(order.products?.price) || 0) * (order.quantity || 1)

              return (
                <div key={order.id} className="o-row"
                  style={{ padding: '0.875rem 1.25rem', borderBottom: i < paged.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background .15s' }}>

                  {/* Row 1: client + status + info btn */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <p style={{ flex: 1, color: C.white, fontSize: '0.85rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0 }}>
                      {order.profiles?.full_name || '—'}
                    </p>
                    <span style={{ fontSize: 9, padding: '3px 9px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {s.label}
                    </span>
                    {order.status === 'retrieved' && (
                      <button onClick={() => revertToWaiting(order)} disabled={updating === order.id} className="o-revert"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: 10, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: updating === order.id ? 'not-allowed' : 'pointer', transition: 'all .18s', flexShrink: 0, opacity: updating === order.id ? 0.5 : 1 }}>
                        <RotateCcw size={9} /> Revert
                      </button>
                    )}
                    <button onClick={() => setDetails(order)} className="o-details-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 9px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}>
                      Info <ChevronRight size={9} />
                    </button>
                  </div>

                  {/* Row 2: metadata chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--col-text)', letterSpacing: '0.04em' }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--col-text)', fontSize: 10 }}>·</span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'DM Sans,sans-serif', color: order.status === 'retrieved' ? C.gold : 'var(--col-text)', fontWeight: order.status === 'retrieved' ? 600 : 400 }}>
                      ${total.toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--col-text)', fontSize: 10 }}>·</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>
                      {format(new Date(order.created_at), 'MMM d, HH:mm')}
                    </span>
                    {order.profiles?.phone && <>
                      <span style={{ color: 'var(--col-text)', fontSize: 10 }}>·</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>{order.profiles.phone}</span>
                    </>}
                  </div>
                </div>
              )
            })}
            <Pager page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </div>

      {/* ── Details Modal ── */}
      <AnimatePresence>
        {details && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            onMouseDown={e => { if (e.target === e.currentTarget) setDetails(null) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 460, background: 'var(--col-modal)', border: `1px solid ${C.goldBorder}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.75)' }}>

              {/* Gold top bar */}
              <div style={{ height: 3, background: `linear-gradient(90deg,${C.gold},var(--col-acc2),rgba(var(--rgb-acc),0.15))` }} />

              <div style={{ padding: '1.5rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.5rem', color: C.white, fontWeight: 400, lineHeight: 1.1, marginBottom: 4 }}>Order Details</h2>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: C.muted, letterSpacing: '0.06em' }}>
                      #{details.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <button onClick={() => setDetails(null)}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(var(--rgb-hi),0.05)', border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>

                {/* Product card */}
                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'rgba(var(--rgb-hi),0.03)', border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: '1rem' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 12, background: 'var(--col-card)', border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {details.products?.image_url
                      ? <img src={details.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Package size={22} color="var(--col-text)" strokeWidth={1} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.white, fontSize: '0.92rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 500, marginBottom: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {details.products?.name || '—'}
                    </p>
                    {details.products?.category && (
                      <p style={{ color: C.muted, fontSize: '0.72rem', fontFamily: 'DM Sans,sans-serif', textTransform: 'capitalize', marginBottom: 8 }}>
                        {details.products.category}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.8rem', color: C.muted, fontFamily: 'DM Sans,sans-serif' }}>×{details.quantity || 1}</span>
                      <span style={{ width: 1, height: 12, background: C.border }} />
                      <span style={{ fontSize: '0.88rem', color: C.gold, fontFamily: 'DM Sans,sans-serif', fontWeight: 700 }}>
                        ${((parseFloat(details.products?.price) || 0) * (details.quantity || 1)).toFixed(2)}
                      </span>
                      {details.products?.price && (
                        <span style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'DM Sans,sans-serif' }}>@ ${parseFloat(details.products.price).toFixed(2)} each</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client + date row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(var(--rgb-hi),0.03)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 5 }}>Client</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--col-acc)', border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: 'var(--col-bg)', fontFamily: 'DM Sans,sans-serif', fontWeight: 700 }}>
                          {(details.profiles?.full_name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '0.78rem', color: C.white, fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {details.profiles?.full_name || '—'}
                        </p>
                        {details.profiles?.phone && (
                          <p style={{ fontSize: '0.65rem', color: C.muted, fontFamily: 'DM Sans,sans-serif' }}>{details.profiles.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'rgba(var(--rgb-hi),0.03)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 5 }}>Ordered</p>
                    <p style={{ fontSize: '0.78rem', color: C.white, fontFamily: 'DM Sans,sans-serif' }}>
                      {format(new Date(details.created_at), 'MMM d, yyyy')}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'DM Sans,sans-serif', marginTop: 2 }}>
                      {format(new Date(details.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>

                {/* Status */}
                {(() => {
                  const s = STATUS_STYLE[details.status] || STATUS_STYLE.active
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, marginBottom: '1.25rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}88`, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', color: s.color, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, flex: 1 }}>{s.label}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--col-text)', letterSpacing: '0.04em' }}>
                        REF {details.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  )
                })()}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {details.status === 'retrieved' && (
                    <button onClick={() => revertToWaiting(details)} disabled={updating === details.id} className="o-revert"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0.65rem', borderRadius: 10, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: '0.8rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: updating === details.id ? 'not-allowed' : 'pointer', transition: 'all .18s', opacity: updating === details.id ? 0.5 : 1 }}>
                      {updating === details.id
                        ? <div style={{ width: 12, height: 12, border: `2px solid ${C.goldBorder}`, borderTopColor: C.gold, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                        : <RotateCcw size={14} />}
                      Revert to Awaiting Pickup
                    </button>
                  )}
                  {details.status === 'active' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => markRetrieved(details)} disabled={updating === details.id} className="o-retrieve"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0.65rem', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.28)', color: '#34d399', fontSize: '0.8rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: updating === details.id ? 'not-allowed' : 'pointer', transition: 'all .18s', opacity: updating === details.id ? 0.5 : 1 }}>
                        {updating === details.id
                          ? <div style={{ width: 12, height: 12, border: '2px solid rgba(52,211,153,0.3)', borderTopColor: '#34d399', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                          : <Check size={14} />}
                        Mark as Picked Up
                      </button>
                      <button onClick={() => cancelOrder(details)} disabled={updating === details.id} className="o-cancel"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.65rem 1rem', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: '0.8rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: updating === details.id ? 'not-allowed' : 'pointer', transition: 'all .18s', opacity: updating === details.id ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  )}
                  <button onClick={() => { openDelete(details) }} className="o-delete"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.6)', fontSize: '0.78rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'all .18s', letterSpacing: '0.06em' }}>
                    <Trash2 size={12} /> Delete Order
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            onMouseDown={e => { if (e.target === e.currentTarget) closeDelete() }}>
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 400, background: 'var(--col-modal)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.75)' }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg,#f87171,rgba(248,113,113,0.3))' }} />
              <div style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={18} color="#f87171" />
                  </div>
                  <div>
                    <h3 style={{ color: C.white, fontFamily: '"Cormorant Garamond",serif', fontSize: '1.35rem', fontWeight: 500, marginBottom: 4 }}>Delete order?</h3>
                    <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.5 }}>This is permanent and cannot be undone.</p>
                  </div>
                </div>
                <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
                  <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'DM Sans,sans-serif', fontWeight: 500, marginBottom: 3 }}>{deleteTarget.products?.name || '—'}</p>
                  <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'DM Sans,sans-serif' }}>
                    {deleteTarget.profiles?.full_name} · ×{deleteTarget.quantity} · ${((parseFloat(deleteTarget.products?.price) || 0) * (deleteTarget.quantity || 1)).toFixed(2)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={closeDelete}
                    style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'rgba(var(--rgb-hi),0.04)', border: '1px solid rgba(var(--rgb-hi),0.08)', color: C.muted, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={confirmDelete}
                    style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                    Delete
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
