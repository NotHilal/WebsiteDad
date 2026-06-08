import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronLeft, ChevronRight, Check, User, ArrowRight, Sparkles, Calendar, Scissors, Star, X, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getOrFetch } from '../lib/cache'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay, getHours
} from 'date-fns'
import toast from 'react-hot-toast'
import StripeCheckout from '../components/payment/StripeCheckout'

function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h)      return `${h}h`
  return `${m}m`
}

// Returns true if booking `slot` for `durationMins` would overlap any blocked hour
function slotOverlapsBlocked(slot, durationMins, blockedSlots) {
  const [sh, sm] = slot.split(':').map(Number)
  const slotStart = sh * 60 + sm
  const slotEnd   = slotStart + durationMins
  return blockedSlots.some(bh => {
    const [bh_h, bh_m] = bh.split(':').map(Number)
    const blockedMin = bh_h * 60 + bh_m
    return blockedMin >= slotStart && blockedMin < slotEnd
  })
}

const STEPS = ['Service', 'Stylist', 'Date & Time', 'Confirm']
const SLOTS = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']

const slide = {
  initial: { opacity:0, x:24 },
  animate: { opacity:1, x:0, transition:{ duration:0.45, ease:[0.22,1,0.36,1] } },
  exit:    { opacity:0, x:-16, transition:{ duration:0.2 } },
}

