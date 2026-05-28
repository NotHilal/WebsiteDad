import { useEffect, useState } from 'react';
import { Search, Phone, Mail, Star } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { format } from 'date-fns';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [appts, setAppts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) loadAppts(selected.id); }, [selected]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false });
    setClients(data ?? []);
    setLoading(false);
  }

  async function loadAppts(userId) {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5);
    setAppts(data ?? []);
  }

  const filtered = clients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl text-white mb-5">Clients</h1>

      <div className="grid grid-cols-12 gap-4">
        {/* List */}
        <div className="col-span-7 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Search by name, email or phone…"
                   className="w-full ps-9 pe-4 py-2.5 rounded-xl text-sm outline-none"
                   style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#fff' }} />
          </div>

          {/* Client rows */}
          <div className="rounded-2xl border overflow-hidden"
               style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {loading ? (
              <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No clients found</p>
            ) : filtered.map((c, i) => (
              <button key={c.id} onClick={() => setSelected(c)}
                      className="w-full text-left flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/5"
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        background:   selected?.id === c.id ? 'rgba(201,169,97,0.07)' : 'transparent',
                      }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                     style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--gold)' }}>
                  {c.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-white">{c.name || '—'}</div>
                  <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.email}</div>
                </div>
                <div className="flex items-center gap-1 text-xs flex-shrink-0"
                     style={{ color: 'var(--gold)' }}>
                  <Star size={11} />
                  {c.points ?? 0}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="col-span-5">
          {selected ? (
            <div className="rounded-2xl border p-5 space-y-5"
                 style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold"
                     style={{ background: 'rgba(201,169,97,0.15)', color: 'var(--gold)' }}>
                  {selected.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div className="font-semibold text-white">{selected.name || '—'}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Joined {format(new Date(selected.created_at), 'MMMM yyyy')}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-3 p-4 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact</div>
                <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <Mail size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  {selected.email}
                </div>
                <div className="flex items-center gap-2.5 text-sm" style={{ color: selected.phone ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }}>
                  <Phone size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  {selected.phone || 'No phone provided'}
                </div>
              </div>

              {/* Points */}
              <div className="flex items-center justify-between p-4 rounded-xl"
                   style={{ background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.15)' }}>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Loyalty points</span>
                <span className="font-display text-2xl" style={{ color: 'var(--gold)' }}>
                  {selected.points ?? 0}
                </span>
              </div>

              {/* Recent appointments */}
              {appts.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Recent appointments
                  </div>
                  <div className="space-y-2">
                    {appts.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-3 rounded-xl"
                           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <div className="text-sm text-white">{a.service_name}</div>
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.date} · {a.time}</div>
                        </div>
                        <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border h-40 flex items-center justify-center"
                 style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Select a client</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
