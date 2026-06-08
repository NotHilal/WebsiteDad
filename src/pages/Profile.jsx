import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Package, Tag, Star, Clock, X, Edit2, Check, LogOut, ShoppingCart, Trash2, Download, Receipt, Scissors, ChevronRight, Minus, Plus } from 'lucide-react'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import StripeCheckout from '../components/payment/StripeCheckout'
import { Copy, CheckCheck } from 'lucide-react'

const TABS = ['Appointments', 'Cart', 'Orders', 'Rewards']

const STATUS_MAP = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  confirmed: { label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  completed: { label: 'Completed', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)'  },
  active:    { label: 'Awaiting Pickup', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  retrieved: { label: 'Picked Up', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)'  },
  expired:   { label: 'Expired',   color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' },
}

function StatusPill({ status }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending
  return <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>{s.label}</span>
}

function Countdown({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)))
  const expired = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      const rem = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
      setSecs(rem)
      if (rem === 0 && !expired.current) { expired.current = true; onExpired() }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const m = Math.floor(secs / 60)
  const s = secs % 60
  const urgent = secs < 60
  return (
    <span style={{ fontSize: 11, fontFamily: 'Jost, sans-serif', color: urgent ? '#f87171' : '#f59e0b', fontWeight: 600 }}>
      {m}:{String(s).padStart(2, '0')}
    </span>
  )
}

const ease = [0.22, 1, 0.36, 1]
const S1 = 'rgba(255,255,255,0.04)'
const BD = 'rgba(255,255,255,0.07)'

