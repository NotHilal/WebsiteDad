import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, Clock, User, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATS    = ['All', 'Cut', 'Color', 'Style', 'Treatment']
const GENDERS = ['All', 'Woman', 'Man']

const GALLERY = [
  {
    id: 1, category: 'cut', gender: 'woman', h: 320,
    image_url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=85',
    title: 'Precision French Bob',
    description: 'A sleek, jaw-length bob sculpted to perfection. Clean lines and effortless movement make this cut a timeless signature for modern elegance.',
    stylist: 'Sophie Laurent', duration: '45 min', price: 'from €45',
  },
  {
    id: 2, category: 'color', gender: 'woman', h: 260,
    image_url: 'https://images.unsplash.com/photo-1614020863825-28a0bb7e3c3c?auto=format&fit=crop&w=800&q=85',
    title: 'Sunlit Balayage',
    description: 'Hand-painted highlights that mimic the natural warmth of sunlight. Seamlessly blended from root to tip for a lived-in, radiant finish.',
    stylist: 'Isabelle Moreau', duration: '2h 30 min', price: 'from €120',
  },
  {
    id: 3, category: 'style', gender: 'woman', h: 280,
    image_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=85',
    title: 'Voluminous Blow-Out',
    description: 'Full-bodied, glossy blow-out styled for lasting hold and maximum shine. Perfect for special occasions or whenever you want to feel extraordinary.',
    stylist: 'Camille Dubois', duration: '45 min', price: 'from €55',
  },
  {
    id: 4, category: 'color', gender: 'woman', h: 300,
    image_url: 'https://images.unsplash.com/photo-1554519934-e32b1629d9ee?auto=format&fit=crop&w=800&q=85',
    title: 'Warm Copper Ombré',
    description: 'A rich gradient transitioning from deep roots to warm copper ends. Expertly blended for a bold yet sophisticated colour story.',
    stylist: 'Marie Fontaine', duration: '3h', price: 'from €150',
  },
  {
    id: 5, category: 'cut', gender: 'woman', h: 250,
    image_url: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?auto=format&fit=crop&w=800&q=85',
    title: 'Textured Layers',
    description: 'Soft, cascading layers that add movement and body to any hair type. Personalised to complement your face shape and natural texture.',
    stylist: 'Sophie Laurent', duration: '1h', price: 'from €65',
  },
  {
    id: 6, category: 'treatment', gender: 'woman', h: 270,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=85',
    title: 'Keratin Smoothing',
    description: 'A professional keratin treatment that eliminates frizz and restores silk-like smoothness for up to 3 months. Ideal for fine or unruly hair.',
    stylist: 'Elena Rousseau', duration: '2h', price: 'from €180',
  },
  {
    id: 7, category: 'color', gender: 'woman', h: 290,
    image_url: 'https://images.unsplash.com/photo-1605980766335-d3a41c7332a1?auto=format&fit=crop&w=800&q=85',
    title: 'Platinum Highlights',
    description: 'Striking platinum streaks woven through darker roots for a high-contrast, editorial look. Bold, luminous, and completely unforgettable.',
    stylist: 'Isabelle Moreau', duration: '3h 30 min', price: 'from €180',
  },
  {
    id: 8, category: 'style', gender: 'woman', h: 240,
    image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=800&q=85',
    title: 'Effortless Beach Waves',
    description: 'Tousled, sun-kissed waves styled to look naturally undone. Light and breezy — the ultimate everyday glamour.',
    stylist: 'Camille Dubois', duration: '1h', price: 'from €65',
  },
  {
    id: 9, category: 'cut', gender: 'man', h: 300,
    image_url: 'https://images.unsplash.com/photo-1595475884562-073c30d45670?auto=format&fit=crop&w=800&q=85',
    title: 'Classic Men\'s Cut',
    description: 'A refined, well-structured cut tailored to the individual. Clean edges, precise fade, and a finish that stays sharp all week.',
    stylist: 'Julien Lefebvre', duration: '45 min', price: 'from €40',
  },
  {
    id: 10, category: 'treatment', gender: 'man', h: 260,
    image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=85',
    title: 'Deep Hydration Ritual',
    description: 'An intensive moisture treatment that revives dry, damaged hair from within. Leaves strands visibly stronger, softer, and full of life.',
    stylist: 'Elena Rousseau', duration: '1h 15 min', price: 'from €95',
  },
  {
    id: 11, category: 'style', gender: 'woman', h: 270,
    image_url: 'https://images.unsplash.com/photo-1499557354967-2b2d8910bcca?auto=format&fit=crop&w=800&q=85',
    title: 'Updo Elegance',
    description: 'A sculpted updo that balances sophistication and softness. Crafted for weddings, galas, or any moment that deserves to be remembered.',
    stylist: 'Antoine Bernard', duration: '1h 30 min', price: 'from €90',
  },
  {
    id: 12, category: 'color', gender: 'woman', h: 250,
    image_url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=800&q=85',
    title: 'Vivid Fantasy Color',
    description: 'Fearless, head-turning colour crafted for those who dare to stand out. Every shade mixed and applied with precision for a lasting, luminous result.',
    stylist: 'Marie Fontaine', duration: '4h', price: 'from €220',
  },
]

