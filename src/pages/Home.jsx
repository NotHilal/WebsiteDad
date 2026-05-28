import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Phone, MapPin, Clock } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation.js';

/* ─── Scroll reveal ──────────────────────────────────────────── */
function Reveal({ children, className, style, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className} style={style}
    >{children}</motion.div>
  );
}

/* ─── Data ───────────────────────────────────────────────────── */
const U = 'https://images.unsplash.com/';
const IMG = {
  hero:      U + 'photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1920&q=80',
  about:     U + 'photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
  haircut:   U + 'photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
  colour:    U + 'photo-1583864697784-a0efc8379f70?auto=format&fit=crop&w=700&q=80',
  treatment: U + 'photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=700&q=80',
  styling:   U + 'photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=700&q=80',
  product1:  U + 'photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80',
  product2:  U + 'photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80',
  product3:  U + 'photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80',
};

const SERVICES = [
  { img: IMG.haircut,   titleEn: 'Haircuts',   titleAr: 'قص الشعر',     descEn: 'Precision cuts for all hair types. Wash, cut and blow-dry included.',           descAr: 'قص دقيق لجميع أنواع الشعر.' },
  { img: IMG.colour,    titleEn: 'Colour',     titleAr: 'صبغ الشعر',    descEn: 'Full colour, highlights, balayage and toning with professional-grade products.', descAr: 'صبغة كاملة وهايلايت وبالياج.' },
  { img: IMG.treatment, titleEn: 'Treatments', titleAr: 'علاجات الشعر', descEn: 'Keratin smoothing, deep conditioning and scalp treatments to restore shine.',   descAr: 'كيراتين وأقنعة مكثفة وعلاجات الفروة.' },
  { img: IMG.styling,   titleEn: 'Styling',    titleAr: 'تصفيف الشعر',  descEn: 'Blowouts and special occasion styling. Leave looking and feeling your best.',  descAr: 'تمليس وتصفيف للمناسبات الخاصة.' },
];

const PRICES = {
  women: [
    { en: 'Wash, Cut & Blow-dry',  ar: 'غسيل وقص وتمليس',   price: '$85' },
    { en: 'Cut & Blow-dry',         ar: 'قص وتمليس',         price: '$65' },
    { en: 'Cut only',              ar: 'قص فقط',             price: '$50' },
    { en: 'Full Colour',            ar: 'صبغة كاملة',        price: '$140+' },
    { en: 'Highlights / Balayage',  ar: 'هايلايت / بالياج',  price: '$120+' },
    { en: 'Keratin Treatment',      ar: 'كيراتين',            price: '$250+' },
    { en: 'Blow-dry only',          ar: 'تمليس فقط',          price: '$45' },
  ],
  men: [
    { en: 'Wash, Cut & Style',      ar: 'غسيل وقص وتصفيف',  price: '$60' },
    { en: 'Cut & Style',            ar: 'قص وتصفيف',         price: '$50' },
    { en: 'Cut only',              ar: 'قص فقط',             price: '$40' },
    { en: 'Colour',                ar: 'صبغة',               price: '$80+' },
    { en: 'Scalp Treatment',       ar: 'علاج فروة الرأس',    price: '$55' },
  ],
  children: [
    { en: 'Cut (under 12)',         ar: 'قص (أقل من 12)',    price: '$35' },
    { en: 'Wash & Cut (under 12)',  ar: 'غسيل وقص',          price: '$45' },
    { en: 'Cut (12–16)',            ar: 'قص (12–16)',         price: '$45' },
  ],
};

const TESTIMONIALS = [
  { nameEn: 'Rachel T.',  locEn: 'Whangaparāoa', nameAr: 'راشيل ت.',  locAr: 'وانغاباراوا',
    qEn: 'I have been coming here for three years and would not go anywhere else. Sarah always knows exactly what I need — colour results that genuinely last.',
    qAr: 'أتردد على Hair Go منذ ثلاث سنوات. سارة تعرف دائماً ما أحتاجه بالضبط.' },
  { nameEn: 'Mark L.',    locEn: 'Red Beach',    nameAr: 'مارك ل.',    locAr: 'ريد بيتش',
    qEn: 'Skilled stylists and a genuinely relaxed atmosphere. James did an excellent job — clean, precise, exactly what I asked for.',
    qAr: 'مصففون موهوبون وأجواء مريحة حقاً.' },
  { nameEn: 'Nadia F.',   locEn: 'Gulf Harbour', nameAr: 'ناديا ف.',   locAr: 'غولف هاربر',
    qEn: 'Keratin treatment done by Lena last month. My hair has never felt this smooth — professional from start to finish.',
    qAr: 'علاج الكيراتين مع لينا كان رائعاً. شعري لم يكن بهذه النعومة من قبل.' },
];

