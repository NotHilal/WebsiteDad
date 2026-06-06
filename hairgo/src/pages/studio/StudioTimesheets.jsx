import { useState, useEffect } from 'react'
import { Clock, Play, StopCircle, ChevronLeft, ChevronRight, Coffee, Trash2, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Pager from '../../lib/Pager'
import { useAuth } from '../../contexts/AuthContext'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInMinutes, isToday, startOfMonth, addDays, isSameMonth, addMonths, subMonths, isSameWeek } from 'date-fns'
import toast from 'react-hot-toast'

const C = {
  card: '#161620',
  gold: '#C9A84C', goldDim: 'rgba(201,168,76,0.55)', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  green: '#34d399', greenBg: 'rgba(52,211,153,0.1)', greenBorder: 'rgba(52,211,153,0.2)',
  red: '#f87171',   redBg:   'rgba(248,113,113,0.1)', redBorder:   'rgba(248,113,113,0.22)',
}

function fmtMins(mins) {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export default function StudioTimesheets() {
  const { user, isAdmin } = useAuth()
  const [week,         setWeek]         = useState(new Date())
  const [stylists,     setStylists]     = useState([])
  const [entries,      setEntries]      = useState([])
  const [linkedStylist, setLinkedStylist] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [breakEdit,    setBreakEdit]    = useState({})
  const [page,         setPage]         = useState(0)
  const [showPicker,     setShowPicker]     = useState(false)
  const [pickerMonth,    setPickerMonth]    = useState(startOfMonth(new Date()))
  const [filterStylist,  setFilterStylist]  = useState(null)
  const [showFilter,     setShowFilter]     = useState(false)

  const weekStart = startOfWeek(week, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(week,   { weekStartsOn: 1 })

  useEffect(() => { load() }, [week, user])

  async function load() {
    setLoading(true)

    if (isAdmin) {
      // Admin sees everything
      const [{ data: stys }, { data: ents }] = await Promise.all([
        supabase.from('stylists').select('id, name, photo_url').order('display_order'),
        supabase.from('timesheets')
          .select('*, stylists(name, photo_url)')
          .gte('clock_in', weekStart.toISOString())
          .lte('clock_in', weekEnd.toISOString())
          .order('clock_in', { ascending: false }),
      ])
      setStylists(stys || [])
      setEntries(ents || [])
      setLinkedStylist(null)
    } else {
      // Employee sees only their own linked stylist
      const { data: linked } = await supabase
        .from('stylists').select('id, name, photo_url').eq('profile_id', user.id).single()
      setLinkedStylist(linked || null)
      if (linked) {
        setStylists([linked])
        const { data: ents } = await supabase
          .from('timesheets')
          .select('*, stylists(name, photo_url)')
          .eq('stylist_id', linked.id)
          .gte('clock_in', weekStart.toISOString())
          .lte('clock_in', weekEnd.toISOString())
          .order('clock_in', { ascending: false })
        setEntries(ents || [])
      } else {
        setStylists([])
        setEntries([])
      }
    }

    setLoading(false)
  }

  async function clockIn(stylistId) {
    const { error } = await supabase.from('timesheets').insert({ stylist_id: stylistId, clock_in: new Date().toISOString() })
    if (error) return toast.error(error.message)
    toast.success('Clocked in')
    load()
  }

  async function clockOut(entry) {
    const { error } = await supabase.from('timesheets').update({ clock_out: new Date().toISOString() }).eq('id', entry.id)
    if (error) return toast.error(error.message)
    toast.success('Clocked out')
    load()
  }

  async function saveBreak(entry, mins) {
    const { error } = await supabase.from('timesheets').update({ break_minutes: parseInt(mins) || 0 }).eq('id', entry.id)
    if (error) return toast.error(error.message)
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, break_minutes: parseInt(mins) || 0 } : e))
    setBreakEdit(prev => { const n = { ...prev }; delete n[entry.id]; return n })
    toast.success('Break updated')
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this timesheet entry?')) return
    await supabase.from('timesheets').delete().eq('id', id)
    toast.success('Entry deleted')
    load()
  }

  const todayEntries  = entries.filter(e => isToday(new Date(e.clock_in)))
  const clockedInNow  = todayEntries.filter(e => !e.clock_out)
  const totalWeekMins = entries.reduce((acc, e) => {
    if (!e.clock_out) return acc
    return acc + Math.max(0, differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) - (e.break_minutes || 0))
  }, 0)

  const filtered = filterStylist ? entries.filter(e => e.stylist_id === filterStylist.id) : entries
  const PER_PAGE = window.innerWidth < 768 ? 4 : 10
  const paged    = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        @keyframes blink        { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        .ts-row:hover           { background: rgba(255,255,255,0.02); }
        .ts-del:hover           { color: ${C.red} !important; border-color: rgba(248,113,113,0.3) !important; }
        .week-nav:hover         { background: rgba(201,168,76,0.08) !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .clk-in:hover           { background: rgba(52,211,153,0.18)  !important; }
        .clk-out:hover          { background: rgba(248,113,113,0.18) !important; }
        .ts-date-btn:hover      { background: rgba(255,255,255,0.05) !important; }
        .ts-picker-week:hover   { background: rgba(201,168,76,0.1) !important; border-color: rgba(201,168,76,0.15) !important; }
        .ts-filter-btn:hover    { background: rgba(255,255,255,0.05) !important; }
        .ts-stylist-row:hover   { background: rgba(255,255,255,0.04) !important; }
        .ts-mobile-cards        { display: none; }
        @media (max-width: 767px) {
          .ts-desktop-table { display: none !important; }
          .ts-mobile-cards  { display: block !important; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: '0.3rem' }}>Team</p>
        <h1 className="font-display font-light" style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', color: C.white, lineHeight: 1.1 }}>Timesheets</h1>
        <p style={{ color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', marginTop: 3 }}>Track worked hours and breaks in real time</p>
      </div>

      {/* Not linked warning for employees */}
      {!isAdmin && !loading && !linkedStylist && (
        <div style={{ flexShrink: 0, padding: '1rem 1.25rem', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p style={{ color: '#f59e0b', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif' }}>
            Your account hasn't been linked to a team member yet. Ask an admin to link your account in the <strong>Stylists</strong> page.
          </p>
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', gap: '0.6rem' }}>
        {[
          { label: 'Clocked in now', value: clockedInNow.length,    color: C.green },
          { label: 'Week total',     value: fmtMins(totalWeekMins), color: C.gold  },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem 0.75rem', textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: '1.5rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 5 }}>{s.label}</div>
          </div>
        ))}

        {/* Filter by stylist (admin only) */}
        {isAdmin && (
          <button onClick={() => setShowFilter(true)} className="ts-filter-btn"
            style={{ flex: 1, background: filterStylist ? C.goldBg : C.card, border: `1px solid ${filterStylist ? C.goldBorder : C.border}`, borderRadius: 12, padding: '0.75rem', cursor: 'pointer', transition: 'all .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {filterStylist ? (
              <>
                {filterStylist.photo_url
                  ? <img src={filterStylist.photo_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${C.gold}` }} />
                  : <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.goldBg, border: `2px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, color: C.gold, fontWeight: 700 }}>{filterStylist.name[0]}</span>
                    </div>
                }
                <span style={{ fontSize: 9, color: C.gold, fontFamily: 'Jost,sans-serif', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterStylist.name.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <div style={{ fontSize: '1.2rem', color: C.muted, lineHeight: 1 }}>⊞</div>
                <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>Filter</div>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Filter modal ─────────────────────────────────────── */}
      {showFilter && (
        <>
          <div onClick={() => setShowFilter(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: '#1b1b27', border: `1px solid ${C.border}`, borderRadius: 20, padding: '1.5rem', width: 'min(92vw, 380px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldDim, fontFamily: 'Jost,sans-serif', fontWeight: 600, marginBottom: 4 }}>Team</p>
                <h3 className="font-display font-light" style={{ fontSize: '1.3rem', color: C.white, lineHeight: 1.1 }}>Filter by member</h3>
              </div>
              <button onClick={() => setShowFilter(false)}
                style={{ width: 30, height: 30, borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}
                className="week-nav">
                ×
              </button>
            </div>

            {/* Stylist grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {stylists.map(s => {
                const isActive = filterStylist?.id === s.id
                return (
                  <button key={s.id} onClick={() => { setFilterStylist(s); setPage(0); setShowFilter(false) }} className="ts-stylist-row"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0.875rem 0.5rem', borderRadius: 12, background: isActive ? C.goldBg : C.subtle, border: `1px solid ${isActive ? C.goldBorder : C.border}`, cursor: 'pointer', transition: 'all .15s' }}>
                    {s.photo_url
                      ? <img src={s.photo_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${isActive ? C.gold : C.border}`, transition: 'border-color .15s' }} />
                      : <div style={{ width: 44, height: 44, borderRadius: '50%', background: isActive ? C.goldBg : 'rgba(255,255,255,0.06)', border: `2px solid ${isActive ? C.gold : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 16, color: isActive ? C.gold : C.muted, fontWeight: 700 }}>{s.name[0]}</span>
                        </div>
                    }
                    <span style={{ color: isActive ? C.gold : C.white, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', fontWeight: isActive ? 600 : 400, textAlign: 'center', lineHeight: 1.2 }}>{s.name.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Week nav + calendar picker ───────────────────────── */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0.5rem 0.625rem' }}>
          {isAdmin && filterStylist && (
            <button onClick={() => { setFilterStylist(null); setPage(0) }} className="week-nav"
              style={{ height: 32, padding: '0 10px', borderRadius: 9, background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all .15s', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Clear
            </button>
          )}

          <button onClick={() => { setWeek(subWeeks(week, 1)); setPage(0) }} className="week-nav"
            style={{ width: 32, height: 32, borderRadius: 9, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}>
            <ChevronLeft size={15} />
          </button>

          <button onClick={() => { setShowPicker(p => !p); setPickerMonth(startOfMonth(week)) }} className="ts-date-btn"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem 0.5rem', borderRadius: 10, transition: 'background .15s' }}>
            <CalendarDays size={14} style={{ color: C.goldDim, flexShrink: 0 }} />
            <span style={{ fontSize: '0.88rem', color: C.white, fontFamily: 'Jost,sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </span>
          </button>

          <button onClick={() => { setWeek(addWeeks(week, 1)); setPage(0) }} className="week-nav"
            style={{ width: 32, height: 32, borderRadius: 9, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}>
            <ChevronRight size={15} />
          </button>

          <button onClick={() => { setWeek(new Date()); setPage(0) }} className="week-nav"
            style={{ height: 32, padding: '0 10px', borderRadius: 9, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all .15s', flexShrink: 0, whiteSpace: 'nowrap' }}>
            Today
          </button>
        </div>

        {/* Backdrop to close picker */}
        {showPicker && <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}

        {/* Calendar picker dropdown */}
        {showPicker && (() => {
          const gridStart  = startOfWeek(startOfMonth(pickerMonth), { weekStartsOn: 1 })
          const pickerDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
          const pickerWeeks = Array.from({ length: 6 }, (_, i) => pickerDays.slice(i * 7, (i + 1) * 7))
          return (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50, background: '#1b1b27', border: `1px solid ${C.border}`, borderRadius: 14, padding: '1rem', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <button onClick={() => setPickerMonth(subMonths(pickerMonth, 1))} className="week-nav"
                  style={{ width: 28, height: 28, borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
                  <ChevronLeft size={13} />
                </button>
                <span style={{ color: C.white, fontFamily: 'Jost,sans-serif', fontSize: '0.85rem', fontWeight: 600 }}>
                  {format(pickerMonth, 'MMMM yyyy')}
                </span>
                <button onClick={() => setPickerMonth(addMonths(pickerMonth, 1))} className="week-nav"
                  style={{ width: 28, height: 28, borderRadius: 7, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.25rem' }}>
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.08em', padding: '3px 0', textTransform: 'uppercase' }}>{d}</div>
                ))}
              </div>

              {/* Week rows */}
              {pickerWeeks.map((wk, wi) => {
                const selected = isSameWeek(wk[0], week, { weekStartsOn: 1 })
                return (
                  <div key={wi} className="ts-picker-week"
                    onClick={() => { setWeek(wk[0]); setPage(0); setShowPicker(false) }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderRadius: 9, cursor: 'pointer', marginBottom: 2, transition: 'all .15s', background: selected ? 'rgba(201,168,76,0.12)' : 'transparent', border: selected ? `1px solid rgba(201,168,76,0.25)` : '1px solid transparent' }}>
                    {wk.map((day, di) => (
                      <div key={di} style={{ textAlign: 'center', padding: '7px 0', fontSize: '0.8rem', fontFamily: 'Jost,sans-serif',
                        color: !isSameMonth(day, pickerMonth) ? 'rgba(255,255,255,0.15)' : isToday(day) ? C.gold : selected ? 'rgba(201,168,76,0.9)' : C.white,
                        fontWeight: isToday(day) ? 700 : 400 }}>
                        {format(day, 'd')}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* ── Today's status strip (employees only) ───────────── */}
      {!isAdmin && stylists.length > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {stylists.map(s => {
            const active    = todayEntries.find(e => e.stylist_id === s.id && !e.clock_out)
            const todayMins = todayEntries
              .filter(e => e.stylist_id === s.id && e.clock_out)
              .reduce((acc, e) => acc + Math.max(0, differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) - (e.break_minutes || 0)), 0)
            const sinceMin  = active ? differenceInMinutes(new Date(), new Date(active.clock_in)) : 0

            return (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${active ? C.greenBorder : C.border}`, borderRadius: 14, padding: '1rem 0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '1 1 110px', minWidth: 110, transition: 'border-color .2s' }}>
                <div style={{ position: 'relative' }}>
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${active ? C.green : C.border}`, transition: 'border-color .2s' }} />
                    : <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.subtle, border: `2px solid ${active ? C.green : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .2s' }}>
                        <span style={{ color: C.muted, fontSize: 18, fontWeight: 700 }}>{s.name[0]}</span>
                      </div>
                  }
                  {active && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: C.green, border: `2px solid ${C.card}`, animation: 'blink 2s infinite' }} />}
                </div>

                <p style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{s.name.split(' ')[0]}</p>

                {active
                  ? <p style={{ fontSize: 10, color: C.green, fontFamily: 'Jost,sans-serif' }}>{fmtMins(sinceMin)}</p>
                  : todayMins > 0
                    ? <p style={{ fontSize: 10, color: C.goldDim, fontFamily: 'Jost,sans-serif' }}>{fmtMins(todayMins)}</p>
                    : <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: 'Jost,sans-serif' }}>Not in</p>
                }

                {isAdmin ? (
                  active
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, padding: '3px 9px', borderRadius: 9999, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, animation: 'blink 2s infinite', display: 'inline-block' }} /> Active
                      </span>
                    : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'Jost,sans-serif', padding: '3px 9px', borderRadius: 9999, background: C.subtle, border: `1px solid ${C.border}` }}>Off</span>
                ) : (
                  active
                    ? <button onClick={() => clockOut(active)} className="clk-out"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}>
                        <StopCircle size={9} /> Out
                      </button>
                    : <button onClick={() => clockIn(s.id)} className="clk-in"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}>
                        <Play size={9} /> In
                      </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Log table ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* ── Desktop table ── */}
        <div className="ts-desktop-table" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${C.border}` }}>
                {['Team Member', 'Date', 'Clock In', 'Clock Out', 'Break', 'Net Hours', ''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, fontWeight: 600, textAlign: 'left', fontFamily: 'Jost,sans-serif', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ height: 10, borderRadius: 4, width: j === 0 ? 110 : 55, background: C.subtle }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center' }}>
                  <Clock size={28} style={{ margin: '0 auto 0.6rem', color: C.border, display: 'block' }} />
                  <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No entries this week</p>
                </td></tr>
              ) : paged.map(e => {
                const net       = e.clock_out ? Math.max(0, differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) - (e.break_minutes || 0)) : null
                const isEditing = breakEdit[e.id] !== undefined
                return (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }} className="ts-row">
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {e.stylists?.photo_url
                          ? <img src={e.stylists.photo_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
                          : <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{e.stylists?.name?.[0]}</span>
                            </div>
                        }
                        <span style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>{e.stylists?.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', whiteSpace: 'nowrap' }}>{format(new Date(e.clock_in), 'EEE, MMM d')}</td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ color: C.green, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{format(new Date(e.clock_in), 'HH:mm')}</span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      {e.clock_out
                        ? <span style={{ color: C.red, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{format(new Date(e.clock_out), 'HH:mm')}</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, padding: '3px 9px', borderRadius: 9999, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, animation: 'blink 2s infinite', display: 'inline-block' }} /> Active
                          </span>
                      }
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {isEditing
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input type="number" min="0" value={breakEdit[e.id]}
                              onChange={ev => setBreakEdit(p => ({ ...p, [e.id]: ev.target.value }))}
                              style={{ width: 50, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.goldBorder}`, borderRadius: 6, padding: '2px 6px', fontSize: '0.75rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif' }} />
                            <span style={{ fontSize: 9, color: C.muted, fontFamily: 'Jost,sans-serif' }}>min</span>
                            <button onClick={() => saveBreak(e, breakEdit[e.id])} style={{ padding: '2px 7px', borderRadius: 5, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: 10, cursor: 'pointer' }}>✓</button>
                          </div>
                        : <button onClick={() => setBreakEdit(p => ({ ...p, [e.id]: String(e.break_minutes || 0) }))}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', padding: 0 }}>
                            <Coffee size={10} />{e.break_minutes ? `${e.break_minutes}m` : '—'}
                          </button>
                      }
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{ color: net !== null ? C.gold : C.muted, fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: net !== null ? 600 : 400 }}>
                        {net !== null ? fmtMins(net) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {isAdmin && (
                        <button onClick={() => deleteEntry(e.id)} className="ts-del"
                          style={{ padding: '3px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.35)', fontSize: 9, fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .15s' }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="ts-mobile-cards" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.subtle, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 11, borderRadius: 4, width: 120, background: C.subtle, marginBottom: 6 }} />
                    <div style={{ height: 9, borderRadius: 4, width: 80, background: C.subtle }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  {[1,1,1].map((_, j) => <div key={j} style={{ flex: 1, height: 32, borderRadius: 8, background: C.subtle }} />)}
                </div>
              </div>
            ))
          ) : entries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Clock size={28} style={{ margin: '0 auto 0.6rem', color: C.border, display: 'block' }} />
              <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No entries this week</p>
            </div>
          ) : paged.map(e => {
            const net       = e.clock_out ? Math.max(0, differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) - (e.break_minutes || 0)) : null
            const isEditing = breakEdit[e.id] !== undefined
            return (
              <div key={e.id} style={{ padding: '0.65rem 0.875rem', borderBottom: `1px solid ${C.border}` }}>

                {/* Name + date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.42rem' }}>
                  {e.stylists?.photo_url
                    ? <img src={e.stylists.photo_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: `1px solid ${C.border}` }} />
                    : <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{e.stylists?.name?.[0]}</span>
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.white, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, lineHeight: 1.2 }}>{e.stylists?.name}</p>
                    <p style={{ color: C.muted, fontSize: '0.67rem', fontFamily: 'Jost,sans-serif', marginTop: 1 }}>{format(new Date(e.clock_in), 'EEE, MMM d')}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteEntry(e.id)} className="ts-del"
                      style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>

                {/* Clock in / out / break */}
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '0.38rem', borderTop: `1px solid ${C.border}`, gap: 0 }}>
                  {[
                    { label: 'In',  content: <span style={{ color: C.green, fontSize: '0.86rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{format(new Date(e.clock_in), 'HH:mm')}</span> },
                    { label: 'Out', content: e.clock_out
                      ? <span style={{ color: C.red, fontSize: '0.86rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{format(new Date(e.clock_out), 'HH:mm')}</span>
                      : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.86rem', fontFamily: 'Jost,sans-serif' }}>—</span>
                    },
                  ].map(({ label, content }, idx) => (
                    <div key={label} style={{ flex: 1, textAlign: 'center', paddingRight: idx === 0 ? 0 : 0, borderRight: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 7, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
                      {content}
                    </div>
                  ))}
                  <div style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 7, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Break</div>
                    {isEditing
                      ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                          <input type="number" min="0" value={breakEdit[e.id]}
                            onChange={ev => setBreakEdit(p => ({ ...p, [e.id]: ev.target.value }))}
                            style={{ width: 38, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.goldBorder}`, borderRadius: 5, padding: '2px 3px', fontSize: '0.68rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', textAlign: 'center' }} />
                          <button onClick={() => saveBreak(e, breakEdit[e.id])} style={{ padding: '2px 5px', borderRadius: 4, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: 9, cursor: 'pointer' }}>✓</button>
                        </div>
                      : <button onClick={() => setBreakEdit(p => ({ ...p, [e.id]: String(e.break_minutes || 0) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: e.break_minutes ? C.goldDim : 'rgba(255,255,255,0.2)', fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', fontWeight: e.break_minutes ? 600 : 400, padding: 0 }}>
                          {e.break_minutes ? `${e.break_minutes}m` : '—'}
                        </button>
                    }
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 7, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>Net</div>
                    {net !== null
                      ? <span style={{ color: C.gold, fontSize: '0.86rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{fmtMins(net)}</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, padding: '2px 6px', borderRadius: 9999, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.green, animation: 'blink 2s infinite', display: 'inline-block' }} /> Active
                        </span>
                    }
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {!loading && <Pager page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />}
    </div>
  )
}
