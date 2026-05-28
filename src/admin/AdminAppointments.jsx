import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const STATUS_OPTIONS = ['pending', 'confirmed', 'done', 'cancelled'];
const STATUS_COLOR   = { pending: '#C9A961', confirmed: '#8C9A7E', done: '#2E3A2E', cancelled: '#C4684F' };

export default function AdminAppointments() {
  const [appts, setAppts]   = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const q = supabase
      .from('appointments')
      .select('*, profiles(name, email, phone)')
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    const { data } = await q;
    setAppts(data ?? []);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  const filtered = filter === 'all' ? appts : appts.filter(a => a.status === filter);

  return (
    <div className="p-6 space-y-5">
      <h1 className="font-display text-2xl text-white">Appointments</h1>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_OPTIONS].map(f => (
          <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
                  style={{
                    background: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                    color:      filter === f ? 'var(--ink)' : 'rgba(255,255,255,0.5)',
                  }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-x-auto"
           style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              {['Client', 'Phone', 'Service', 'Staff', 'Date', 'Time', 'Status', ''].map(h => (
                <th key={h} className="text-start px-4 py-3 text-xs font-medium"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No appointments</td></tr>
            ) : filtered.map((a, i) => (
              <tr key={a.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{a.profiles?.name || '—'}</div>
                  <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.profiles?.email}</div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {a.profiles?.phone || '—'}
                </td>
                <td className="px-4 py-3 text-white">{a.service_name}</td>
                <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.staff_name}</td>
                <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.date}</td>
                <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.time}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ background: `${STATUS_COLOR[a.status]}20`, color: STATUS_COLOR[a.status] }}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select value={a.status}
                          onChange={e => updateStatus(a.id, e.target.value)}
                          className="text-xs rounded-lg px-2 py-1 outline-none"
                          style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
