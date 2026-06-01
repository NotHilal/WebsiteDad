import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronLeft, ChevronRight, Check, User, ArrowRight, Sparkles, Calendar, Scissors, Star, X, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay
} from 'date-fns'
import toast from 'react-hot-toast'

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
  const [saving,   setSaving]   = useState(false)
  const [done,     setDone]     = useState(false)
  const [sel,      setSel]      = useState({ service:null, stylist:null, date:null, time:null, notes:'' })
  const [preview,  setPreview]  = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('services').select('*').order('category'),
      supabase.from('stylists').select('*').order('display_order'),
      supabase.from('blocked_dates').select('date'),
    ]).then(([{data:svc},{data:sty},{data:blk}]) => {
      setServices(svc || [])
      setStylists(sty || [])
      setBlocked((blk||[]).map(b => b.date))
    })
  }, [])

  useEffect(() => {
    if (!sel.date || !sel.stylist) return
    const dateStr = format(sel.date, 'yyyy-MM-dd')
    Promise.all([
      supabase.from('appointments').select('time').eq('stylist_id', sel.stylist.id).eq('date', dateStr).neq('status', 'cancelled'),
      supabase.from('blocked_hours').select('hour').eq('date', dateStr),
    ]).then(([{ data: appts }, { data: hours }]) => {
      setTaken((appts || []).map(a => a.time.slice(0, 5)))
      setBlockedSlots((hours || []).map(h => h.hour))
    })
  }, [sel.date, sel.stylist])

  const days     = eachDayOfInterval({ start:startOfMonth(month), end:endOfMonth(month) })
  const startPad = getDay(startOfMonth(month))
  const isOff    = d => isBefore(d, startOfDay(new Date())) || getDay(d)===0 || blocked.includes(format(d,'yyyy-MM-dd'))

  async function book() {
    if (!user) return toast.error('Please sign in to book')
    setSaving(true)
    try {
      const { error } = await supabase.from('appointments').insert({
        user_id:user.id, stylist_id:sel.stylist.id, service_id:sel.service.id,
        date:format(sel.date,'yyyy-MM-dd'), time:sel.time, notes:sel.notes, status:'pending',
      })
      if (error) throw error
      setDone(true)
    } catch(err) { toast.error(err.message||'Booking failed') }
    finally { setSaving(false) }
  }

  /* ── Success ──────────────────────────────────────────────── */
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
          {[sel.service?.name, `€${sel.service?.price}`, `${sel.service?.duration} min`].filter(Boolean).map((l,i)=>(
            <span key={i} style={{ padding:'6px 16px', borderRadius:9999, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.18)', fontSize:11, color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{l}</span>
          ))}
        </div>
        <button className="btn-gold" onClick={() => { setDone(false); setStep(0); setSel({ service:null, stylist:null, date:null, time:null, notes:'' }) }}>
          Book Another <ArrowRight size={15}/>
        </button>
      </motion.div>
    </div>
  )

  /* ── Layout ───────────────────────────────────────────────── */
  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>

      {/* ── LEFT SIDEBAR ──────────────────────────────────────── */}
      <div className="appt-sidebar" style={{
        width:300, position:'fixed', top:68, bottom:0, left:0, overflowY:'auto',
        background:'#080808', borderRight:'1px solid rgba(201,168,76,0.1)',
        display:'flex', flexDirection:'column', padding:'2.5rem 2rem',
        zIndex:20,
      }}>
        {/* Ambient glow */}
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:300, height:200, background:'radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Brand */}
        <div style={{ marginBottom:'2.5rem', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#C9A84C,#C4956A)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Scissors size={11} color="#000" style={{ transform:'rotate(45deg)' }}/>
            </div>
            <span className="font-display" style={{ fontSize:'1.3rem', color:'#fff' }}>Hair<span style={{ color:'#C9A84C' }}>Go</span></span>
          </div>
          <p style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', fontFamily:'Jost,sans-serif' }}>Premium Hair Studio · Doha</p>
        </div>

        {/* Step list */}
        <div style={{ position:'relative', marginBottom:'2.5rem' }}>
          {/* Vertical line */}
          <div style={{ position:'absolute', left:15, top:16, bottom:16, width:1, background:'rgba(255,255,255,0.06)' }} />

          {STEPS.map((s, i) => {
            const isActive = i === step
            const isDone   = i < step
            return (
              <div key={s} onClick={() => isDone && setStep(i)}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'0.75rem 0', cursor: isDone ? 'pointer' : 'default', position:'relative', zIndex:1 }}>
                {/* Circle */}
                <div style={{
                  width:30, height:30, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.4s ease',
                  background: isActive ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : isDone ? 'rgba(201,168,76,0.15)' : '#080808',
                  border: isActive ? 'none' : isDone ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: isActive ? '0 4px 20px rgba(201,168,76,0.45)' : 'none',
                }}>
                  {isDone
                    ? <Check size={13} color="#C9A84C"/>
                    : <span style={{ fontSize:11, fontWeight:600, color: isActive ? '#000' : 'rgba(255,255,255,0.25)', fontFamily:'Jost,sans-serif' }}>{i+1}</span>
                  }
                </div>
                <span style={{
                  fontSize:11, letterSpacing:'0.16em', textTransform:'uppercase', fontFamily:'Jost,sans-serif',
                  color: isActive ? '#fff' : isDone ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.18)',
                  fontWeight: isActive ? 500 : 300, transition:'color 0.3s',
                }}>{s}</span>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:'2rem' }} />

        {/* Live summary */}
        <div style={{ flex:1 }}>
          <p style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', fontFamily:'Jost,sans-serif', marginBottom:'1rem' }}>Your Selection</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            {[
              { label:'Service', value: sel.service?.name, sub: sel.service?.price ? `€${sel.service.price}` : null },
              { label:'Stylist', value: sel.stylist?.name },
              { label:'Date',    value: sel.date ? format(sel.date,'MMM d, yyyy') : null },
              { label:'Time',    value: sel.time },
            ].map(({ label, value, sub }) => (
              <div key={label}>
                <p style={{ fontSize:8, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', fontFamily:'Jost,sans-serif', marginBottom:3 }}>{label}</p>
                {value
                  ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)', fontFamily:'Jost,sans-serif' }}>{value}</p>
                      {sub && <span style={{ fontSize:10, color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>· {sub}</span>}
                    </div>
                  : <div style={{ height:1, width:24, background:'rgba(255,255,255,0.1)', marginTop:4 }} />
                }
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty */}
        <div style={{ marginTop:'2rem', padding:'1rem', borderRadius:14, background:'rgba(201,168,76,0.05)', border:'1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <Star size={10} color="#C9A84C"/>
            <span style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>Loyalty</span>
          </div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontFamily:'Jost,sans-serif', lineHeight:1.6 }}>
            Every completed visit counts toward your <span style={{ color:'#C9A84C' }}>30% reward</span>.
          </p>
        </div>
      </div>

      {/* ── RIGHT CONTENT ─────────────────────────────────────── */}
      <div className="appt-content" style={{ marginLeft:300, flex:1, minHeight:'100vh', paddingTop:88, paddingBottom:60 }}>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 2.5rem' }}>

          <AnimatePresence mode="wait">

            {/* ── STEP 0: Service ───────────────────────────── */}
            {step===0 && (
              <motion.div key="s0" {...slide}>
                <div style={{ marginBottom:28 }}>
                  <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2rem,4vw,3rem)', marginBottom:6, lineHeight:1.1 }}>
                    What would you like<br/>
                    <span className="gold-gradient" style={{ fontStyle:'italic' }}>today?</span>
                  </h1>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif' }}>Choose a service — tap <em>Learn more</em> for details</p>
                </div>

                {/* ── 2-column compact grid ── */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                  {(services.length ? services : Array.from({length:6},(_,i)=>({id:i,name:'Loading...',description:'',price:'',duration:0,category:''}))).map((svc, i) => {
                    const isActive = sel.service?.id === svc.id
                    return (
                      <div key={svc.id}
                        style={{
                          borderRadius:14,
                          border: isActive ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.07)',
                          background: isActive ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.025)',
                          transition:'all 0.3s ease',
                          boxShadow: isActive ? '0 6px 28px rgba(201,168,76,0.12)' : 'none',
                          overflow:'hidden',
                          display:'flex', flexDirection:'column',
                        }}
                        className="svc-card">

                        {/* Top accent bar */}
                        <div style={{ height:3, background: isActive ? 'linear-gradient(90deg,#C9A84C,#C4956A)' : 'rgba(255,255,255,0.05)', transition:'background 0.3s', flexShrink:0 }} />

                        {/* Card body — clicking here selects */}
                        <div
                          onClick={() => { setSel(p=>({...p,service:svc})); setStep(1) }}
                          style={{ padding:'1rem 1.1rem 0.85rem', flex:1, display:'flex', flexDirection:'column', gap:6, cursor:'pointer' }}>
                          {/* Name + price row */}
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6 }}>
                            <h4 className="font-display" style={{ fontSize:'1.05rem', color:'#fff', lineHeight:1.2, flex:1 }}>{svc.name}</h4>
                            {svc.price && (
                              <span className="font-display" style={{ fontSize:'1.1rem', color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.55)', flexShrink:0, transition:'color 0.3s' }}>
                                €{svc.price}
                              </span>
                            )}
                          </div>

                          {/* Duration pill */}
                          {svc.duration>0 && (
                            <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:9999, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', width:'fit-content' }}>
                              <Clock size={9} color="rgba(255,255,255,0.25)" strokeWidth={1.5}/>
                              <span style={{ fontSize:9, color:'rgba(255,255,255,0.28)', fontFamily:'Jost,sans-serif', letterSpacing:'0.1em' }}>{svc.duration} min</span>
                            </div>
                          )}
                        </div>

                        {/* Action row */}
                        <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setPreview(svc) }}
                            style={{ flex:1, padding:'0.6rem 0', background:'transparent', border:'none', borderRight:'1px solid rgba(255,255,255,0.05)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', fontFamily:'Jost,sans-serif', transition:'all 0.2s' }}
                            className="svc-info-btn">
                            <Info size={11}/> Learn more
                          </button>
                          <button
                            onClick={() => { setSel(p=>({...p,service:svc})); setStep(1) }}
                            style={{ flex:1, padding:'0.6rem 0', background: isActive ? 'rgba(201,168,76,0.15)' : 'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.3)', fontFamily:'Jost,sans-serif', transition:'all 0.2s', fontWeight: isActive ? 600 : 400 }}
                            className="svc-select-btn">
                            {isActive ? <><Check size={11}/> Selected</> : <>Select <ArrowRight size={11}/></>}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ── Service detail modal ── */}
                <AnimatePresence>
                  {preview && (
                    <motion.div
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}
                      onClick={() => setPreview(null)}>
                      <motion.div
                        initial={{ opacity:0, scale:0.93, y:16 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.93, y:8 }}
                        transition={{ type:'spring', damping:26, stiffness:340 }}
                        onClick={e => e.stopPropagation()}
                        style={{ width:'100%', maxWidth:420, background:'#111', border:'1px solid rgba(201,168,76,0.18)', borderRadius:20, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>

                        {/* Gold top bar */}
                        <div style={{ height:3, background:'linear-gradient(90deg,#C9A84C,#C4956A,rgba(201,168,76,0.2))' }} />

                        {/* Header */}
                        <div style={{ padding:'1.5rem 1.5rem 1rem', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                          <div>
                            <h2 className="font-display font-light" style={{ fontSize:'1.8rem', color:'#fff', lineHeight:1.1, marginBottom:4 }}>{preview.name}</h2>
                            {preview.category && (
                              <span style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{preview.category}</span>
                            )}
                          </div>
                          <button onClick={() => setPreview(null)}
                            style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}
                            className="preview-close">
                            <X size={14}/>
                          </button>
                        </div>

                        {/* Divider */}
                        <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'0 1.5rem' }} />

                        {/* Info pills */}
                        <div style={{ display:'flex', gap:8, padding:'1rem 1.5rem', flexWrap:'wrap' }}>
                          {preview.price && (
                            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0.45rem 1rem', borderRadius:9999, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)' }}>
                              <span style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', fontFamily:'Jost,sans-serif' }}>Price</span>
                              <span className="font-display" style={{ fontSize:'1.1rem', color:'#C9A84C' }}>€{preview.price}</span>
                            </div>
                          )}
                          {preview.duration>0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0.45rem 1rem', borderRadius:9999, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                              <Clock size={11} color="rgba(255,255,255,0.3)" strokeWidth={1.5}/>
                              <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.55)', fontFamily:'Jost,sans-serif' }}>{preview.duration} min</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {preview.description && (
                          <div style={{ padding:'0 1.5rem 1.5rem' }}>
                            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.88rem', lineHeight:1.85, fontFamily:'Jost,sans-serif', fontWeight:300 }}>{preview.description}</p>
                          </div>
                        )}

                        {/* CTA */}
                        <div style={{ padding:'1.25rem 1.5rem', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8 }}>
                          <button onClick={() => setPreview(null)}
                            style={{ flex:1, padding:'0.7rem', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', cursor:'pointer', transition:'all 0.2s' }}
                            className="preview-cancel">
                            Close
                          </button>
                          <button onClick={() => { setSel(p=>({...p,service:preview})); setPreview(null); setStep(1) }}
                            className="btn-gold"
                            style={{ flex:2, padding:'0.7rem', fontSize:11, justifyContent:'center' }}>
                            Book This Service <ArrowRight size={13}/>
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── STEP 1: Stylist ───────────────────────────── */}
            {step===1 && (
              <motion.div key="s1" {...slide}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:36, gap:'1rem' }}>
                  <div>
                    <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2rem,4vw,3rem)', marginBottom:6, lineHeight:1.1 }}>
                      Who should take<br/>
                      <span className="gold-gradient" style={{ fontStyle:'italic' }}>care of you?</span>
                    </h1>
                    <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif' }}>
                      {sel.service?.name} {sel.service?.price && `· €${sel.service.price}`}
                    </p>
                  </div>
                  <button onClick={() => setStep(0)} className="appt-back-btn" style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 16px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', transition:'all 0.3s', whiteSpace:'nowrap', flexShrink:0, marginTop:6 }}>
                    <ChevronLeft size={13}/> Back
                  </button>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'1rem' }}>
                  {(stylists.length ? stylists : Array.from({length:4},(_,i)=>({id:i,name:'...',title:''}))).map((sty,i) => {
                    const isActive = sel.stylist?.id === sty.id
                    return (
                      <button key={sty.id}
                        onClick={() => { setSel(p=>({...p,stylist:sty})); setStep(2) }}
                        className="appt-sty-card"
                        style={{
                          padding:0, borderRadius:18, cursor:'pointer', overflow:'hidden',
                          border: isActive ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.07)',
                          background:'rgba(255,255,255,0.02)', transition:'all 0.35s ease',
                          boxShadow: isActive ? '0 8px 40px rgba(201,168,76,0.12)' : 'none',
                          position:'relative',
                        }}>
                        <div style={{ height:160, background:'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(196,149,106,0.04))', position:'relative', overflow:'hidden' }}>
                          {sty.photo_url
                            ? <img src={sty.photo_url} alt={sty.name} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}/>
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <User size={36} color="rgba(201,168,76,0.2)" strokeWidth={1}/>
                              </div>
                          }
                          {isActive && (
                            <div style={{ position:'absolute', inset:0, background:'rgba(201,168,76,0.08)', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:10 }}>
                              <div style={{ width:24, height:24, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <Check size={12} color="#000" strokeWidth={3}/>
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ padding:'0.9rem 1rem', textAlign:'center' }}>
                          <p className="font-display" style={{ color:'#fff', fontSize:'1.05rem', marginBottom:3 }}>{sty.name}</p>
                          <p style={{ fontSize:8, color:'rgba(255,255,255,0.25)', letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:'Jost,sans-serif' }}>{sty.title}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Date & Time ───────────────────────── */}
            {step===2 && (
              <motion.div key="s2" {...slide}>

                {/* Compact header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:'1rem' }}>
                  <div>
                    <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(1.6rem,3vw,2.2rem)', marginBottom:3, lineHeight:1.1 }}>
                      When works <span className="gold-gradient" style={{ fontStyle:'italic' }}>for you?</span>
                    </h1>
                    <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.8rem', fontFamily:'Jost,sans-serif' }}>
                      {sel.service?.name} with {sel.stylist?.name}
                    </p>
                  </div>
                  <button onClick={() => setStep(1)} className="appt-back-btn" style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', transition:'all 0.3s', whiteSpace:'nowrap', flexShrink:0 }}>
                    <ChevronLeft size={13}/> Back
                  </button>
                </div>

                {/* ── Full-width calendar ── */}
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'1rem 1.25rem', marginBottom:12 }}>
                  {/* Month nav */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <button onClick={() => setMonth(subMonths(month,1))} className="appt-nav-btn" style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', cursor:'pointer', transition:'all 0.3s' }}>
                      <ChevronLeft size={12}/>
                    </button>
                    <span className="font-display" style={{ color:'#fff', fontSize:'1.05rem' }}>{format(month,'MMMM yyyy')}</span>
                    <button onClick={() => setMonth(addMonths(month,1))} className="appt-nav-btn" style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', cursor:'pointer', transition:'all 0.3s' }}>
                      <ChevronRight size={12}/>
                    </button>
                  </div>

                  {/* Weekday labels */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => (
                      <div key={i} style={{ textAlign:'center', fontSize:9, color:'rgba(255,255,255,0.18)', letterSpacing:'0.08em', padding:'3px 0', fontFamily:'Jost,sans-serif', textTransform:'uppercase' }}>{d}</div>
                    ))}
                  </div>

                  {/* Day grid — fixed height cells, no aspect-ratio */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                    {Array.from({length:startPad}).map((_,i)=><div key={`p${i}`} style={{ height:44 }}/>)}
                    {days.map(day => {
                      const off=isOff(day), isSel=sel.date&&isSameDay(day,sel.date), isToday=isSameDay(day,new Date())
                      return (
                        <button key={day.toString()} disabled={off} onClick={() => setSel(p=>({...p,date:day,time:null}))} className="appt-day-btn"
                          style={{
                            height:44, borderRadius:10, fontSize:'0.85rem', fontFamily:'Jost,sans-serif',
                            cursor:off?'not-allowed':'pointer', transition:'all 0.2s ease',
                            border:isToday&&!isSel?'1px solid rgba(201,168,76,0.35)':'1px solid transparent',
                            background:isSel?'linear-gradient(135deg,#C9A84C,#C4956A)':'transparent',
                            color:isSel?'#000':off?'rgba(255,255,255,0.08)':isToday?'#C9A84C':'rgba(255,255,255,0.5)',
                            fontWeight:isSel?700:400,
                            boxShadow:isSel?'0 4px 16px rgba(201,168,76,0.4)':'none',
                          }}>{format(day,'d')}</button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Time slots (below calendar, same card width) ── */}
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'0.875rem 1.25rem' }}>
                  {sel.date ? (
                    <>
                      {/* Selected date label */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
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

                      {/* Morning | Afternoon side by side */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1px 1fr', gap:'0 12px' }}>
                        {[
                          ['Morning',   SLOTS.filter(s => parseInt(s) < 13)],
                          ['Afternoon', SLOTS.filter(s => parseInt(s) >= 13)],
                        ].map(([label, slots], col) => (
                          col === 0 ? (
                            <div key={label}>
                              <p style={{ fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', fontFamily:'Jost,sans-serif', marginBottom:7 }}>{label}</p>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
                                {slots.map(slot => {
                                  const tk   = taken.includes(slot) || blockedSlots.includes(slot)
                                  const isSel = sel.time === slot
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
                            <div key="divider" style={{ background:'rgba(255,255,255,0.06)', borderRadius:1 }} />,
                            <div key={label}>
                              <p style={{ fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', fontFamily:'Jost,sans-serif', marginBottom:7 }}>{label}</p>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
                                {slots.map(slot => {
                                  const tk=taken.includes(slot), isSel=sel.time===slot
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

            {/* ── STEP 3: Confirm ───────────────────────────── */}
            {step===3 && (
              <motion.div key="s3" {...slide}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:36, gap:'1rem' }}>
                  <div>
                    <h1 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2rem,4vw,3rem)', marginBottom:6, lineHeight:1.1 }}>
                      Almost there,<br/>
                      <span className="gold-gradient" style={{ fontStyle:'italic' }}>let's confirm.</span>
                    </h1>
                    <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif' }}>Review your appointment details</p>
                  </div>
                  <button onClick={() => setStep(2)} className="appt-back-btn" style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 16px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', transition:'all 0.3s', whiteSpace:'nowrap', flexShrink:0, marginTop:6 }}>
                    <ChevronLeft size={13}/> Back
                  </button>
                </div>

                {/* Summary card */}
                <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(201,168,76,0.14)', marginBottom:20, position:'relative' }}>
                  <div style={{ height:3, background:'linear-gradient(90deg,#C9A84C,#C4956A,rgba(201,168,76,0.2))' }} />
                  <div style={{ position:'absolute', top:0, right:0, width:180, height:180, background:'radial-gradient(circle,rgba(201,168,76,0.05) 0%,transparent 70%)', pointerEvents:'none' }} />
                  <div style={{ background:'rgba(255,255,255,0.02)' }}>
                    {[
                      { label:'Service', value:sel.service?.name, extra:`€${sel.service?.price}` },
                      { label:'Stylist', value:sel.stylist?.name },
                      { label:'Date',    value:sel.date?format(sel.date,'EEEE, MMMM d, yyyy'):'' },
                      { label:'Time',    value:sel.time },
                      ...(sel.service?.duration?[{ label:'Duration', value:`${sel.service.duration} min` }]:[]),
                    ].map(({ label, value, extra }, i, arr) => (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.5rem', borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                        <span style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', fontFamily:'Jost,sans-serif' }}>{label}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.85rem', fontFamily:'Jost,sans-serif', fontWeight:300 }}>{value}</span>
                          {extra && <span style={{ padding:'2px 10px', borderRadius:9999, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', fontSize:11, color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{extra}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:'block', fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:8, fontFamily:'Jost,sans-serif' }}>Notes (optional)</label>
                  <textarea value={sel.notes} onChange={e=>setSel(p=>({...p,notes:e.target.value}))} rows={3}
                    placeholder="Any special requests or preferences..."
                    className="appt-textarea"
                    style={{ width:'100%', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'0.9rem 1.1rem', fontSize:'0.84rem', color:'#f0f0f0', outline:'none', fontFamily:'Jost,sans-serif', fontWeight:300, resize:'none', transition:'border-color 0.3s', boxSizing:'border-box' }}
                  />
                </div>

                {!user && (
                  <div style={{ padding:'11px 16px', borderRadius:12, background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.12)', marginBottom:14, textAlign:'center' }}>
                    <p style={{ color:'rgba(251,191,36,0.8)', fontSize:'0.82rem', fontFamily:'Jost,sans-serif' }}>Please sign in to confirm your booking.</p>
                  </div>
                )}

                <button className="btn-gold" onClick={book} disabled={saving||!user} style={{ width:'100%', justifyContent:'center' }}>
                  {saving
                    ? <div style={{ width:16,height:16,border:'2px solid rgba(0,0,0,0.25)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
                    : <>Confirm Booking <Check size={15}/></>
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

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }

        @media (max-width:700px) {
          .appt-sidebar { display:none !important; }
          .appt-content { margin-left:0 !important; }
        }

        .svc-card:hover { border-color:rgba(201,168,76,0.3) !important; background:rgba(201,168,76,0.04) !important; }
        .svc-info-btn:hover   { color:rgba(255,255,255,0.65) !important; background:rgba(255,255,255,0.04) !important; }
        .svc-select-btn:hover { color:#C9A84C !important; background:rgba(201,168,76,0.08) !important; }
        .preview-close:hover  { background:rgba(255,255,255,0.1) !important; color:rgba(255,255,255,0.8) !important; }
        .preview-cancel:hover { background:rgba(255,255,255,0.07) !important; color:rgba(255,255,255,0.6) !important; }
        .appt-sty-card:hover {
          border-color:rgba(201,168,76,0.3) !important;
          transform:translateY(-4px);
          box-shadow:0 12px 40px rgba(201,168,76,0.1) !important;
        }
        .appt-back-btn:hover {
          color:rgba(255,255,255,0.6) !important;
          border-color:rgba(255,255,255,0.13) !important;
          background:rgba(255,255,255,0.07) !important;
        }
        .appt-nav-btn:hover {
          background:rgba(201,168,76,0.09) !important;
          border-color:rgba(201,168,76,0.22) !important;
          color:#C9A84C !important;
        }
        .appt-day-btn:not(:disabled):hover {
          background:rgba(201,168,76,0.1) !important;
          color:#C9A84C !important;
        }
        .appt-slot-btn:not(:disabled):hover {
          border-color:rgba(201,168,76,0.28) !important;
          background:rgba(201,168,76,0.07) !important;
          color:#C9A84C !important;
        }
        .appt-textarea:focus { border-color:rgba(201,168,76,0.35) !important; }
        .appt-textarea::placeholder { color:rgba(255,255,255,0.13); }
      `}</style>
    </div>
  )
}
