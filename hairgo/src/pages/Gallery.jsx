import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CATS = ['All', 'Cut', 'Color', 'Treatment', 'Style']

const placeholders = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  category: CATS[(i % 4) + 1].toLowerCase(),
  ph: true,
  height: [220, 280, 250, 190, 310, 240][i % 6],
}))

export default function Gallery() {
  const [images, setImages]   = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive]   = useState('All')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    supabase.from('gallery').select('*, stylists(name)').order('display_order')
      .then(({ data }) => { setImages(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  const filtered = active === 'All' ? images : images.filter(img => img.category === active.toLowerCase())
  const items    = loading ? placeholders : (filtered.length > 0 ? filtered : placeholders)

  return (
    <div style={{ minHeight:'100vh', paddingTop:140, paddingBottom:120 }}>
      <div className="wrap">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.75, ease:[0.22,1,0.36,1] }}
          style={{ textAlign:'center', marginBottom:72 }}>
          <span className="sec-label">Our Work</span>
          <h1 className="font-display font-light"
            style={{ color:'#fff', fontSize:'clamp(3rem,8vw,6rem)', textAlign:'center', marginBottom:'1.5rem' }}>
            Gallery
          </h1>
          <div className="gold-bar" />
          <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.9rem', lineHeight:1.85, maxWidth:460, margin:'0 auto', textAlign:'center' }}>
            A showcase of transformations — each cut a unique story of artistry and care.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.75rem', flexWrap:'wrap', marginBottom:64 }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={active === cat ? 'btn-gold' : 'btn-outline'}
              style={active === cat ? { padding:'12px 28px' } : { padding:'11px 28px' }}>
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Masonry */}
        <div style={{ columns:'2 200px', columnGap:'1.25rem' }}>
          {items.map((item, i) => (
            <motion.div key={item.id ?? i}
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              transition={{ duration:0.55, delay:i * 0.035 }}
              onClick={() => !loading && setLightbox(item)}
              style={{ marginBottom:'1.25rem', breakInside:'avoid', height:item.height || 240,
                borderRadius:20, overflow:'hidden', position:'relative',
                cursor: loading ? 'default' : 'pointer' }}
            >
              {item.image_url ? (
                <img src={item.image_url} alt={item.title || ''}
                  style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.7s ease' }}
                  onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
              ) : (
                <div style={{ width:'100%', height:'100%' }}
                  className={item.ph ? 'shimmer' : ''} />
              )}

              {/* Hover overlay */}
              {!loading && (
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
                  opacity:0, transition:'opacity 0.35s', display:'flex', alignItems:'center', justifyContent:'center' }}
                  onMouseEnter={e => e.currentTarget.style.opacity='1'}
                  onMouseLeave={e => e.currentTarget.style.opacity='0'}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(15,15,15,0.8)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <ZoomIn size={17} color="rgba(255,255,255,0.8)" />
                  </div>
                  {item.category && (
                    <div style={{ position:'absolute', bottom:14, left:14 }}>
                      <span style={{ fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', padding:'5px 12px', borderRadius:9999, background:'rgba(201,168,76,0.22)', color:'#C9A84C', backdropFilter:'blur(8px)' }}>
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.93)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}
            onClick={() => setLightbox(null)}>
            <button style={{ position:'absolute', top:24, right:24, width:44, height:44, borderRadius:'50%', background:'rgba(20,20,20,0.8)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>
              <X size={18} />
            </button>
            <motion.div initial={{ scale:0.88, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.88, opacity:0 }}
              transition={{ type:'spring', damping:26, stiffness:280 }}
              style={{ maxWidth:640, maxHeight:'88vh', borderRadius:24, overflow:'hidden', boxShadow:'0 40px 120px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}>
              {lightbox.image_url
                ? <img src={lightbox.image_url} alt={lightbox.title || ''} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                : <div style={{ width:'100%', height:320, background:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.85rem' }}>No image</span>
                  </div>
              }
              {(lightbox.title || lightbox.stylists?.name) && (
                <div style={{ padding:'1.25rem 1.5rem', background:'#111', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  {lightbox.title && <p className="font-display" style={{ fontSize:'1.2rem', color:'#fff' }}>{lightbox.title}</p>}
                  {lightbox.stylists?.name && <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.32)', marginTop:4 }}>by {lightbox.stylists.name}</p>}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
