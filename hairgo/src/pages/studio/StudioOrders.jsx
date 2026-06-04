import { useState, useEffect, useMemo } from 'react'
import { Search, Package, Check, X, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)',
  goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)',
  subtle: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.07)',
}

const STATUS_STYLE = {
  active:    { color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',   border: 'rgba(201,168,76,0.22)'   },
  retrieved: { color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',   border: 'rgba(201,168,76,0.22)'   },
  expired:   { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)' },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.22)'  },
}

const STATUS_TABS = ['All', 'Active', 'Retrieved', 'Expired', 'Cancelled']

export default function StudioOrders() {
  const [orders,      setOrders]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [tab,         setTab]         = useState('All')
  const [updating,    setUpdating]    = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletePass,   setDeletePass]   = useState('')
  const [deleteError,  setDeleteError]  = useState(false)
  const [showPass,     setShowPass]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('preorders')
      .select('*, products(name, price, image_url, category), profiles(full_name, phone)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load orders')
    setOrders(data || [])
    setLoading(false)
  }

  async function markRetrieved(id) {
    setUpdating(id)
    const { error } = await supabase.from('preorders').update({ status: 'retrieved' }).eq('id', id)
    if (error) { toast.error('Update failed'); setUpdating(null); return }
    toast.success('Marked as retrieved')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'retrieved' } : o))
    setUpdating(null)
  }

  async function cancelOrder(id) {
    if (!confirm('Cancel this order? Refund the client manually via Stripe.')) return
    setUpdating(id)
    const order = orders.find(o => o.id === id)
    const { error } = await supabase.from('preorders').update({ status: 'cancelled' }).eq('id', id)
    if (error) { toast.error('Update failed'); setUpdating(null); return }
    // restore stock
    if (order?.product_id && order?.quantity) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', order.product_id).single()
      if (prod) await supabase.from('products').update({ stock: (prod.stock || 0) + order.quantity }).eq('id', order.product_id)
    }
    toast.success('Order cancelled')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    setUpdating(null)
  }

  function openDelete(order) { setDeleteTarget(order); setDeletePass(''); setDeleteError(false); setShowPass(false) }
  function closeDelete() { setDeleteTarget(null); setDeletePass(''); setDeleteError(false) }

  async function confirmDelete() {
    if (deletePass !== 'hairgo24') { setDeleteError(true); return }
    const { error } = await supabase.from('preorders').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Order deleted')
    setOrders(prev => prev.filter(o => o.id !== deleteTarget.id))
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.15rem' }}>
            Orders
          </h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, fontFamily: 'Jost,sans-serif' }}>
            All product orders
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, product, or order ID…" autoComplete="off"
            style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              borderRadius: 9, padding: '0.45rem 0.875rem 0.45rem 2rem',
              fontSize: '0.8rem', color: C.white, outline: 'none',
              fontFamily: 'Jost,sans-serif', width: 320, transition: 'border-color .2s',
            }}
            className="o-search"
          />
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '0.35rem 0.875rem', borderRadius: 20, fontSize: 11,
              letterSpacing: '0.13em', textTransform: 'uppercase',
              fontFamily: 'Jost,sans-serif', fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer', transition: 'all .18s', border: 'none',
              background: tab === t ? C.goldBg : 'rgba(255,255,255,0.04)',
              color: tab === t ? C.gold : C.muted,
              outline: tab === t ? `1px solid ${C.goldBorder}` : '1px solid transparent',
            }}>
            {t}
            <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>({counts[t] || 0})</span>
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0.75rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 60, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} className="shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10 }}>
            <Package size={28} style={{ color: 'rgba(255,255,255,0.07)' }} />
            <p style={{ color: C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>
              {search ? 'No orders match your search' : 'No orders yet'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                {['Order ID', 'Product', 'Client', 'Qty', 'Total', 'Ordered', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '0.625rem 1rem', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, textAlign: 'left', fontFamily: 'Jost,sans-serif', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, i) => {
                const s = STATUS_STYLE[order.status] || STATUS_STYLE.active
                const total = (parseFloat(order.products?.price) || 0) * (order.quantity || 1)
                const isUpdating = updating === order.id
                const isActive = order.status === 'active'

                return (
                  <tr key={order.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }} className="o-row">

                    {/* Order ID */}
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.72rem', color: C.muted, whiteSpace: 'nowrap' }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>

                    {/* Product */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#181818', border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {order.products?.image_url
                            ? <img src={order.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Package size={13} style={{ color: C.muted }} />
                          }
                        </div>
                        <div>
                          <p style={{ color: C.white, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', whiteSpace: 'nowrap' }}>{order.products?.name || '—'}</p>
                          {order.products?.category && (
                            <p style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif', textTransform: 'capitalize' }}>{order.products.category}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <p style={{ color: C.dim, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', whiteSpace: 'nowrap' }}>{order.profiles?.full_name || '—'}</p>
                      {order.profiles?.phone && (
                        <p style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Jost,sans-serif' }}>{order.profiles.phone}</p>
                      )}
                    </td>

                    {/* Qty */}
                    <td style={{ padding: '0.75rem 1rem', color: C.dim, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
                      ×{order.quantity || 1}
                    </td>

                    {/* Total */}
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'Jost,sans-serif', fontSize: '0.82rem', color: order.status === 'retrieved' ? C.gold : C.dim, fontWeight: order.status === 'retrieved' ? 600 : 400 }}>
                      €{total.toFixed(2)}
                    </td>

                    {/* Ordered */}
                    <td style={{ padding: '0.75rem 1rem', color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', whiteSpace: 'nowrap' }}>
                      {format(new Date(order.created_at), 'MMM d, HH:mm')}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {order.status === 'active' ? 'Awaiting Pickup' : order.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isActive && (
                          <>
                            <button
                              onClick={() => markRetrieved(order.id)}
                              disabled={isUpdating}
                              title="Mark as picked up"
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: isUpdating ? 'not-allowed' : 'pointer', transition: 'all .18s', opacity: isUpdating ? 0.5 : 1, whiteSpace: 'nowrap' }}
                              className="o-retrieve-btn">
                              {isUpdating
                                ? <div style={{ width: 10, height: 10, border: '1.5px solid rgba(52,211,153,0.3)', borderTopColor: '#34d399', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                                : <Check size={11} />
                              }
                              Picked Up
                            </button>
                            <button
                              onClick={() => cancelOrder(order.id)}
                              disabled={isUpdating}
                              title="Cancel order"
                              style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isUpdating ? 'not-allowed' : 'pointer', transition: 'all .18s', flexShrink: 0, opacity: isUpdating ? 0.5 : 1 }}
                              className="o-cancel-btn">
                              <X size={12} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openDelete(order)}
                          title="Delete order"
                          style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}
                          className="o-delete-btn">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div onClick={closeDelete}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, background: '#12121c', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg,#f87171,#ef4444)' }} />
            <div style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={18} color="#f87171" />
                </div>
                <div>
                  <h3 style={{ color: C.white, fontFamily: '"Cormorant Garamond",serif', fontSize: '1.35rem', fontWeight: 500, marginBottom: 4 }}>Delete order?</h3>
                  <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', lineHeight: 1.5 }}>This is permanent and cannot be undone.</p>
                </div>
              </div>

              <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ color: C.white, fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 3 }}>
                  {deleteTarget.products?.name || '—'}
                </p>
                <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif' }}>
                  {deleteTarget.profiles?.full_name} · ×{deleteTarget.quantity} · €{((parseFloat(deleteTarget.products?.price) || 0) * (deleteTarget.quantity || 1)).toFixed(2)}
                </p>
              </div>

              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 8 }}>
                Enter password to confirm
              </label>
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={deletePass}
                  onChange={e => { setDeletePass(e.target.value); setDeleteError(false) }}
                  onKeyDown={e => e.key === 'Enter' && confirmDelete()}
                  placeholder="••••••••"
                  autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', background: deleteError ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${deleteError ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '0.7rem 2.5rem 0.7rem 0.9rem', fontSize: '0.85rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', transition: 'border-color .2s' }}
                />
                <button onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 10, fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em' }}>
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {deleteError && <p style={{ color: '#f87171', fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', marginBottom: '1rem' }}>Incorrect password</p>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closeDelete}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: C.muted, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .o-search:focus { border-color: ${C.goldBorder} !important; }
        .o-row:hover { background: rgba(255,255,255,0.015); }
        .o-retrieve-btn:hover { background: rgba(52,211,153,0.18) !important; border-color: rgba(52,211,153,0.45) !important; }
        .o-cancel-btn:hover   { background: rgba(248,113,113,0.12) !important; border-color: rgba(248,113,113,0.35) !important; }
        .o-delete-btn:hover   { background: rgba(248,113,113,0.15) !important; border-color: rgba(248,113,113,0.4) !important; }
      `}</style>
    </div>
  )
}
