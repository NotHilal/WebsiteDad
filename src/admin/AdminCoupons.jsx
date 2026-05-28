import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { format } from 'date-fns';

const EMPTY = { code: '', type: 'percent', value: '', expires_at: '', max_uses: '', active: true };

export default function AdminCoupons() {
  const [coupons, setCoupons]   = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('coupons')
      .select('*, coupon_uses(id)')
      .order('created_at', { ascending: false });
    setCoupons(data ?? []);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.value) { setError('Code and value are required.'); return; }
    setSaving(true);

    const payload = {
      code:       form.code.trim().toUpperCase(),
      type:       form.type,
      value:      parseFloat(form.value),
      expires_at: form.expires_at || null,
      max_uses:   form.max_uses ? parseInt(form.max_uses) : null,
      active:     form.active,
    };

    const { error: err } = await supabase.from('coupons').insert(payload);
    setSaving(false);

    if (err) { setError(err.message); return; }
    setModal(false);
    setForm(EMPTY);
    load();
  }

  async function toggleActive(id, current) {
    await supabase.from('coupons').update({ active: !current }).eq('id', id);
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c));
  }

  async function deleteCoupon(id) {
    if (!confirm('Delete this coupon?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    setCoupons(prev => prev.filter(c => c.id !== id));
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-white">Coupons</h1>
        <button onClick={() => setModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
          <Plus size={15} /> Create coupon
        </button>
      </div>

      {/* Coupons table */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              {['Code', 'Type', 'Value', 'Uses', 'Expires', 'Status', ''].map(h => (
                <th key={h} className="text-start px-4 py-3 text-xs font-medium"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No coupons yet</td></tr>
            ) : coupons.map((c, i) => (
              <tr key={c.id}
                  style={{ borderBottom: i < coupons.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--gold)' }}>{c.code}</td>
                <td className="px-4 py-3 text-xs capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.type}</td>
                <td className="px-4 py-3 text-white">
                  {c.type === 'percent' ? `${c.value}%` : `$${c.value}`}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {c.coupon_uses?.length ?? 0} / {c.max_uses ?? '∞'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {c.expires_at ? format(new Date(c.expires_at), 'dd/MM/yy') : '—'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(c.id, c.active)}
                          className="text-xs px-2 py-0.5 rounded-full transition-all"
                          style={{
                            background: c.active ? 'rgba(140,154,126,0.2)' : 'rgba(255,255,255,0.06)',
                            color:      c.active ? 'var(--sage)' : 'rgba(255,255,255,0.35)',
                          }}>
                    {c.active ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-white/5"
                          style={{ color: '#f87171' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
               style={{ background: '#1A1410', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-white">Create coupon</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              {/* Code */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Code *</label>
                <input value={form.code} onChange={set('code')} required
                       placeholder="e.g. SUMMER20"
                       className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono tracking-wider"
                       style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Type *</label>
                  <select value={form.type} onChange={set('type')}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Value * {form.type === 'percent' ? '(%)' : '($)'}
                  </label>
                  <input value={form.value} onChange={set('value')} required type="number" min="0.01" step="0.01"
                         className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                         style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                </div>
              </div>

              {/* Expires + Max uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Expires (optional)</label>
                  <input type="date" value={form.expires_at} onChange={set('expires_at')}
                         className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                         style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Max uses (blank = ∞)</label>
                  <input type="number" min="1" value={form.max_uses} onChange={set('max_uses')}
                         className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                         style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                </div>
              </div>

              {error && (
                <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(196,104,79,0.2)', color: '#f87171' }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm border"
                        style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                        style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
                  {saving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
