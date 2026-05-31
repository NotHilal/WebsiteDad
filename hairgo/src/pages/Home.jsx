import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Star, ChevronDown } from 'lucide-react'

const inView = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.85, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
  }),
}


const services = [
  { name: 'Precision Cut', desc: "Sculpted to your bone structure and lifestyle — a silhouette that's perfectly yours.", price: 'from €45', image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&h=260&q=80' },
  { name: 'Color & Highlights', desc: 'Balayage, ombré, vivid transformations. Color that moves the way you do.', price: 'from €80', image: 'https://images.unsplash.com/photo-1614020863825-28a0bb7e3c3c?auto=format&fit=crop&w=600&h=260&q=80' },
  { name: 'Blow-Out & Style', desc: 'A flawless finish for every occasion, from everyday elegance to special events.', price: 'from €35', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&h=260&q=80' },
  { name: 'Hair Treatments', desc: "Keratin, deep hydration, and repair therapies to restore your hair's vitality.", price: 'from €55', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&h=260&q=80' },
]

const stats = [
  { value: '12+',   label: 'Years of expertise' },
  { value: '3,000+', label: 'Happy clients' },
  { value: '8',     label: 'Expert stylists' },
  { value: '4.9 ★', label: 'Average rating' },
]

const gallery = [
  { h: 300, image: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?auto=format&fit=crop&w=600&h=300&q=80' },
  { h: 220, image: 'https://images.unsplash.com/photo-1595475884562-073c30d45670?auto=format&fit=crop&w=600&h=220&q=80' },
  { h: 260, image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&h=260&q=80' },
  { h: 240, image: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=600&h=240&q=80' },
  { h: 320, image: 'https://images.unsplash.com/photo-1554519934-e32b1629d9ee?auto=format&fit=crop&w=600&h=320&q=80' },
]

export default function Home() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <div>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ paddingTop:'12vh', paddingBottom:'8vh' }}>

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
            initial={{ opacity:0, y:-18 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.15 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-light mb-12"
          >
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulse-gold 2.4s infinite' }} />
            <span style={{ fontSize:10, letterSpacing:'0.24em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>
              Premium Hair Studio &nbsp;·&nbsp; Doha, Qatar
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity:0, y:36 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:1, delay:0.28, ease:[0.22,1,0.36,1] }}
            className="font-display font-light"
            style={{ fontSize:'clamp(4rem, 11vw, 8.5rem)', lineHeight:0.88, marginBottom:'2rem' }}
          >
            <span style={{ color:'#fff', display:'block' }}>Your hair,</span>
            <span className="gold-gradient" style={{ fontStyle:'italic', display:'block' }}>your story.</span>
          </motion.h1>

          {/* Divider */}
          <motion.div
            initial={{ scaleX:0, opacity:0 }}
            animate={{ scaleX:1, opacity:1 }}
            transition={{ duration:0.9, delay:0.5 }}
            className="gold-bar"
            style={{ margin:'0 auto 2.5rem auto' }}
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity:0, y:18 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.7, delay:0.58 }}
            style={{ color:'rgba(255,255,255,0.45)', fontSize:'1.05rem', lineHeight:1.85, maxWidth:520, margin:'0 auto 3.5rem auto', fontWeight:300 }}
          >
            Expert stylists crafting looks that reflect who you truly are.
            Book your transformation today.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity:0, y:18 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.65, delay:0.72 }}
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
          initial={{ opacity:0, y:16 }}
          animate={{ opacity:1, y:0 }}
          transition={{ delay:1.1, duration:0.7 }}
          style={{ position:'absolute', bottom:120, left:0, right:0, display:'flex', justifyContent:'center', gap:'clamp(2rem,6vw,6rem)' }}
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
      <section style={{ paddingTop:32, paddingBottom:32, position:'relative' }}>
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
            {services.map(({ name, desc, price, image }, i) => (
              <motion.div key={name}
                initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-40px' }}
                custom={i} variants={inView}
                className="glass-light service-card"
                style={{ borderRadius:24, padding:0, textAlign:'center', transition:'all 0.5s cubic-bezier(0.22,1,0.36,1)', cursor:'default', position:'relative', overflow:'hidden', willChange:'transform', backfaceVisibility:'hidden' }}
                whileHover={{ y:-6, boxShadow:'0 20px 60px rgba(201,168,76,0.1)', borderColor:'rgba(201,168,76,0.2)' }}
              >
                {/* Photo */}
                <div style={{ height:200, overflow:'hidden', position:'relative' }}>
                  <img src={image} alt={name} className="service-img"
                    style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.65s ease', willChange:'transform', backfaceVisibility:'hidden' }} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(10,10,10,0.75))' }} />
                </div>

                {/* Text */}
                <div style={{ padding:'1.5rem 2rem 2.5rem 2rem' }}>
                  <h3 className="font-display" style={{ fontSize:'1.4rem', color:'#fff', marginBottom:'0.85rem', textAlign:'center' }}>{name}</h3>
                  <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.85rem', lineHeight:1.85, marginBottom:'1.5rem', textAlign:'center' }}>{desc}</p>
                  <span style={{ fontSize:10, color:'#C9A84C', letterSpacing:'0.18em', textTransform:'uppercase', display:'block', textAlign:'center' }}>{price}</span>
                </div>

                {/* Bottom accent */}
                <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:0, height:1, background:'linear-gradient(90deg,transparent,#C9A84C,transparent)', transition:'width 0.5s ease' }}
                  className="card-accent" />
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} custom={5} variants={inView}
            style={{ textAlign:'center', marginTop:20 }}>
            <Link to="/appointments" className="btn-gold">
              Book Your Service <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>

      </section>

      {/* ══ GALLERY PREVIEW ═════════════════════════════════════ */}
      <section style={{ paddingTop:32, paddingBottom:32, position:'relative' }}>

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
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'1.25rem', marginBottom:'1.5rem' }}>
            {gallery.map(({ image }, i) => (
              <motion.div key={i}
                initial={{ opacity:0, scale:0.95 }}
                whileInView={{ opacity:1, scale:1 }}
                viewport={{ once:true, margin:'-30px' }}
                transition={{ duration:0.65, delay:i * 0.07 }}
                className="gallery-item"
                style={{ aspectRatio:'1/1', borderRadius:20, overflow:'hidden', position:'relative', cursor:'pointer' }}
                whileHover={{ scale:1.02 }}
              >
                <img src={image} alt={`Gallery ${i + 1}`} className="gallery-img"
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
      <section style={{ paddingTop:16, paddingBottom:16 }}>
        <div className="wrap">
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'2rem', alignItems:'center' }}
               className="lg:grid-cols-2">

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
                  {[
                    { name:'Sophie Laurent', title:'Head Stylist', url:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
                    { name:'Camille Dubois',  title:'Style Expert',  url:'https://images.unsplash.com/photo-1573497019236-17f8177b81e8?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
                  ].map((m, i) => (
                    <motion.div key={m.name}
                      initial={{ opacity:0, x:-50 }}
                      whileInView={{ opacity:1, x:0 }}
                      viewport={{ once:true, margin:'-40px' }}
                      transition={{ duration:0.75, delay:i * 0.15, ease:[0.22,1,0.36,1] }}
                    >
                      <div style={{
                        aspectRatio:'1/1', borderRadius:20, overflow:'hidden',
                        border:'1px solid rgba(201,168,76,0.18)',
                        boxShadow:'0 16px 48px rgba(0,0,0,0.5)',
                        marginBottom:'0.4rem',
                      }}>
                        <img src={m.url} alt={m.name}
                          style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', transition:'transform 0.65s ease' }}
                          onMouseEnter={e => e.currentTarget.style.transform='scale(1.06)'}
                          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
                      </div>
                      <p className="font-display" style={{ color:'#fff', fontSize:'1rem', textAlign:'center', marginBottom:3 }}>{m.name}</p>
                      <div style={{ width:24, height:1, background:'linear-gradient(90deg,transparent,#C9A84C,transparent)', margin:'0 auto 5px auto' }} />
                      <p style={{ color:'rgba(201,168,76,0.7)', fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', textAlign:'center', fontFamily:'Jost,sans-serif' }}>{m.title}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Right column — slides in from right */}
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', paddingTop:'1rem' }}>
                  {[
                    { name:'Julien Lefebvre', title:'Master Barber',     url:'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
                    { name:'Antoine Bernard', title:'Creative Director', url:'https://images.unsplash.com/photo-1590873803005-539ede4d828a?auto=format&fit=crop&crop=faces&w=400&h=400&q=80' },
                  ].map((m, i) => (
                    <motion.div key={m.name}
                      initial={{ opacity:0, x:50 }}
                      whileInView={{ opacity:1, x:0 }}
                      viewport={{ once:true, margin:'-40px' }}
                      transition={{ duration:0.75, delay:i * 0.15 + 0.1, ease:[0.22,1,0.36,1] }}
                    >
                      <div style={{
                        aspectRatio:'1/1', borderRadius:20, overflow:'hidden',
                        border:'1px solid rgba(201,168,76,0.18)',
                        boxShadow:'0 16px 48px rgba(0,0,0,0.5)',
                        marginBottom:'0.4rem',
                      }}>
                        <img src={m.url} alt={m.name}
                          style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', transition:'transform 0.65s ease' }}
                          onMouseEnter={e => e.currentTarget.style.transform='scale(1.06)'}
                          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'} />
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
      <section style={{ paddingTop:32, paddingBottom:32 }}>
        <div className="wrap">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}
            style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

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
                Every visit earns you loyalty points. Collect enough and unlock exclusive discount coupons for your next appointment or store purchase.
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
      `}</style>
    </div>
  )
}