export default function Gallery() {
  const [images, setImages]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [active, setActive]     = useState('All')
  const [gender, setGender]     = useState('All')
  const [page, setPage]         = useState(1)
  const [lightbox, setLightbox] = useState(null)

  const PER_PAGE = 6

  useEffect(() => {
    supabase.from('gallery').select('*, stylists(name)').order('display_order')
      .then(({ data }) => { setImages(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const source   = images.length > 0 ? images : GALLERY
  const filtered = source
    .filter(img => active === 'All' || img.category === active.toLowerCase())
    .filter(img => gender === 'All' || img.gender === gender.toLowerCase())
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function changePage(p) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changeFilter(fn) {
    fn()
    setPage(1)
  }

  return (
    <div style={{ minHeight:'100vh', paddingTop:120, paddingBottom:80 }}>
      <div className="wrap">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.75, ease:[0.22,1,0.36,1] }}
          style={{ textAlign:'center', marginBottom:48 }}>
          <h1 className="font-display font-light"
            style={{ color:'#fff', fontSize:'clamp(3rem,8vw,6rem)', textAlign:'center', marginBottom:'0.5rem' }}>
            Gallery
          </h1>
          <span className="sec-label">Our Work</span>
          <div className="gold-bar" style={{ marginTop:'1rem', marginBottom:'1.25rem' }} />
          <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.9rem', lineHeight:1.85, maxWidth:420, margin:'0 auto' }}>
            Every image is a story of craft, care, and transformation.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.75rem', marginBottom:48 }}>

          {/* Gender selector */}
          <div style={{ display:'flex', alignItems:'center', gap:0 }}>
            {GENDERS.map((g, i) => (
              <div key={g} style={{ display:'flex', alignItems:'center' }}>
                <button onClick={() => changeFilter(() => setGender(g))} style={{
                  background:'none', border:'none', cursor:'pointer', padding:'0 2rem',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  transition:'all 0.35s ease',
                }}>
                  <span className="font-display" style={{
                    fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:300, fontStyle:'italic',
                    color: gender === g ? '#C9A84C' : 'rgba(255,255,255,0.2)',
                    transition:'color 0.35s ease',
                    letterSpacing:'0.02em',
                  }}>{g}</span>
                  <motion.div
                    animate={{ scaleX: gender === g ? 1 : 0, opacity: gender === g ? 1 : 0 }}
                    transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
                    style={{ height:1, width:32, background:'linear-gradient(90deg,transparent,#C9A84C,transparent)', transformOrigin:'center' }}
                  />
                </button>
                {i < GENDERS.length - 1 && (
                  <div style={{ width:1, height:28, background:'rgba(255,255,255,0.08)' }} />
                )}
              </div>
            ))}
          </div>

          {/* Category pills */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', flexWrap:'wrap' }}>
            {CATS.map(cat => (
              <button key={cat} onClick={() => changeFilter(() => setActive(cat))} style={{
                padding:'9px 22px', borderRadius:9999, cursor:'pointer',
                fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase',
                fontFamily:'Jost,sans-serif', fontWeight:500, transition:'all 0.3s ease',
                background: active === cat ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : 'rgba(255,255,255,0.04)',
                border: active === cat ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: active === cat ? '#000' : 'rgba(255,255,255,0.45)',
                boxShadow: active === cat ? '0 6px 24px rgba(201,168,76,0.3)' : 'none',
              }}>{cat}</button>
            ))}
          </div>

        </motion.div>

        {/* Grid */}
        <motion.div layout style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1.25rem' }}>
          <AnimatePresence>
            {paginated.map((item, i) => (
              <motion.div key={item.id}
                layout
                initial={{ opacity:0, scale:0.94 }}
                animate={{ opacity:1, scale:1 }}
                exit={{ opacity:0, scale:0.94 }}
                transition={{ duration:0.45, delay:i * 0.04 }}
                onClick={() => setLightbox(item)}
                className="gallery-item"
                style={{
                  aspectRatio:'4/3', borderRadius:20, overflow:'hidden',
                  position:'relative', cursor:'pointer',
                  border:'1px solid rgba(255,255,255,0.05)',
                }}
              >
                <img src={item.image_url} alt={item.title || ''}
                  className="gallery-img"
                  style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.7s ease' }} />

                {/* Hover overlay */}
                <div className="gallery-overlay" style={{
                  position:'absolute', inset:0,
                  background:'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
                  opacity:0, transition:'opacity 0.35s ease',
                  display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'1.25rem',
                }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <p className="font-display" style={{ color:'#fff', fontSize:'1rem', marginBottom:4 }}>{item.title}</p>
                      <span style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>{item.category}</span>
                    </div>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(201,168,76,0.9)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ZoomIn size={15} color="#000" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', marginTop:48 }}>

            {/* Prev */}
            <button onClick={() => changePage(page - 1)} disabled={page === 1}
              style={{
                width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                color: page === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                cursor: page === 1 ? 'not-allowed' : 'pointer', transition:'all 0.2s',
              }}>
              ‹
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => changePage(p)}
                style={{
                  width:40, height:40, borderRadius:12,
                  fontSize:13, fontFamily:'Jost,sans-serif',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', transition:'all 0.25s ease',
                  background: p === page ? 'linear-gradient(135deg,#C9A84C,#C4956A)' : 'rgba(255,255,255,0.04)',
                  border: p === page ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: p === page ? '#000' : 'rgba(255,255,255,0.45)',
                  fontWeight: p === page ? 600 : 400,
                  boxShadow: p === page ? '0 4px 16px rgba(201,168,76,0.3)' : 'none',
                }}>
                {p}
              </button>
            ))}

            {/* Next */}
            <button onClick={() => changePage(page + 1)} disabled={page === totalPages}
              style={{
                width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                color: page === totalPages ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                cursor: page === totalPages ? 'not-allowed' : 'pointer', transition:'all 0.2s',
              }}>
              ›
            </button>

          </motion.div>
        )}

      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.25 }}
            style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ opacity:0, scale:0.92, y:24 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.92, y:24 }}
              transition={{ type:'spring', damping:28, stiffness:300 }}
              onClick={e => e.stopPropagation()}
              style={{
                display:'grid', gridTemplateColumns:'1fr 1fr',
                maxWidth:900, width:'100%', maxHeight:'88vh',
                borderRadius:28, overflow:'hidden',
                boxShadow:'0 48px 120px rgba(0,0,0,0.9)',
                border:'1px solid rgba(201,168,76,0.12)',
              }}
            >
              {/* Image side */}
              <div style={{ position:'relative', overflow:'hidden', minHeight:400 }}>
                <img src={lightbox.image_url} alt={lightbox.title || ''}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, transparent 70%, rgba(10,10,10,0.6))' }} />
              </div>

              {/* Detail side */}
              <div style={{
                background:'#0d0d0d', padding:'2rem 2.5rem',
                display:'flex', flexDirection:'column', justifyContent:'center', gap:'1.25rem',
                overflowY:'auto', position:'relative',
              }}>
                {/* Close button */}
                <button
                  onClick={() => setLightbox(null)}
                  style={{ position:'absolute', top:14, right:14, width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(201,168,76,0.4)'; e.currentTarget.style.color='#C9A84C' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.color='rgba(255,255,255,0.5)' }}
                >
                  <X size={15} />
                </button>

                {/* Category badge */}
                <div>
                  <span style={{
                    display:'inline-block', padding:'5px 16px', borderRadius:9999,
                    background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)',
                    fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase',
                    color:'#C9A84C', fontFamily:'Jost,sans-serif',
                  }}>
                    {lightbox.category}
                  </span>
                </div>

                {/* Title */}
                <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(1.6rem,3vw,2.2rem)', lineHeight:1.1, margin:0 }}>
                  {lightbox.title}
                </h2>

                <div className="gold-bar" style={{ margin:0 }} />

                {/* Description */}
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.88rem', lineHeight:1.9, margin:0 }}>
                  {lightbox.description}
                </p>

                {/* Meta */}
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {(lightbox.stylist || lightbox.stylists?.name) && (
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <User size={13} color="#C9A84C" />
                      </div>
                      <div>
                        <p style={{ fontSize:9, color:'rgba(255,255,255,0.28)', letterSpacing:'0.16em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', marginBottom:2 }}>Stylist</p>
                        <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.7)', fontFamily:'Jost,sans-serif' }}>{lightbox.stylist || lightbox.stylists?.name}</p>
                      </div>
                    </div>
                  )}
                  {lightbox.duration && (
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Clock size={13} color="#C9A84C" />
                      </div>
                      <div>
                        <p style={{ fontSize:9, color:'rgba(255,255,255,0.28)', letterSpacing:'0.16em', textTransform:'uppercase', fontFamily:'Jost,sans-serif', marginBottom:2 }}>Duration</p>
                        <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.7)', fontFamily:'Jost,sans-serif' }}>{lightbox.duration}</p>
                      </div>
                    </div>
                  )}
                  {lightbox.price && (
                    <div style={{ paddingTop:'0.25rem' }}>
                      <span style={{ fontSize:'1.5rem', fontFamily:'Cormorant Garamond,serif', color:'#C9A84C' }}>{lightbox.price}</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Link to="/appointments" onClick={() => setLightbox(null)}
                  className="btn-gold" style={{ marginTop:'0.5rem', width:'100%', justifyContent:'center' }}>
                  Book this Service <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .gallery-item:hover .gallery-img { transform: scale(1.06); }
        .gallery-item:hover .gallery-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
