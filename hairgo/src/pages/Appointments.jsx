import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronLeft, ChevronRight, Check, User, ArrowRight, Sparkles, Calendar, Scissors } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay
} from 'date-fns'
import toast from 'react-hot-toast'

const STEPS = ['Service', 'Stylist', 'Date & Time', 'Confirm']
const STEP_ICONS = [Scissors, User, Calendar, Check]
const SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30']

const fadeSlide = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25 } },
}

export default function Appointments() {
  const { user, profile } = useAuth()
  const [step,       setStep]       = useState(0)
  const [services,   setServices]   = useState([])
  const [stylists,   setStylists]   = useState([])
  const [blocked,    setBlocked]    = useState([])
  const [taken,      setTaken]      = useState([])
  const [month,      setMonth]      = useState(new Date())
  const [saving,     setSaving]     = useState(false)
  const [done,       setDone]       = useState(false)
  const [sel,        setSel]        = useState({ service:null, stylist:null, date:null, time:null, notes:'' })

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
    supabase.from('appointments').select('time')
      .eq('stylist_id', sel.stylist.id)
      .eq('date', format(sel.date, 'yyyy-MM-dd'))
      .neq('status', 'cancelled')
      .then(({ data }) => setTaken((data||[]).map(a => a.time.slice(0,5))))
  }, [sel.date, sel.stylist])

  const days     = eachDayOfInterval({ start:startOfMonth(month), end:endOfMonth(month) })
  const startPad = getDay(startOfMonth(month))
  const isOff    = d => isBefore(d, startOfDay(new Date())) || getDay(d)===0 || blocked.includes(format(d,'yyyy-MM-dd'))

  async function book() {
    if (!user) return toast.error('Please sign in to book')
    setSaving(true)
    try {
      const { error } = await supabase.from('appointments').insert({
        user_id: user.id, stylist_id: sel.stylist.id, service_id: sel.service.id,
        date: format(sel.date,'yyyy-MM-dd'), time: sel.time, notes: sel.notes, status:'pending',
      })
      if (error) throw error
      await supabase.from('profiles').update({ points:(profile?.points||0)+10 }).eq('id', user.id)
      setDone(true)
      toast.success('+10 loyalty points earned!')
    } catch(err) { toast.error(err.message||'Booking failed') }
    finally { setSaving(false) }
  }

  /* ─── Success screen ──────────────────────────────────────── */
  if (done) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', position:'relative', overflow:'hidden' }}>
      {/* Ambient glow */}
      <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:700, background:'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', damping:22 }}
        style={{ position:'relative', textAlign:'center' }}>

        <motion.div
          initial={{ scale:0 }} animate={{ scale:1 }}
          transition={{ type:'spring', damping:15, delay:0.15 }}
          style={{
            width:100, height:100, borderRadius:'50%',
            background:'linear-gradient(135deg,#C9A84C,#C4956A)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 2.5rem auto',
            boxShadow:'0 16px 64px rgba(201,168,76,0.45), 0 0 0 16px rgba(201,168,76,0.06)',
          }}>
          <Check size={42} color="#000" strokeWidth={2.5} />
        </motion.div>

        <h2 className="font-display font-light" style={{ fontSize:'clamp(2.5rem,5vw,4.5rem)', color:'#fff', marginBottom:'1rem', lineHeight:1.05 }}>
          You're <span className="gold-gradient" style={{ fontStyle:'italic' }}>booked!</span>
        </h2>
        <div className="gold-bar" />
        <p style={{ color:'rgba(255,255,255,0.42)', fontSize:'0.9rem', lineHeight:1.85, maxWidth:400, margin:'1.5rem auto 2.5rem auto' }}>
          Your appointment on <strong style={{ color:'#fff' }}>{format(sel.date,'MMMM d, yyyy')}</strong> at{' '}
          <strong style={{ color:'#fff' }}>{sel.time}</strong> with{' '}
          <strong style={{ color:'#fff' }}>{sel.stylist?.name}</strong> is pending confirmation.
        </p>

        {/* Summary pills */}
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10, marginBottom:'3rem' }}>
          {[
            { label: sel.service?.name, icon: '✦' },
            { label: `€${sel.service?.price}`, icon: '' },
            { label: `${sel.service?.duration} min`, icon: '' },
          ].filter(p => p.label).map(({ label, icon }, i) => (
            <span key={i} style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 18px', borderRadius:9999,
              background:'rgba(201,168,76,0.07)', border:'1px solid rgba(201,168,76,0.15)',
              fontSize:11, color:'#C9A84C', letterSpacing:'0.06em',
              fontFamily:'Jost,sans-serif',
            }}>{icon} {label}</span>
          ))}
        </div>

        <button className="btn-gold"
          onClick={() => { setDone(false); setStep(0); setSel({ service:null, stylist:null, date:null, time:null, notes:'' }) }}>
          Book Another <ArrowRight size={15} />
        </button>
      </motion.div>
    </div>
  )

  /* ─── Main booking flow ───────────────────────────────────── */
  return (
    <div style={{ minHeight:'100vh', paddingTop:140, paddingBottom:120, position:'relative', overflow:'hidden' }}>

      {/* Ambient background effects */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'15%', left:'50%', transform:'translateX(-50%)', width:900, height:600, background:'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', top:'60%', left:'20%', width:400, height:400, background:'radial-gradient(circle, rgba(196,149,106,0.03) 0%, transparent 70%)', borderRadius:'50%' }} />
      </div>

      <div style={{ width:'100%', maxWidth:780, marginLeft:'auto', marginRight:'auto', paddingLeft:'1.5rem', paddingRight:'1.5rem', position:'relative' }}>

        {/* ── Header ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.7, ease:[0.22,1,0.36,1] }}
          style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'8px 20px', borderRadius:9999, marginBottom:32,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulse-gold 2.4s infinite' }} />
            <span style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>
              Reserve Your Visit
            </span>
          </div>
          <h1 className="font-display font-light"
            style={{ color:'#fff', fontSize:'clamp(2.8rem,6vw,5rem)', lineHeight:0.95, marginBottom:'1.5rem' }}>
            Book Your<br />
            <span className="gold-gradient" style={{ fontStyle:'italic' }}>Appointment</span>
          </h1>
          <div className="gold-bar" />
        </motion.div>

        {/* ── Step Progress ──────────────────────────────── */}
        <motion.div
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.5, delay:0.2 }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:56 }}>
          {STEPS.map((s, i) => {
            const Icon = STEP_ICONS[i]
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={s} style={{ display:'flex', alignItems:'center' }}>
                {/* Step circle + label */}
                <div
                  onClick={() => { if (isDone) setStep(i) }}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                    cursor: isDone ? 'pointer' : 'default',
                    opacity: isActive ? 1 : isDone ? 0.85 : 0.35,
                    transition: 'all 0.4s ease',
                  }}>
                  <div style={{
                    width: isActive ? 48 : 40,
                    height: isActive ? 48 : 40,
                    borderRadius: '50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: isActive
                      ? 'linear-gradient(135deg,#C9A84C,#C4956A)'
                      : isDone
                        ? 'rgba(201,168,76,0.12)'
                        : 'rgba(255,255,255,0.04)',
                    border: isActive
                      ? 'none'
                      : isDone
                        ? '1px solid rgba(201,168,76,0.25)'
                        : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isActive ? '0 8px 32px rgba(201,168,76,0.35)' : 'none',
                    transition:'all 0.4s ease',
                  }}>
                    {isDone
                      ? <Check size={16} color="#C9A84C" />
                      : <Icon size={isActive ? 18 : 15} color={isActive ? '#000' : isDone ? '#C9A84C' : 'rgba(255,255,255,0.4)'} />
                    }
                  </div>
                  <span className="appt-step-label" style={{
                    fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase',
                    fontFamily:'Jost,sans-serif', fontWeight: isActive ? 500 : 300,
                    color: isActive ? '#C9A84C' : isDone ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.25)',
                    transition:'all 0.3s',
                  }}>{s}</span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 48, height: 1, margin:'0 8px', marginBottom: 22,
                    background: isDone
                      ? 'linear-gradient(90deg, rgba(201,168,76,0.5), rgba(201,168,76,0.3))'
                      : 'rgba(255,255,255,0.06)',
                    transition:'background 0.4s',
                  }} />
                )}
              </div>
            )
          })}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── STEP 0: Service ──────────────────────────── */}
          {step===0 && (
            <motion.div key="s0" {...fadeSlide}>
              <div style={{ textAlign:'center', marginBottom:40 }}>
                <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem', marginBottom:8 }}>
                  Choose your service
                </h3>
                <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.85rem' }}>Select the service you'd like to book</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1rem' }}>
                {(services.length ? services : Array.from({length:4},(_,i)=>({id:i,name:'Loading...',description:'',price:'',duration:0}))).map(svc => {
                  const active = sel.service?.id === svc.id
                  return (
                    <button key={svc.id}
                      onClick={() => { setSel(p=>({...p,service:svc})); setStep(1) }}
                      className="appt-card"
                      style={{
                        textAlign:'left', padding:'2rem 2.25rem', borderRadius:22, width:'100%',
                        cursor:'pointer', transition:'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                        position:'relative', overflow:'hidden',
                        border: active ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(255,255,255,0.06)',
                        background: active ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
                        boxShadow: active ? '0 8px 40px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.1)' : 'none',
                      }}>
                      {/* Top row: name + price */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.85rem' }}>
                        <h4 className="font-display" style={{ fontSize:'1.35rem', color:'#fff', lineHeight:1.2 }}>{svc.name}</h4>
                        {svc.price && (
                          <span style={{
                            padding:'4px 14px', borderRadius:9999,
                            background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.15)',
                            fontSize:12, color:'#C9A84C', fontFamily:'Jost,sans-serif', whiteSpace:'nowrap',
                          }}>€{svc.price}</span>
                        )}
                      </div>
                      <p style={{ color:'rgba(255,255,255,0.32)', fontSize:'0.85rem', lineHeight:1.85, marginBottom:'1rem' }}>{svc.description}</p>
                      {svc.duration>0 && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.2)', fontSize:'0.78rem' }}>
                          <Clock size={12} strokeWidth={1.5} />{svc.duration} min
                        </div>
                      )}
                      {/* Hover accent line */}
                      <div className="appt-card-accent" style={{
                        position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
                        width:0, height:1,
                        background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',
                        transition:'width 0.5s ease',
                      }} />
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Stylist ─────────────────────────── */}
          {step===1 && (
            <motion.div key="s1" {...fadeSlide}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:40 }}>
                <div>
                  <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem', marginBottom:4 }}>Choose your stylist</h3>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.82rem' }}>
                    for {sel.service?.name}
                    {sel.service?.price && <span style={{ color:'rgba(201,168,76,0.5)', marginLeft:8 }}>· €{sel.service.price}</span>}
                  </p>
                </div>
                <button onClick={() => setStep(0)} className="appt-back-btn" style={{
                  color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                  padding:'9px 16px', fontSize:'0.8rem', fontFamily:'Jost,sans-serif',
                  transition:'all 0.3s',
                }}>
                  <ChevronLeft size={14}/>Back
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1.25rem' }}>
                {(stylists.length ? stylists : Array.from({length:3},(_,i)=>({id:i,name:'...',title:''}))).map(sty => {
                  const active = sel.stylist?.id === sty.id
                  return (
                    <button key={sty.id}
                      onClick={() => { setSel(p=>({...p,stylist:sty})); setStep(2) }}
                      className="appt-card"
                      style={{
                        textAlign:'center', padding:'2.5rem 1.5rem', borderRadius:22, width:'100%',
                        cursor:'pointer', transition:'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                        position:'relative', overflow:'hidden',
                        border: active ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(255,255,255,0.06)',
                        background: active ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
                      }}>
                      {/* Avatar */}
                      <div style={{
                        width:72, height:72, borderRadius:'50%',
                        background:'linear-gradient(135deg,rgba(201,168,76,0.15),rgba(196,149,106,0.1))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        margin:'0 auto 1.5rem auto', overflow:'hidden',
                        border:'2px solid rgba(201,168,76,0.1)',
                        boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
                      }}>
                        {sty.photo_url
                          ? <img src={sty.photo_url} alt={sty.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                          : <User size={26} color="#C9A84C" strokeWidth={1.5} />
                        }
                      </div>
                      <h4 className="font-display" style={{ fontSize:'1.25rem', color:'#fff', marginBottom:'0.4rem' }}>{sty.name}</h4>
                      <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.18em', textTransform:'uppercase' }}>{sty.title}</p>
                      <div className="appt-card-accent" style={{
                        position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
                        width:0, height:1,
                        background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',
                        transition:'width 0.5s ease',
                      }} />
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Date & Time ─────────────────────── */}
          {step===2 && (
            <motion.div key="s2" {...fadeSlide}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:40 }}>
                <div>
                  <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem', marginBottom:4 }}>Pick a date & time</h3>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.82rem' }}>
                    {sel.service?.name} with {sel.stylist?.name}
                  </p>
                </div>
                <button onClick={() => setStep(1)} className="appt-back-btn" style={{
                  color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                  padding:'9px 16px', fontSize:'0.8rem', fontFamily:'Jost,sans-serif',
                  transition:'all 0.3s',
                }}>
                  <ChevronLeft size={14}/>Back
                </button>
              </div>

              <div className="appt-datetime-grid" style={{ display:'grid', gap:'2rem' }}>
                {/* Calendar */}
                <div style={{
                  background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                  borderRadius:22, padding:'2rem',
                }}>
                  {/* Month nav */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
                    <button onClick={() => setMonth(subMonths(month,1))} className="appt-nav-btn" style={{
                      width:36, height:36, borderRadius:12,
                      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'rgba(255,255,255,0.4)', cursor:'pointer', transition:'all 0.3s',
                    }}>
                      <ChevronLeft size={15}/>
                    </button>
                    <span className="font-display" style={{ color:'#fff', fontSize:'1.1rem', letterSpacing:'0.04em' }}>
                      {format(month,'MMMM yyyy')}
                    </span>
                    <button onClick={() => setMonth(addMonths(month,1))} className="appt-nav-btn" style={{
                      width:36, height:36, borderRadius:12,
                      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'rgba(255,255,255,0.4)', cursor:'pointer', transition:'all 0.3s',
                    }}>
                      <ChevronRight size={15}/>
                    </button>
                  </div>

                  {/* Day headers */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:10 }}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <div key={d} style={{
                        textAlign:'center', fontSize:9, color:'rgba(255,255,255,0.18)',
                        letterSpacing:'0.14em', textTransform:'uppercase', padding:'6px 0',
                        fontFamily:'Jost,sans-serif',
                      }}>{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                    {Array.from({length:startPad}).map((_,i)=><div key={`p${i}`}/>)}
                    {days.map(day => {
                      const off   = isOff(day)
                      const isSel = sel.date && isSameDay(day,sel.date)
                      const isToday = isSameDay(day, new Date())
                      return (
                        <button key={day.toString()} disabled={off}
                          onClick={() => setSel(p=>({...p,date:day,time:null}))}
                          className="appt-day-btn"
                          style={{
                            aspectRatio:'1/1', borderRadius:12, fontSize:'0.82rem',
                            border: isToday && !isSel ? '1px solid rgba(201,168,76,0.2)' : 'none',
                            cursor: off ? 'not-allowed' : 'pointer',
                            background: isSel ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : 'transparent',
                            color: isSel ? '#000' : off ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.55)',
                            fontWeight: isSel ? 600 : 400,
                            boxShadow: isSel ? '0 4px 20px rgba(201,168,76,0.35)' : 'none',
                            transition:'all 0.25s ease',
                            fontFamily:'Jost,sans-serif',
                          }}>
                          {format(day,'d')}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time slots */}
                <div>
                  {sel.date ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                        <Calendar size={13} color="#C9A84C" strokeWidth={1.5} />
                        <p style={{ fontSize:11, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', fontFamily:'Jost,sans-serif' }}>
                          {format(sel.date,'EEEE, MMMM d')}
                        </p>
                      </div>

                      {/* Morning / Afternoon labels */}
                      <p style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', marginBottom:10, fontFamily:'Jost,sans-serif' }}>
                        Morning
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
                        {SLOTS.filter(s => parseInt(s) < 13).map(slot => {
                          const tk    = taken.includes(slot)
                          const isSel = sel.time === slot
                          return (
                            <button key={slot} disabled={tk}
                              onClick={() => setSel(p=>({...p,time:slot}))}
                              className="appt-slot-btn"
                              style={{
                                padding:'0.8rem 0', borderRadius:12, fontSize:'0.85rem',
                                cursor: tk ? 'not-allowed' : 'pointer',
                                border: isSel ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                background: isSel ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : 'rgba(255,255,255,0.02)',
                                color: isSel ? '#000' : tk ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
                                fontWeight: isSel ? 600 : 300,
                                textDecoration: tk ? 'line-through' : 'none',
                                boxShadow: isSel ? '0 4px 20px rgba(201,168,76,0.3)' : 'none',
                                transition:'all 0.25s ease',
                                fontFamily:'Jost,sans-serif',
                              }}>
                              {slot}
                            </button>
                          )
                        })}
                      </div>

                      <p style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.18)', marginBottom:10, fontFamily:'Jost,sans-serif' }}>
                        Afternoon
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                        {SLOTS.filter(s => parseInt(s) >= 13).map(slot => {
                          const tk    = taken.includes(slot)
                          const isSel = sel.time === slot
                          return (
                            <button key={slot} disabled={tk}
                              onClick={() => setSel(p=>({...p,time:slot}))}
                              className="appt-slot-btn"
                              style={{
                                padding:'0.8rem 0', borderRadius:12, fontSize:'0.85rem',
                                cursor: tk ? 'not-allowed' : 'pointer',
                                border: isSel ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                background: isSel ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : 'rgba(255,255,255,0.02)',
                                color: isSel ? '#000' : tk ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
                                fontWeight: isSel ? 600 : 300,
                                textDecoration: tk ? 'line-through' : 'none',
                                boxShadow: isSel ? '0 4px 20px rgba(201,168,76,0.3)' : 'none',
                                transition:'all 0.25s ease',
                                fontFamily:'Jost,sans-serif',
                              }}>
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{
                      height:'100%', minHeight:200, display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center', gap:12,
                      borderRadius:22, border:'1px dashed rgba(255,255,255,0.06)',
                      background:'rgba(255,255,255,0.01)',
                    }}>
                      <Calendar size={28} color="rgba(255,255,255,0.1)" strokeWidth={1} />
                      <p style={{ color:'rgba(255,255,255,0.18)', fontSize:'0.85rem', fontStyle:'italic' }}>Select a date first</p>
                    </div>
                  )}
                </div>
              </div>

              {sel.date && sel.time && (
                <motion.div
                  initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                  style={{ textAlign:'center', marginTop:48 }}>
                  <button className="btn-gold" onClick={() => setStep(3)}>
                    Continue <ArrowRight size={15}/>
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: Confirm ─────────────────────────── */}
          {step===3 && (
            <motion.div key="s3" {...fadeSlide}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:40 }}>
                <div>
                  <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem', marginBottom:4 }}>Confirm booking</h3>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.82rem' }}>Review your appointment details</p>
                </div>
                <button onClick={() => setStep(2)} className="appt-back-btn" style={{
                  color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                  padding:'9px 16px', fontSize:'0.8rem', fontFamily:'Jost,sans-serif',
                  transition:'all 0.3s',
                }}>
                  <ChevronLeft size={14}/>Back
                </button>
              </div>

              {/* Summary card */}
              <div style={{
                borderRadius:22, padding:'2.25rem',
                background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                marginBottom:28, position:'relative', overflow:'hidden',
              }}>
                {/* Subtle corner glow */}
                <div style={{
                  position:'absolute', top:-40, right:-40, width:160, height:160,
                  background:'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
                  pointerEvents:'none',
                }} />

                {[
                  { label:'Service', value: sel.service?.name, extra: sel.service?.price ? `€${sel.service.price}` : null },
                  { label:'Stylist', value: sel.stylist?.name },
                  { label:'Date',    value: sel.date ? format(sel.date,'EEEE, MMMM d, yyyy') : '' },
                  { label:'Time',    value: sel.time },
                ].map(({ label, value, extra }, i, arr) => (
                  <div key={label} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'1.15rem 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <span style={{
                      fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase',
                      color:'rgba(255,255,255,0.25)', fontFamily:'Jost,sans-serif',
                    }}>{label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ color:'#f0f0f0', fontSize:'0.9rem', fontFamily:'Jost,sans-serif', fontWeight:300 }}>{value}</span>
                      {extra && (
                        <span style={{
                          padding:'3px 12px', borderRadius:9999,
                          background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.15)',
                          fontSize:11, color:'#C9A84C', fontFamily:'Jost,sans-serif',
                        }}>{extra}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div style={{ marginBottom:28 }}>
                <label style={{
                  display:'block', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase',
                  color:'rgba(255,255,255,0.25)', marginBottom:10, fontFamily:'Jost,sans-serif',
                }}>
                  Notes (optional)
                </label>
                <textarea value={sel.notes} onChange={e => setSel(p=>({...p,notes:e.target.value}))} rows={3}
                  placeholder="Any special requests or preferences..."
                  className="appt-textarea"
                  style={{
                    width:'100%', background:'rgba(255,255,255,0.02)',
                    border:'1px solid rgba(255,255,255,0.06)', borderRadius:16,
                    padding:'1rem 1.25rem', fontSize:'0.88rem', color:'#f0f0f0',
                    outline:'none', fontFamily:'Jost,sans-serif', fontWeight:300,
                    resize:'none', transition:'border-color 0.3s',
                  }}
                />
              </div>

              {!user && (
                <div style={{
                  textAlign:'center', padding:'14px 20px', borderRadius:14,
                  background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.12)',
                  marginBottom:20,
                }}>
                  <p style={{ color:'rgba(251,191,36,0.8)', fontSize:'0.84rem', fontFamily:'Jost,sans-serif' }}>
                    Please sign in to confirm your booking.
                  </p>
                </div>
              )}

              <button className="btn-gold" onClick={book} disabled={saving || !user} style={{ width:'100%' }}>
                {saving
                  ? <div style={{ width:16, height:16, border:'2px solid rgba(0,0,0,0.25)', borderTopColor:'#000', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                  : <>Confirm Booking <Check size={15}/></>
                }
              </button>

              {/* Loyalty hint */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                marginTop:16,
              }}>
                <Sparkles size={11} color="rgba(201,168,76,0.4)" />
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:'0.12em', fontFamily:'Jost,sans-serif' }}>
                  You'll earn +10 loyalty points
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Scoped hover styles ─────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .appt-datetime-grid {
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 700px) {
          .appt-datetime-grid { grid-template-columns: 1fr; }
          .appt-step-label { display: none; }
        }

        .appt-card:hover {
          border-color: rgba(201,168,76,0.3) !important;
          background: rgba(201,168,76,0.04) !important;
          transform: translateY(-4px);
          box-shadow: 0 12px 48px rgba(201,168,76,0.08);
        }
        .appt-card:hover .appt-card-accent {
          width: 60% !important;
        }

        .appt-back-btn:hover {
          color: rgba(255,255,255,0.6) !important;
          border-color: rgba(255,255,255,0.12) !important;
          background: rgba(255,255,255,0.06) !important;
        }

        .appt-nav-btn:hover {
          background: rgba(201,168,76,0.08) !important;
          border-color: rgba(201,168,76,0.2) !important;
          color: #C9A84C !important;
        }

        .appt-day-btn:not(:disabled):hover {
          background: rgba(201,168,76,0.1) !important;
          color: #C9A84C !important;
        }

        .appt-slot-btn:not(:disabled):hover {
          border-color: rgba(201,168,76,0.25) !important;
          background: rgba(201,168,76,0.06) !important;
          color: #C9A84C !important;
        }

        .appt-textarea:focus {
          border-color: rgba(201,168,76,0.35) !important;
        }
        .appt-textarea::placeholder {
          color: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  )
}
