import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronLeft, ChevronRight, Check, User, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay
} from 'date-fns'
import toast from 'react-hot-toast'

const STEPS = ['Service', 'Stylist', 'Date & Time', 'Confirm']
const SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30']

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

  // ── Shared input style ──────────────────────────────────────────────────
  const inp = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'1rem 1.25rem', fontSize:'0.88rem', color:'#f0f0f0', outline:'none', fontFamily:'Jost,sans-serif', fontWeight:300, resize:'none', transition:'border-color 0.3s' }

  if (done) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'2rem' }}>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', damping:20 }}>
        <div style={{ width:96, height:96, borderRadius:'50%', background:'linear-gradient(135deg,#C9A84C,#C4956A)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 2.5rem auto', boxShadow:'0 12px 56px rgba(201,168,76,0.45)' }}>
          <Check size={40} color="#000" />
        </div>
        <h2 className="font-display font-light" style={{ fontSize:'4rem', color:'#fff', marginBottom:'1.25rem' }}>Booked!</h2>
        <div className="gold-bar" />
        <p style={{ color:'rgba(255,255,255,0.42)', fontSize:'0.9rem', lineHeight:1.85, maxWidth:380, margin:'1.5rem auto 3rem auto' }}>
          Your appointment on <strong style={{ color:'#fff' }}>{format(sel.date,'MMMM d, yyyy')}</strong> at{' '}
          <strong style={{ color:'#fff' }}>{sel.time}</strong> with{' '}
          <strong style={{ color:'#fff' }}>{sel.stylist?.name}</strong> is pending confirmation.
        </p>
        <button className="btn-gold"
          onClick={() => { setDone(false); setStep(0); setSel({ service:null, stylist:null, date:null, time:null, notes:'' }) }}>
          Book Another <ArrowRight size={15} />
        </button>
      </motion.div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', paddingTop:160, paddingBottom:120, paddingLeft:'1.5rem', paddingRight:'1.5rem' }}>
      <div style={{ width:'100%', maxWidth:720, marginLeft:'auto', marginRight:'auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <span className="sec-label">Reserve Your Visit</span>
          <h1 className="font-display font-light"
            style={{ color:'#fff', fontSize:'clamp(2.5rem,6vw,4.5rem)', textAlign:'center', marginBottom:'1.5rem' }}>
            Book Appointment
          </h1>
          <div className="gold-bar" />
        </div>

        {/* Steps */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', flexWrap:'wrap', marginBottom:56 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{
                display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:9999,
                fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', fontFamily:'Jost,sans-serif',
                transition:'all 0.35s',
                background: i===step ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : i<step ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.05)',
                color: i===step ? '#000' : i<step ? '#C9A84C' : 'rgba(255,255,255,0.25)',
                fontWeight: i===step ? 600 : 400,
                boxShadow: i===step ? '0 4px 20px rgba(201,168,76,0.3)' : 'none',
                whiteSpace:'nowrap',
              }}>
                <span style={{ width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, border:`1px solid currentColor` }}>
                  {i<step ? <Check size={8}/> : i+1}
                </span>
                <span style={{ display: window.innerWidth >= 640 ? 'inline' : 'none' }}>{s}</span>
              </div>
              {i<STEPS.length-1 && (
                <div style={{ width:28, height:1, background: i<step ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)' }} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 0: Service ──────────────────────────────── */}
          {step===0 && (
            <motion.div key="s0" initial={{ opacity:0, x:28 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-28 }} transition={{ duration:0.3 }}>
              <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem', textAlign:'center', marginBottom:36 }}>
                Choose a service
              </h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'1.25rem' }}>
                {(services.length ? services : Array.from({length:4},(_,i)=>({id:i,name:'Loading...',description:'',price:'',duration:0}))).map(svc => (
                  <button key={svc.id}
                    onClick={() => { setSel(p=>({...p,service:svc})); setStep(1) }}
                    style={{
                      textAlign:'left', padding:'2rem', borderRadius:20,
                      border: sel.service?.id===svc.id ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.07)',
                      background: sel.service?.id===svc.id ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.025)',
                      cursor:'pointer', transition:'all 0.3s', width:'100%',
                      boxShadow: sel.service?.id===svc.id ? '0 8px 32px rgba(201,168,76,0.15)' : 'none',
                    }}
                    onMouseEnter={e => { if(sel.service?.id!==svc.id) { e.currentTarget.style.borderColor='rgba(201,168,76,0.25)'; e.currentTarget.style.transform='translateY(-3px)' }}}
                    onMouseLeave={e => { if(sel.service?.id!==svc.id) { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.transform='translateY(0)' }}}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                      <h4 className="font-display" style={{ fontSize:'1.3rem', color:'#fff' }}>{svc.name}</h4>
                      {svc.price && <span style={{ color:'#C9A84C', fontSize:'0.9rem' }}>€{svc.price}</span>}
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.85rem', lineHeight:1.8 }}>{svc.description}</p>
                    {svc.duration>0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:'1rem', color:'rgba(255,255,255,0.25)', fontSize:'0.78rem' }}>
                        <Clock size={12}/>{svc.duration} min
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Stylist ─────────────────────────────── */}
          {step===1 && (
            <motion.div key="s1" initial={{ opacity:0, x:28 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-28 }} transition={{ duration:0.3 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:36 }}>
                <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem' }}>Choose a stylist</h3>
                <button onClick={() => setStep(0)} style={{ color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:'0.85rem' }}>
                  <ChevronLeft size={14}/> Back
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1.25rem' }}>
                {(stylists.length ? stylists : Array.from({length:3},(_,i)=>({id:i,name:'...',title:''}))).map(sty => (
                  <button key={sty.id}
                    onClick={() => { setSel(p=>({...p,stylist:sty})); setStep(2) }}
                    style={{
                      textAlign:'center', padding:'2.25rem 1.5rem', borderRadius:20,
                      border: sel.stylist?.id===sty.id ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.07)',
                      background: sel.stylist?.id===sty.id ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.025)',
                      cursor:'pointer', transition:'all 0.3s', width:'100%',
                    }}
                    onMouseEnter={e => { if(sel.stylist?.id!==sty.id) { e.currentTarget.style.transform='translateY(-3px)' }}}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
                  >
                    <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,rgba(201,168,76,0.18),rgba(196,149,106,0.12))', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem auto', overflow:'hidden' }}>
                      {sty.photo_url
                        ? <img src={sty.photo_url} alt={sty.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        : <User size={24} color="#C9A84C"/>
                      }
                    </div>
                    <h4 className="font-display" style={{ fontSize:'1.2rem', color:'#fff', marginBottom:'0.35rem' }}>{sty.name}</h4>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase' }}>{sty.title}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Date & Time ─────────────────────────── */}
          {step===2 && (
            <motion.div key="s2" initial={{ opacity:0, x:28 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-28 }} transition={{ duration:0.3 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:36 }}>
                <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem' }}>Pick a date & time</h3>
                <button onClick={() => setStep(1)} style={{ color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:'0.85rem' }}>
                  <ChevronLeft size={14}/> Back
                </button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'2rem' }} className="sm:grid-cols-2">
                {/* Calendar */}
                <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'1.75rem' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                    <button onClick={() => setMonth(subMonths(month,1))} style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', cursor:'pointer' }}>
                      <ChevronLeft size={15}/>
                    </button>
                    <span style={{ color:'#fff', fontSize:'0.9rem', letterSpacing:'0.06em' }}>{format(month,'MMMM yyyy')}</span>
                    <button onClick={() => setMonth(addMonths(month,1))} style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', cursor:'pointer' }}>
                      <ChevronRight size={15}/>
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:8 }}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(
                      <div key={d} style={{ textAlign:'center', fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.12em', textTransform:'uppercase', padding:'4px 0' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                    {Array.from({length:startPad}).map((_,i)=><div key={`p${i}`}/>)}
                    {days.map(day => {
                      const off  = isOff(day)
                      const isSel = sel.date && isSameDay(day,sel.date)
                      return (
                        <button key={day.toString()} disabled={off}
                          onClick={() => setSel(p=>({...p,date:day,time:null}))}
                          style={{
                            aspectRatio:'1/1', borderRadius:10, fontSize:'0.8rem', border:'none', cursor: off ? 'not-allowed' : 'pointer',
                            background: isSel ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : 'transparent',
                            color: isSel ? '#000' : off ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
                            fontWeight: isSel ? 600 : 400,
                            boxShadow: isSel ? '0 4px 16px rgba(201,168,76,0.35)' : 'none',
                            transition:'all 0.2s',
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
                      <p style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginBottom:20 }}>
                        {format(sel.date,'EEEE, MMMM d')}
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                        {SLOTS.map(slot => {
                          const tk   = taken.includes(slot)
                          const isSel = sel.time===slot
                          return (
                            <button key={slot} disabled={tk}
                              onClick={() => setSel(p=>({...p,time:slot}))}
                              style={{
                                padding:'0.75rem 0', borderRadius:12, fontSize:'0.85rem', cursor: tk ? 'not-allowed' : 'pointer',
                                border: isSel ? 'none' : '1px solid rgba(255,255,255,0.07)',
                                background: isSel ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : 'rgba(255,255,255,0.025)',
                                color: isSel ? '#000' : tk ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
                                fontWeight: isSel ? 600 : 400,
                                textDecoration: tk ? 'line-through' : 'none',
                                boxShadow: isSel ? '0 4px 16px rgba(201,168,76,0.3)' : 'none',
                                transition:'all 0.2s',
                              }}>
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.88rem', fontStyle:'italic' }}>Select a date first</p>
                    </div>
                  )}
                </div>
              </div>

              {sel.date && sel.time && (
                <div style={{ textAlign:'center', marginTop:40 }}>
                  <button className="btn-gold" onClick={() => setStep(3)}>
                    Continue <ArrowRight size={15}/>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: Confirm ─────────────────────────────── */}
          {step===3 && (
            <motion.div key="s3" initial={{ opacity:0, x:28 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-28 }} transition={{ duration:0.3 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:36 }}>
                <h3 className="font-display" style={{ color:'#fff', fontSize:'1.6rem' }}>Confirm booking</h3>
                <button onClick={() => setStep(2)} style={{ color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:'0.85rem' }}>
                  <ChevronLeft size={14}/> Back
                </button>
              </div>

              {/* Summary */}
              <div className="glass" style={{ borderRadius:20, padding:'2rem', marginBottom:28 }}>
                {[
                  { label:'Service', value:`${sel.service?.name} · €${sel.service?.price}` },
                  { label:'Stylist', value:sel.stylist?.name },
                  { label:'Date',    value:sel.date ? format(sel.date,'EEEE, MMMM d, yyyy') : '' },
                  { label:'Time',    value:sel.time },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.1rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}
                    className="last:border-0">
                    <span style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.27)' }}>{label}</span>
                    <span style={{ color:'#f0f0f0', fontSize:'0.9rem' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div style={{ marginBottom:28 }}>
                <label style={{ display:'block', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.27)', marginBottom:10 }}>
                  Notes (optional)
                </label>
                <textarea value={sel.notes} onChange={e => setSel(p=>({...p,notes:e.target.value}))} rows={3}
                  placeholder="Any special requests or preferences..." style={inp}
                  onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.45)'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                />
              </div>

              {!user && <p style={{ textAlign:'center', color:'rgba(251,191,36,0.75)', fontSize:'0.85rem', marginBottom:20 }}>Please sign in to confirm your booking.</p>}

              <button className="btn-gold" onClick={book} disabled={saving || !user} style={{ width:'100%' }}>
                {saving
                  ? <div style={{ width:16, height:16, border:'2px solid rgba(0,0,0,0.25)', borderTopColor:'#000', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                  : <>Confirm Booking <Check size={15}/></>
                }
              </button>
              <p style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:12, letterSpacing:'0.15em' }}>
                You'll earn +10 loyalty points
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
