import { useState, useEffect, useMemo } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { supabase } from '../../lib/supabase'
import {
  Activity, Calendar, CalendarOff, Users, UserCheck, MessageSquare,
  Clock, Banknote, ShoppingBag, Sparkles, Scissors, Package, Image,
  Tag, RefreshCw, ChevronDown, X,
} from 'lucide-react'

const C = {
  card: '#161620', bg: '#0e0e14',
  gold: '#C9A84C', goldBg: 'rgba(201,168,76,0.08)', goldBorder: 'rgba(201,168,76,0.18)',
  blue: '#60a5fa', blueBg: 'rgba(96,165,250,0.08)', blueBorder: 'rgba(96,165,250,0.2)',
  purple: '#a78bfa',
  green: '#34d399', greenBg: 'rgba(52,211,153,0.08)',
  red: '#f87171',   redBg:   'rgba(248,113,113,0.08)',
  white: '#f0f0f0', dim: 'rgba(255,255,255,0.45)', muted: 'rgba(255,255,255,0.22)',
  border: 'rgba(255,255,255,0.07)', subtle: 'rgba(255,255,255,0.04)',
}

const ACTION_META = {
  // Appointments
  'appointment.status_changed':    { Icon: Calendar,      color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Appointment'   },
  // Users
  'user.role_changed':             { Icon: Users,         color: C.gold,    bg: C.goldBg,                 label: 'Role change'   },
  'user.artist_promoted':          { Icon: UserCheck,     color: C.gold,    bg: C.goldBg,                 label: 'Promotion'     },
  // Tickets
  'ticket.closed':                 { Icon: MessageSquare, color: C.red,     bg: C.redBg,                  label: 'Ticket'        },
  'ticket.reopened':               { Icon: MessageSquare, color: C.green,   bg: C.greenBg,                label: 'Ticket'        },
  // Timesheets
  'timesheet.clock_in':            { Icon: Clock,         color: C.green,   bg: C.greenBg,                label: 'Timesheet'     },
  'timesheet.clock_out':           { Icon: Clock,         color: C.red,     bg: C.redBg,                  label: 'Timesheet'     },
  // Pay runs
  'payrun.paid':                   { Icon: Banknote,      color: C.gold,    bg: C.goldBg,                 label: 'Pay run'       },
  // Blocked dates
  'blocked_dates.salon_blocked':   { Icon: CalendarOff,   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  label: 'Schedule'      },
  'blocked_dates.salon_unblocked': { Icon: CalendarOff,   color: C.green,   bg: C.greenBg,                label: 'Schedule'      },
  'blocked_dates.approved':        { Icon: CalendarOff,   color: C.green,   bg: C.greenBg,                label: 'Day off'       },
  'blocked_dates.rejected':        { Icon: CalendarOff,   color: C.red,     bg: C.redBg,                  label: 'Day off'       },
  'blocked_dates.requested':       { Icon: CalendarOff,   color: C.blue,    bg: C.blueBg,                 label: 'Day off'       },
  // Orders
  'order.retrieved':               { Icon: ShoppingBag,   color: C.green,   bg: C.greenBg,                label: 'Order'         },
  'order.reverted':                { Icon: ShoppingBag,   color: C.gold,    bg: C.goldBg,                 label: 'Order'         },
  'order.cancelled':               { Icon: ShoppingBag,   color: C.red,     bg: C.redBg,                  label: 'Order'         },
  'order.deleted':                 { Icon: ShoppingBag,   color: C.red,     bg: C.redBg,                  label: 'Order'         },
  // Home display
  'home_display.updated':          { Icon: Sparkles,      color: C.gold,    bg: C.goldBg,                 label: 'Home display'  },
  // Services
  'service.created':               { Icon: Scissors,      color: C.green,   bg: C.greenBg,                label: 'Service'       },
  'service.edited':                { Icon: Scissors,      color: C.blue,    bg: C.blueBg,                 label: 'Service'       },
  'service.deleted':               { Icon: Scissors,      color: C.red,     bg: C.redBg,                  label: 'Service'       },
  'service.archived':              { Icon: Scissors,      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  label: 'Service'       },
  'service.restored':              { Icon: Scissors,      color: C.green,   bg: C.greenBg,                label: 'Service'       },
  // Stylists
  'stylist.created':               { Icon: UserCheck,     color: C.green,   bg: C.greenBg,                label: 'Stylist'       },
  'stylist.edited':                { Icon: UserCheck,     color: C.blue,    bg: C.blueBg,                 label: 'Stylist'       },
  'stylist.deleted':               { Icon: UserCheck,     color: C.red,     bg: C.redBg,                  label: 'Stylist'       },
  'stylist.unlinked':              { Icon: UserCheck,     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  label: 'Stylist'       },
  // Products
  'product.created':               { Icon: Package,       color: C.green,   bg: C.greenBg,                label: 'Product'       },
  'product.edited':                { Icon: Package,       color: C.blue,    bg: C.blueBg,                 label: 'Product'       },
  'product.deleted':               { Icon: Package,       color: C.red,     bg: C.redBg,                  label: 'Product'       },
  // Gallery
  'gallery.photo_added':           { Icon: Image,         color: C.green,   bg: C.greenBg,                label: 'Gallery'       },
  'gallery.photo_edited':          { Icon: Image,         color: C.blue,    bg: C.blueBg,                 label: 'Gallery'       },
  'gallery.photo_deleted':         { Icon: Image,         color: C.red,     bg: C.redBg,                  label: 'Gallery'       },
  // Coupons
  'coupon.created':                { Icon: Tag,           color: C.green,   bg: C.greenBg,                label: 'Coupon'        },
  'coupon.edited':                 { Icon: Tag,           color: C.blue,    bg: C.blueBg,                 label: 'Coupon'        },
  'coupon.deleted':                { Icon: Tag,           color: C.red,     bg: C.redBg,                  label: 'Coupon'        },
  'coupon.assigned':               { Icon: Tag,           color: C.gold,    bg: C.goldBg,                 label: 'Coupon'        },
}

function getActionMeta(action) {
  return ACTION_META[action] || { Icon: Activity, color: C.dim, bg: C.subtle, label: action }
}

function dayLabel(dateKey) {
  const d = new Date(dateKey + 'T12:00:00')
  if (isToday(d))     return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE')
}

function daySubLabel(dateKey) {
  const d = new Date(dateKey + 'T12:00:00')
  return format(d, 'MMM d, yyyy')
}

const SELECT_STYLE = {
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.dim, fontSize: '0.78rem', fontFamily: 'Jost,sans-serif',
  padding: '6px 10px 6px 10px', cursor: 'pointer', outline: 'none',
  appearance: 'none', WebkitAppearance: 'none',
}

export default function StudioLogs() {
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filterActor,  setFilterActor]  = useState('all')
  const [filterAction, setFilterAction] = useState('all')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(400)
    if (error) console.error('[Activity Logs] load failed:', error.message, error)
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const sub = supabase.channel('activity-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, payload => {
        setLogs(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const actors = useMemo(() => {
    const map = new Map()
    logs.forEach(l => {
      if (!map.has(l.actor_id)) map.set(l.actor_id, { id: l.actor_id, name: l.actor_name, role: l.actor_role })
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [logs])

  const actionTypes = useMemo(() => {
    const set = new Set(logs.map(l => l.action))
    return [...set].sort()
  }, [logs])

  const filtered = useMemo(() => logs.filter(l => {
    if (filterActor  !== 'all' && l.actor_id !== filterActor)  return false
    if (filterAction !== 'all' && l.action   !== filterAction) return false
    return true
  }), [logs, filterActor, filterAction])

  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach(log => {
      const key = format(new Date(log.created_at), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(log)
    })
    return [...map.entries()]
  }, [filtered])

  const hasFilters = filterActor !== 'all' || filterAction !== 'all'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`
        .log-row:hover { background: rgba(255,255,255,0.025) !important; }
        .log-select:focus { border-color: rgba(201,168,76,0.35) !important; }
        .log-clear:hover { background: rgba(248,113,113,0.12) !important; color: #f87171 !important; border-color: rgba(248,113,113,0.25) !important; }
        .log-refresh:hover { background: rgba(201,168,76,0.12) !important; color: #C9A84C !important; border-color: rgba(201,168,76,0.3) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexShrink: 0, gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontFamily: 'Jost,sans-serif', fontWeight: 700, color: C.white, marginBottom: 3 }}>
            Activity Logs
          </h2>
          <p style={{ fontSize: '0.78rem', fontFamily: 'Jost,sans-serif', color: C.muted }}>
            Every action, who did it, and when
          </p>
        </div>
        <button onClick={load} className="log-refresh"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.dim, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}>
          <RefreshCw size={12} style={{ transform: loading ? 'rotate(360deg)' : 'none', transition: loading ? 'transform 0.6s linear' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Actor select */}
        <div style={{ position: 'relative' }}>
          <select value={filterActor} onChange={e => setFilterActor(e.target.value)}
            className="log-select" style={SELECT_STYLE}>
            <option value="all">All people</option>
            {actors.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
            ))}
          </select>
          <ChevronDown size={11} color={C.muted} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Action select */}
        <div style={{ position: 'relative' }}>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="log-select" style={SELECT_STYLE}>
            <option value="all">All actions</option>
            {actionTypes.map(a => (
              <option key={a} value={a}>{getActionMeta(a).label} — {a}</option>
            ))}
          </select>
          <ChevronDown size={11} color={C.muted} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {hasFilters && (
          <button onClick={() => { setFilterActor('all'); setFilterAction('all') }} className="log-clear"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: C.subtle, border: `1px solid ${C.border}`, color: C.dim, fontSize: '0.75rem', fontFamily: 'Jost,sans-serif', cursor: 'pointer', transition: 'all .15s' }}>
            <X size={11} /> Clear
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontFamily: 'Jost,sans-serif', color: C.muted }}>
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Log list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 62, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        )}

        {!loading && grouped.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color={C.border} />
            </div>
            <p style={{ fontSize: '0.82rem', fontFamily: 'Jost,sans-serif', color: C.muted }}>
              {hasFilters ? 'No events match your filters' : 'No activity yet'}
            </p>
          </div>
        )}

        {!loading && grouped.map(([dayKey, dayLogs]) => (
          <div key={dayKey} style={{ marginBottom: '1.75rem' }}>
            {/* Day separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.625rem' }}>
              <div style={{ height: 1, width: 12, background: C.border, flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Jost,sans-serif', fontWeight: 700, color: C.dim, whiteSpace: 'nowrap' }}>
                {dayLabel(dayKey)}
              </span>
              <span style={{ fontSize: '0.68rem', fontFamily: 'Jost,sans-serif', color: C.muted, whiteSpace: 'nowrap' }}>
                {daySubLabel(dayKey)}
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: '0.65rem', fontFamily: 'Jost,sans-serif', color: 'rgba(255,255,255,0.18)', whiteSpace: 'nowrap' }}>
                {dayLogs.length} event{dayLogs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {dayLogs.map(log => {
                const { Icon, color, bg, label } = getActionMeta(log.action)
                const isAdm = log.actor_role === 'admin'
                const actorColor  = isAdm ? C.gold   : C.blue
                const actorBg     = isAdm ? C.goldBg : C.blueBg
                const actorBorder = isAdm ? C.goldBorder : C.blueBorder

                return (
                  <div key={log.id} className="log-row"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 0.875rem', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, transition: 'background .15s', cursor: 'default' }}>

                    {/* Time */}
                    <span style={{ fontSize: '0.7rem', fontFamily: 'Jost,sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.22)', minWidth: 38, paddingTop: 2, flexShrink: 0, letterSpacing: '0.04em' }}>
                      {format(new Date(log.created_at), 'HH:mm')}
                    </span>

                    {/* Action icon */}
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color={color} strokeWidth={2} />
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        {/* Actor badge */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, background: actorBg, border: `1px solid ${actorBorder}` }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: actorColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, fontFamily: 'Jost,sans-serif', fontWeight: 700, color: actorColor, letterSpacing: '0.03em' }}>
                            {log.actor_name}
                          </span>
                          <span style={{ fontSize: 8, fontFamily: 'Jost,sans-serif', color: actorColor, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {log.actor_role}
                          </span>
                        </span>

                        {/* Action type label */}
                        <span style={{ fontSize: 9, fontFamily: 'Jost,sans-serif', fontWeight: 600, color, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75 }}>
                          {label}
                        </span>
                      </div>

                      {/* Message */}
                      <p style={{ fontSize: '0.8rem', fontFamily: 'Jost,sans-serif', color: 'rgba(255,255,255,0.52)', lineHeight: 1.5, margin: 0 }}>
                        {log.details?.message || log.action}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