const PRODUCTS = [
  { img: IMG.product1, brandEn: 'Moroccanoil', brandAr: 'موروكانويل', nameEn: 'Argan Oil Serum',  nameAr: 'سيروم زيت الأرجان', price: 'from $32',
    descEn: 'Tames frizz and adds mirror-like shine without weighing hair down.',    descAr: 'يُهدئ التجعد ويضيف بريقاً مذهلاً.' },
  { img: IMG.product2, brandEn: 'Redken',      brandAr: 'ريدكن',      nameEn: 'Colour Shampoo',   nameAr: 'شامبو حماية اللون',  price: 'from $24',
    descEn: 'Sulphate-free formula to protect colour and maintain vibrancy.',        descAr: 'يحمي اللون ويحافظ على حيويته.' },
  { img: IMG.product3, brandEn: 'Kérastase',   brandAr: 'كيراستاس',   nameEn: 'Keratin Mask',     nameAr: 'قناع الكيراتين',     price: 'from $28',
    descEn: 'Intensive repair mask that smooths, strengthens and revives hair.',     descAr: 'قناع إصلاح مكثف يُنعّم ويُقوي الشعر.' },
];

const W = '1200px';
const CONTAINER = { maxWidth: W, margin: '0 auto', padding: '0 32px' };

export default function Home() {
  const { t, lang } = useTranslation();
  const [tab, setTab]           = useState('women');
  const [hoveredPrice, setHov]  = useState(null);

  const priceTabs = [
    { key: 'women',    en: 'Women',    ar: 'نساء' },
    { key: 'men',      en: 'Men',      ar: 'رجال' },
    { key: 'children', en: 'Children', ar: 'أطفال' },
  ];

  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{
        minHeight: '92vh', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        backgroundImage: `linear-gradient(to right, rgba(26,25,23,0.93) 40%, rgba(26,25,23,0.55) 100%), url(${IMG.hero})`,
        backgroundSize: 'cover', backgroundPosition: 'center 30%',
      }}>
        <div style={{ ...CONTAINER, width: '100%', padding: '80px 32px' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '52px', height: '2px', background: 'var(--gold)', marginBottom: '28px' }}
            />
            <motion.h1
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 'clamp(3rem, 6.5vw, 6rem)', fontWeight: 300, color: '#fff', lineHeight: 1.08, maxWidth: '640px', marginBottom: '24px' }}
            >
              {lang === 'ar' ? <>صالون شعر<br />احترافي</> : <>We Will Create<br />Your Best Look</>}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', maxWidth: '380px', marginBottom: '40px', lineHeight: 1.9, fontFamily: 'Roboto' }}
            >
              {lang === 'ar'
                ? 'قص وصبغ وعلاج الشعر لجميع الأنواع في وانغاباراوا، نيوزيلندا.'
                : 'Cuts, colour and treatments for all hair types in Whangaparāoa. Walk-ins welcome.'}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}
            >
              <Link to="/book" className="btn">{lang === 'ar' ? 'احجز موعداً' : 'Book Appointment'}</Link>
              <Link to="/shop" className="btn-outline btn">{lang === 'ar' ? 'المتجر' : 'View Products'}</Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── INFO BAR ──────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
        <div style={CONTAINER}>
          <div className="home-infobar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { icon: Phone,  l1En: '+64 9 XXX XXXX',        l1Ar: '+64 9 XXX XXXX',           l2En: 'Call or text anytime',  l2Ar: 'اتصل أو راسلنا' },
              { icon: MapPin, l1En: 'Whangaparāoa, Auckland', l1Ar: 'وانغاباراوا، أوكلاند',     l2En: 'New Zealand',           l2Ar: 'نيوزيلندا' },
              { icon: Clock,  l1En: 'Mon – Sat  9am – 7pm',  l1Ar: 'الاثنين – السبت  9ص – 7م', l2En: 'Sun  10am – 5pm',       l2Ar: 'الأحد  10ص – 5م' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(201,168,76,0.04)' }}
                  style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '26px 28px', borderRight: '1px solid var(--border)', cursor: 'default', borderLeft: i === 0 ? '1px solid var(--border)' : 'none' }}
                >
                  <item.icon size={20} strokeWidth={1} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 400, fontFamily: 'Roboto', marginBottom: '2px' }}>{lang === 'ar' ? item.l1Ar : item.l1En}</div>
                    <div style={{ color: 'var(--text)', fontSize: '12px', fontFamily: 'Roboto' }}>{lang === 'ar' ? item.l2Ar : item.l2En}</div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '90px 0' }}>
        <div style={CONTAINER}>
          <div className="home-about" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>

            {/* Photo */}
            <Reveal style={{ overflow: 'hidden' }}>
              <motion.div
                style={{ overflow: 'hidden', height: '500px' }}
                whileHover="hover"
              >
                <motion.img
                  src={IMG.about} alt="Hair Go salon"
                  variants={{ hover: { scale: 1.04 } }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </motion.div>
            </Reveal>

            {/* Text */}
            <Reveal delay={0.15}>
              <div style={{ width: '40px', height: '2px', background: 'var(--gold)', marginBottom: '28px' }} />
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)', fontWeight: 400, color: '#fff', marginBottom: '4px', lineHeight: 1.15 }}>
                {lang === 'ar' ? 'مرحباً بك في' : 'Welcome to'}
              </h2>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)', fontWeight: 300, color: 'var(--gold)', marginBottom: '28px', lineHeight: 1.15 }}>
                Hair Go
              </h2>
              <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 2, marginBottom: '12px', fontFamily: 'Roboto' }}>
                {lang === 'ar'
                  ? 'Hair Go هو صالون شعر راسخ في وانغاباراوا منذ عام 2014.'
                  : 'Hair Go has been part of the Whangaparāoa community since 2014. Our experienced team of stylists is dedicated to delivering results that last — in a welcoming, unhurried environment.'}
              </p>
              <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 2, marginBottom: '36px', fontFamily: 'Roboto' }}>
                {lang === 'ar'
                  ? 'من القص اليومي إلى تحولات الألوان الكاملة، نهتم بكل عميل باهتمام يستحق.'
                  : 'From everyday cuts to full colour transformations, we take care of every client with the personal attention they deserve.'}
              </p>
              <div style={{ display: 'flex', gap: '36px', marginBottom: '40px' }}>
                {[
                  { num: '10+', en: 'Years open',     ar: 'سنوات' },
                  { num: '500+', en: 'Happy clients',  ar: 'عميل' },
                  { num: '4.9',  en: 'Google rating',  ar: 'تقييم' },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '2rem', fontWeight: 300, color: '#fff', lineHeight: 1, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{s.num}</div>
                    <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'Roboto' }}>
                      {lang === 'ar' ? s.ar : s.en}
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/book" className="btn">{lang === 'ar' ? 'احجز موعداً' : 'Book Appointment'}</Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SERVICES ──────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-alt)', padding: '90px 0', borderTop: '1px solid var(--border)' }}>
        <div style={CONTAINER}>
          <Reveal style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 className="section-title">{lang === 'ar' ? 'خدماتنا' : 'Our Services'}</h2>
            <span className="section-divider" />
          </Reveal>
          <div className="home-services" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)' }}>
            {SERVICES.map((s, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: 'var(--bg)', overflow: 'hidden', cursor: 'default' }}
                >
                  <div style={{ height: '220px', overflow: 'hidden' }}>
                    <motion.img
                      src={s.img} alt={s.titleEn}
                      whileHover={{ scale: 1.07 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                  <div style={{ padding: '28px 24px 32px', textAlign: 'center' }}>
                    <h4 style={{ color: '#fff', fontWeight: 400, fontSize: '1.15rem', marginBottom: '10px', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                      {lang === 'ar' ? s.titleAr : s.titleEn}
                    </h4>
                    <p style={{ color: 'var(--text)', fontSize: '13px', lineHeight: 1.85, fontFamily: 'Roboto' }}>
                      {lang === 'ar' ? s.descAr : s.descEn}
                    </p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICE LIST ────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '90px 0', borderTop: '1px solid var(--border)' }}>
        <div style={CONTAINER}>
          <Reveal style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="section-title">{lang === 'ar' ? 'قائمة الأسعار' : 'Price List'}</h2>
            <span className="section-divider" />
          </Reveal>
          <Reveal delay={0.1}>
            {/* Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px', borderBottom: '1px solid var(--border)' }}>
              {priceTabs.map(t => (
                <motion.button key={t.key} onClick={() => setTab(t.key)}
                  whileHover={{ color: 'var(--gold)' }}
                  style={{
                    padding: '10px 28px', fontSize: '11px', fontWeight: 400,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Roboto',
                    color: tab === t.key ? 'var(--gold)' : 'rgba(255,255,255,0.45)',
                    borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
                    marginBottom: '-1px', transition: 'color 0.2s',
                  }}>
                  {lang === 'ar' ? t.ar : t.en}
                </motion.button>
              ))}
            </div>

            {/* Rows */}
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              {PRICES[tab].map((p, i) => (
                <motion.div
                  key={`${tab}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  onMouseEnter={() => setHov(i)}
                  onMouseLeave={() => setHov(null)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 12px',
                    borderBottom: '1px dotted rgba(255,255,255,0.07)',
                    borderLeft: hoveredPrice === i ? '2px solid var(--gold)' : '2px solid transparent',
                    transition: 'border-color 0.2s, background 0.2s',
                    background: hoveredPrice === i ? 'rgba(201,168,76,0.04)' : 'transparent',
                    cursor: 'default',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 300, fontFamily: 'Roboto' }}>
                    {lang === 'ar' ? p.ar : p.en}
                  </span>
                  <span style={{ color: 'var(--gold)', fontSize: '14px', fontWeight: 400, flexShrink: 0, marginLeft: '32px', fontFamily: 'Roboto' }}>
                    {p.price}
                  </span>
                </motion.div>
              ))}
            </div>

            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'Roboto' }}>
              {lang === 'ar' ? '* الأسعار قد تختلف حسب طول الشعر' : '* Prices may vary depending on hair length and condition'}
            </p>
            <div style={{ textAlign: 'center', marginTop: '36px' }}>
              <Link to="/book" className="btn-outline btn">{lang === 'ar' ? 'احجزي موعداً' : 'Book Appointment'}</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA STRIP ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-alt)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '72px 0', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '18px', fontFamily: 'Roboto' }}>
            {lang === 'ar' ? 'وانغاباراوا · نيوزيلندا' : 'Whangaparāoa · Auckland · Est. 2014'}
          </p>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 300, color: '#fff', marginBottom: '12px' }}>
            {lang === 'ar' ? 'احجزي موعدك اليوم' : 'Book an Appointment Today'}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 300, marginBottom: '36px', fontFamily: 'Roboto' }}>
            {lang === 'ar' ? 'فريقنا جاهز لاستقبالك' : 'Walk-ins welcome · Online booking available 24/7'}
          </p>
          <Link to="/book" className="btn">{lang === 'ar' ? 'احجز الآن' : 'Book Now'}</Link>
        </Reveal>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '90px 0' }}>
        <div style={CONTAINER}>
          <Reveal style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 className="section-title">{lang === 'ar' ? 'ما يقوله عملاؤنا' : 'What Our Clients Say'}</h2>
            <span className="section-divider" />
          </Reveal>
          <div className="home-testimonials" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)' }}>
            {TESTIMONIALS.map((item, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: 'var(--bg-card)', padding: '40px 32px', cursor: 'default' }}
                >
                  <div style={{ fontSize: '2.5rem', color: 'var(--gold)', lineHeight: 0.8, marginBottom: '22px', fontFamily: 'Georgia, serif' }}>"</div>
                  <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.9, marginBottom: '28px', fontStyle: 'italic', fontFamily: 'Roboto' }}>
                    {lang === 'ar' ? item.qAr : item.qEn}
                  </p>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: 400, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                      {lang === 'ar' ? item.nameAr : item.nameEn}
                    </div>
                    <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginTop: '3px', fontFamily: 'Roboto' }}>
                      {lang === 'ar' ? item.locAr : item.locEn}
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ──────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-alt)', padding: '90px 0', borderTop: '1px solid var(--border)' }}>
        <div style={CONTAINER}>
          <Reveal style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 className="section-title">{lang === 'ar' ? 'منتجاتنا' : 'Hair Care Products'}</h2>
            <span className="section-divider" />
            <p style={{ color: 'var(--text)', fontSize: '14px', maxWidth: '440px', margin: '0 auto', fontFamily: 'Roboto' }}>
              {lang === 'ar' ? 'منتجات احترافية للعناية بشعرك في المنزل.' : 'Professional-grade products to maintain your style at home.'}
            </p>
          </Reveal>
          <div className="home-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)' }}>
            {PRODUCTS.map((p, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div
                  whileHover="hover"
                  style={{ background: 'var(--bg)', overflow: 'hidden', cursor: 'pointer' }}
                >
                  <Link to="/shop" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ height: '240px', overflow: 'hidden' }}>
                      <motion.img
                        src={p.img} alt={p.nameEn}
                        variants={{ hover: { scale: 1.06 } }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    <div style={{ padding: '24px 24px 28px' }}>
                      <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px', fontFamily: 'Roboto' }}>
                        {lang === 'ar' ? p.brandAr : p.brandEn}
                      </div>
                      <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 400, marginBottom: '8px', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                        {lang === 'ar' ? p.nameAr : p.nameEn}
                      </h4>
                      <p style={{ color: 'var(--text)', fontSize: '13px', lineHeight: 1.75, marginBottom: '12px', fontFamily: 'Roboto' }}>
                        {lang === 'ar' ? p.descAr : p.descEn}
                      </p>
                      <motion.div
                        variants={{ hover: { color: '#fff' } }}
                        style={{ color: 'var(--gold)', fontSize: '13px', fontFamily: 'Roboto', transition: 'color 0.2s' }}
                      >
                        {p.price}
                      </motion.div>
                    </div>
                  </Link>
                </motion.div>
              </Reveal>
            ))}
          </div>
          <Reveal style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/shop" className="btn-outline btn">{lang === 'ar' ? 'عرض جميع المنتجات' : 'View All Products'}</Link>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
