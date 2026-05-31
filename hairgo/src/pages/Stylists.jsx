import { motion } from 'framer-motion'
import { Link2, Scissors, User } from 'lucide-react'

const TEAM = [
  {
    id: 1, name: 'Sophie Laurent', title: 'Head Stylist & Color Director',
    bio: 'With 14 years of experience in Parisian salons, Sophie brings an unmatched eye for shape and color. She specialises in transformative balayage and precision cuts tailored to each client.',
    specialties: ['Balayage', 'Precision Cut'],
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
  {
    id: 2, name: 'Isabelle Moreau', title: 'Senior Colorist',
    bio: 'Isabelle trained in Lyon and New York before joining HairGo. Her mastery of complex color corrections and vivid transformations has earned her a loyal following.',
    specialties: ['Color Correction', 'Highlights', 'Ombré'],
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
  {
    id: 3, name: 'Camille Dubois', title: 'Style & Texture Expert',
    bio: "Camille's passion lies in bringing out the natural beauty of every texture — from sleek blow-outs to voluminous curls. She is the go-to for special events and editorial looks.",
    specialties: ['Blow-Out', 'Curl Styling'],
    photo_url: 'https://images.unsplash.com/photo-1573497019236-17f8177b81e8?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
  {
    id: 4, name: 'Elena Rousseau', title: 'Hair Treatment Specialist',
    bio: 'Elena dedicates herself to hair health. From keratin smoothing to deep hydration therapies, she restores shine and vitality to even the most stressed hair.',
    specialties: ['Keratin', 'Hair Treatments'],
    photo_url: 'https://images.unsplash.com/photo-1506863530036-1efeddceb993?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
  {
    id: 5, name: 'Marie Fontaine', title: 'Color Artist',
    bio: "Marie treats hair as her canvas. Bold vivid shades and hand-painted highlights are her signature — always designed to complement the client's skin tone and personality.",
    specialties: ['Vivid Color', 'Balayage'],
    photo_url: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
  {
    id: 6, name: 'Julien Lefebvre', title: 'Master Barber & Stylist',
    bio: 'Julien blends classic barbering tradition with modern styling. Known for immaculate fades and textured cuts, he brings a refined edge to every appointment.',
    specialties: ["Men's Cut", 'Fade', 'Textured Styles'],
    photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
  {
    id: 7, name: 'Antoine Bernard', title: 'Creative Director',
    bio: "Antoine's avant-garde vision has graced runways and magazine covers. At HairGo he channels that creativity into elevated everyday looks and stunning special-occasion styles.",
    specialties: ['Editorial', 'Avant-Garde', 'Updos'],
    photo_url: 'https://images.unsplash.com/photo-1590873803005-539ede4d828a?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
  {
    id: 8, name: 'Lucas Martin', title: 'Stylist',
    bio: 'The newest member of the HairGo family, Lucas brings fresh energy and a keen attention to detail. He excels at modern cuts and relaxed styling for every day.',
    specialties: ['Precision Cut', 'Blow-Out'],
    photo_url: 'https://images.unsplash.com/photo-1543132220-4bf3de6e10ae?auto=format&fit=crop&crop=faces&w=600&h=800&q=80',
  },
]

const inView = {
  hidden: { opacity:0, y:36 },
  visible: (i=0) => ({ opacity:1, y:0, transition:{ duration:0.8, delay:i*0.12, ease:[0.22,1,0.36,1] } }),
}

export default function Stylists() {
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
          {TEAM.map((s, i) => (
            <motion.div key={s.id} initial="hidden" whileInView="visible" viewport={{ once: true }}
              custom={i} variants={inView} className="group">

              {/* Photo */}
              <div style={{ aspectRatio:'3/4', borderRadius:24, overflow:'hidden', marginBottom:'2rem',
                background:'linear-gradient(135deg,#1a1a1a,#141414)', border:'1px solid rgba(255,255,255,0.06)',
                position:'relative' }}>
                {s.photo_url
                  ? <img src={s.photo_url} alt={s.name} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', transition:'transform 0.7s ease' }}
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
                <h3 className="font-display" style={{ fontSize:'1.6rem', color:'#fff', marginBottom:'0.5rem', textAlign:'center' }}>{s.name}</h3>
                <p style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C9A84C', marginBottom:'1.25rem', textAlign:'center' }}>{s.title}</p>
                <p style={{ color:'rgba(255,255,255,0.36)', fontSize:'0.85rem', lineHeight:1.85, marginBottom:'1.5rem', textAlign:'center' }}>{s.bio}</p>
                {s.specialties?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'0.5rem' }}>
                    {s.specialties.map(spec => (
                      <span key={spec} style={{ padding:'5px 14px', borderRadius:9999, background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.15)', color:'#C9A84C', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase' }}>
                        {spec}
                      </span>
                    ))}
                  </div>
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