export default function Profile() {
  const { user, profile, fetchProfile } = useAuth()
  const { cartItems, cartTotal, removeFromCart, commitQtyUpdate, expireItem, clearCart } = useCart()
  const navigate = useNavigate()

  const [tab, setTab]             = useState('Appointments')
  const [appointments, setAppts]  = useState([])
  const [orders, setOrders]       = useState([])
  const [coupons, setCoupons]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [editName, setEditName]   = useState(false)
  const [nameInput, setNameInput] = useState(profile?.full_name || '')
  const [loggingOut, setOut]      = useState(false)
  const [receipt,   setReceipt]   = useState(null)
  const [apptPage,  setApptPage]  = useState(0)
  const [ordPage,   setOrdPage]   = useState(0)
  const PER_PAGE = 2

  // Payment modal state
  const [payStep,      setPayStep]      = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [reserving,    setReserving]    = useState(false)

  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    const [{ data: a }, { data: o }, { data: c }] = await Promise.all([
      supabase.from('appointments').select('*, stylists(name), services(name,price,duration)').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('preorders').select('*, products(name,image_url,price)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_coupons').select('*, coupons(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setAppts(a || [])
    setOrders(o || [])
    setCoupons(c || [])
    setLoading(false)
  }

  async function saveName() {
    await supabase.from('profiles').update({ full_name: nameInput }).eq('id', user.id)
    await fetchProfile(user.id)
    setEditName(false)
    toast.success('Name updated')
  }

  async function handleLogout() {
    setOut(true)
    await supabase.auth.signOut()
    navigate('/')
  }

  async function startCartPayment() {
    if (cartItems.length === 0) return
    setPayStep('loading')
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount: cartTotal.toFixed(2), label: `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} from HairGo Store` },
      })
      if (error) throw error
      setClientSecret(data.client_secret)
      setPayStep('form')
    } catch (err) {
      toast.error(err.message || 'Could not start payment')
      setPayStep(null)
    }
  }

  async function reserveInStore() {
    if (cartItems.length === 0) return
    setReserving(true)
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      for (const item of cartItems) {
        await supabase.from('preorders').insert({
          user_id: user.id, product_id: item.product_id, quantity: item.quantity,
          status: 'active', payment_status: 'pay_in_store', expires_at: expiresAt,
        })
        await supabase.from('products')
          .update({ stock: Math.max(0, (item.products?.stock ?? 0) - item.quantity) })
          .eq('id', item.product_id)
      }
      await clearCart()
      toast.success('Items reserved! Come pay in store within 7 days.')
      loadAll()
      setTab('Orders')
    } catch {
      toast.error('Could not reserve items — please try again')
    } finally {
      setReserving(false)
    }
  }

  async function completeCartPayment(paymentIntentId) {
    try {
      for (const item of cartItems) {
        await supabase.from('preorders').insert({
          user_id: user.id, product_id: item.product_id, quantity: item.quantity,
          status: 'active', payment_intent_id: paymentIntentId, payment_status: 'paid',
        })
        await supabase.from('products')
          .update({ stock: Math.max(0, (item.products?.stock ?? 0) - item.quantity) })
          .eq('id', item.product_id)
      }
      await clearCart()
      setPayStep(null); setClientSecret(null)
      toast.success('Payment confirmed! Come pick up your order.')
      loadAll()
      setTab('Orders')
    } catch {
      toast.error('Payment succeeded but order failed — contact us')
    }
  }

  function downloadReceipt(order) {
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const W    = doc.internal.pageSize.getWidth()
    const H    = doc.internal.pageSize.getHeight()
    const m    = 16   // margin
    const gold = [201, 168, 76]
    const dark = [20, 20, 20]
    const mid  = [100, 100, 100]
    const lite = [170, 170, 170]
    const bg   = [248, 248, 248]
    const paid = order.payment_status === 'paid'
    const inStore = order.payment_status === 'pay_in_store'
    const total = ((parseFloat(order.products?.price) || 0) * order.quantity).toFixed(2)
    const orderDate = format(new Date(order.created_at), 'MMMM d, yyyy')
    const orderId   = order.id.slice(0, 8).toUpperCase()

    let y = 0

    // Gold top bar
    doc.setFillColor(...gold)
    doc.rect(0, 0, W, 4, 'F')

    // White background
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 4, W, H - 4, 'F')

    y = 18

    // Brand — left
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...dark)
    doc.text('HairGo', m, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...lite)
    doc.text('PREMIUM HAIR STUDIO · DOHA, QATAR', m, y + 5.5)

    // RECEIPT label — right
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...gold)
    doc.text('RECEIPT', W - m, y, { align: 'right' })

    y += 14

    // Thin gold rule
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.4)
    doc.line(m, y, W - m, y)
    y += 10

    // Order # / Date row
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...lite)
    doc.text('ORDER NUMBER', m, y)
    doc.text('DATE', W - m, y, { align: 'right' })
    y += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...dark)
    doc.text(`#${orderId}`, m, y)
    doc.text(orderDate, W - m, y, { align: 'right' })

    y += 11

    // Customer row
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...lite)
    doc.text('CUSTOMER', m, y)
    y += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...dark)
    doc.text(profile?.full_name || user?.email || 'Customer', m, y)

    y += 14

    // Items table header
    doc.setFillColor(...bg)
    doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 11, 2, 2, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...mid)
    doc.text('ITEM', m, y + 1)
    doc.text('AMOUNT', W - m, y + 1, { align: 'right' })

    y += 13

    // Product line
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...dark)
    const productName = order.products?.name || 'Product'
    // Truncate long names
    const maxW = W - m * 2 - 30
    let displayName = productName
    while (doc.getTextWidth(displayName) > maxW && displayName.length > 4) {
      displayName = displayName.slice(0, -1)
    }
    if (displayName !== productName) displayName += '...'
    doc.text(displayName, m, y)
    doc.text(`€${total}`, W - m, y, { align: 'right' })

    y += 5.5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...lite)
    doc.text(`${order.quantity} x €${parseFloat(order.products?.price || 0).toFixed(2)}`, m, y)

    y += 10

    // Dividers before total
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.25)
    doc.line(m, y, W - m, y)
    y += 2
    doc.setDrawColor(...dark)
    doc.setLineWidth(0.6)
    doc.line(m, y, W - m, y)
    y += 8

    // Total row
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...mid)
    doc.text('TOTAL', m, y)

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...gold)
    doc.text(`€${total}`, W - m, y, { align: 'right' })

    y += 16

    // Payment status box
    const statusBg = paid ? [240, 253, 244] : [255, 251, 235]
    const statusTx = paid ? [21, 128, 61]   : [120, 80, 0]
    doc.setFillColor(...statusBg)
    doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 12, 3, 3, 'F')
    doc.setDrawColor(paid ? 187 : 253, paid ? 247 : 230, paid ? 208 : 138)
    doc.setLineWidth(0.3)
    doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 12, 3, 3, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...statusTx)
    doc.text(paid ? 'Paid via Stripe' : inStore ? 'Pay in store' : 'Payment pending', W / 2, y + 1.5, { align: 'center' })

    y += 20

    // Footer rule
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.25)
    doc.line(m, y, W - m, y)
    y += 7

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...lite)
    doc.text('Thank you for shopping with HairGo.', W / 2, y, { align: 'center' })
    y += 4.5
    doc.text('hairgo.qa  ·  Doha, Qatar', W / 2, y, { align: 'center' })

    // Gold bottom bar
    doc.setFillColor(...gold)
    doc.rect(0, H - 4, W, 4, 'F')

    doc.save(`HairGo-Receipt-${orderId}.pdf`)
  }

  function downloadApptReceipt(appt) {
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const W    = doc.internal.pageSize.getWidth()
    const H    = doc.internal.pageSize.getHeight()
    const m    = 16
    const gold = [201, 168, 76]
    const dark = [20, 20, 20]
    const mid  = [100, 100, 100]
    const lite = [170, 170, 170]
    const bg   = [248, 248, 248]
    const paid = appt.payment_status === 'paid'
    const inStoreAppt = appt.payment_status === 'pay_in_store'
    const apptId   = appt.id.slice(0, 8).toUpperCase()
    const apptDate = format(new Date(appt.date), 'MMMM d, yyyy')
    const bookedOn = appt.created_at ? format(new Date(appt.created_at), 'MMMM d, yyyy') : apptDate

    let y = 0

    doc.setFillColor(...gold); doc.rect(0, 0, W, 4, 'F')
    doc.setFillColor(255, 255, 255); doc.rect(0, 4, W, H - 4, 'F')

    y = 18

    // Brand
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...dark)
    doc.text('HairGo', m, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...lite)
    doc.text('PREMIUM HAIR STUDIO · DOHA, QATAR', m, y + 5.5)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...gold)
    doc.text('APPOINTMENT', W - m, y, { align: 'right' })

    y += 14
    doc.setDrawColor(...gold); doc.setLineWidth(0.4); doc.line(m, y, W - m, y)
    y += 10

    // Ref + booked date
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...lite)
    doc.text('REFERENCE', m, y); doc.text('BOOKED ON', W - m, y, { align: 'right' })
    y += 5
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark)
    doc.text(`#${apptId}`, m, y)
    doc.text(bookedOn, W - m, y, { align: 'right' })

    y += 11

    // Customer
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...lite)
    doc.text('CUSTOMER', m, y)
    y += 5
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark)
    doc.text(profile?.full_name || user?.email || 'Customer', m, y)

    y += 14

    // Details table header
    doc.setFillColor(...bg); doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 11, 2, 2, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...mid)
    doc.text('APPOINTMENT DETAILS', m, y + 1)

    y += 13

    // Service name
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark)
    doc.text(appt.services?.name || 'Service', m, y)
    if (appt.services?.price) {
      doc.setFontSize(12); doc.setTextColor(...gold)
      doc.text(`€${appt.services.price}`, W - m, y, { align: 'right' })
    }

    y += 6
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...lite)
    if (appt.stylists?.name) doc.text(`with ${appt.stylists.name}`, m, y)
    if (appt.services?.duration) doc.text(`${appt.services.duration} min`, W - m, y, { align: 'right' })

    y += 10

    // Appointment date/time box
    doc.setFillColor(248, 246, 240)
    doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 16, 3, 3, 'F')
    doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.3)
    doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 16, 3, 3, 'S')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...gold)
    doc.text('APPOINTMENT DATE & TIME', W / 2, y - 0.5, { align: 'center' })
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark)
    const timeStr = appt.time ? appt.time.slice(0, 5) : ''
    doc.text(`${apptDate}${timeStr ? '  at  ' + timeStr : ''}`, W / 2, y + 6, { align: 'center' })

    y += 22

    // Dividers + total
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.25); doc.line(m, y, W - m, y)
    y += 2
    doc.setDrawColor(...dark); doc.setLineWidth(0.6); doc.line(m, y, W - m, y)
    y += 8
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...mid)
    doc.text('TOTAL', m, y)
    doc.setFontSize(18); doc.setTextColor(...gold)
    doc.text(`€${parseFloat(appt.services?.price || 0).toFixed(2)}`, W - m, y, { align: 'right' })

    y += 16

    // Payment badge
    const statusBg = paid ? [240, 253, 244] : [255, 251, 235]
    const statusTx = paid ? [21, 128, 61]   : [120, 80, 0]
    doc.setFillColor(...statusBg)
    doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 12, 3, 3, 'F')
    doc.setDrawColor(paid ? 187 : 253, paid ? 247 : 230, paid ? 208 : 138)
    doc.setLineWidth(0.3); doc.roundedRect(m - 3, y - 5, W - m * 2 + 6, 12, 3, 3, 'S')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...statusTx)
    doc.text(paid ? 'Paid via Stripe' : inStoreAppt ? 'Pay in store' : 'Payment pending', W / 2, y + 1.5, { align: 'center' })

    y += 18

    doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.25); doc.line(m, y, W - m, y)
    y += 7
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...lite)
    doc.text('Thank you for choosing HairGo.', W / 2, y, { align: 'center' })
    y += 4.5
    doc.text('hairgo.qa  ·  Doha, Qatar', W / 2, y, { align: 'center' })

    doc.setFillColor(...gold); doc.rect(0, H - 4, W, 4, 'F')
    doc.save(`HairGo-Appointment-${apptId}.pdf`)
  }

  const totalVisits     = profile?.points || 0
  const stampsThisCycle = totalVisits % 5
  const remaining       = stampsThisCycle === 0 ? 5 : 5 - stampsThisCycle
  const initial  = (profile?.full_name || user?.email)?.[0]?.toUpperCase()
  const name     = profile?.full_name || user?.email?.split('@')[0] || 'Guest'
  const isAdmin  = profile?.role === 'admin'
  const upcoming = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length
  const activeCoupons = coupons.filter(c => !c.used).length
  const card = { background: S1, border: `1px solid ${BD}`, borderRadius: 16 }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '78px 20px 20px', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 600, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Top card ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          style={{ ...card, display: 'flex', overflow: 'hidden' }}>

          {/* Loyalty stamps */}
          <div style={{ flex: '0 0 52%', padding: '22px 24px' }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Loyalty Visits</p>
            {totalVisits > 0 && stampsThisCycle === 0 ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div key={i} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, delay: i * 0.06, ease }}
                      style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #C9A84C, #C4956A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(201,168,76,0.4)' }}>
                      <Check size={14} color="#0a0a0a" strokeWidth={2.5} />
                    </motion.div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#C9A84C', marginBottom: 3, fontFamily: 'Jost,sans-serif', fontWeight: 500 }}>Reward unlocked!</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Check Rewards · {totalVisits} visits total</p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const filled = i < stampsThisCycle
                    return (
                      <motion.div key={i} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, delay: i * 0.06, ease }}
                        style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: filled ? 'linear-gradient(135deg, #C9A84C, #C4956A)' : 'transparent', border: filled ? 'none' : '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: filled ? '0 0 12px rgba(201,168,76,0.35)' : 'none' }}>
                        {filled && <Check size={14} color="#0a0a0a" strokeWidth={2.5} />}
                      </motion.div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                  <span className="gold-gradient" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22 }}>{stampsThisCycle}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}> / 5 visits</span>
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  {totalVisits === 0 ? 'Book 5 visits to unlock 30% off' : `${remaining} more to unlock 30% off`}
                </p>
              </>
            )}
          </div>

          <div style={{ width: 1, background: BD, flexShrink: 0, margin: '16px 0' }} />

          {/* Profile */}
          <div style={{ flex: 1, padding: '22px 20px 22px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #C9A84C, #C4956A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Cormorant Garamond", serif', fontSize: 19, color: '#0a0a0a', fontWeight: 500, boxShadow: '0 0 18px rgba(201,168,76,0.35)' }}>
                {initial || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201,168,76,0.45)', color: 'white', fontFamily: '"Cormorant Garamond", serif', fontSize: 19, outline: 'none', flex: 1, minWidth: 0 }} autoFocus />
                    <button onClick={saveName} style={{ background: 'none', border: 'none', color: '#C9A84C', cursor: 'pointer', padding: 2 }}><Check size={13}/></button>
                    <button onClick={() => setEditName(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 2 }}><X size={13}/></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditName(true); setNameInput(profile?.full_name || '') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 21, color: '#f0f0f0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{name}</span>
                    <Edit2 size={11} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  </button>
                )}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
            </div>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 500, color: '#C9A84C', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', padding: '4px 12px', borderRadius: 6, alignSelf: 'flex-start' }}>
              {isAdmin ? 'Admin' : `${totalVisits} visit${totalVisits !== 1 ? 's' : ''} total`}
            </span>
          </div>
        </motion.div>

        {/* ── Stats bar ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.07, ease }}
          style={{ ...card, display: 'flex' }}>
          {[
            { label: 'Upcoming',  value: upcoming },
            { label: 'Cart',      value: cartItems.reduce((s, i) => s + i.quantity, 0) },
            { label: 'Coupons',   value: activeCoupons },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, padding: '16px 0', textAlign: 'center', borderRight: i < 2 ? `1px solid ${BD}` : 'none' }}>
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 32, color: '#f0f0f0', lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.28)' }}>{label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── Tabs + content ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.13, ease }}
          style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => { setTab(t); setApptPage(0); setOrdPage(0) }} style={{ flex: 1, padding: '13px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', transition: 'color 0.2s', fontWeight: tab === t ? 500 : 400, color: tab === t ? '#C9A84C' : 'rgba(255,255,255,0.28)', borderBottom: `2px solid ${tab === t ? '#C9A84C' : 'transparent'}`, marginBottom: -1 }}>
                {t}
                {t === 'Cart' && cartItems.length > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 9, background: 'rgba(201,168,76,0.2)', color: '#C9A84C', padding: '1px 5px', borderRadius: 9999 }}>
                    {cartItems.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}>

                {/* ── Cart ── */}
                {tab === 'Cart' && (
                  <div>
                    {cartItems.length === 0 ? (
                      <EmptyState icon={ShoppingCart} text="Your cart is empty." action="Browse the store" link="/store" />
                    ) : (
                      <>
                        {cartItems.map((item, i) => (
                          <CartItemRow
                            key={item.id}
                            item={item}
                            isLast={i === cartItems.length - 1}
                            onRemove={removeFromCart}
                            onCommit={commitQtyUpdate}
                            onExpired={expireItem}
                            BD={BD}
                          />
                        ))}

                        {/* Cart footer */}
                        <div style={{ padding: '14px 20px', borderTop: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost, sans-serif', marginBottom: 3 }}>Total</p>
                            <p className="font-display" style={{ fontSize: '1.6rem', color: '#C9A84C', lineHeight: 1 }}>€{cartTotal.toFixed(2)}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button onClick={startCartPayment} disabled={payStep === 'loading' || reserving} className="btn-gold" style={{ padding: '10px 22px', fontSize: 11, justifyContent: 'center' }}>
                              {payStep === 'loading'
                                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : 'Pay Online'
                              }
                            </button>
                            <button onClick={reserveInStore} disabled={payStep === 'loading' || reserving}
                              style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.07)', color: (payStep === 'loading' || reserving) ? 'rgba(201,168,76,0.4)' : '#C9A84C', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: (payStep === 'loading' || reserving) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              {reserving
                                ? <div style={{ width: 12, height: 12, border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : 'Pay In Store'
                              }
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Appointments ── */}
                {tab === 'Appointments' && (() => {
                  const totalApptPages = Math.ceil(appointments.length / PER_PAGE)
                  const pageAppts = appointments.slice(apptPage * PER_PAGE, (apptPage + 1) * PER_PAGE)
                  return (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 320 }}>
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} style={{ height: 150, borderRadius: 12, background: S1 }} className="shimmer" />
                      ))
                    ) : appointments.length === 0 ? (
                      <EmptyState icon={Calendar} text="No appointments yet." action="Book your first visit" link="/appointments" />
                    ) : (
                      pageAppts.map(appt => {
                        const s = STATUS_MAP[appt.status] ?? STATUS_MAP.pending
                        const apptDate = format(new Date(appt.date), 'MMM d, yyyy')
                        const isUpcoming = appt.status === 'confirmed' || appt.status === 'pending'
                        return (
                          <div key={appt.id} style={{ borderRadius: 14, border: `1px solid ${isUpcoming ? 'rgba(201,168,76,0.2)' : BD}`, overflow: 'hidden', background: isUpcoming ? 'rgba(201,168,76,0.02)' : 'rgba(255,255,255,0.02)' }}>

                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${BD}`, background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Scissors size={10} color="rgba(255,255,255,0.25)" />
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                                  #{appt.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif' }}>·</span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif' }}>
                                  {appt.created_at ? format(new Date(appt.created_at), 'MMM d, yyyy') : apptDate}
                                </span>
                              </div>
                              <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {s.label}
                              </span>
                            </div>

                            {/* Main content */}
                            <div style={{ padding: '12px 14px' }}>
                              {/* Service + price */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div>
                                  <p style={{ color: '#f0f0f0', fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{appt.services?.name || '—'}</p>
                                  {appt.stylists?.name && (
                                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Jost,sans-serif' }}>
                                      with {appt.stylists.name}
                                      {appt.services?.duration && <span style={{ color: 'rgba(255,255,255,0.18)' }}> · {appt.services.duration} min</span>}
                                    </p>
                                  )}
                                </div>
                                {appt.services?.price && (
                                  <span className="font-display" style={{ color: '#C9A84C', fontSize: '1.1rem', flexShrink: 0 }}>
                                    €{appt.services.price}
                                  </span>
                                )}
                              </div>

                              {/* Date/time pill */}
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${isUpcoming ? 'rgba(201,168,76,0.18)' : BD}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Calendar size={10} color={isUpcoming ? '#C9A84C' : 'rgba(255,255,255,0.25)'} />
                                  <span style={{ fontSize: 11, color: isUpcoming ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontFamily: 'Jost,sans-serif', fontWeight: isUpcoming ? 600 : 400 }}>
                                    {apptDate}
                                  </span>
                                </div>
                                {appt.time && (
                                  <>
                                    <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.1)' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <Clock size={10} color={isUpcoming ? '#C9A84C' : 'rgba(255,255,255,0.25)'} />
                                      <span style={{ fontSize: 11, color: isUpcoming ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontFamily: 'Jost,sans-serif', fontWeight: isUpcoming ? 600 : 400 }}>
                                        {appt.time.slice(0, 5)}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: `1px solid ${BD}`, background: 'rgba(255,255,255,0.01)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: appt.payment_status === 'paid' ? '#34d399' : appt.payment_status === 'pay_in_store' ? '#f59e0b' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.08em' }}>
                                  {appt.payment_status === 'paid' ? 'Paid via Stripe' : appt.payment_status === 'pay_in_store' ? 'Pay in store' : 'No payment on file'}
                                </span>
                              </div>
                              {appt.payment_status === 'paid' && (
                                <button
                                  onClick={() => downloadApptReceipt(appt)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)', color: '#C9A84C', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.14)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.07)'}>
                                  <Download size={10} /> Receipt
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                    </div>
                    <Pager page={apptPage} total={totalApptPages} onChange={setApptPage} />
                  </div>
                  )
                })()}

                {/* ── Orders ── */}
                {tab === 'Orders' && (() => {
                  const totalOrdPages = Math.ceil(orders.length / PER_PAGE)
                  const pageOrders = orders.slice(ordPage * PER_PAGE, (ordPage + 1) * PER_PAGE)
                  return (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300 }}>
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} style={{ height: 140, borderRadius: 12, background: S1 }} className="shimmer" />
                      ))
                    ) : orders.length === 0 ? (
                      <EmptyState icon={Package} text="No orders yet." action="Browse the store" link="/store" />
                    ) : (
                      pageOrders.map(order => {
                        const total = ((parseFloat(order.products?.price) || 0) * order.quantity).toFixed(2)
                        const s = STATUS_MAP[order.status] ?? STATUS_MAP.active
                        return (
                          <div key={order.id} style={{ borderRadius: 14, border: `1px solid ${BD}`, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>

                            {/* Order header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${BD}`, background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Package size={11} color="rgba(255,255,255,0.25)" />
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                                  #{order.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif' }}>·</span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif' }}>
                                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color, fontFamily: 'Jost,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {s.label}
                              </span>
                            </div>

                            {/* Product row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                              <div style={{ width: 52, height: 52, borderRadius: 8, background: '#181818', border: `1px solid ${BD}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {order.products?.image_url
                                  ? <img src={order.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <Package size={18} color="rgba(255,255,255,0.12)" />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: '#e5e5e5', fontSize: 13, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {order.products?.name}
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, fontFamily: 'Jost,sans-serif' }}>
                                  Qty {order.quantity}
                                  {order.products?.price && ` · €${parseFloat(order.products.price).toFixed(2)} each`}
                                </p>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p className="font-display" style={{ color: '#C9A84C', fontSize: '1.1rem', lineHeight: 1 }}>€{total}</p>
                              </div>
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: `1px solid ${BD}`, background: 'rgba(255,255,255,0.01)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: order.payment_status === 'paid' ? '#34d399' : '#f59e0b', flexShrink: 0 }} />
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.08em' }}>
                                    {order.payment_status === 'paid' ? 'Paid via Stripe' : order.payment_status === 'pay_in_store' ? 'Pay in store' : 'Payment pending'}
                                  </span>
                                </div>
                                {order.payment_status === 'pay_in_store' && order.expires_at && order.status === 'active' && (
                                  <span style={{ fontSize: 9, color: 'rgba(245,158,11,0.55)', fontFamily: 'Jost,sans-serif', paddingLeft: 11 }}>
                                    Hold expires {format(new Date(order.expires_at), 'MMM d')}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setReceipt(order)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)', color: '#C9A84C', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.14)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.07)'}>
                                <Receipt size={10} /> Receipt
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                    </div>
                    <Pager page={ordPage} total={totalOrdPages} onChange={setOrdPage} />
                  </div>
                  )
                })()}

                {/* ── Rewards ── */}
                {tab === 'Rewards' && (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => <div key={i} style={{ height: 90, borderRadius: 14, background: S1 }} className="shimmer" />)
                    ) : coupons.length === 0 ? (
                      <EmptyState icon={Star} text="No coupons yet. Complete 5 visits to unlock your 30% reward." />
                    ) : (
                      coupons.map(({ id, coupons: c, used }) => <CouponCard key={id} coupon={c} used={used} />)
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Sign out ── */}
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.2, ease }}
          onClick={handleLogout} disabled={loggingOut}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, border: `1px solid ${BD}`, background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = BD }}>
          {loggingOut ? <svg className="animate-spin" style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : <LogOut size={13} />}
          {loggingOut ? 'Signing out' : 'Sign Out'}
        </motion.button>
      </div>

      {/* ── Receipt modal ── */}
      <AnimatePresence>
        {receipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setReceipt(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

            <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              id="receipt-print-area"
              style={{ width: '100%', maxWidth: 380, background: '#0e0e14', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

              {/* Gold top bar */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #C9A84C, #E8D5A3, #C4956A)' }} />

              <div style={{ padding: '24px 26px 26px' }}>

                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 5 }}>
                    <Scissors size={13} color="#C9A84C" />
                    <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', color: '#f0f0f0', letterSpacing: '0.04em' }}>
                      Hair<span style={{ color: '#C9A84C' }}>Go</span>
                    </span>
                  </div>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif' }}>
                    Premium Hair Studio · Doha, Qatar
                  </p>
                </div>

                {/* Order # + Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', marginBottom: 4 }}>Order</p>
                    <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em' }}>#{receipt.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', marginBottom: 4 }}>Date</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Jost,sans-serif' }}>{format(new Date(receipt.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Customer */}
                <div style={{ marginBottom: 18, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', marginBottom: 4 }}>Customer</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Jost,sans-serif' }}>{profile?.full_name || user?.email}</p>
                </div>

                {/* Items header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif' }}>Item</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif' }}>Amount</span>
                </div>

                {/* Item row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <p style={{ fontSize: 13, color: '#f0f0f0', fontFamily: 'Jost,sans-serif', fontWeight: 500, marginBottom: 3 }}>{receipt.products?.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'Jost,sans-serif' }}>
                      {receipt.quantity} × €{parseFloat(receipt.products?.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, color: '#f0f0f0', fontFamily: 'Jost,sans-serif', fontWeight: 600, flexShrink: 0 }}>
                    €{((parseFloat(receipt.products?.price) || 0) * receipt.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Total</span>
                  <span className="font-display gold-gradient" style={{ fontSize: '1.6rem', lineHeight: 1 }}>
                    €{((parseFloat(receipt.products?.price) || 0) * receipt.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Payment badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', background: receipt.payment_status === 'paid' ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)', borderRadius: 10, border: `1px solid ${receipt.payment_status === 'paid' ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}`, marginBottom: 22 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: receipt.payment_status === 'paid' ? '#34d399' : '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontFamily: 'Jost,sans-serif', color: receipt.payment_status === 'paid' ? '#34d399' : '#f59e0b', fontWeight: 600, letterSpacing: '0.1em' }}>
                    {receipt.payment_status === 'paid' ? 'Paid via Stripe' : receipt.payment_status === 'pay_in_store' ? 'Pay in store' : 'Payment pending'}
                  </span>
                </div>

                <p style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: 'Jost,sans-serif', letterSpacing: '0.14em', marginBottom: 20 }}>
                  Thank you for shopping with HairGo.
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setReceipt(null)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', cursor: 'pointer' }}>
                    Close
                  </button>
                  <button onClick={() => downloadReceipt(receipt)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg, #C9A84C, #C4956A)', border: 'none', color: '#000', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Download size={12} /> Download PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stripe modal ── */}
      {payStep === 'form' && clientSecret && (
        <StripeCheckout
          clientSecret={clientSecret}
          amount={cartTotal.toFixed(2)}
          label={`${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} from HairGo Store`}
          onSuccess={completeCartPayment}
          onCancel={() => { setPayStep(null); setClientSecret(null) }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function CouponCard({ coupon: c, used }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    if (!c?.code || used) return
    navigator.clipboard.writeText(c.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const discountLabel = c?.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c?.discount_value}`
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', opacity: used ? 0.5 : 1, filter: used ? 'grayscale(0.4)' : 'none' }}>
      <div style={{ border: `1px solid ${used ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.25)'}`, borderRadius: 16, display: 'flex', overflow: 'hidden', background: used ? 'rgba(255,255,255,0.02)' : 'rgba(201,168,76,0.03)' }}>
        <div style={{ flexShrink: 0, width: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 8px', background: used ? 'rgba(255,255,255,0.03)' : 'rgba(201,168,76,0.07)', position: 'relative' }}>
          <span className="font-display gold-gradient" style={{ fontSize: '2.2rem', lineHeight: 1, fontWeight: 400, filter: used ? 'grayscale(1)' : 'none' }}>{discountLabel}</span>
          <span style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: used ? 'rgba(255,255,255,0.2)' : 'rgba(201,168,76,0.6)', fontFamily: 'Jost,sans-serif', marginTop: 4 }}>OFF</span>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', zIndex: 2 }} />
          <div style={{ position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', zIndex: 2 }} />
        </div>
        <div style={{ width: 1, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0', position: 'relative' }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ width: 1, height: 5, background: used ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.2)' }} />)}
          <Scissors size={10} style={{ color: used ? 'rgba(255,255,255,0.15)' : 'rgba(201,168,76,0.35)', position: 'absolute', top: '50%', transform: 'translateY(-50%) rotate(90deg)' }} />
        </div>
        <div style={{ flex: 1, padding: '16px 16px 16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, minWidth: 0 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: used ? 'rgba(255,255,255,0.2)' : 'rgba(201,168,76,0.55)', fontFamily: 'Jost,sans-serif' }}>{used ? 'Used reward' : 'Loyalty Reward'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, padding: '7px 12px', borderRadius: 8, minWidth: 0, background: used ? 'rgba(255,255,255,0.03)' : 'rgba(201,168,76,0.07)', border: `1px solid ${used ? 'rgba(255,255,255,0.06)' : 'rgba(201,168,76,0.18)'}` }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 13, letterSpacing: '0.14em', color: used ? 'rgba(255,255,255,0.25)' : '#C9A84C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c?.code}</span>
            </div>
            {!used && (
              <button onClick={copy} style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: 'pointer', background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(201,168,76,0.08)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(201,168,76,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
                {copied ? <CheckCheck size={13} color="#34d399" /> : <Copy size={13} color="#C9A84C" />}
              </button>
            )}
          </div>
          {c?.expiry_date && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif' }}>{used ? 'Expired' : 'Expires'} {format(new Date(c.expiry_date), 'MMM d, yyyy')}</p>}
        </div>
      </div>
      {used && (
        <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%) rotate(-12deg)', border: '2px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '3px 10px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>Used</span>
        </div>
      )}
    </div>
  )
}

function CartItemRow({ item, isLast, onRemove, onCommit, onExpired, BD }) {
  const [qty, setQty]         = useState(item.quantity)
  const committedRef          = useRef(item.quantity) // last qty saved to DB
  const debounceRef           = useRef(null)
  const itemRef               = useRef(item)

  useEffect(() => { itemRef.current = item }, [item])

  // Sync local qty if context changes externally (e.g. expiry revert)
  useEffect(() => {
    if (item.quantity !== committedRef.current) {
      setQty(item.quantity)
      committedRef.current = item.quantity
    }
  }, [item.quantity])

  function change(newQty) {
    if (newQty <= 0) { onRemove(itemRef.current); return }
    setQty(newQty) // instant UI
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onCommit(itemRef.current, committedRef.current, newQty)
      committedRef.current = newQty
    }, 400)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const price = parseFloat(item.products?.price) || 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: isLast ? 'none' : `1px solid ${BD}` }}>
      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#181818', border: `1px solid ${BD}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.products?.image_url
          ? <img src={item.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Package size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#e5e5e5', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
          {item.products?.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Qty stepper */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
            <button
              onClick={() => change(qty - 1)}
              disabled={qty <= 1}
              style={{ width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qty <= 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: qty <= 1 ? 'not-allowed' : 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => { if (qty > 1) e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => e.currentTarget.style.color = qty <= 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)'}>
              <Minus size={10} />
            </button>
            <span style={{ width: 26, textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Jost,sans-serif', userSelect: 'none' }}>
              {qty}
            </span>
            <button
              onClick={() => change(qty + 1)}
              disabled={qty >= (item.products?.stock ?? Infinity)}
              style={{ width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qty >= (item.products?.stock ?? Infinity) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: qty >= (item.products?.stock ?? Infinity) ? 'not-allowed' : 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => { if (qty < (item.products?.stock ?? Infinity)) e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => e.currentTarget.style.color = qty >= (item.products?.stock ?? Infinity) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)'}>
              <Plus size={10} />
            </button>
          </div>
          <span style={{ color: '#C9A84C', fontSize: 13, fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>
            €{(price * qty).toFixed(2)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <Countdown expiresAt={item.expires_at} onExpired={() => onExpired(item)} />
        <button onClick={() => onRemove(item)}
          style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

function Pager({ page, total, onChange }) {
  if (total <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12 }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        ‹
      </button>

      {Array.from({ length: total }).map((_, i) => (
        <button key={i} onClick={() => onChange(i)}
          style={{ width: 30, height: 30, borderRadius: 8, border: i === page ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.08)', background: i === page ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)', color: i === page ? '#C9A84C' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 11, fontFamily: 'Jost,sans-serif', fontWeight: i === page ? 700 : 400, transition: 'all 0.2s' }}>
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total - 1}
        style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page === total - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.45)', cursor: page === total - 1 ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        ›
      </button>
    </div>
  )
}

function EmptyState({ icon: Icon, text, action, link }) {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <Icon size={22} style={{ color: 'rgba(255,255,255,0.12)' }} />
      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textAlign: 'center', maxWidth: 220, lineHeight: 1.6 }}>{text}</p>
      {action && link && (
        <button onClick={() => navigate(link)} style={{ marginTop: 4, padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.07)', color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}
