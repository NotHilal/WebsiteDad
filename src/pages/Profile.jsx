import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Package, Tag, Star, Clock, X, Edit2, Check, LogOut, ShoppingCart, Trash2, Download, Receipt, Scissors, ChevronRight, Minus, Plus, AlertTriangle, RotateCcw } from 'lucide-react'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import StripeCheckout from '../components/payment/StripeCheckout'
import { Copy, CheckCheck } from 'lucide-react'

const TABS = ['Appointments', 'Cart', 'Orders', 'Rewards']

const STATUS_MAP = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  confirmed: { label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  completed: { label: 'Completed', color: 'var(--col-acc)', bg: 'rgba(var(--rgb-acc),0.12)'  },
  active:    { label: 'Awaiting Pickup', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  retrieved: { label: 'Picked Up', color: 'var(--col-acc)', bg: 'rgba(var(--rgb-acc),0.12)'  },
  expired:   { label: 'Expired',   color: 'var(--col-text)', bg: 'rgba(var(--rgb-hi),0.06)' },
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
    <span style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: urgent ? '#f87171' : '#f59e0b', fontWeight: 600 }}>
      {m}:{String(s).padStart(2, '0')}
    </span>
  )
}

const ease = [0.22, 1, 0.36, 1]
const S1 = 'rgba(var(--rgb-hi),0.04)'
const BD = 'rgba(var(--rgb-hi),0.07)'