export default function Appointments() {
  const { user, profile } = useAuth()
  const [step,     setStep]     = useState(0)
  const [services, setServices] = useState([])
  const [stylists, setStylists] = useState([])
  const [blocked,  setBlocked]  = useState([])
  const [taken,       setTaken]       = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [month,    setMonth]    = useState(new Date())
  const [saving,       setSaving]       = useState(false)
  const [done,         setDone]         = useState(false)
  const [sel,          setSel]          = useState({ service:null, stylist:null, date:null, time:null, notes:'' })
  const [preview,      setPreview]      = useState(null)
  const [payStep,      setPayStep]      = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [appliedCoupon,    setAppliedCoupon]    = useState(null)
  const [stylistDayOffs,   setStylistDayOffs]   = useState([])

  useEffect(() => {
    const TTL = 5 * 60_000
    Promise.all([
      getOrFetch('services_all', async () => {
        const { data } = await supabase.from('services').select('*').order('category')
        return data || []
      }, TTL),
      getOrFetch('stylists_all', async () => {
        const { data } = await supabase.from('stylists').select('*').not('profile_id', 'is', null).order('display_order')
        return data || []
      }, TTL),
      getOrFetch('blocked_dates', async () => {
        const { data } = await supabase.from('blocked_dates').select('date').is('stylist_id', null).eq('status', 'approved')
        return (data || []).map(b => b.date)
      }, 2 * 60_000),
    ]).then(([svc, sty, blk]) => {
      setServices(svc)
      setStylists(sty)
      setBlocked(blk)
    })
  }, [])

  useEffect(() => {
    if (!sel.stylist) { setStylistDayOffs([]); return }
    supabase
      .from('blocked_dates')
      .select('date')
      .eq('stylist_id', sel.stylist.id)
      .eq('status', 'approved')
      .then(({ data }) => setStylistDayOffs((data || []).map(d => d.date)))
  }, [sel.stylist?.id])

  useEffect(() => {
    if (!sel.date || !sel.stylist) return
    const dateStr = format(sel.date, 'yyyy-MM-dd')
    if (stylistDayOffs.includes(dateStr)) { setTaken([...SLOTS]); setBlockedSlots([]); return }
    Promise.all([
      supabase.from('appointments').select('time, services(duration)').eq('stylist_id', sel.stylist.id).eq('date', dateStr).neq('status', 'cancelled'),
      supabase.from('blocked_hours').select('hour').eq('date', dateStr).or(`stylist_id.eq.${sel.stylist.id},stylist_id.is.null`),
    ]).then(([{ data: appts }, { data: hours }]) => {
      const selectedDur = sel.service?.duration || 60
      const takenSet = new Set()

      for (const appt of (appts || [])) {
        const [h, m] = appt.time.slice(0, 5).split(':').map(Number)
        const apptStart = h * 60 + m
        const apptDur = appt.services?.duration || 60
        const apptEnd = apptStart + apptDur

        for (const slot of SLOTS) {
          const [sh, sm] = slot.split(':').map(Number)
          const slotMin = sh * 60 + sm
          const slotEnd = slotMin + selectedDur

          // Block if slot falls inside an existing appointment's range
          if (slotMin >= apptStart && slotMin < apptEnd) takenSet.add(slot)
          // Block if booking selected service here would overlap an existing appointment
          if (slotMin < apptStart && slotEnd > apptStart) takenSet.add(slot)
        }
      }

      setTaken([...takenSet])
      setBlockedSlots((hours || []).map(h => h.hour))
    })
  }, [sel.date, sel.stylist, sel.service, stylistDayOffs])

  /* scroll to top on every step change */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  /* fetch user's unused coupons when reaching confirm step */
  useEffect(() => {
    if (step !== 3 || !user) return
    setAppliedCoupon(null)
    supabase
      .from('user_coupons')
      .select('id, used, coupons(id, code, discount_type, discount_value, expiry_date, active)')
      .eq('user_id', user.id)
      .eq('used', false)
      .then(({ data }) => {
        const now = new Date()
        const valid = (data || []).filter(uc => {
          const c = uc.coupons
          if (!c || !c.active) return false
          if (c.expiry_date && new Date(c.expiry_date) < now) return false
          return true
        })
        setAvailableCoupons(valid)
      })
  }, [step, user])

  const days     = eachDayOfInterval({ start:startOfMonth(month), end:endOfMonth(month) })
  const startPad = getDay(startOfMonth(month))
  const isOff    = d => isBefore(d, startOfDay(new Date())) || getDay(d)===0 || blocked.includes(format(d,'yyyy-MM-dd')) || (sel.stylist && stylistDayOffs.includes(format(d,'yyyy-MM-dd')))

  const basePrice  = parseFloat(sel.service?.price || 0)
  const finalPrice = appliedCoupon
    ? appliedCoupon.coupons.discount_type === 'percentage'
      ? Math.max(0, basePrice * (1 - appliedCoupon.coupons.discount_value / 100))
      : Math.max(0, basePrice - appliedCoupon.coupons.discount_value)
    : basePrice

  async function startPayment() {
    if (!user) return toast.error('Please sign in to book')
    setPayStep('loading')
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: finalPrice.toFixed(2),
          label: `${sel.service.name} with ${sel.stylist.name} — ${format(sel.date, 'MMM d')} at ${sel.time}`,
        },
      })
      if (error) throw error
      setClientSecret(data.client_secret)
      setPayStep('form')
    } catch (err) {
      toast.error(err.message || 'Could not start payment')
      setPayStep(null)
    }
  }

  async function completeBooking(paymentIntentId) {
    setSaving(true)
    try {
      const { error } = await supabase.from('appointments').insert({
        user_id: user.id, stylist_id: sel.stylist.id, service_id: sel.service.id,
        date: format(sel.date, 'yyyy-MM-dd'), time: sel.time, notes: sel.notes,
        status: 'confirmed', payment_intent_id: paymentIntentId, payment_status: 'paid',
      })
      if (error) throw error
      if (appliedCoupon) {
        await supabase.from('user_coupons').update({ used: true }).eq('id', appliedCoupon.id)
      }
      setDone(true)
    } catch (err) {
      toast.error('Payment succeeded but booking failed — please contact us')
    } finally {
      setSaving(false)
    }
  }

  /* ── Success ── */
  if (done) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
      <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:600, background:'radial-gradient(circle, rgba(201,168,76,0.09) 0%, transparent 65%)', pointerEvents:'none' }} />
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', damping:22 }}
        style={{ textAlign:'center', maxWidth:480, position:'relative' }}>
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', damping:14, delay:0.15 }}
          style={{ width:112, height:112, borderRadius:'50%', background:'linear-gradient(135deg,#C9A84C,#C4956A)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 2.5rem', boxShadow:'0 24px 80px rgba(201,168,76,0.5), 0 0 0 20px rgba(201,168,76,0.07)' }}>
          <Check size={48} color="#000" strokeWidth={2.5}/>
        </motion.div>
        <h2 className="font-display font-light" style={{ fontSize:'clamp(2.5rem,5vw,4.5rem)', color:'#fff', marginBottom:'1rem', lineHeight:1 }}>
          You're <span className="gold-gradient" style={{ fontStyle:'italic' }}>booked!</span>
        </h2>
        <div className="gold-bar"/>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.9rem', lineHeight:1.9, margin:'1.5rem auto 2rem' }}>
          <strong style={{ color:'#fff' }}>{format(sel.date,'MMMM d, yyyy')}</strong> at <strong style={{ color:'#fff' }}>{sel.time}</strong> · <strong style={{ color:'#fff' }}>{sel.stylist?.name}</strong>
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8, marginBottom:'2.5rem' }}>
          {[sel.service?.name, `€${sel.service?.price}`, sel.service?.duration ? fmtDur(sel.service.duration) : null].filter(Boolean).map((l,i)=>(
            <span key={i} style={{ padding:'6px 16px', borderRadius:9999, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.18)', fontSize:11, color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{l}</span>
          ))}
        </div>
        <button className="btn-gold" onClick={() => { setDone(false); setStep(0); setSel({ service:null, stylist:null, date:null, time:null, notes:'' }); setPayStep(null); setClientSecret(null) }}>
          Book Another <ArrowRight size={15}/>
        </button>
      </motion.div>
    </div>
  )

  /* ── Main layout ── */
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', paddingBottom:(sel.service||sel.stylist||sel.date)?88:0 }}>

      {/* ── Mobile step bar (shown only when sidebar is hidden) ── */}
      <div className="appt-mobile-steps" style={{ display:'none', padding:'1rem 1.25rem 0.75rem', borderBottom:'1px solid rgba(201,168,76,0.1)', background:'#0a0a12', position:'sticky', top:58, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0 }}>
          {STEPS.map((s, i) => {
            const isActive = i===step, isDone = i<step
            return (
              <div key={s} style={{ display:'flex', alignItems:'center' }}>
                <div onClick={() => isDone && setStep(i)}
                  style={{ display:'flex', alignItems:'center', gap:6, cursor:isDone?'pointer':'default' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:isActive?'linear-gradient(135deg,#C9A84C,#C4956A)':isDone?'rgba(201,168,76,0.12)':'rgba(255,255,255,0.05)', border:isActive?'none':isDone?'1px solid rgba(201,168,76,0.35)':'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .3s', boxShadow:isActive?'0 4px 14px rgba(201,168,76,0.45)':'none' }}>
                    {isDone ? <Check size={10} color="#C9A84C"/> : <span style={{ fontSize:10, fontWeight:600, color:isActive?'#000':'rgba(255,255,255,0.25)', fontFamily:'Jost,sans-serif' }}>{i+1}</span>}
                  </div>
                  <span style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', color:isActive?'#fff':isDone?'rgba(201,168,76,0.55)':'rgba(255,255,255,0.2)', fontWeight:isActive?600:300 }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ width:20, height:1, background:isDone?'rgba(201,168,76,0.3)':'rgba(255,255,255,0.07)', margin:'0 6px', flexShrink:0 }} />}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex', flex:1 }}>

      {/* ── LEFT STEP PANEL ── */}
      <div className="appt-step-panel" style={{
        width:300, flexShrink:0, position:'sticky', top:68,
        height:'calc(100vh - 68px)', overflowY:'auto',
        background:'#0a0a12', borderRight:'1px solid rgba(201,168,76,0.14)',
        display:'flex', flexDirection:'column', padding:'3rem 2rem', zIndex:10,
      }}>
        {/* Top ambient glow */}
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:360, height:240, background:'radial-gradient(ellipse, rgba(201,168,76,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Brand */}
        <div style={{ marginBottom:'3rem', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#C9A84C,#C4956A)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(201,168,76,0.38)', flexShrink:0 }}>
              <Scissors size={13} color="#000" style={{ transform:'rotate(45deg)' }}/>
            </div>
            <div>
              <span className="font-display" style={{ fontSize:'1.4rem', color:'#fff', lineHeight:1 }}>Hair<span style={{ color:'#C9A84C' }}>Go</span></span>
              <span style={{ display:'block', fontSize:8, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', fontFamily:'Jost,sans-serif', marginTop:3 }}>Book your appointment</span>
            </div>
          </div>
          <div style={{ height:1, background:'linear-gradient(90deg,rgba(201,168,76,0.2),transparent)', marginTop:6 }} />
        </div>

        {/* Steps */}
        <div style={{ position:'relative', marginBottom:'2rem' }}>
          <div style={{ position:'absolute', left:15, top:26, height:'calc(100% - 52px)', width:1, background:'linear-gradient(to bottom,rgba(201,168,76,0.22),rgba(255,255,255,0.04))' }} />
          {STEPS.map((s, i) => {
            const isActive = i===step, isDone = i<step
            return (
              <div key={s} onClick={() => isDone && setStep(i)}
                style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'0.85rem 0', cursor:isDone?'pointer':'default', position:'relative', zIndex:1 }}>
                <div style={{
                  width:32, height:32, borderRadius:'50%', flexShrink:0, marginTop:1,
                  background: isActive ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : isDone ? 'rgba(201,168,76,0.12)' : '#0a0a12',
                  border: isActive ? 'none' : isDone ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: isActive ? '0 6px 24px rgba(201,168,76,0.5)' : 'none',
                  transition:'all 0.4s ease',
                }}>
                  {isDone ? <Check size={13} color="#C9A84C"/> : <span style={{ fontSize:12, fontWeight:600, color:isActive?'#000':'rgba(255,255,255,0.22)', fontFamily:'Jost,sans-serif' }}>{i+1}</span>}
                </div>
                <div style={{ paddingTop:3 }}>
                  <span style={{ fontSize:11, letterSpacing:'0.16em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', color:isActive?'#fff':isDone?'rgba(201,168,76,0.65)':'rgba(255,255,255,0.22)', fontWeight:isActive?600:300, transition:'color 0.3s', display:'block' }}>{s}</span>
                  {isDone && (
                    <span style={{ fontSize:10, color:'rgba(201,168,76,0.45)', fontFamily:'Jost,sans-serif', marginTop:3, display:'block', lineHeight:1 }}>
                      {i===0 && sel.service?.name}
                      {i===1 && sel.stylist?.name}
                      {i===2 && sel.date && format(sel.date,'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ height:1, background:'linear-gradient(90deg,rgba(201,168,76,0.15),transparent)', marginBottom:'1.75rem' }} />

        {/* Live summary */}
        <div style={{ flex:1 }}>
          <p style={{ fontSize:8, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', fontFamily:'Jost,sans-serif', marginBottom:'1.25rem' }}>Your selection</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
            {[
              { label:'Service', value:sel.service?.name, sub:sel.service?.price?`€${sel.service.price}`:null },
              { label:'Stylist', value:sel.stylist?.name },
              { label:'Date',    value:sel.date?format(sel.date,'MMM d, yyyy'):null },
              { label:'Time',    value:sel.time },
            ].map(({ label, value, sub }) => (
              <div key={label}>
                <p style={{ fontSize:8, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', fontFamily:'Jost,sans-serif', marginBottom:5 }}>{label}</p>
                {value
                  ? <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.72)', fontFamily:'Jost,sans-serif', lineHeight:1.3 }}>{value}</p>
                      {sub && <span style={{ fontSize:11, color:'#C9A84C', fontFamily:'Jost,sans-serif', fontWeight:500 }}>{sub}</span>}
                    </div>
                  : <div style={{ height:1, width:24, background:'rgba(255,255,255,0.1)', marginTop:6 }} />
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CENTER CONTENT ── */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ maxWidth:720, margin:'0 auto', padding:'3.5rem 2rem' }} className="appt-content-wrap">
          <AnimatePresence mode="wait">

            {/* ── STEP 0: Service ── */}
            {step===0 && (
              <motion.div key="s0" {...slide}>
                <div style={{ textAlign:'center', marginBottom:36 }}>
                  <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.2rem,4vw,3.4rem)', marginBottom:8, lineHeight:1.05 }}>
                    What would you like<br/>
                    <span className="gold-gradient" style={{ fontStyle:'italic' }}>today?</span>
                  </h1>
                  <p style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif' }}>
                    Tap a card to book instantly · use <Info size={11} style={{ display:'inline', verticalAlign:'middle' }}/> for details
                  </p>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px, 1fr))', gap:'1.25rem' }}>
                  {(services.length ? services : Array.from({length:6},(_,i)=>({id:i,name:'',price:'',duration:0,category:''}))).map((svc) => {
                    const isActive = sel.service?.id === svc.id
                    return (
                      <div key={svc.id} className="appt-svc-card"
                        onClick={() => { setSel(p=>({...p,service:svc})); setStep(1) }}
                        style={{ height:260, borderRadius:18, overflow:'hidden', position:'relative', cursor:'pointer',
                                 border: isActive ? '2px solid rgba(201,168,76,0.7)' : '1px solid rgba(255,255,255,0.06)',
                                 boxShadow: isActive ? '0 0 0 4px rgba(201,168,76,0.12),0 16px 48px rgba(0,0,0,0.5)' : '0 6px 24px rgba(0,0,0,0.35)',
                                 transition:'all 0.35s cubic-bezier(0.22,1,0.36,1)' }}>

                        <div style={{ position:'absolute', inset:0 }}>
                          {svc.image_url
                            ? <img src={svc.image_url} alt={svc.name} className="appt-svc-img" loading="lazy" decoding="async"
                                style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
                            : <div style={{ width:'100%', height:'100%', background:'radial-gradient(ellipse at 25% 30%, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.04) 50%, #0d0d14 100%)' }}>
                                {svc.name && <span className="font-display" style={{ position:'absolute', bottom:-10, right:14, fontSize:'8rem', color:'rgba(201,168,76,0.07)', lineHeight:1, userSelect:'none' }}>{svc.name.charAt(0)}</span>}
                              </div>
                          }
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,rgba(6,6,10,0.55) 45%,rgba(6,6,10,0.98) 100%)' }} />
                          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,rgba(201,168,76,${isActive?'0.9':'0.4'}),transparent)` }} />
                        </div>

                        {svc.category && (
                          <div style={{ position:'absolute', top:12, left:12, zIndex:2 }}>
                            <span style={{ fontSize:9, padding:'4px 10px', borderRadius:20, background:'rgba(0,0,0,0.58)', backdropFilter:'blur(8px)', color:'rgba(255,255,255,0.55)', fontFamily:'Jost,sans-serif', fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', border:'1px solid rgba(255,255,255,0.1)' }}>
                              {svc.category}
                            </span>
                          </div>
                        )}

                        <button onClick={e => { e.stopPropagation(); setPreview(svc) }}
                          className="appt-info-btn"
                          style={{ position:'absolute', top:10, right:isActive?48:10, zIndex:3, width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0 }}>
                          <Info size={12}/>
                        </button>

                        {isActive && (
                          <div style={{ position:'absolute', top:10, right:10, zIndex:3, width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#C9A84C,#C4956A)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(201,168,76,0.5)' }}>
                            <Check size={14} color="#000" strokeWidth={2.5}/>
                          </div>
                        )}

                        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'1.25rem 1.4rem 1.3rem', zIndex:2 }}>
                          <div style={{ height:1, background:`linear-gradient(90deg,rgba(201,168,76,${isActive?'0.5':'0.22'}),transparent)`, marginBottom:'0.7rem' }} />
                          <h3 className="font-display" style={{ fontSize:'1.5rem', color:'#fff', lineHeight:1.1, marginBottom:'0.6rem', fontWeight:400 }}>{svc.name}</h3>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            {svc.price && <span className="font-display" style={{ fontSize:'1.8rem', color:'#C9A84C', lineHeight:1, textShadow:isActive?'0 0 28px rgba(201,168,76,0.5)':'none' }}>€{svc.price}</span>}
                            {svc.duration>0 && (
                              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.1)' }}>
                                <Clock size={9} color="rgba(255,255,255,0.4)" strokeWidth={1.5}/>
                                <span style={{ fontSize:10, color:'rgba(255,255,255,0.55)', fontFamily:'Jost,sans-serif', fontWeight:600 }}>{fmtDur(svc.duration)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Service detail modal */}
                <AnimatePresence>
                  {preview && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}
                      onClick={() => setPreview(null)}>
                      <motion.div
                        initial={{ opacity:0, scale:0.93, y:16 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.93, y:8 }}
                        transition={{ type:'spring', damping:26, stiffness:340 }}
                        onClick={e => e.stopPropagation()}
                        style={{ width:'100%', maxWidth:460, background:'#0e0e14', border:'1px solid rgba(201,168,76,0.15)', borderRadius:22, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.7)' }}>

                        {preview.image_url ? (
                          <div style={{ height:200, position:'relative', overflow:'hidden' }}>
                            <img src={preview.image_url} alt={preview.name} loading="lazy" decoding="async" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 30%,rgba(14,14,20,0.95) 100%)' }}/>
                            <button onClick={() => setPreview(null)} style={{ position:'absolute', top:12, right:12, width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} className="preview-close"><X size={14}/></button>
                            <div style={{ position:'absolute', bottom:14, left:18, right:18 }}>
                              <h2 className="font-display font-light" style={{ fontSize:'1.8rem', color:'#fff', lineHeight:1.1, marginBottom:preview.category?3:0 }}>{preview.name}</h2>
                              {preview.category && <span style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{preview.category}</span>}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ height:3, background:'linear-gradient(90deg,#C9A84C,#C4956A,rgba(201,168,76,0.2))' }}/>
                            <div style={{ padding:'1.5rem 1.5rem 0.75rem', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                              <div>
                                <h2 className="font-display font-light" style={{ fontSize:'1.8rem', color:'#fff', lineHeight:1.1, marginBottom:4 }}>{preview.name}</h2>
                                {preview.category && <span style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{preview.category}</span>}
                              </div>
                              <button onClick={() => setPreview(null)} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} className="preview-close"><X size={14}/></button>
                            </div>
                          </>
                        )}

                        <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'0.875rem 1.5rem 0' }}/>
                        <div style={{ display:'flex', gap:8, padding:'1rem 1.5rem', flexWrap:'wrap' }}>
                          {preview.price && (
                            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0.45rem 1rem', borderRadius:9999, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)' }}>
                              <span style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', fontFamily:'Jost,sans-serif' }}>Price</span>
                              <span className="font-display" style={{ fontSize:'1.1rem', color:'#C9A84C' }}>€{preview.price}</span>
                            </div>
                          )}
                          {preview.duration>0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0.45rem 1rem', borderRadius:9999, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                              <Clock size={11} color="rgba(255,255,255,0.3)" strokeWidth={1.5}/>
                              <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.55)', fontFamily:'Jost,sans-serif' }}>{fmtDur(preview.duration)}</span>
                            </div>
                          )}
                        </div>
                        {preview.description && (
                          <div style={{ padding:'0 1.5rem 1.25rem' }}>
                            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem', lineHeight:1.85, fontFamily:'Jost,sans-serif', fontWeight:300 }}>{preview.description}</p>
                          </div>
                        )}
                        <div style={{ padding:'1.25rem 1.5rem', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8 }}>
                          <button onClick={() => setPreview(null)} style={{ flex:1, padding:'0.7rem', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', cursor:'pointer', transition:'all 0.2s' }} className="preview-cancel">Close</button>
                          <button onClick={() => { setSel(p=>({...p,service:preview})); setPreview(null); setStep(1) }} className="btn-gold" style={{ flex:2, padding:'0.7rem', fontSize:11, justifyContent:'center' }}>
                            Book This Service <ArrowRight size={13}/>
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── STEP 1: Stylist ── */}
            {step===1 && (
              <motion.div key="s1" {...slide}>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                  <button onClick={() => setStep(0)} className="appt-back-btn" style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', transition:'all 0.3s' }}>
                    <ChevronLeft size={13}/> Back
                  </button>
                </div>
                <div style={{ textAlign:'center', marginBottom:36 }}>
                  <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2rem,4vw,3rem)', marginBottom:6, lineHeight:1.1 }}>
                    Who should take<br/><span className="gold-gradient" style={{ fontStyle:'italic' }}>care of you?</span>
                  </h1>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif' }}>
                    {sel.service?.name}{sel.service?.price && ` · €${sel.service.price}`}
                  </p>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'1.1rem' }}>
                  {(stylists.length ? stylists : Array.from({length:4},(_,i)=>({id:i,name:'',title:''}))).map((sty) => {
                    const isActive = sel.stylist?.id === sty.id
                    return (
                      <button key={sty.id} onClick={() => { setSel(p=>({...p,stylist:sty})); setStep(2) }}
                        className="appt-sty-card"
                        style={{ padding:0, borderRadius:18, cursor:'pointer', overflow:'hidden',
                                 border: isActive ? '2px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.07)',
                                 background:'rgba(255,255,255,0.02)', transition:'all 0.35s ease',
                                 boxShadow: isActive ? '0 0 0 4px rgba(201,168,76,0.1),0 8px 40px rgba(201,168,76,0.12)' : '0 4px 20px rgba(0,0,0,0.3)',
                                 position:'relative' }}>
                        <div style={{ height:190, background:'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(196,149,106,0.04))', position:'relative', overflow:'hidden' }}>
                          {sty.photo_url
                            ? <img src={sty.photo_url} alt={sty.name} loading="lazy" decoding="async" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}/>
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <User size={40} color="rgba(201,168,76,0.18)" strokeWidth={1}/>
                              </div>
                          }
                          {isActive && (
                            <div style={{ position:'absolute', inset:0, background:'rgba(201,168,76,0.06)' }}>
                              <div style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#C9A84C,#C4956A)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(201,168,76,0.4)' }}>
                                <Check size={12} color="#000" strokeWidth={2.5}/>
                              </div>
                            </div>
                          )}
                          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, background:'linear-gradient(to top,rgba(0,0,0,0.55),transparent)' }}/>
                        </div>
                        <div style={{ padding:'0.9rem 1rem 1rem', textAlign:'center', borderTop:`1px solid ${isActive?'rgba(201,168,76,0.12)':'rgba(255,255,255,0.04)'}` }}>
                          <p className="font-display" style={{ color:'#fff', fontSize:'1.1rem', marginBottom:4 }}>{sty.name}</p>
                          {sty.title && <p style={{ fontSize:8, color:'rgba(255,255,255,0.25)', letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:'Jost,sans-serif' }}>{sty.title}</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Date & Time ── */}
            {step===2 && (
              <motion.div key="s2" {...slide}>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                  <button onClick={() => setStep(1)} className="appt-back-btn" style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', transition:'all 0.3s' }}>
                    <ChevronLeft size={13}/> Back
                  </button>
                </div>
                <div style={{ textAlign:'center', marginBottom:28 }}>
                  <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(1.8rem,3vw,2.6rem)', marginBottom:4, lineHeight:1.1 }}>
                    When works <span className="gold-gradient" style={{ fontStyle:'italic' }}>for you?</span>
                  </h1>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.8rem', fontFamily:'Jost,sans-serif' }}>
                    {sel.service?.name} with {sel.stylist?.name}
                  </p>
                </div>

                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'1.1rem 1.4rem', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <button onClick={() => setMonth(subMonths(month,1))} className="appt-nav-btn" style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', cursor:'pointer', transition:'all 0.3s' }}>
                      <ChevronLeft size={13}/>
                    </button>
                    <span className="font-display" style={{ color:'#fff', fontSize:'1.1rem' }}>{format(month,'MMMM yyyy')}</span>
                    <button onClick={() => setMonth(addMonths(month,1))} className="appt-nav-btn" style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', cursor:'pointer', transition:'all 0.3s' }}>
                      <ChevronRight size={13}/>
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:6 }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => (
                      <div key={i} style={{ textAlign:'center', fontSize:9, color:'rgba(255,255,255,0.18)', letterSpacing:'0.08em', padding:'3px 0', fontFamily:'Jost,sans-serif', textTransform:'uppercase' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                    {Array.from({length:startPad}).map((_,i)=><div key={`p${i}`} style={{ height:44 }}/>)}
                    {days.map(day => {
                      const off=isOff(day), isSel=sel.date&&isSameDay(day,sel.date), isToday=isSameDay(day,new Date())
                      return (
                        <button key={day.toString()} disabled={off} onClick={() => setSel(p=>({...p,date:day,time:null}))} className="appt-day-btn"
                          style={{ height:44, borderRadius:10, fontSize:'0.85rem', fontFamily:'Jost,sans-serif',
                            cursor:off?'not-allowed':'pointer', transition:'all 0.2s ease',
                            border:isToday&&!isSel?'1px solid rgba(201,168,76,0.35)':'1px solid transparent',
                            background:isSel?'linear-gradient(135deg,#C9A84C,#C4956A)':'transparent',
                            color:isSel?'#000':off?'rgba(255,255,255,0.08)':isToday?'#C9A84C':'rgba(255,255,255,0.5)',
                            fontWeight:isSel?700:400, boxShadow:isSel?'0 4px 16px rgba(201,168,76,0.4)':'none',
                          }}>{format(day,'d')}</button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'1rem 1.4rem' }}>
                  {sel.date ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <Calendar size={11} color="#C9A84C" strokeWidth={1.5}/>
                          <span style={{ fontSize:10, letterSpacing:'0.13em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{format(sel.date,'EEEE, MMMM d')}</span>
                        </div>
                        {sel.time && (
                          <button className="btn-gold" onClick={() => setStep(3)} style={{ padding:'6px 18px', fontSize:10, gap:6 }}>
                            Continue <ArrowRight size={12}/>
                          </button>
                        )}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1px 1fr', gap:'0 14px' }}>
                        {[
                          ['Morning',   SLOTS.filter(s => parseInt(s) < 13)],
                          ['Afternoon', SLOTS.filter(s => parseInt(s) >= 13)],
                        ].map(([label, slots], col) => (
                          col===0 ? (
                            <div key={label}>
                              <p style={{ fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', fontFamily:'Jost,sans-serif', marginBottom:8 }}>{label}</p>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
                                {slots.map(slot => {
                                  const isPast = sel.date && isSameDay(sel.date,new Date()) && parseInt(slot)<=getHours(new Date())
                                  const tk = taken.includes(slot)||slotOverlapsBlocked(slot, sel.service?.duration||60, blockedSlots)||isPast
                                  const isSel = sel.time===slot
                                  return (
                                    <button key={slot} disabled={tk} onClick={() => setSel(p=>({...p,time:slot}))} className="appt-slot-btn"
                                      style={{ padding:'0.45rem 0', borderRadius:8, fontSize:'0.73rem', fontFamily:'Jost,sans-serif', cursor:tk?'not-allowed':'pointer', transition:'all 0.2s ease', border:isSel?'none':'1px solid rgba(255,255,255,0.07)', background:isSel?'linear-gradient(135deg,#C9A84C,#C4956A)':'rgba(255,255,255,0.02)', color:isSel?'#000':tk?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.4)', fontWeight:isSel?700:300, textDecoration:tk?'line-through':'none', boxShadow:isSel?'0 4px 14px rgba(201,168,76,0.35)':'none' }}>
                                      {slot}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ) : [
                            <div key="divider" style={{ background:'rgba(255,255,255,0.06)', borderRadius:1 }}/>,
                            <div key={label}>
                              <p style={{ fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', fontFamily:'Jost,sans-serif', marginBottom:8 }}>{label}</p>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
                                {slots.map(slot => {
                                  const isPast = sel.date && isSameDay(sel.date,new Date()) && parseInt(slot)<=getHours(new Date())
                                  const tk = taken.includes(slot)||slotOverlapsBlocked(slot, sel.service?.duration||60, blockedSlots)||isPast
                                  const isSel = sel.time===slot
                                  return (
                                    <button key={slot} disabled={tk} onClick={() => setSel(p=>({...p,time:slot}))} className="appt-slot-btn"
                                      style={{ padding:'0.45rem 0', borderRadius:8, fontSize:'0.73rem', fontFamily:'Jost,sans-serif', cursor:tk?'not-allowed':'pointer', transition:'all 0.2s ease', border:isSel?'none':'1px solid rgba(201,168,76,0.1)', background:isSel?'linear-gradient(135deg,#C9A84C,#C4956A)':'rgba(201,168,76,0.03)', color:isSel?'#000':tk?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.4)', fontWeight:isSel?700:300, textDecoration:tk?'line-through':'none', boxShadow:isSel?'0 4px 14px rgba(201,168,76,0.35)':'none' }}>
                                      {slot}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ]
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0.75rem 0', color:'rgba(255,255,255,0.18)', fontSize:'0.8rem', fontFamily:'Jost,sans-serif', fontStyle:'italic' }}>
                      <Calendar size={14} strokeWidth={1.2}/> Pick a date to see available times
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Confirm ── */}
            {step===3 && (
              <motion.div key="s3" {...slide}>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                  <button onClick={() => setStep(2)} className="appt-back-btn" style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', transition:'all 0.3s' }}>
                    <ChevronLeft size={13}/> Back
                  </button>
                </div>
                <div style={{ textAlign:'center', marginBottom:32 }}>
                  <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2rem,4vw,3rem)', marginBottom:6, lineHeight:1.1 }}>
                    Almost there,<br/><span className="gold-gradient" style={{ fontStyle:'italic' }}>let's confirm.</span>
                  </h1>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif' }}>Review your appointment details</p>
                </div>

                <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(201,168,76,0.14)', marginBottom:20, position:'relative' }}>
                  {sel.service?.image_url ? (
                    <div style={{ height:140, position:'relative', overflow:'hidden' }}>
                      <img src={sel.service.image_url} alt={sel.service.name} loading="lazy" decoding="async" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(14,14,20,0.93) 100%)' }}/>
                      <div style={{ position:'absolute', bottom:14, left:20, right:20, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                        <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem', lineHeight:1 }}>{sel.service.name}</h3>
                        <span className="font-display" style={{ color:'#C9A84C', fontSize:'1.8rem', lineHeight:1 }}>€{sel.service.price}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height:3, background:'linear-gradient(90deg,#C9A84C,#C4956A,rgba(201,168,76,0.2))' }}/>
                  )}

                  <div style={{ background:'rgba(255,255,255,0.02)', position:'relative' }}>
                    <div style={{ position:'absolute', top:0, right:0, width:160, height:160, background:'radial-gradient(circle,rgba(201,168,76,0.05) 0%,transparent 70%)', pointerEvents:'none' }}/>
                    {[
                      ...(!sel.service?.image_url ? [{ label:'Service', value:sel.service?.name, extra:`€${sel.service?.price}` }] : []),
                      { label:'Stylist',  value:sel.stylist?.name },
                      { label:'Date',     value:sel.date?format(sel.date,'EEEE, MMMM d, yyyy'):'' },
                      { label:'Time',     value:sel.time },
                      ...(sel.service?.duration?[{ label:'Duration', value:fmtDur(sel.service.duration) }]:[]),
                    ].map(({ label, value, extra }, i, arr) => (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.9rem 1.5rem', borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                        <span style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', fontFamily:'Jost,sans-serif' }}>{label}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif', fontWeight:300 }}>{value}</span>
                          {extra && <span style={{ padding:'2px 10px', borderRadius:9999, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', fontSize:11, color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{extra}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:18 }}>
                  <label style={{ display:'block', fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:8, fontFamily:'Jost,sans-serif' }}>Notes (optional)</label>
                  <textarea value={sel.notes} onChange={e=>setSel(p=>({...p,notes:e.target.value}))} rows={3}
                    placeholder="Any special requests or preferences..."
                    className="appt-textarea"
                    style={{ width:'100%', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'0.9rem 1.1rem', fontSize:'0.84rem', color:'#f0f0f0', outline:'none', fontFamily:'Jost,sans-serif', fontWeight:300, resize:'none', transition:'border-color 0.3s', boxSizing:'border-box' }}
                  />
                </div>

                {/* ── Coupons ── */}
                {availableCoupons.length > 0 && (
                  <div style={{ marginBottom:18 }}>
                    <p style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:8, fontFamily:'Jost,sans-serif' }}>Your coupons</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {availableCoupons.map(uc => {
                        const c = uc.coupons
                        const isApplied = appliedCoupon?.id === uc.id
                        const discLabel = c.discount_type === 'percentage' ? `${c.discount_value}% off` : `€${c.discount_value} off`
                        return (
                          <button key={uc.id} onClick={() => setAppliedCoupon(isApplied ? null : uc)}
                            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1rem', borderRadius:12, cursor:'pointer', transition:'all 0.2s',
                              background: isApplied ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)',
                              border: isApplied ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.07)',
                            }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:28, height:28, borderRadius:8, background: isApplied ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)', border: isApplied ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {isApplied ? <Check size={13} color="#C9A84C" strokeWidth={2.5}/> : <Star size={11} color="rgba(255,255,255,0.2)" strokeWidth={1.5}/>}
                              </div>
                              <span style={{ fontSize:'0.82rem', fontFamily:'"Courier New", monospace', letterSpacing:'0.08em', color: isApplied ? '#C9A84C' : 'rgba(255,255,255,0.55)', fontWeight: isApplied ? 700 : 400 }}>{c.code}</span>
                            </div>
                            <span style={{ fontSize:'0.78rem', fontFamily:'Jost,sans-serif', color: isApplied ? '#C9A84C' : 'rgba(255,255,255,0.3)', fontWeight: isApplied ? 600 : 400 }}>{discLabel}</span>
                          </button>
                        )
                      })}
                    </div>
                    {appliedCoupon && (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem 0.75rem', marginTop:6, borderRadius:9, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.14)' }}>
                        <span style={{ fontSize:'0.78rem', fontFamily:'Jost,sans-serif', color:'rgba(52,211,153,0.8)' }}>Coupon applied</span>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:'0.78rem', fontFamily:'Jost,sans-serif', color:'rgba(255,255,255,0.3)', textDecoration:'line-through' }}>€{basePrice.toFixed(2)}</span>
                          <span style={{ fontSize:'0.9rem', fontFamily:'Jost,sans-serif', color:'#34d399', fontWeight:700 }}>€{finalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!user && (
                  <div style={{ padding:'11px 16px', borderRadius:12, background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.12)', marginBottom:14, textAlign:'center' }}>
                    <p style={{ color:'rgba(251,191,36,0.8)', fontSize:'0.82rem', fontFamily:'Jost,sans-serif' }}>Please sign in to book.</p>
                  </div>
                )}

                <button className="btn-gold" onClick={startPayment} disabled={payStep==='loading'||!user} style={{ width:'100%', justifyContent:'center' }}>
                  {payStep==='loading'
                    ? <div style={{ width:16,height:16,border:'2px solid rgba(0,0,0,0.25)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
                    : <>Pay €{finalPrice.toFixed(2)} <ArrowRight size={15}/></>
                  }
                </button>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:12 }}>
                  <Sparkles size={10} color="rgba(201,168,76,0.4)"/>
                  <p style={{ fontSize:9, color:'rgba(255,255,255,0.18)', letterSpacing:'0.12em', fontFamily:'Jost,sans-serif' }}>Every completed visit counts toward your 30% reward</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT SPACER (balances left panel) ── */}
      <div className="appt-side-spacer" style={{ width:300, flexShrink:0 }} />

      {/* ── Stripe payment modal ── */}
      {payStep==='form' && clientSecret && (
        <StripeCheckout
          clientSecret={clientSecret}
          amount={finalPrice.toFixed(2)}
          label={`${sel.service?.name} with ${sel.stylist?.name}`}
          onSuccess={completeBooking}
          onCancel={() => { setPayStep(null); setClientSecret(null) }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }

        .appt-svc-card:hover { transform:translateY(-5px) !important; box-shadow:0 24px 60px rgba(0,0,0,0.6) !important; border-color:rgba(201,168,76,0.35) !important; }
        .appt-svc-card:hover .appt-svc-img { transform:scale(1.07) !important; }
        .appt-info-btn:hover { color:rgba(255,255,255,0.75) !important; background:rgba(255,255,255,0.12) !important; border-color:rgba(255,255,255,0.2) !important; }
        .appt-sty-card:hover { border-color:rgba(201,168,76,0.3) !important; transform:translateY(-4px) !important; box-shadow:0 16px 48px rgba(201,168,76,0.1) !important; }
        .appt-back-btn:hover { color:rgba(255,255,255,0.6) !important; border-color:rgba(255,255,255,0.13) !important; background:rgba(255,255,255,0.07) !important; }
        .appt-nav-btn:hover { background:rgba(201,168,76,0.09) !important; border-color:rgba(201,168,76,0.22) !important; color:#C9A84C !important; }
        .appt-day-btn:not(:disabled):hover { background:rgba(201,168,76,0.1) !important; color:#C9A84C !important; }
        .appt-slot-btn:not(:disabled):hover { border-color:rgba(201,168,76,0.28) !important; background:rgba(201,168,76,0.07) !important; color:#C9A84C !important; }
        .appt-textarea:focus { border-color:rgba(201,168,76,0.35) !important; }
        .appt-textarea::placeholder { color:rgba(255,255,255,0.13); }
        .preview-close:hover { background:rgba(255,255,255,0.1) !important; color:rgba(255,255,255,0.8) !important; }
        .preview-cancel:hover { background:rgba(255,255,255,0.07) !important; color:rgba(255,255,255,0.6) !important; }

        @media (max-width:900px) {
          .appt-step-panel { display:none !important; }
          .appt-side-spacer { display:none !important; }
          .appt-mobile-steps { display:block !important; }
        }
        .appt-step-panel::-webkit-scrollbar { display:none; }
        @media (max-width:600px) {
          .appt-svc-card { height:220px !important; }
          .appt-content-wrap { padding: 1.5rem 1.25rem !important; }
        }
      `}</style>
      </div>
    </div>
  )
}
