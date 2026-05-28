import { useEffect, useState } from 'react';
import { CalendarDays, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { format, startOfDay, startOfWeek, endOfWeek } from 'date-fns';

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl p-5 border"
         style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: `${color}20`, color }}>
          <Icon size={18} strokeWidth={1.5} />
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      </div>
      <div className="font-display text-3xl text-white">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ today: 0, week: 0, clients: 0, msgs: 0 });
  const [recentAppts, setRecent] = useState([]);

  useEffect(() => {
    loadStats();
    loadRecent();
  }, []);

  async function loadStats() {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd   = format(endOfWeek(new Date()), 'yyyy-MM-dd');

    const [{ count: today }, { count: week }, { count: clients }, { count: msgs }] = await Promise.all([
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('date', todayStr).neq('status','cancelled'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('date', weekStart).lte('date', weekEnd).neq('status','cancelled'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status','open').eq('unread_admin', true),
    ]);
    setStats({ today: today ?? 0, week: week ?? 0, clients: clients ?? 0, msgs: msgs ?? 0 });
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles(name, email, phone)')
      .order('date', { ascending: true })
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .neq('status', 'cancelled')
      .limit(8);
    setRecent(data ?? []);
  }

  const kpis = [
    { icon: CalendarDays,  label: "Today's appointments", value: stats.today,   color: 'var(--gold)' },
    { icon: TrendingUp,    label: 'This week',            value: stats.week,    color: 'var(--bronze)' },
    { icon: Users,         label: 'Total clients',        value: stats.clients, color: 'var(--sage)' },
    { icon: MessageSquare, label: 'Unread messages',      value: stats.msgs,    color: 'var(--rose)' },
  ];

  const statusColor = { pending: '#C9A961', confirmed: '#8C9A7E', cancelled: '#C4684F', done: '#2E3A2E' };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white">Dashboard</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {format(new Date(), 'EEEE, MMMM d yyyy')}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Upcoming appointments */}
      <div>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Upcoming appointments
        </h2>
        <div className="rounded-2xl border overflow-hidden"
             style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {recentAppts.length === 0 ? (
            <p className="text-sm p-6 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No upcoming appointments
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Client', 'Service', 'Staff', 'Date', 'Time', 'Status'].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-medium"
                        style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentAppts.map((a, i) => (
                  <tr key={a.id}
                      style={{ borderBottom: i < recentAppts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{a.profiles?.name || '—'}</div>
                      <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.profiles?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-white">{a.service_name}</td>
                    <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.staff_name}</td>
                    <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.date}</td>
                    <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.time}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: `${statusColor[a.status]}20`, color: statusColor[a.status] }}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