export default function Profile() {
  const { user, profile, fetchProfile } = useAuth()
  const { cartItems, cartTotal, removeFromCart, commitQtyUpdate, expireItem, clearCart } = useCart()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [tab, setTab]             = useState(() => {
    const t = location.state?.tab
    return TABS.includes(t) ? t : 'Appointments'
  })
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

  // Appointment manage modal state
  const [manageAppt,  setManageAppt]  = useState(null)
  const [cancelling,  setCancelling]  = useState(false)


  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    const [{ data: a }, { data: o }, { data: c }] = await Promise.all([
      supabase.from('appointments').select('*, stylists(id, name, photo_url), services(id, name, price, duration)').eq('user_id', user.id).order('date', { ascending: false }),
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
        body: { type: 'cart', label: `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} from HairGo Store` },
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
      const orderGroupId = crypto.randomUUID()
      for (const item of cartItems) {
        await supabase.from('preorders').insert({
          user_id: user.id, product_id: item.product_id, quantity: item.quantity,
          status: 'active', payment_status: 'pay_in_store', expires_at: expiresAt,
          order_group_id: orderGroupId,
        })
        await supabase.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        })
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
      const orderGroupId = crypto.randomUUID()
      for (const item of cartItems) {
        await supabase.from('preorders').insert({
          user_id: user.id, product_id: item.product_id, quantity: item.quantity,
          status: 'active', payment_intent_id: paymentIntentId, payment_status: 'paid',
          order_group_id: orderGroupId,
        })
        await supabase.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        })
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

  function canManage(appt) {
    if (!['confirmed', 'pending'].includes(appt.status)) return false
    if (appt.payment_status !== 'paid') return false
    const apptTime = new Date(`${appt.date}T${appt.time || '00:00'}`)
    return apptTime - Date.now() > 24 * 60 * 60 * 1000
  }

  function withinWindow(appt) {
    if (!['confirmed', 'pending'].includes(appt.status)) return false
    if (appt.payment_status !== 'paid') return false
    const apptTime = new Date(`${appt.date}T${appt.time || '00:00'}`)
    const diff = apptTime - Date.now()
    return diff > 0 && diff <= 24 * 60 * 60 * 1000
  }

  async function handleCancelAppt() {
    if (!manageAppt || cancelling) return
    setCancelling(true)
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { type: 'appointment', id: manageAppt.id, refundPct: 80 },
      })
      if (error) throw error
      setAppts(prev => prev.map(a => a.id === manageAppt.id
        ? { ...a, status: 'cancelled', payment_status: data?.refunded ? 'refunded' : a.payment_status }
        : a))
      ;(async () => { try { await supabase.from('activity_logs').insert({
        actor_id:   user.id,
        actor_name: profile?.full_name || user.email,
        actor_role: profile?.role || 'user',
        action:     'appointment.cancelled_by_client',
        details: {
          message:        `${profile?.full_name || user.email} cancelled their ${manageAppt.services?.name || 'appointment'} on ${manageAppt.date}${manageAppt.time ? ` at ${manageAppt.time.slice(0, 5)}` : ''} — 80% refund issued`,
          appointment_id: manageAppt.id,
          service:        manageAppt.services?.name,
          stylist:        manageAppt.stylists?.name,
          date:           manageAppt.date,
          time:           manageAppt.time,
          refund_pct:     80,
        },
      }) } catch {} })()
      setManageAppt(null)
      toast.success('Appointment cancelled — 80% refund is on its way.')
    } catch (err) {
      toast.error(err.message || 'Could not cancel appointment')
    } finally {
      setCancelling(false)
    }
  }

  function handleReschedule() {
    if (!manageAppt) return
    const apptId = manageAppt.id
    setManageAppt(null)
    navigate('/appointments', {
      state: { reschedule: { service: manageAppt.services, stylist: manageAppt.stylists, stylist_id: manageAppt.stylist_id, appointmentId: apptId } },
    })
  }

  function downloadReceipt(order) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const W   = doc.internal.pageSize.getWidth()   // 148
    const H   = doc.internal.pageSize.getHeight()  // 210
    const ml  = 14
    const mr  = 14

    // Brand palette
    const steel  = [184, 212, 232]
    const steel2 = [88, 148, 186]
    const gold   = [201, 168, 76]
    const ink    = [14, 18, 32]
    const gray   = [100, 106, 122]
    const lite   = [162, 167, 182]
    const rule   = [220, 226, 238]

    const paid      = order.payment_status === 'paid'
    const inStore   = order.payment_status === 'pay_in_store'
    const total     = ((parseFloat(order.products?.price) || 0) * order.quantity).toFixed(2)
    const unitPrice = parseFloat(order.products?.price || 0).toFixed(2)
    const orderDate = format(new Date(order.created_at), 'MMMM d, yyyy')
    const orderId   = order.id.slice(0, 8).toUpperCase()
    const customer  = profile?.full_name || user?.email || 'Customer'

    // ── Full white page ──
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, 'F')

    // Top steel bar
    doc.setFillColor(...steel); doc.rect(0, 0, W, 3, 'F')
    // Bottom steel bar
    doc.setFillColor(...steel); doc.rect(0, H - 3, W, 3, 'F')

    // ── HEADER ──
    let y = 18

    // Wordmark left
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...ink)
    doc.text('Hair', ml, y)
    doc.setTextColor(...steel2)
    doc.text('Go', ml + doc.getTextWidth('Hair'), y)
    // Underline wordmark
    const wmarkW = doc.getTextWidth('Hair') + doc.getTextWidth('Go')
    doc.setDrawColor(...steel); doc.setLineWidth(0.7); doc.line(ml, y + 2, ml + wmarkW, y + 2)

    // Tagline
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...lite)
    doc.text('PREMIUM HAIR STUDIO  ·  AUCKLAND, NEW ZEALAND', ml, y + 8)

    // RECEIPT label right
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...ink)
    doc.text('RECEIPT', W - mr, y, { align: 'right' })

    // Ref # + date right
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray)
    doc.text(`# ${orderId}`, W - mr, y + 7, { align: 'right' })
    doc.setFontSize(7.5); doc.setTextColor(...lite)
    doc.text(orderDate, W - mr, y + 12.5, { align: 'right' })

    y += 22

    // Full steel rule
    doc.setDrawColor(...steel); doc.setLineWidth(0.6); doc.line(ml, y, W - mr, y)

    y += 10

    // ── BILLED TO ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...steel2)
    doc.text('BILLED TO', ml, y)
    y += 5
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink)
    doc.text(customer, ml, y)
    if (user?.email && profile?.full_name) {
      y += 5
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray)
      doc.text(user.email, ml, y)
    }

    y += 12

    // ── ITEMS TABLE ──
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 6

    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...steel2)
    doc.text('DESCRIPTION', ml, y)
    doc.text('AMOUNT', W - mr, y, { align: 'right' })

    y += 4
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 8

    // Product
    const productName = order.products?.name || 'Product'
    const maxNW = W - ml - mr - 30
    let dispName = productName
    while (doc.getTextWidth(dispName) > maxNW && dispName.length > 4) dispName = dispName.slice(0, -1)
    if (dispName !== productName) dispName += '...'

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...ink)
    doc.text(dispName, ml, y)
    doc.text(`$${total}`, W - mr, y, { align: 'right' })

    y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gray)
    doc.text(`${order.quantity} unit${order.quantity > 1 ? 's' : ''}  ×  $${unitPrice} each`, ml, y)

    y += 12

    // ── TOTALS ──
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 8

    const colL = W / 2 + 8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gray)
    doc.text('Subtotal', colL, y)
    doc.text(`$${total}`, W - mr, y, { align: 'right' })

    y += 8
    doc.setDrawColor(...steel); doc.setLineWidth(0.5); doc.line(colL, y, W - mr, y)
    y += 7

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink)
    doc.text('TOTAL', colL, y)
    doc.setFontSize(18); doc.setTextColor(...gold)
    doc.text(`$${total}`, W - mr, y, { align: 'right' })

    y += 16

    // ── PAYMENT STATUS ──
    if (paid) {
      doc.setFillColor(232, 252, 240); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'F')
      doc.setDrawColor(120, 205, 155); doc.setLineWidth(0.25); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'S')
      doc.setFillColor(34, 197, 94); doc.ellipse(W / 2 - 18, y + 1, 1.6, 1.6, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(20, 115, 58)
      doc.text('Paid via Stripe', W / 2 - 13, y + 1.4)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 180, 130)
      doc.text('·  Payment complete', W / 2 + 16, y + 1.4)
    } else {
      doc.setFillColor(255, 249, 232); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'F')
      doc.setDrawColor(234, 172, 62); doc.setLineWidth(0.25); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'S')
      doc.setFillColor(245, 158, 11); doc.ellipse(W / 2 - 16, y + 1, 1.6, 1.6, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(133, 85, 0)
      doc.text(inStore ? 'Pay in Store' : 'Payment Pending', W / 2 - 11, y + 1.4)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(200, 145, 40)
      doc.text(inStore ? '·  Due at salon' : '·  Awaiting payment', W / 2 + 18, y + 1.4)
    }

    y += 20

    // ── FOOTER ──
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...lite)
    doc.text('Thank you for shopping with HairGo.', W / 2, y, { align: 'center' })
    y += 5
    doc.setFontSize(7); doc.setTextColor(...steel2)
    doc.text('hairgo.co.nz  ·  Auckland, New Zealand', W / 2, y, { align: 'center' })

    doc.save(`HairGo-Receipt-${orderId}.pdf`)
  }

  function downloadApptReceipt(appt) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const W   = doc.internal.pageSize.getWidth()
    const H   = doc.internal.pageSize.getHeight()
    const ml  = 14
    const mr  = 14

    const steel  = [184, 212, 232]
    const steel2 = [88, 148, 186]
    const gold   = [201, 168, 76]
    const ink    = [14, 18, 32]
    const gray   = [100, 106, 122]
    const lite   = [162, 167, 182]
    const rule   = [220, 226, 238]

    const paid        = appt.payment_status === 'paid'
    const inStoreAppt = appt.payment_status === 'pay_in_store'
    const apptId      = appt.id.slice(0, 8).toUpperCase()
    const apptDate    = format(new Date(appt.date), 'MMMM d, yyyy')
    const bookedOn    = appt.created_at ? format(new Date(appt.created_at), 'MMMM d, yyyy') : apptDate
    const price       = parseFloat(appt.services?.price || 0).toFixed(2)
    const timeStr     = appt.time ? appt.time.slice(0, 5) : ''
    const customer    = profile?.full_name || user?.email || 'Customer'

    // ── Full white page ──
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, 'F')
    doc.setFillColor(...steel); doc.rect(0, 0, W, 3, 'F')
    doc.setFillColor(...steel); doc.rect(0, H - 3, W, 3, 'F')

    // ── HEADER ──
    let y = 18

    // Wordmark
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...ink)
    doc.text('Hair', ml, y)
    doc.setTextColor(...steel2)
    doc.text('Go', ml + doc.getTextWidth('Hair'), y)
    const wmarkW = doc.getTextWidth('Hair') + doc.getTextWidth('Go')
    doc.setDrawColor(...steel); doc.setLineWidth(0.7); doc.line(ml, y + 2, ml + wmarkW, y + 2)

    // Tagline
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...lite)
    doc.text('PREMIUM HAIR STUDIO  ·  AUCKLAND, NEW ZEALAND', ml, y + 8)

    // RECEIPT label right
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...ink)
    doc.text('RECEIPT', W - mr, y, { align: 'right' })

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray)
    doc.text(`# ${apptId}`, W - mr, y + 7, { align: 'right' })
    doc.setFontSize(7.5); doc.setTextColor(...lite)
    doc.text(bookedOn, W - mr, y + 12.5, { align: 'right' })

    y += 22

    // Full steel rule
    doc.setDrawColor(...steel); doc.setLineWidth(0.6); doc.line(ml, y, W - mr, y)

    y += 10

    // ── BILLED TO ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...steel2)
    doc.text('BILLED TO', ml, y)
    y += 5
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink)
    doc.text(customer, ml, y)
    if (user?.email && profile?.full_name) {
      y += 5
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray)
      doc.text(user.email, ml, y)
    }

    y += 12

    // ── SERVICE TABLE ──
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 6

    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...steel2)
    doc.text('DESCRIPTION', ml, y); doc.text('AMOUNT', W - mr, y, { align: 'right' })

    y += 4
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 8

    // Service name
    const svcName = appt.services?.name || 'Service'
    const maxSvcW = W - ml - mr - 30
    let svcDisp = svcName
    while (doc.getTextWidth(svcDisp) > maxSvcW && svcDisp.length > 4) svcDisp = svcDisp.slice(0, -1)
    if (svcDisp !== svcName) svcDisp += '...'

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...ink)
    doc.text(svcDisp, ml, y)
    doc.text(`$${price}`, W - mr, y, { align: 'right' })

    y += 6
    const subtitle = [
      appt.stylists?.name ? `with ${appt.stylists.name}` : null,
      appt.services?.duration ? `${appt.services.duration} min` : null,
    ].filter(Boolean).join('  ·  ')
    if (subtitle) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gray)
      doc.text(subtitle, ml, y)
      y += 5
    }

    y += 8

    // ── APPOINTMENT DATE/TIME ──
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 8

    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...steel2)
    doc.text('APPOINTMENT', ml, y)
    y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...ink)
    doc.text(`${apptDate}${timeStr ? '   ·   ' + timeStr : ''}`, ml, y)

    y += 12

    // ── TOTALS ──
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 8

    const colL = W / 2 + 8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gray)
    doc.text('Subtotal', colL, y); doc.text(`$${price}`, W - mr, y, { align: 'right' })

    y += 8
    doc.setDrawColor(...steel); doc.setLineWidth(0.5); doc.line(colL, y, W - mr, y)
    y += 7

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink)
    doc.text('TOTAL', colL, y)
    doc.setFontSize(18); doc.setTextColor(...gold)
    doc.text(`$${price}`, W - mr, y, { align: 'right' })

    y += 16

    // ── PAYMENT STATUS ──
    if (paid) {
      doc.setFillColor(232, 252, 240); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'F')
      doc.setDrawColor(120, 205, 155); doc.setLineWidth(0.25); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'S')
      doc.setFillColor(34, 197, 94); doc.ellipse(W / 2 - 18, y + 1, 1.6, 1.6, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(20, 115, 58)
      doc.text('Paid via Stripe', W / 2 - 13, y + 1.4)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 180, 130)
      doc.text('·  Payment complete', W / 2 + 16, y + 1.4)
    } else {
      doc.setFillColor(255, 249, 232); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'F')
      doc.setDrawColor(234, 172, 62); doc.setLineWidth(0.25); doc.roundedRect(ml, y - 4, W - ml - mr, 11, 3, 3, 'S')
      doc.setFillColor(245, 158, 11); doc.ellipse(W / 2 - 16, y + 1, 1.6, 1.6, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(133, 85, 0)
      doc.text(inStoreAppt ? 'Pay in Store' : 'Payment Pending', W / 2 - 11, y + 1.4)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(200, 145, 40)
      doc.text(inStoreAppt ? '·  Due at salon' : '·  Awaiting payment', W / 2 + 18, y + 1.4)
    }

    y += 20

    // ── FOOTER ──
    doc.setDrawColor(...rule); doc.setLineWidth(0.25); doc.line(ml, y, W - mr, y)
    y += 8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...lite)
    doc.text('Thank you for choosing HairGo. We look forward to seeing you again.', W / 2, y, { align: 'center' })
    y += 5
    doc.setFontSize(7); doc.setTextColor(...steel2)
    doc.text('hairgo.co.nz  ·  Auckland, New Zealand', W / 2, y, { align: 'center' })

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '78px 20px 20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Top card ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="profile-top-card" style={{ ...card, display: 'flex', overflow: 'hidden' }}>

          {/* Loyalty stamps */}
          <div className="profile-loyalty" style={{ flex: '0 0 52%', padding: '22px 24px' }}>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--col-text)', marginBottom: 14 }}>Loyalty Visits</p>
            {totalVisits > 0 && stampsThisCycle === 0 ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div key={i} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, delay: i * 0.06, ease }}
                      style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--col-acc), var(--col-acc2))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(var(--rgb-acc),0.4)' }}>
                      <Check size={14} color="var(--col-bg)" strokeWidth={2.5} />
                    </motion.div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--col-acc)', marginBottom: 3, fontFamily: 'DM Sans,sans-serif', fontWeight: 500 }}>Reward unlocked!</p>
                <p style={{ fontSize: 11, color: 'var(--col-text)' }}>Check Rewards · {totalVisits} visits total</p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const filled = i < stampsThisCycle
                    return (
                      <motion.div key={i} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, delay: i * 0.06, ease }}
                        style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: filled ? 'linear-gradient(135deg, var(--col-acc), var(--col-acc2))' : 'transparent', border: filled ? 'none' : '1.5px solid var(--col-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: filled ? '0 0 12px rgba(var(--rgb-acc),0.35)' : 'none' }}>
                        {filled && <Check size={14} color="var(--col-bg)" strokeWidth={2.5} />}
                      </motion.div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 12, color: 'var(--col-text)', marginBottom: 4 }}>
                  <span className="gold-gradient" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22 }}>{stampsThisCycle}</span>
                  <span style={{ color: 'var(--col-text)' }}> / 5 visits</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--col-text)' }}>
                  {totalVisits === 0 ? 'Book 5 visits to unlock 30% off' : `${remaining} more to unlock 30% off`}
                </p>
              </>
            )}
          </div>

          <div className="profile-divider" style={{ width: 1, background: BD, flexShrink: 0, margin: '16px 0' }} />

          {/* Profile */}
          <div className="profile-info" style={{ flex: 1, padding: '22px 20px 22px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--col-acc), var(--col-acc2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Cormorant Garamond", serif', fontSize: 19, color: 'var(--col-bg)', fontWeight: 500, boxShadow: '0 0 18px rgba(var(--rgb-acc),0.35)' }}>
                {initial || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(var(--rgb-acc),0.45)', color: 'var(--col-text)', fontFamily: '"Cormorant Garamond", serif', fontSize: 19, outline: 'none', flex: 1, minWidth: 0 }} autoFocus />
                    <button onClick={saveName} style={{ background: 'none', border: 'none', color: 'var(--col-acc)', cursor: 'pointer', padding: 2 }}><Check size={13}/></button>
                    <button onClick={() => setEditName(false)} style={{ background: 'none', border: 'none', color: 'var(--col-text)', cursor: 'pointer', padding: 2 }}><X size={13}/></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditName(true); setNameInput(profile?.full_name || '') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 21, color: 'var(--col-text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{name}</span>
                    <Edit2 size={11} style={{ color: 'var(--col-text)', flexShrink: 0 }} />
                  </button>
                )}
                <p style={{ fontSize: 11, color: 'var(--col-text)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
            </div>
            <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 500, color: 'var(--col-bg)', background: 'var(--col-acc)', border: '1px solid rgba(var(--rgb-acc),0.25)', padding: '4px 12px', borderRadius: 6, alignSelf: 'flex-start' }}>
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
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 32, color: 'var(--col-text)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--col-text)' }}>{label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── Tabs + content ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.13, ease }}
          className="profile-tab-panel" style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => { setTab(t); setApptPage(0); setOrdPage(0) }} className="profile-tab-btn" style={{ flex: 1, padding: '13px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', transition: 'color 0.2s', fontWeight: tab === t ? 500 : 400, color: tab === t ? 'var(--col-acc)' : 'var(--col-text)', borderBottom: `2px solid ${tab === t ? 'var(--col-acc)' : 'transparent'}`, marginBottom: -1 }}>
                {t}
                {t === 'Cart' && cartItems.length > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 11, background: 'var(--col-acc)', color: 'var(--col-bg)', padding: '1px 5px', borderRadius: 9999 }}>
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
                            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--col-text)', fontFamily: 'DM Sans, sans-serif', marginBottom: 3 }}>Total</p>
                            <p className="font-display" style={{ fontSize: '1.6rem', color: 'var(--col-acc)', lineHeight: 1 }}>${cartTotal.toFixed(2)}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button onClick={startCartPayment} disabled={payStep === 'loading' || reserving} className="btn-gold" style={{ padding: '10px 22px', fontSize: 11, justifyContent: 'center' }}>
                              {payStep === 'loading'
                                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopcolor: 'var(--col-bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : 'Pay Online'
                              }
                            </button>
                            <button onClick={reserveInStore} disabled={payStep === 'loading' || reserving}
                              style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid rgba(var(--rgb-acc),0.25)', background: 'var(--col-acc)', color: 'var(--col-bg)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: (payStep === 'loading' || reserving) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              {reserving
                                ? <div style={{ width: 12, height: 12, border: '2px solid rgba(var(--rgb-acc),0.3)', borderTopColor: 'var(--col-acc)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
                          <div key={appt.id} style={{ borderRadius: 16, border: `1px solid ${isUpcoming ? 'rgba(var(--rgb-acc),0.28)' : BD}`, overflow: 'hidden', background: 'var(--col-bg)', boxShadow: isUpcoming ? '0 4px 24px rgba(var(--rgb-acc),0.08)' : 'none', display: 'flex', transition: 'box-shadow 0.2s' }}>

                            {/* Left accent bar */}
                            <div style={{ width: 3, flexShrink: 0, background: isUpcoming ? 'linear-gradient(to bottom, var(--col-acc), var(--col-acc2))' : 'transparent' }} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              {/* Header */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 0' }}>
                                <span style={{ fontSize: 11, fontFamily: 'DM Sans,sans-serif', color: 'var(--col-text)', opacity: 0.3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                  #{appt.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  {s.label}
                                </span>
                              </div>

                              {/* Main content */}
                              <div style={{ padding: '10px 14px 12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                  <div style={{ minWidth: 0 }}>
                                    <p className="font-display" style={{ color: 'var(--col-text)', fontSize: '1.15rem', fontWeight: 400, lineHeight: 1.1, marginBottom: 4 }}>{appt.services?.name || '—'}</p>
                                    {appt.stylists?.name && (
                                      <p style={{ color: 'var(--col-text)', opacity: 0.5, fontSize: 11, fontFamily: 'DM Sans,sans-serif' }}>
                                        with {appt.stylists.name}{appt.services?.duration ? ` · ${appt.services.duration} min` : ''}
                                      </p>
                                    )}
                                  </div>
                                  {appt.services?.price && (
                                    <span className="font-display" style={{ color: isUpcoming ? 'var(--col-acc)' : 'var(--col-text)', fontSize: '1.25rem', flexShrink: 0, marginLeft: 10 }}>
                                      ${appt.services.price}
                                    </span>
                                  )}
                                </div>

                                {/* Date/time pill */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: isUpcoming ? 'rgba(var(--rgb-acc),0.07)' : 'rgba(var(--rgb-hi),0.04)', border: `1px solid ${isUpcoming ? 'rgba(var(--rgb-acc),0.2)' : BD}` }}>
                                  <Calendar size={10} color={isUpcoming ? 'var(--col-acc)' : 'var(--col-text)'} />
                                  <span style={{ fontSize: 11, color: isUpcoming ? 'var(--col-acc)' : 'var(--col-text)', fontFamily: 'DM Sans,sans-serif', fontWeight: isUpcoming ? 600 : 400 }}>{apptDate}</span>
                                  {appt.time && (
                                    <>
                                      <div style={{ width: 1, height: 10, background: 'rgba(var(--rgb-hi),0.15)' }} />
                                      <Clock size={10} color={isUpcoming ? 'var(--col-acc)' : 'var(--col-text)'} />
                                      <span style={{ fontSize: 11, color: isUpcoming ? 'var(--col-acc)' : 'var(--col-text)', fontFamily: 'DM Sans,sans-serif', fontWeight: isUpcoming ? 600 : 400 }}>{appt.time.slice(0, 5)}</span>
                                    </>
                                  )}
                                </div>

                                {canManage(appt) && (
                                  <button onClick={() => setManageAppt(appt)}
                                    style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                                    <X size={10} /> Cancel
                                  </button>
                                )}
                                {withinWindow(appt) && (
                                  <button onClick={() => navigate('/chat')}
                                    style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(var(--rgb-hi),0.04)', border: '1px solid rgba(var(--rgb-hi),0.1)', color: 'var(--col-text)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: 500, cursor: 'pointer', opacity: 0.55 }}>
                                    Contact us
                                  </button>
                                )}
                              </div>

                              {/* Footer */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: `1px solid ${BD}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: appt.payment_status === 'paid' ? '#34d399' : appt.payment_status === 'pay_in_store' ? '#f59e0b' : 'rgba(var(--rgb-hi),0.3)' }} />
                                  <span style={{ fontSize: 12, color: 'var(--col-text)', opacity: 0.45, fontFamily: 'DM Sans,sans-serif', letterSpacing: '0.06em' }}>
                                    {appt.payment_status === 'paid' ? 'Paid online' : appt.payment_status === 'pay_in_store' ? 'Pay in store' : 'No payment on file'}
                                  </span>
                                </div>
                                {appt.payment_status === 'paid' && (
                                  <button onClick={() => downloadApptReceipt(appt)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: 'rgba(var(--rgb-acc),0.08)', border: '1px solid rgba(var(--rgb-acc),0.2)', color: 'var(--col-acc)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <Download size={9} /> Receipt
                                  </button>
                                )}
                              </div>
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
                  const groups = Object.values(
                    orders.reduce((acc, o) => {
                      const key = o.order_group_id || o.id
                      if (!acc[key]) acc[key] = []
                      acc[key].push(o)
                      return acc
                    }, {})
                  ).sort((a, b) => new Date(b[0].created_at) - new Date(a[0].created_at))

                  const totalOrdPages = Math.ceil(groups.length / PER_PAGE)
                  const pageGroups = groups.slice(ordPage * PER_PAGE, (ordPage + 1) * PER_PAGE)
                  return (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300 }}>
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} style={{ height: 140, borderRadius: 12, background: S1 }} className="shimmer" />
                      ))
                    ) : groups.length === 0 ? (
                      <EmptyState icon={Package} text="No orders yet." action="Browse the store" link="/store" />
                    ) : (
                      pageGroups.map(group => {
                        const first = group[0]
                        const s = STATUS_MAP[first.status] ?? STATUS_MAP.active
                        const groupTotal = group.reduce((sum, o) => sum + (parseFloat(o.products?.price) || 0) * o.quantity, 0)
                        const groupId = (first.order_group_id || first.id).slice(0, 8).toUpperCase()
                        return (
                          <div key={groupId} style={{ borderRadius: 14, border: `1px solid ${BD}`, overflow: 'hidden', background: 'rgba(var(--rgb-hi),0.02)' }}>

                            {/* Order header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${BD}`, background: 'rgba(var(--rgb-hi),0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Package size={11} color="var(--col-text)" />
                                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--col-text)', letterSpacing: '0.08em' }}>#{groupId}</span>
                                <span style={{ fontSize: 12, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>·</span>
                                <span style={{ fontSize: 12, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>{format(new Date(first.created_at), 'MMM d, yyyy')}</span>
                              </div>
                              <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color, fontFamily: 'DM Sans,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {s.label}
                              </span>
                            </div>

                            {/* Items */}
                            {group.map((order, i) => (
                              <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < group.length - 1 ? `1px solid ${BD}` : 'none' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--col-card)', border: `1px solid ${BD}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {order.products?.image_url
                                    ? <img src={order.products.image_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.3s ease' }} onLoad={e => { e.currentTarget.style.opacity = '1' }} />
                                    : <Package size={16} color="rgba(var(--rgb-hi),0.12)" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ color: 'var(--col-text)', fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {order.products?.name}
                                  </p>
                                  <p style={{ color: 'var(--col-text)', fontSize: 11, fontFamily: 'DM Sans,sans-serif', opacity: 0.5 }}>
                                    Qty {order.quantity}{order.products?.price ? ` · $${parseFloat(order.products.price).toFixed(2)} each` : ''}
                                  </p>
                                </div>
                                <p className="font-display" style={{ color: 'var(--col-acc)', fontSize: '1.05rem', lineHeight: 1, flexShrink: 0 }}>
                                  ${((parseFloat(order.products?.price) || 0) * order.quantity).toFixed(2)}
                                </p>
                              </div>
                            ))}

                            {/* Footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: `1px solid ${BD}`, background: 'rgba(var(--rgb-hi),0.01)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: first.payment_status === 'paid' ? '#34d399' : '#f59e0b', flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif', letterSpacing: '0.08em' }}>
                                    {first.payment_status === 'paid' ? 'Paid via Stripe' : first.payment_status === 'pay_in_store' ? 'Pay in store' : 'Payment pending'}
                                  </span>
                                </div>
                                {first.payment_status === 'pay_in_store' && first.expires_at && first.status === 'active' && (
                                  <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.55)', fontFamily: 'DM Sans,sans-serif', paddingLeft: 11 }}>
                                    Hold expires {format(new Date(first.expires_at), 'MMM d')}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {group.length > 1 && (
                                  <span className="font-display" style={{ color: 'var(--col-acc)', fontSize: '1.1rem' }}>
                                    ${groupTotal.toFixed(2)}
                                  </span>
                                )}
<button onClick={() => setReceipt(first)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'var(--col-acc)', border: '1px solid rgba(var(--rgb-acc),0.18)', color: 'var(--col-bg)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                  <Receipt size={10} /> Receipt
                                </button>
                              </div>
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
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, border: `1px solid ${BD}`, background: 'transparent', color: 'var(--col-text)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--col-text)'; e.currentTarget.style.borderColor = 'var(--col-text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--col-text)'; e.currentTarget.style.borderColor = BD }}>
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
              style={{ width: '100%', maxWidth: 380, background: 'var(--col-modal)', border: '1px solid rgba(var(--rgb-acc),0.18)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

              {/* Gold top bar */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, var(--col-acc), #E8D5A3, var(--col-acc2))' }} />

              <div style={{ padding: '24px 26px 26px' }}>

                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(var(--rgb-hi),0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 5 }}>
                    <Scissors size={13} color="var(--col-acc)" />
                    <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', color: 'var(--col-text)', letterSpacing: '0.04em' }}>
                      Hair<span style={{ color: 'var(--col-acc)' }}>Go</span>
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--col-text)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif' }}>
                    Premium Hair Studio · Auckland, NZ
                  </p>
                </div>

                {/* Order # + Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--col-text)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', marginBottom: 4 }}>Order</p>
                    <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--col-text)', letterSpacing: '0.1em' }}>#{receipt.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: 'var(--col-text)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', marginBottom: 4 }}>Date</p>
                    <p style={{ fontSize: 12, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>{format(new Date(receipt.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Customer */}
                <div style={{ marginBottom: 18, padding: '10px 12px', background: 'rgba(var(--rgb-hi),0.03)', border: '1px solid rgba(var(--rgb-hi),0.06)', borderRadius: 10 }}>
                  <p style={{ fontSize: 11, color: 'var(--col-text)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', marginBottom: 4 }}>Customer</p>
                  <p style={{ fontSize: 12, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>{profile?.full_name || user?.email}</p>
                </div>

                {/* Items header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--col-text)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif' }}>Item</span>
                  <span style={{ fontSize: 11, color: 'var(--col-text)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif' }}>Amount</span>
                </div>

                {/* Item row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid rgba(var(--rgb-hi),0.06)', borderBottom: '1px solid rgba(var(--rgb-hi),0.06)', marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <p style={{ fontSize: 13, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif', fontWeight: 500, marginBottom: 3 }}>{receipt.products?.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>
                      {receipt.quantity} × ${parseFloat(receipt.products?.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, flexShrink: 0 }}>
                    ${((parseFloat(receipt.products?.price) || 0) * receipt.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <span style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', color: 'var(--col-text)', fontWeight: 600 }}>Total</span>
                  <span className="font-display gold-gradient" style={{ fontSize: '1.6rem', lineHeight: 1 }}>
                    ${((parseFloat(receipt.products?.price) || 0) * receipt.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Payment badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', background: receipt.payment_status === 'paid' ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)', borderRadius: 10, border: `1px solid ${receipt.payment_status === 'paid' ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}`, marginBottom: 22 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: receipt.payment_status === 'paid' ? '#34d399' : '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontFamily: 'DM Sans,sans-serif', color: receipt.payment_status === 'paid' ? '#34d399' : '#f59e0b', fontWeight: 600, letterSpacing: '0.1em' }}>
                    {receipt.payment_status === 'paid' ? 'Paid via Stripe' : receipt.payment_status === 'pay_in_store' ? 'Pay in store' : 'Payment pending'}
                  </span>
                </div>

                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif', letterSpacing: '0.14em', marginBottom: 20 }}>
                  Thank you for shopping with HairGo.
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setReceipt(null)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(var(--rgb-hi),0.04)', border: '1px solid rgba(var(--rgb-hi),0.08)', color: 'var(--col-text)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
                    Close
                  </button>
                  <button onClick={() => downloadReceipt(receipt)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg, var(--col-acc), var(--col-acc2))', border: 'none', color: 'var(--col-bg)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Sans,sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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

      {/* ── Manage appointment modal ── */}
      <AnimatePresence>
        {manageAppt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => !cancelling && setManageAppt(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }}
              style={{ background: 'var(--col-modal)', borderRadius: 20, padding: 24, maxWidth: 380, width: '100%', position: 'relative' }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => !cancelling && setManageAppt(null)}
                style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 8, background: 'rgba(var(--rgb-hi),0.06)', border: '1px solid rgba(var(--rgb-hi),0.1)', color: 'var(--col-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>

              <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--col-acc)', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, marginBottom: 4 }}>Manage Appointment</p>
              <p className="font-display" style={{ fontSize: '1.3rem', color: 'var(--col-text)', marginBottom: 16 }}>{manageAppt.services?.name || '—'}</p>

              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(var(--rgb-hi),0.04)', border: '1px solid rgba(var(--rgb-hi),0.07)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {manageAppt.stylists?.name && (
                  <span style={{ fontSize: 12, color: 'var(--col-text)', opacity: 0.6, fontFamily: 'DM Sans,sans-serif' }}>with {manageAppt.stylists.name}</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={11} color="var(--col-acc)" />
                  <span style={{ fontSize: 12, color: 'var(--col-text)', fontFamily: 'DM Sans,sans-serif' }}>
                    {format(new Date(manageAppt.date), 'MMM d, yyyy')}{manageAppt.time ? ` at ${manageAppt.time.slice(0, 5)}` : ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <button onClick={handleReschedule} disabled={cancelling}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(var(--rgb-acc),0.07)', border: '1px solid rgba(var(--rgb-acc),0.2)', cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.7 : 1, transition: 'all 0.2s', width: '100%', textAlign: 'left' }}>
                  <RotateCcw size={16} color="var(--col-acc)" style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--col-acc)', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, margin: 0 }}>Reschedule</p>
                    <p style={{ fontSize: 11, color: 'var(--col-text)', opacity: 0.5, fontFamily: 'DM Sans,sans-serif', margin: '2px 0 0' }}>Pick a new date & time</p>
                  </div>
                </button>

                <button onClick={handleCancelAppt} disabled={cancelling}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.7 : 1, transition: 'all 0.2s', width: '100%', textAlign: 'left' }}>
                  <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, color: '#f87171', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, margin: 0 }}>Cancel</p>
                    <p style={{ fontSize: 11, color: 'var(--col-text)', opacity: 0.5, fontFamily: 'DM Sans,sans-serif', margin: '2px 0 0' }}>80% refund · Cannot be undone</p>
                  </div>
                </button>
              </div>

              <p style={{ fontSize: 11, color: 'var(--col-text)', opacity: 0.35, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                Appointments within 24 hours cannot be managed online. Contact us directly.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .profile-top-card { flex-direction: column !important; }
          .profile-loyalty {
            flex: unset !important;
            padding: 18px 18px 16px !important;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }
          .profile-divider { display: none !important; }
          .profile-info {
            flex: unset !important;
            padding: 16px 18px 18px !important;
          }
          .profile-tab-panel { min-height: 320px; }
          .profile-tab-btn {
            padding: 11px 2px !important;
            font-size: 11px !important;
            letter-spacing: 0.08em !important;
          }
        }
      `}</style>
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
  const discountLabel = c?.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c?.discount_value}`
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', opacity: used ? 0.55 : 1 }}>
      <div style={{ border: `1px solid ${used ? 'rgba(255,255,255,0.06)' : 'rgba(184,212,232,0.3)'}`, borderRadius: 16, display: 'flex', overflow: 'hidden', background: '#111116' }}>

        {/* Left: discount badge */}
        <div style={{ flexShrink: 0, width: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 8px', background: used ? 'rgba(255,255,255,0.02)' : 'linear-gradient(160deg, #3D5A73 0%, #B8D4E8 100%)', position: 'relative' }}>
          <span className="font-display" style={{ fontSize: '2.2rem', lineHeight: 1, fontWeight: 400, color: '#fff' }}>{discountLabel}</span>
          <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontFamily: 'DM Sans,sans-serif', marginTop: 4 }}>OFF</span>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#111116', zIndex: 2 }} />
          <div style={{ position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#111116', zIndex: 2 }} />
        </div>

        {/* Perforated divider */}
        <div style={{ width: 1, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0', position: 'relative' }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ width: 1, height: 5, background: 'rgba(255,255,255,0.1)' }} />)}
          <Scissors size={10} style={{ color: 'rgba(255,255,255,0.22)', position: 'absolute', top: '50%', transform: 'translateY(-50%) rotate(90deg)' }} />
        </div>

        {/* Right: code + info */}
        <div style={{ flex: 1, padding: '16px 16px 16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, minWidth: 0 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: used ? 'rgba(255,255,255,0.25)' : '#B8D4E8', fontFamily: 'DM Sans,sans-serif', margin: 0 }}>{used ? 'Used reward' : 'Loyalty Reward'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, padding: '7px 12px', borderRadius: 8, minWidth: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 13, letterSpacing: '0.14em', color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c?.code}</span>
            </div>
            {!used && (
              <button onClick={copy} style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: 'pointer', background: copied ? 'rgba(52,211,153,0.12)' : '#B8D4E8', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(184,212,232,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
                {copied ? <CheckCheck size={13} color="#34d399" /> : <Copy size={13} color="#0a0a0a" />}
              </button>
            )}
          </div>
          {c?.expiry_date && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans,sans-serif', margin: 0 }}>{used ? 'Expired' : 'Expires'} {format(new Date(c.expiry_date), 'MMM d, yyyy')}</p>}
        </div>
      </div>
      {used && (
        <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%) rotate(-12deg)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '3px 10px' }}>
          <span style={{ fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans,sans-serif', fontWeight: 600 }}>Used</span>
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
      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--col-card)', border: `1px solid ${BD}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.products?.image_url
          ? <img src={item.products.image_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.3s ease' }} onLoad={e => { e.currentTarget.style.opacity = '1' }} />
          : <Package size={16} style={{ color: 'var(--col-text)' }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--col-text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
          {item.products?.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Qty stepper */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(var(--rgb-hi),0.05)', border: '1px solid rgba(var(--rgb-hi),0.1)', borderRadius: 8 }}>
            <button
              onClick={() => change(qty - 1)}
              disabled={qty <= 1}
              style={{ width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qty <= 1 ? 'var(--col-text)' : 'var(--col-text)', background: 'none', border: 'none', cursor: qty <= 1 ? 'not-allowed' : 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => { if (qty > 1) e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => e.currentTarget.style.color = qty <= 1 ? 'var(--col-text)' : 'var(--col-text)'}>
              <Minus size={10} />
            </button>
            <span style={{ width: 26, textAlign: 'center', color: 'var(--col-text)', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', userSelect: 'none' }}>
              {qty}
            </span>
            <button
              onClick={() => change(qty + 1)}
              disabled={qty >= (item.products?.stock ?? Infinity)}
              style={{ width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qty >= (item.products?.stock ?? Infinity) ? 'var(--col-text)' : 'var(--col-text)', background: 'none', border: 'none', cursor: qty >= (item.products?.stock ?? Infinity) ? 'not-allowed' : 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => { if (qty < (item.products?.stock ?? Infinity)) e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => e.currentTarget.style.color = qty >= (item.products?.stock ?? Infinity) ? 'var(--col-text)' : 'var(--col-text)'}>
              <Plus size={10} />
            </button>
          </div>
          <span style={{ color: 'var(--col-acc)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', fontWeight: 600 }}>
            ${(price * qty).toFixed(2)}
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
        style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(var(--rgb-hi),0.04)', border: '1px solid rgba(var(--rgb-hi),0.08)', color: page === 0 ? 'var(--col-text)' : 'var(--col-text)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        ‹
      </button>

      {Array.from({ length: total }).map((_, i) => (
        <button key={i} onClick={() => onChange(i)}
          style={{ width: 30, height: 30, borderRadius: 8, border: i === page ? '1px solid rgba(var(--rgb-acc),0.4)' : '1px solid rgba(var(--rgb-hi),0.08)', background: i === page ? 'var(--col-acc)' : 'rgba(var(--rgb-hi),0.04)', color: i === page ? 'var(--col-bg)' : 'var(--col-text)', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans,sans-serif', fontWeight: i === page ? 700 : 400, transition: 'all 0.2s' }}>
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total - 1}
        style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(var(--rgb-hi),0.04)', border: '1px solid rgba(var(--rgb-hi),0.08)', color: page === total - 1 ? 'var(--col-text)' : 'var(--col-text)', cursor: page === total - 1 ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        ›
      </button>
    </div>
  )
}

function EmptyState({ icon: Icon, text, action, link }) {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <Icon size={22} style={{ color: 'var(--col-text)' }} />
      <p style={{ color: 'var(--col-text)', fontSize: 13, textAlign: 'center', maxWidth: 220, lineHeight: 1.6 }}>{text}</p>
      {action && link && (
        <button onClick={() => navigate(link)} style={{ marginTop: 4, padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(var(--rgb-acc),0.25)', background: 'var(--col-acc)', color: 'var(--col-bg)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}
