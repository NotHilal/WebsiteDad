import { useState, useEffect } from 'react'
import { Check, UserCheck, Image, Scissors } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const C = {
  card: '#161620', gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)',
  goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)',
  subtle: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.07)',
}

const MAX_TEAM     = 4
const MAX_GALLERY  = 5
const MAX_SERVICES = 4

export default function StudioHomeDisplay() {
  const [stylists,  setStylists]  = useState([])
  const [gallery,   setGallery]   = useState([])
  const [services,  setServices]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [updating,  setUpdating]  = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: s }, { data: g }, { data: svc }] = await Promise.all([
      supabase.from('stylists').select('id, name, title, photo_url, featured').order('display_order'),
      supabase.from('gallery').select('id, image_url, title, category, featured').order('display_order'),
      supabase.from('services').select('id, name, category, price, image_url, featured').order('name'),
    ])
    setStylists(s || [])
    setGallery(g || [])
    setServices(svc || [])
    setLoading(false)
  }

  async function toggleStylist(s) {
    const count = stylists.filter(x => x.featured).length
    if (!s.featured && count >= MAX_TEAM) return toast.error(`Max ${MAX_TEAM} team members on home`)
    setUpdating(s.id)
    const { error } = await supabase.from('stylists').update({ featured: !s.featured }).eq('id', s.id)
    if (error) toast.error('Failed to update')
    else setStylists(prev => prev.map(x => x.id === s.id ? { ...x, featured: !x.featured } : x))
    setUpdating(null)
  }

  async function toggleGallery(item) {
    const count = gallery.filter(x => x.featured).length
    if (!item.featured && count >= MAX_GALLERY) return toast.error(`Max ${MAX_GALLERY} gallery images on home`)
    setUpdating(item.id)
    const { error } = await supabase.from('gallery').update({ featured: !item.featured }).eq('id', item.id)
    if (error) toast.error('Failed to update')
    else setGallery(prev => prev.map(x => x.id === item.id ? { ...x, featured: !x.featured } : x))
    setUpdating(null)
  }

  async function toggleService(svc) {
    const count = services.filter(x => x.featured).length
    if (!svc.featured && count >= MAX_SERVICES) return toast.error(`Max ${MAX_SERVICES} services on home`)
    if (!svc.featured && !svc.image_url) return toast.error('Add an image to this service first')
    setUpdating(svc.id)
    const { error } = await supabase.from('services').update({ featured: !svc.featured }).eq('id', svc.id)
    if (error) toast.error('Failed to update')
    else setServices(prev => prev.map(x => x.id === svc.id ? { ...x, featured: !x.featured } : x))
    setUpdating(null)
  }

  const teamCount     = stylists.filter(s => s.featured).length
  const galleryCount  = gallery.filter(g => g.featured).length
  const serviceCount  = services.filter(s => s.featured).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', height: '100%' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Home Page</p>
        <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', color: C.white, lineHeight: 1.1, marginBottom: '0.2rem' }}>
          Featured Display
        </h1>
        <p style={{ color: C.muted, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif' }}>
          Pick which team members and gallery images appear on the home page. Changes apply instantly.
        </p>
      </div>

      {/* ── Team Section ─────────────────────────────────────── */}
      <Section
        icon={<UserCheck size={14} color={C.gold} strokeWidth={1.5} />}
        title="Team on Home"
        badge={`${teamCount} / ${MAX_TEAM} selected`}
        badgeActive={teamCount >= MAX_TEAM}
      >
        {loading ? (
          <SkeletonGrid n={4} h={180} minW={140} />
        ) : stylists.length === 0 ? (
          <Empty>No stylists found — add some in the Stylists page first.</Empty>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {stylists.map(s => {
              const locked = !s.featured && teamCount >= MAX_TEAM
              return (
                <button key={s.id} onClick={() => toggleStylist(s)}
                  disabled={updating === s.id || locked}
                  style={{
                    padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden',
                    outline: s.featured ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                    background: s.featured ? C.goldBg : 'transparent',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: updating === s.id ? 0.5 : locked ? 0.4 : 1,
                    transition: 'all 0.2s', position: 'relative',
                  }}>
                  <div style={{ height: 120, overflow: 'hidden', position: 'relative', background: C.subtle }}>
                    {s.photo_url
                      ? <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                      : <Initials name={s.name} />
                    }
                    {s.featured && <CheckBadge />}
                  </div>
                  <div style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                    <p style={{ color: s.featured ? C.gold : C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                    <p style={{ color: C.muted, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── Services Section ─────────────────────────────────── */}
      <Section
        icon={<Scissors size={14} color={C.gold} strokeWidth={1.5} />}
        title="Services on Home"
        badge={`${serviceCount} / ${MAX_SERVICES} selected`}
        badgeActive={serviceCount >= MAX_SERVICES}
      >
        {loading ? (
          <SkeletonGrid n={4} ratio="4/3" minW={160} />
        ) : services.length === 0 ? (
          <Empty>No services found — add some in the Services page first.</Empty>
        ) : (
          <>
            {services.some(s => !s.image_url) && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'Jost,sans-serif', marginBottom: '0.75rem' }}>
                Services without an image are greyed out — add an image in the Services page to enable them.
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {services.map(svc => {
                const noImage = !svc.image_url
                const locked  = (!svc.featured && serviceCount >= MAX_SERVICES) || noImage
                return (
                  <button key={svc.id} onClick={() => toggleService(svc)}
                    disabled={updating === svc.id || locked}
                    style={{
                      padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden',
                      outline: svc.featured ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                      background: svc.featured ? C.goldBg : 'transparent',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: updating === svc.id ? 0.5 : noImage ? 0.35 : locked ? 0.4 : 1,
                      transition: 'all 0.2s', position: 'relative',
                    }}>
                    <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: C.subtle }}>
                      {svc.image_url
                        ? <img src={svc.image_url} alt={svc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                            <Scissors size={20} color="rgba(255,255,255,0.15)" strokeWidth={1} />
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif' }}>No image</span>
                          </div>
                      }
                      {svc.featured && <CheckBadge />}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.4rem 0.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                        <p style={{ color: '#fff', fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</p>
                        {svc.price && <p style={{ color: C.goldDim, fontSize: 9, fontFamily: 'Jost,sans-serif' }}>€{svc.price}</p>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </Section>

      {/* ── Gallery Section ───────────────────────────────────── */}
      <Section
        icon={<Image size={14} color={C.gold} strokeWidth={1.5} />}
        title="Gallery on Home"
        badge={`${galleryCount} / ${MAX_GALLERY} selected`}
        badgeActive={galleryCount >= MAX_GALLERY}
      >
        {loading ? (
          <SkeletonGrid n={6} ratio="4/3" minW={160} />
        ) : gallery.length === 0 ? (
          <Empty>No gallery images found — upload some in the Gallery page first.</Empty>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {gallery.map(item => {
              const locked = !item.featured && galleryCount >= MAX_GALLERY
              return (
                <button key={item.id} onClick={() => toggleGallery(item)}
                  disabled={updating === item.id || locked}
                  style={{
                    padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden',
                    outline: item.featured ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                    background: 'transparent',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: updating === item.id ? 0.5 : locked ? 0.4 : 1,
                    transition: 'all 0.2s', position: 'relative',
                  }}>
                  <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: C.subtle }}>
                    <img src={item.image_url} alt={item.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {item.featured && <CheckBadge />}
                    {item.title && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.4rem 0.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                        <p style={{ color: '#fff', fontSize: 9, fontFamily: 'Jost,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Section>

    </div>
  )
}

function Section({ icon, title, badge, badgeActive, children }) {
  const C = {
    card: '#161620', gold: '#C9A84C',
    white: '#f0f0f0', muted: 'rgba(255,255,255,0.22)',
    border: 'rgba(255,255,255,0.07)',
  }
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <h2 className="font-display" style={{ fontSize: '1.05rem', color: C.white }}>{title}</h2>
        </div>
        <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: badgeActive ? C.gold : C.muted, fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>
          {badge}
        </span>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>{children}</div>
    </div>
  )
}

function CheckBadge() {
  return (
    <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
      <Check size={12} color="#000" strokeWidth={3} />
    </div>
  )
}

function Initials({ name }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="font-display" style={{ fontSize: '2rem', color: 'rgba(201,168,76,0.35)' }}>{name?.[0]}</span>
    </div>
  )
}

function SkeletonGrid({ n, minW = 160, ratio }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))`, gap: '0.75rem' }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="shimmer" style={{ aspectRatio: ratio || '1/1', borderRadius: 12 }} />
      ))}
    </div>
  )
}

function Empty({ children }) {
  return (
    <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', textAlign: 'center', padding: '1.5rem 0' }}>
      {children}
    </p>
  )
}
