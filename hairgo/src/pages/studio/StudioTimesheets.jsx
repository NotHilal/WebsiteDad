import { useState, useEffect } from 'react'
import { Clock, Play, StopCircle, ChevronLeft, ChevronRight, Coffee, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInMinutes, isToday } from 'date-fns'
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <style>{`
        @keyframes blink   { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        .ts-row:hover      { background: rgba(255,255,255,0.02); }
        .ts-del:hover      { color: ${C.red} !important; border-color: rgba(248,113,113,0.3) !important; }
        .week-nav:hover    { background: rgba(201,168,76,0.08) !important; border-color: ${C.goldBorder} !important; color: ${C.gold} !important; }
        .clk-in:hover      { background: rgba(52,211,153,0.18)  !important; }
        .clk-out:hover     { background: rgba(248,113,113,0.18) !important; }
        .ts-mobile-cards   { display: none; }
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

      {/* ── Week nav + stats ─────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setWeek(subWeeks(week, 1))} className="week-nav"
            style={{ width: 30, height: 30, borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '0.85rem', color: C.white, fontFamily: 'Jost,sans-serif', minWidth: 168, textAlign: 'center' }}>
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button onClick={() => setWeek(addWeeks(week, 1))} className="week-nav"
            style={{ width: 30, height: 30, borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {[
            { label: 'Clocked in now', value: clockedInNow.length,    color: C.green },
            { label: 'Week total',     value: fmtMins(totalWeekMins), color: C.gold  },
            { label: 'Entries',        value: entries.length,         color: C.dim   },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.55rem 0.875rem', textAlign: 'center', minWidth: 80 }}>
              <div className="font-display" style={{ fontSize: '1.25rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's status strip ─────────────────────────────── */}
      {stylists.length > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: 4 }}>
          {stylists.map(s => {
            const active    = todayEntries.find(e => e.stylist_id === s.id && !e.clock_out)
            const todayMins = todayEntries
              .filter(e => e.stylist_id === s.id && e.clock_out)
              .reduce((acc, e) => acc + Math.max(0, differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) - (e.break_minutes || 0)), 0)
            const sinceMin  = active ? differenceInMinutes(new Date(), new Date(active.clock_in)) : 0

            return (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${active ? C.greenBorder : C.border}`, borderRadius: 14, padding: '0.8rem 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 108, flexShrink: 0, transition: 'border-color .2s' }}>
                <div style={{ position: 'relative' }}>
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${active ? C.green : C.border}`, transition: 'border-color .2s' }} />
                    : <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.subtle, border: `2px solid ${active ? C.green : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .2s' }}>
                        <span style={{ color: C.muted, fontSize: 15, fontWeight: 700 }}>{s.name[0]}</span>
                      </div>
                  }
                  {active && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: C.green, border: `2px solid ${C.card}`, animation: 'blink 2s infinite' }} />}
                </div>

                <p style={{ color: C.white, fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{s.name.split(' ')[0]}</p>

                {active
                  ? <p style={{ fontSize: 9, color: C.green, fontFamily: 'Jost,sans-serif' }}>{fmtMins(sinceMin)}</p>
                  : todayMins > 0
                    ? <p style={{ fontSize: 9, color: C.goldDim, fontFamily: 'Jost,sans-serif' }}>{fmtMins(todayMins)}</p>
                    : <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: 'Jost,sans-serif' }}>Not in</p>
                }

                {active
                  ? <button onClick={() => clockOut(active)} className="clk-out"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}>
                      <StopCircle size={9} /> Out
                    </button>
                  : <button onClick={() => clockIn(s.id)} className="clk-in"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}>
                      <Play size={9} /> In
                    </button>
                }
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
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center' }}>
                  <Clock size={28} style={{ margin: '0 auto 0.6rem', color: C.border, display: 'block' }} />
                  <p style={{ color: C.muted, fontSize: '0.8rem', fontFamily: 'Jost,sans-serif' }}>No entries this week</p>
                </td></tr>
              ) : entries.map(e => {
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
          ) : entries.map(e => {
            const net       = e.clock_out ? Math.max(0, differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) - (e.break_minutes || 0)) : null
            const isEditing = breakEdit[e.id] !== undefined
            return (
              <div key={e.id} style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.border}` }}>

                {/* Name + date + net hours */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.625rem' }}>
                  {e.stylists?.photo_url
                    ? <img src={e.stylists.photo_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: `1px solid ${C.border}` }} />
                    : <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>{e.stylists?.name?.[0]}</span>
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.white, fontSize: '0.83rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, lineHeight: 1.2 }}>{e.stylists?.name}</p>
                    <p style={{ color: C.muted, fontSize: '0.7rem', fontFamily: 'Jost,sans-serif', marginTop: 2 }}>{format(new Date(e.clock_in), 'EEE, MMM d')}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteEntry(e.id)} className="ts-del"
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>

                {/* Clock in / out / break */}
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '0.5rem', borderTop: `1px solid ${C.border}`, gap: 0 }}>
                  {[
                    { label: 'In',  content: <span style={{ color: C.green, fontSize: '0.9rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{format(new Date(e.clock_in), 'HH:mm')}</span> },
                    { label: 'Out', content: e.clock_out
                      ? <span style={{ color: C.red, fontSize: '0.9rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{format(new Date(e.clock_out), 'HH:mm')}</span>
                      : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontFamily: 'Jost,sans-serif' }}>—</span>
                    },
                  ].map(({ label, content }, idx) => (
                    <div key={label} style={{ flex: 1, textAlign: 'center', paddingRight: idx === 0 ? 0 : 0, borderRight: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>{label}</div>
                      {content}
                    </div>
                  ))}
                  <div style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Break</div>
                    {isEditing
                      ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <input type="number" min="0" value={breakEdit[e.id]}
                            onChange={ev => setBreakEdit(p => ({ ...p, [e.id]: ev.target.value }))}
                            style={{ width: 44, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.goldBorder}`, borderRadius: 6, padding: '2px 4px', fontSize: '0.72rem', color: C.white, outline: 'none', fontFamily: 'Jost,sans-serif', textAlign: 'center' }} />
                          <button onClick={() => saveBreak(e, breakEdit[e.id])} style={{ padding: '2px 6px', borderRadius: 5, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, fontSize: 10, cursor: 'pointer' }}>✓</button>
                        </div>
                      : <button onClick={() => setBreakEdit(p => ({ ...p, [e.id]: String(e.break_minutes || 0) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: e.break_minutes ? C.goldDim : 'rgba(255,255,255,0.2)', fontSize: '0.85rem', fontFamily: 'Jost,sans-serif', fontWeight: e.break_minutes ? 600 : 400, padding: 0 }}>
                          {e.break_minutes ? `${e.break_minutes}m` : '—'}
                        </button>
                    }
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: C.muted, fontFamily: 'Jost,sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Net</div>
                    {net !== null
                      ? <span style={{ color: C.gold, fontSize: '0.88rem', fontFamily: 'Jost,sans-serif', fontWeight: 700 }}>{fmtMins(net)}</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: C.green, fontFamily: 'Jost,sans-serif', fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, animation: 'blink 2s infinite', display: 'inline-block' }} /> Active
                        </span>
                    }
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
