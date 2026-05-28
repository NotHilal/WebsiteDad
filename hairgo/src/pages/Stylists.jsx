import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link2, Scissors, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

const placeholders = Array.from({ length: 4 }, (_, i) => ({ id: i, ph: true }))

const inView = {
  hidden: { opacity:0, y:36 },
  visible: (i=0) => ({ opacity:1, y:0, transition:{ duration:0.8, delay:i*0.12, ease:[0.22,1,0.36,1] } }),
}

export default function Stylists() {
  const [stylists, setStylists] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('stylists').select('*').order('display_order')
      .then(({ data }) => { setStylists(data || []); setLoading(false) })
  }, [])

  const items = loading || stylists.length === 0 ? placeholders : stylists

  return (
    <div style={{ minHeight:'100vh', paddingTop:140, paddingBottom:120 }}>
      <div className="wrap">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.75, ease:[0.22,1,0.36,1] }}
          style={{ textAlign:'center', marginBottom:96 }}>
          <span className="sec-label">The Artists</span>
          <h1 className="font-display font-light"
            style={{ color:'#fff', fontSize:'clamp(3rem,8vw,6rem)', textAlign:'center', marginBottom:'1.5rem' }}>
            Our Team
          </h1>
          <div className="gold-bar" />
          <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.9rem', lineHeight:1.85, maxWidth:460, margin:'0 auto', textAlign:'center' }}>
            Passionate experts with years of training and a genuine eye for what makes you uniquely beautiful.
          </p>
        </motion.div>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))', gap:'3.5rem' }}>
          {items.map((s, i) => (
            <motion.div key={s.id} initial="hidden" animate={loading ? 'hidden' : 'visible'}
              custom={i} variants={inView} className="group">

              {/* Photo */}
              <div style={{ aspectRatio:'3/4', borderRadius:24, overflow:'hidden', marginBottom:'2rem',
                background:'linear-gradient(135deg,#1a1a1a,#141414)', border:'1px solid rgba(255,255,255,0.06)',
                position:'relative' }}>
                {s.photo_url
                  ? <img src={s.photo_url} alt={s.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.7s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
                  : s.ph
                  ? <div className="shimmer" style={{ width:'100%', height:'100%' }} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <User size={64} color="rgba(255,255,255,0.06)" />
                    </div>
                }
                {/* Hover overlay for instagram */}
                {s.instagram && !s.ph && (
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)', opacity:0, transition:'opacity 0.4s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity='1' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity='0' }}>
                    <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer"
                      style={{ position:'absolute', bottom:16, right:16, width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.6)', textDecoration:'none' }}
                      onClick={e => e.stopPropagation()}>
                      <Link2 size={15} />
                    </a>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ textAlign:'center' }}>
                {s.ph ? (
                  <>
                    <div className="shimmer" style={{ height:22, borderRadius:8, width:140, margin:'0 auto 12px' }} />
                    <div className="shimmer" style={{ height:12, borderRadius:6, width:100, margin:'0 auto 16px' }} />
                    <div className="shimmer" style={{ height:48, borderRadius:8 }} />
                  </>
                ) : (
                  <>
                    <h3 className="font-display" style={{ fontSize:'1.6rem', color:'#fff', marginBottom:'0.5rem', textAlign:'center' }}>{s.name}</h3>
                    <p style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C9A84C', marginBottom:'1.25rem', textAlign:'center' }}>{s.title}</p>
                    <p style={{ color:'rgba(255,255,255,0.36)', fontSize:'0.85rem', lineHeight:1.85, marginBottom:'1.5rem', textAlign:'center' }}
                      className="line-clamp-3">{s.bio}</p>
                    {s.specialties?.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'0.5rem' }}>
                        {s.specialties.map(spec => (
                          <span key={spec} style={{ padding:'5px 14px', borderRadius:9999, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.15)', color:'#C9A84C', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase' }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Join CTA */}
        <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          transition={{ duration:0.7 }} style={{ textAlign:'center', marginTop:100 }}>
          <div style={{ display:'inline-block', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(16px)', borderRadius:28, padding:'4rem 4rem' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,rgba(201,168,76,0.18),rgba(196,149,106,0.12))', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.75rem auto' }}>
              <Scissors size={22} color="#C9A84C" style={{ transform:'rotate(45deg)' }} />
            </div>
            <h3 className="font-display" style={{ fontSize:'2rem', color:'#fff', marginBottom:'1rem', textAlign:'center' }}>Join the family</h3>
            <div className="gold-bar" />
            <p style={{ color:'rgba(255,255,255,0.36)', fontSize:'0.88rem', lineHeight:1.85, maxWidth:340, margin:'0 auto', textAlign:'center' }}>
              Passionate about hair? We're always looking for talented stylists to join the HairGo team.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
