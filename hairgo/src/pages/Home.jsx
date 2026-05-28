import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Scissors, Sparkles, Star, Shield, ChevronDown } from 'lucide-react'

const inView = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.85, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
  }),
}

const services = [
  { name: 'Precision Cut', desc: "Sculpted to your bone structure and lifestyle — a silhouette that's perfectly yours.", icon: Scissors, price: 'from €45' },
  { name: 'Color & Highlights', desc: 'Balayage, ombré, vivid transformations. Color that moves the way you do.', icon: Sparkles, price: 'from €80' },
  { name: 'Blow-Out & Style', desc: 'A flawless finish for every occasion, from everyday elegance to special events.', icon: Star, price: 'from €35' },
  { name: 'Hair Treatments', desc: "Keratin, deep hydration, and repair therapies to restore your hair's vitality.", icon: Shield, price: 'from €55' },
]

const stats = [
  { value: '12+',   label: 'Years of expertise' },
  { value: '3,000+', label: 'Happy clients' },
  { value: '8',     label: 'Expert stylists' },
  { value: '4.9 ★', label: 'Average rating' },
]

const gallery = [
  { h: 300 }, { h: 220 }, { h: 260 },
  { h: 240 }, { h: 320 }, { h: 200 },
]

export default function Home() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const y       = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <div className="overflow-x-hidden">

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Soft ambient light blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:800, height:800, background:'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', borderRadius:'50%' }} />
          <div style={{ position:'absolute', top:'20%', left:'20%', width:500, height:500, background:'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)', borderRadius:'50%' }} />
          <div style={{ position:'absolute', bottom:'20%', right:'18%', width:400, height:400, background:'radial-gradient(circle, rgba(196,149,106,0.05) 0%, transparent 70%)', borderRadius:'50%' }} />
        </div>

        {/* Faint grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.022]"
          style={{ backgroundImage:'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize:'80px 80px' }} />

        <motion.div style={{ y, opacity }} className="relative z-10 wrap text-center">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity:0, y:-18 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.15 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-light mb-12"
          >
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulse-gold 2.4s infinite' }} />
            <span style={{ fontSize:10, letterSpacing:'0.24em', textTransform:'uppercase', color:'#C9A84C', fontFamily:'Jost,sans-serif' }}>
              Premium Hair Studio &nbsp;·&nbsp; Paris
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

      {/* ══ STATS ══════════════════════════════════════════════ */}
      <section style={{ paddingTop:80, paddingBottom:80 }}>
        <div className="wrap">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:'2.5rem' }}>
            {stats.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once:true }}
                custom={i}
                variants={inView}
                style={{ textAlign:'center', padding:'1rem' }}
              >
                <div className="font-display gold-gradient" style={{ fontSize:'clamp(2.5rem,4vw,3.5rem)', lineHeight:1, marginBottom:'0.75rem' }}>
                  {value}
                </div>
                <div style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', fontFamily:'Jost,sans-serif' }}>
                  {label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SERVICES ════════════════════════════════════════════ */}
      <section style={{ paddingTop:120, paddingBottom:120 }}>
        <div className="wrap">

          {/* Section header */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}
            style={{ textAlign:'center', marginBottom:80 }}>
            <span className="sec-label">What We Offer</span>
            <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.8rem,5vw,4.5rem)', textAlign:'center', marginBottom:'1.5rem' }}>
              Our Services
            </h2>
            <div className="gold-bar" />
            <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.9rem', lineHeight:1.9, maxWidth:480, margin:'0 auto', textAlign:'center' }}>
              Every visit is a unique experience tailored to bring out the most beautiful version of you.
            </p>
          </motion.div>

          {/* Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'1.75rem' }}>
            {services.map(({ name, desc, icon:Icon, price }, i) => (
              <motion.div key={name}
                initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-40px' }}
                custom={i} variants={inView}
                className="glass-light"
                style={{ borderRadius:24, padding:'2.75rem 2rem', textAlign:'center', transition:'all 0.5s cubic-bezier(0.22,1,0.36,1)', cursor:'default', position:'relative', overflow:'hidden' }}
                whileHover={{ y:-6, boxShadow:'0 20px 60px rgba(201,168,76,0.1)', borderColor:'rgba(201,168,76,0.2)' }}
              >
                {/* Icon */}
                <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,rgba(201,168,76,0.14),rgba(196,149,106,0.1))', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.75rem auto' }}>
                  <Icon size={22} color="#C9A84C" />
                </div>

                <h3 className="font-display" style={{ fontSize:'1.4rem', color:'#fff', marginBottom:'1rem', textAlign:'center' }}>{name}</h3>
                <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.85rem', lineHeight:1.85, marginBottom:'1.75rem', textAlign:'center' }}>{desc}</p>
                <span style={{ fontSize:10, color:'#C9A84C', letterSpacing:'0.18em', textTransform:'uppercase', display:'block', textAlign:'center' }}>{price}</span>

                {/* Bottom accent */}
                <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:0, height:1, background:'linear-gradient(90deg,transparent,#C9A84C,transparent)', transition:'width 0.5s ease' }}
                  className="card-accent" />
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} custom={5} variants={inView}
            style={{ textAlign:'center', marginTop:64 }}>
            <Link to="/appointments" className="btn-gold">
              Book Your Service <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══ GALLERY PREVIEW ═════════════════════════════════════ */}
      <section style={{ paddingTop:120, paddingBottom:120 }}>
        {/* Soft gradient above section */}
        <div style={{ pointerEvents:'none', position:'absolute', left:0, right:0, height:200, marginTop:-200, background:'linear-gradient(to bottom, transparent, rgba(201,168,76,0.018))' }} />

        <div className="wrap">
          {/* Header */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}
            style={{ textAlign:'center', marginBottom:56 }}>
            <span className="sec-label">Our Work</span>
            <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.8rem,5vw,4.5rem)', textAlign:'center', marginBottom:'1.5rem' }}>
              Gallery
            </h2>
            <div className="gold-bar" style={{ marginBottom:'2rem' }} />
            <Link to="/gallery" className="btn-outline" style={{ padding:'12px 28px', fontSize:11 }}>
              View All <ArrowRight size={13} />
            </Link>
          </motion.div>

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1.25rem' }}>
            {gallery.map(({ h }, i) => (
              <motion.div key={i}
                initial={{ opacity:0, scale:0.95 }}
                whileInView={{ opacity:1, scale:1 }}
                viewport={{ once:true, margin:'-30px' }}
                transition={{ duration:0.65, delay:i * 0.07 }}
                style={{ height:h, borderRadius:20, overflow:'hidden', position:'relative', cursor:'pointer',
                  background:'linear-gradient(135deg,#1a1814,#141414)', border:'1px solid rgba(255,255,255,0.05)' }}
                whileHover={{ scale:1.02 }}
              >
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(201,168,76,0.04),rgba(196,149,106,0.03))', transition:'all 0.5s' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Scissors size={28} color="rgba(201,168,76,0.15)" style={{ transform:'rotate(45deg)' }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT ═══════════════════════════════════════════════ */}
      <section style={{ paddingTop:120, paddingBottom:120 }}>
        <div className="wrap">
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'6rem', alignItems:'center' }}
               className="lg:grid-cols-2">

            {/* Left */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView} style={{ textAlign:'center' }}>
              <span className="sec-label">Our Story</span>
              <h2 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.8rem,5vw,4.5rem)', lineHeight:1.08, marginBottom:'2rem', textAlign:'center' }}>
                Art meets<br />
                <span className="gold-gradient" style={{ fontStyle:'italic' }}>precision.</span>
              </h2>
              <div className="gold-bar" style={{ margin:'0 auto 2.5rem auto' }} />
              <p style={{ color:'rgba(255,255,255,0.42)', fontSize:'0.9rem', lineHeight:1.95, marginBottom:'1.25rem', textAlign:'center' }}>
                Born from a passion for transformative beauty, HairGo has been redefining hair artistry in Paris for over a decade. Our team of expert stylists blends technical mastery with an intuitive understanding of each client's unique vision.
              </p>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.85rem', lineHeight:1.95, marginBottom:'3rem', textAlign:'center' }}>
                We believe a great haircut is more than technique — it's about listening, understanding, and delivering a look that makes you feel truly yourself.
              </p>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <Link to="/stylists" className="btn-gold">
                  Meet the Team <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>

            {/* Right — collage */}
            <motion.div
              initial={{ opacity:0, x:40 }}
              whileInView={{ opacity:1, x:0 }}
              viewport={{ once:true }}
              transition={{ duration:0.95, ease:[0.22,1,0.36,1] }}
              style={{ position:'relative' }}
            >
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                  <div style={{ height:280, borderRadius:24, background:'linear-gradient(135deg,#1e1a14,#141414)', border:'1px solid rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Scissors size={52} color="rgba(201,168,76,0.16)" style={{ transform:'rotate(45deg)' }} />
                  </div>
                  <div style={{ height:190, borderRadius:24, background:'linear-gradient(135deg,#141414,#161210)', border:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Sparkles size={38} color="rgba(196,149,106,0.16)" />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', marginTop:'2.5rem' }}>
                  <div style={{ height:190, borderRadius:24, background:'linear-gradient(135deg,#141614,#141414)', border:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Star size={38} color="rgba(201,168,76,0.16)" />
                  </div>
                  <div style={{ height:280, borderRadius:24, background:'linear-gradient(135deg,#1a1414,#141414)', border:'1px solid rgba(196,149,106,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Scissors size={52} color="rgba(196,149,106,0.16)" style={{ transform:'rotate(45deg)' }} />
                  </div>
                </div>
              </div>
              {/* Glow accents */}
              <div style={{ position:'absolute', top:-24, right:-24, width:160, height:160, background:'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-16, left:-16, width:120, height:120, background:'radial-gradient(circle, rgba(196,149,106,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ LOYALTY ═════════════════════════════════════════════ */}
      <section style={{ paddingTop:80, paddingBottom:80 }}>
        <div className="wrap">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}
            style={{ borderRadius:32, border:'1px solid rgba(201,168,76,0.18)', padding:'5rem 3rem', textAlign:'center', position:'relative', overflow:'hidden',
              background:'linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(196,149,106,0.04) 60%, transparent 100%)' }}
          >
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:400, height:160, background:'radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'relative' }}>
              <div className="inline-flex items-center gap-2 glass-light" style={{ padding:'8px 20px', borderRadius:9999, marginBottom:32, display:'inline-flex', alignItems:'center', gap:8 }}>
                <Star size={13} color="#C9A84C" />
                <span style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C9A84C' }}>Loyalty Program</span>
              </div>

              <h3 className="font-display font-light" style={{ color:'#fff', fontSize:'clamp(2.5rem,4vw,4rem)', textAlign:'center', marginBottom:'1.5rem' }}>
                Earn. Redeem. <span className="gold-gradient" style={{ fontStyle:'italic' }}>Shine.</span>
              </h3>
              <div className="gold-bar" />
              <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.88rem', lineHeight:1.9, maxWidth:520, margin:'0 auto 3rem auto', textAlign:'center' }}>
                Every visit earns you loyalty points. Collect enough and unlock exclusive discount coupons for your next appointment or store purchase.
              </p>
              <Link to="/register" className="btn-gold">
                Join for Free <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════ */}
      <section style={{ paddingTop:140, paddingBottom:140, textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:700, background:'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 65%)', borderRadius:'50%' }} />
        </div>
        <div className="wrap" style={{ position:'relative' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={inView}>
            <span className="sec-label">Ready?</span>
            <h2 className="font-display font-light"
              style={{ color:'#fff', fontSize:'clamp(3rem,8vw,7rem)', lineHeight:0.95, marginBottom:'2rem', textAlign:'center' }}>
              Ready for your<br />
              <span className="gold-gradient" style={{ fontStyle:'italic' }}>transformation?</span>
            </h2>
            <div className="gold-bar" />
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.9rem', lineHeight:1.85, maxWidth:380, margin:'0 auto 3.5rem auto', textAlign:'center' }}>
              Book your appointment in minutes and let our experts take care of the rest.
            </p>
            <Link to="/appointments" className="btn-gold">
              Book Now <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

    </div>
  )
}
