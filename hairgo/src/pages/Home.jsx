import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Star, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getOrFetch } from '../lib/cache'

const inView = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: (i = 0) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.9, delay: i * 0.11, ease: [0.25, 0.46, 0.45, 0.94] }
  }),
}

const cardIn = {
  hidden: { opacity: 0, y: 24, scale: 0.97, filter: 'blur(4px)' },
  visible: (i = 0) => ({
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }
  }),
}

const FALLBACK_TEAM = [
  { id: 'f1', name: 'Sophie Laurent',   title: 'Head Stylist',       photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
  { id: 'f2', name: 'Camille Dubois',   title: 'Style Expert',       photo_url: 'https://images.unsplash.com/photo-1573497019236-17f8177b81e8?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
  { id: 'f3', name: 'Julien Lefebvre',  title: 'Master Barber',      photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
  { id: 'f4', name: 'Antoine Bernard',  title: 'Creative Director',  photo_url: 'https://images.unsplash.com/photo-1590873803005-539ede4d828a?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
]


const FALLBACK_SERVICES = [
  { id: 'fsvc1', name: 'Precision Cut',     description: "Sculpted to your bone structure and lifestyle — a silhouette that's perfectly yours.", price_display: 'from €45', image_url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&h=260&q=80' },
  { id: 'fsvc2', name: 'Color & Highlights', description: 'Balayage, ombré, vivid transformations. Color that moves the way you do.',            price_display: 'from €80', image_url: 'https://images.unsplash.com/photo-1614020863825-28a0bb7e3c3c?auto=format&fit=crop&w=600&h=260&q=80' },
  { id: 'fsvc3', name: 'Blow-Out & Style',   description: 'A flawless finish for every occasion, from everyday elegance to special events.',        price_display: 'from €35', image_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&h=260&q=80' },
  { id: 'fsvc4', name: 'Hair Treatments',    description: "Keratin, deep hydration, and repair therapies to restore your hair's vitality.",          price_display: 'from €55', image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&h=260&q=80' },
]

const stats = [
  { value: '12+',   label: 'Years of expertise' },
  { value: '3,000+', label: 'Happy clients' },
  { value: '8',     label: 'Expert stylists' },
  { value: '4.9 ★', label: 'Average rating' },
]

const FALLBACK_GALLERY = [
  { id: 'fg1', image_url: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?auto=format&fit=crop&w=600&q=80' },
  { id: 'fg2', image_url: 'https://images.unsplash.com/photo-1595475884562-073c30d45670?auto=format&fit=crop&w=600&q=80' },
  { id: 'fg3', image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80' },
  { id: 'fg4', image_url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=600&q=80' },
  { id: 'fg5', image_url: 'https://images.unsplash.com/photo-1554519934-e32b1629d9ee?auto=format&fit=crop&w=600&q=80' },
]

export default function Home() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const [teamMembers,   setTeamMembers]   = useState([])
  const [galleryImages, setGalleryImages] = useState([])
  const [homeServices,  setHomeServices]  = useState([])

  useEffect(() => {
    const TTL = 5 * 60_000

    getOrFetch('home_stylists', async () => {
      const { data } = await supabase.from('stylists').select('id, name, title, photo_url').eq('featured', true).order('display_order')
      if (data?.length) return data
      const { data: fb } = await supabase.from('stylists').select('id, name, title, photo_url').order('display_order').limit(4)
      return fb || []
    }, TTL).then(setTeamMembers)

    getOrFetch('home_gallery', async () => {
      const { data } = await supabase.from('gallery').select('id, image_url').eq('featured', true).order('display_order')
      if (data?.length) return data
      const { data: fb } = await supabase.from('gallery').select('id, image_url').order('display_order').limit(5)
      return fb || []
    }, TTL).then(setGalleryImages)

    getOrFetch('home_services', async () => {
      const { data } = await supabase.from('services').select('id, name, description, price, image_url').eq('featured', true).order('name')
      if (data?.length) return data.map(s => ({ ...s, price_display: s.price ? `from €${s.price}` : '' }))
      const { data: fb } = await supabase.from('services').select('id, name, description, price, image_url').order('name').limit(4)
      return (fb || []).map(s => ({ ...s, price_display: s.price ? `from €${s.price}` : '' }))
    }, TTL).then(setHomeServices)
  }, [])

  const displayedTeam     = [...teamMembers,  ...FALLBACK_TEAM.slice(teamMembers.length)].slice(0, 4)
  const displayedGallery  = [...galleryImages, ...FALLBACK_GALLERY.slice(galleryImages.length)].slice(0, 5)
  const displayedServices = [...homeServices,  ...FALLBACK_SERVICES.slice(homeServices.length)].slice(0, 4)

  return (
    <div>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section ref={heroRef} className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden" style={{ paddingTop:'6vh', paddingBottom:'8vh' }}>

        {/* Soft ambient light blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:800, height:800, background:'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', borderRadius:'50%' }} />
          <div style={{ position:'absolute', top:'20%', left:'20%', width:500, height:500, background:'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)', borderRadius:'50%' }} />
          <div style={{ position:'absolute', bottom:'20%', right:'18%', width:400, height:400, background:'radial-gradient(circle, rgba(196,149,106,0.05) 0%, transparent 70%)', borderRadius:'50%' }} />
        </div>

        {/* Faint grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.022]"
          style={{ backgroundImage:'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize:'80px 80px' }} />

        <motion.div style={{ opacity }} className="relative z-10 wrap text-center">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity:0, y:-10, scale:0.88, filter:'blur(5px)' }}
            animate={{ opacity:1, y:0, scale:1, filter:'blur(0px)' }}
            transition={{ duration:0.75, delay:0.1, ease:[0.25,0.46,0.45,0.94] }}
            style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:'2.5rem',
              padding:'8px 20px 8px 10px', borderRadius:9999,
              background:'rgba(201,168,76,0.07)',
              border:'1px solid rgba(201,168,76,0.22)',
              boxShadow:'0 0 24px rgba(201,168,76,0.08)',
            }}
          >
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulse-gold 2.4s infinite' }} />
            <span style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', fontFamily:'Jost,sans-serif', fontWeight:400 }}>
              Premium Hair Studio &nbsp;<span style={{ color:'rgba(201,168,76,0.5)' }}>·</span>&nbsp; Doha, Qatar
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-display font-light"
            style={{ fontSize:'clamp(4rem, 11vw, 8.5rem)', lineHeight:0.88, marginBottom:'2rem' }}>
            <motion.span
              initial={{ opacity:0, y:32, filter:'blur(10px)' }}
              animate={{ opacity:1, y:0, filter:'blur(0px)' }}
              transition={{ duration:1.05, delay:0.22, ease:[0.16,1,0.3,1] }}
              style={{ color:'#fff', display:'block' }}>Your hair,</motion.span>
            <motion.span
              initial={{ opacity:0, y:32, filter:'blur(10px)' }}
              animate={{ opacity:1, y:0, filter:'blur(0px)' }}
              transition={{ duration:1.05, delay:0.38, ease:[0.16,1,0.3,1] }}
              className="gold-gradient" style={{ fontStyle:'italic', display:'block' }}>your story.</motion.span>
          </h1>

          {/* Divider */}
          <motion.div
            initial={{ scaleX:0, opacity:0 }}
            animate={{ scaleX:1, opacity:1 }}
            transition={{ duration:0.85, delay:0.54, ease:[0.25,0.46,0.45,0.94] }}
            className="gold-bar"
            style={{ margin:'0 auto 2.5rem auto' }}
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity:0, y:12, filter:'blur(5px)' }}
            animate={{ opacity:1, y:0, filter:'blur(0px)' }}
            transition={{ duration:0.85, delay:0.56, ease:[0.25,0.46,0.45,0.94] }}
            style={{ color:'rgba(255,255,255,0.45)', fontSize:'1.05rem', lineHeight:1.85, maxWidth:520, margin:'0 auto 3.5rem auto', fontWeight:300 }}
          >
            Expert stylists crafting looks that reflect who you truly are.
            Book your transformation today.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity:0, y:10, filter:'blur(4px)' }}
            animate={{ opacity:1, y:0, filter:'blur(0px)' }}
            transition={{ duration:0.75, delay:0.7, ease:[0.25,0.46,0.45,0.94] }}
            style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'1rem' }}
          >
            <Link to="/appointments" className="btn-gold" style={{ gap:12 }}>
              Book Appointment
              <ArrowRight size={15} />
            </Link>
            <Link to="/gallery" className="btn-outline">
              View Gallery
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity:0, y:10, filter:'blur(4px)' }}
          animate={{ opacity:1, y:0, filter:'blur(0px)' }}
          transition={{ delay:1.05, duration:0.85, ease:[0.25,0.46,0.45,0.94] }}
          style={{ position:'absolute', bottom:120, left:0, right:0, display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'clamp(1.25rem,5vw,6rem)', padding:'0 1.5rem' }}
        >
          {stats.map(({ value, label }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div className="font-display gold-gradient" style={{ fontSize:'clamp(1.4rem,2.5vw,2rem)', lineHeight:1, marginBottom:'0.35rem' }}>{value}</div>
              <div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', fontFamily:'Jost,sans-serif' }}>{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ delay:1.5 }}
          style={{ position:'absolute', bottom:40, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:'rgba(255,255,255,0.18)' }}
        >
          <span style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase' }}>Scroll</span>
          <motion.div animate={{ y:[0,7,0] }} transition={{ repeat:Infinity, duration:1.7 }}>
            <ChevronDown size={13} />
          </motion.div>
        </motion.div>
      </section>

      {/* ══ SERVICES ════════════════════════════════════════════ */}
      <section className="home-section" style={{ position:'relative' }}>
        <div className="wrap">

          {/* Section header */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}
            style={{ textAlign:'center', marginBottom:24 }}>
            <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.8rem,5vw,4.5rem)', textAlign:'center', marginBottom:'0.5rem' }}>
              Our Services
            </h2>
            <span className="sec-label">What We Offer</span>
            <div className="gold-bar" style={{ marginTop:'1rem' }} />
          </motion.div>

          {/* Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'1.75rem' }}>
            {displayedServices.map((svc, i) => (
              <motion.div key={svc.id}
                initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-40px' }}
                custom={i} variants={cardIn}
                className="glass-light service-card"
                style={{ borderRadius:24, padding:0, textAlign:'center', transition:'all 0.5s cubic-bezier(0.22,1,0.36,1)', cursor:'default', position:'relative', overflow:'hidden', willChange:'transform', backfaceVisibility:'hidden' }}
                whileHover={{ y:-6, boxShadow:'0 20px 60px rgba(201,168,76,0.1)', borderColor:'rgba(201,168,76,0.2)' }}
              >
                {/* Photo */}
                <div style={{ height:200, overflow:'hidden', position:'relative' }}>
                  <img src={svc.image_url} alt={svc.name} className="service-img" loading="lazy" decoding="async"
                    style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.65s ease', willChange:'transform', backfaceVisibility:'hidden' }} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(10,10,10,0.75))' }} />
                </div>

                {/* Text */}
                <div style={{ padding:'1.5rem 2rem 2.5rem 2rem' }}>
                  <h3 className="font-display" style={{ fontSize:'1.4rem', color:'#fff', marginBottom:'0.85rem', textAlign:'center' }}>{svc.name}</h3>
                  <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.85rem', lineHeight:1.85, marginBottom:'1.5rem', textAlign:'center' }}>{svc.description}</p>
                  <span style={{ fontSize:10, color:'#C9A84C', letterSpacing:'0.18em', textTransform:'uppercase', display:'block', textAlign:'center' }}>{svc.price_display}</span>
                </div>

                {/* Bottom accent */}
                <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:0, height:1, background:'linear-gradient(90deg,transparent,#C9A84C,transparent)', transition:'width 0.5s ease' }}
                  className="card-accent" />
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign:'center', marginTop:20 }}>
            <Link to="/appointments" className="btn-gold">
              Book Your Service <ArrowRight size={15} />
            </Link>
          </div>
        </div>

      </section>

      {/* ══ GALLERY PREVIEW ═════════════════════════════════════ */}
      <section className="home-section" style={{ position:'relative' }}>

        <div className="wrap">
          {/* Header */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}
            style={{ textAlign:'center', marginBottom:18 }}>
            <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.8rem,5vw,4.5rem)', textAlign:'center', marginBottom:'0.5rem' }}>
              Gallery
            </h2>
            <span className="sec-label">Our Work</span>
            <div className="gold-bar" style={{ marginTop:'1rem', marginBottom:0 }} />
          </motion.div>

          {/* Grid */}
          <div className="home-gallery-grid" style={{ marginBottom:'1.5rem' }}>
            {displayedGallery.map((item, i) => (
              <motion.div key={item.id}
                initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-30px' }}
                custom={i} variants={cardIn}
                className="gallery-item"
                style={{ aspectRatio:'1/1', borderRadius:20, overflow:'hidden', position:'relative', cursor:'pointer' }}
                whileHover={{ scale:1.02 }}
              >
                <img src={item.image_url} alt={`Gallery ${i + 1}`} className="gallery-img" loading="lazy" decoding="async"
                  style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.65s ease' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 55%, rgba(10,10,10,0.5))', transition:'opacity 0.4s' }} />
              </motion.div>
            ))}
          </div>

          {/* View All button */}
          <div style={{ textAlign:'center' }}>
            <Link to="/gallery" className="btn-outline" style={{ padding:'12px 28px', fontSize:11 }}>
              View All <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ ABOUT ═══════════════════════════════════════════════ */}
      <section className="home-section home-section-sm">
        <div className="wrap">
          <div className="home-about-grid">

            {/* Left */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView} style={{ textAlign:'center' }}>
              <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.8rem,5vw,4.5rem)', lineHeight:1.08, marginBottom:'0.5rem', textAlign:'center' }}>
                Art meets<br />
                <span className="gold-gradient" style={{ fontStyle:'italic' }}>precision.</span>
              </h2>
              <span className="sec-label">Our Story</span>
              <div className="gold-bar" style={{ margin:'0 auto 1.25rem auto' }} />
              <p style={{ color:'rgba(255,255,255,0.42)', fontSize:'0.9rem', lineHeight:1.95, marginBottom:0, textAlign:'center' }}>
                Born in the heart of Doha, HairGo brings together a team of internationally trained stylists united by one purpose: to deliver excellence. From precision cuts to transformative colour, every service is crafted with the care and expertise you deserve.
              </p>
            </motion.div>

            {/* Right — collage */}
            <motion.div
              initial={{ opacity:0 }}
              whileInView={{ opacity:1 }}
              viewport={{ once:true }}
              transition={{ duration:0.4 }}
              style={{ position:'relative' }}
            >
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', maxWidth:340, margin:'0 auto' }}>

                {/* Left column — slides in from left */}
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {displayedTeam.slice(0, 2).map((m, i) => (
                    <motion.div key={m.id}
                      initial={{ opacity:0, x:-28, filter:'blur(5px)' }}
                      whileInView={{ opacity:1, x:0, filter:'blur(0px)' }}
                      viewport={{ once:true, margin:'-40px' }}
                      transition={{ duration:0.85, delay:i * 0.13, ease:[0.16,1,0.3,1] }}
                    >
                      <div style={{
                        aspectRatio:'1/1', borderRadius:20, overflow:'hidden',
                        border:'1px solid rgba(201,168,76,0.18)',
                        boxShadow:'0 16px 48px rgba(0,0,0,0.5)',
                        marginBottom:'0.4rem',
                      }}>
                        {m.photo_url
                          ? <img src={m.photo_url} alt={m.name} loading="lazy" decoding="async"
                              style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', transition:'transform 0.65s ease' }}
                              onMouseEnter={e => e.currentTarget.style.transform='scale(1.06)'}
                              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
                          : <div style={{ width:'100%', height:'100%', background:'rgba(201,168,76,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <span className="font-display" style={{ fontSize:'2.5rem', color:'rgba(201,168,76,0.4)' }}>{m.name?.[0]}</span>
                            </div>
                        }
                      </div>
                      <p className="font-display" style={{ color:'#fff', fontSize:'1rem', textAlign:'center', marginBottom:3 }}>{m.name}</p>
                      <div style={{ width:24, height:1, background:'linear-gradient(90deg,transparent,#C9A84C,transparent)', margin:'0 auto 5px auto' }} />
                      <p style={{ color:'rgba(201,168,76,0.7)', fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', textAlign:'center', fontFamily:'Jost,sans-serif' }}>{m.title}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Right column — slides in from right */}
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', paddingTop:'1rem' }}>
                  {displayedTeam.slice(2, 4).map((m, i) => (
                    <motion.div key={m.id}
                      initial={{ opacity:0, x:28, filter:'blur(5px)' }}
                      whileInView={{ opacity:1, x:0, filter:'blur(0px)' }}
                      viewport={{ once:true, margin:'-40px' }}
                      transition={{ duration:0.85, delay:i * 0.13 + 0.1, ease:[0.16,1,0.3,1] }}
                    >
                      <div style={{
                        aspectRatio:'1/1', borderRadius:20, overflow:'hidden',
                        border:'1px solid rgba(201,168,76,0.18)',
                        boxShadow:'0 16px 48px rgba(0,0,0,0.5)',
                        marginBottom:'0.4rem',
                      }}>
                        {m.photo_url
                          ? <img src={m.photo_url} alt={m.name} loading="lazy" decoding="async"
                              style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', transition:'transform 0.65s ease' }}
                              onMouseEnter={e => e.currentTarget.style.transform='scale(1.06)'}
                              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
                          : <div style={{ width:'100%', height:'100%', background:'rgba(201,168,76,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <span className="font-display" style={{ fontSize:'2.5rem', color:'rgba(201,168,76,0.4)' }}>{m.name?.[0]}</span>
                            </div>
                        }
                      </div>
                      <p className="font-display" style={{ color:'#fff', fontSize:'1rem', textAlign:'center', marginBottom:3 }}>{m.name}</p>
                      <div style={{ width:24, height:1, background:'linear-gradient(90deg,transparent,#C9A84C,transparent)', margin:'0 auto 5px auto' }} />
                      <p style={{ color:'rgba(201,168,76,0.7)', fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', textAlign:'center', fontFamily:'Jost,sans-serif' }}>{m.title}</p>
                    </motion.div>
                  ))}
                </div>

              </div>

              {/* Meet the Team button */}
              <div style={{ textAlign:'center', marginTop:'1.5rem', marginBottom:'2.5rem' }}>
                <Link to="/stylists" className="btn-gold">
                  Meet the Team <ArrowRight size={15} />
                </Link>
              </div>

              {/* Glow accents */}
              <div style={{ position:'absolute', top:-24, right:-24, width:160, height:160, background:'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-16, left:-16, width:120, height:120, background:'radial-gradient(circle, rgba(196,149,106,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ LOYALTY + CTA ═══════════════════════════════════════ */}
      <section className="home-section">
        <div className="wrap">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}
            className="home-cta-grid">

            {/* Loyalty panel */}
            <div style={{
              borderRadius:28, padding:'3rem 2.5rem', textAlign:'center',
              position:'relative', overflow:'hidden',
              background:'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(196,149,106,0.04) 100%)',
              border:'1px solid rgba(201,168,76,0.18)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem',
            }}>
              <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)', width:280, height:140, background:'radial-gradient(ellipse, rgba(201,168,76,0.14) 0%, transparent 70%)', pointerEvents:'none' }} />
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 18px', borderRadius:9999, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)' }}>
                <Star size={11} color="#C9A84C" />
                <span style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>Loyalty Program</span>
              </div>
              <h3 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(1.8rem,3vw,2.8rem)', lineHeight:1.1, margin:0 }}>
                Earn. Redeem.<br />
                <span className="gold-gradient" style={{ fontStyle:'italic' }}>Shine.</span>
              </h3>
              <div className="gold-bar" />
              <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.85rem', lineHeight:1.85, maxWidth:340, margin:0 }}>
                Come 5 times and unlock an exclusive 30% discount on your next appointment. Simple, rewarding, and made for our regulars.
              </p>
              <Link to="/register" className="btn-gold" style={{ marginTop:'0.5rem' }}>
                Join for Free <ArrowRight size={14} />
              </Link>
            </div>

            {/* CTA panel */}
            <div style={{
              borderRadius:28, padding:'3rem 2.5rem', textAlign:'center',
              position:'relative', overflow:'hidden',
              background:'linear-gradient(135deg, rgba(196,149,106,0.06) 0%, rgba(201,168,76,0.08) 100%)',
              border:'1px solid rgba(201,168,76,0.12)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem',
            }}>
              <div style={{ position:'absolute', bottom:-40, right:-40, width:240, height:240, background:'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />
              <span style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', fontFamily:'Jost,sans-serif' }}>Ready?</span>
              <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(1.8rem,3vw,2.8rem)', lineHeight:1.1, margin:0 }}>
                Ready for your<br />
                <span className="gold-gradient" style={{ fontStyle:'italic' }}>transformation?</span>
              </h2>
              <div className="gold-bar" />
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.85rem', lineHeight:1.85, maxWidth:320, margin:0 }}>
                Book your appointment in minutes and let our experts take care of the rest.
              </p>
              <Link to="/appointments" className="btn-gold" style={{ marginTop:'0.5rem' }}>
                Book Now <ArrowRight size={14} />
              </Link>
            </div>

          </motion.div>
        </div>
      </section>

      <style>{`
        .service-card:hover .service-img { transform: scale(1.07); }
        .gallery-item:hover .gallery-img { transform: scale(1.08); }

        .home-section    { padding-top: 56px; padding-bottom: 56px; }
        .home-section-sm { padding-top: 32px; padding-bottom: 32px; }
        @media (max-width: 640px) {
          .home-section    { padding-top: 72px; padding-bottom: 72px; }
          .home-section-sm { padding-top: 56px; padding-bottom: 56px; }
        }

        .home-gallery-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.25rem;
        }
        .home-cta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .home-about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: center;
        }

        @media (max-width: 860px) {
          .home-about-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .home-gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
          .home-cta-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .home-gallery-grid { grid-template-columns: repeat(2, 1fr); gap: 0.625rem; }
          .home-gallery-grid > div:last-child { grid-column: 1 / -1; max-width: 50%; margin: 0 auto; width: 100%; }
        }
        @media (max-width: 640px) {
          .hero-section {
            align-items: flex-start !important;
            padding-top: 145px !important;
            padding-bottom: 160px !important;
          }
        }
      `}</style>
    </div>
  )
}
