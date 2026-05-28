import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE || 'hg-portal';

export default function AdminGate() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked]     = useState(false);

  // If already authenticated admin, redirect to dashboard
  if (user && profile?.role === 'admin') {
    navigate(`/${ADMIN_ROUTE}/dashboard`, { replace: true });
    return null;
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (locked) return;
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error('denied');

      // Verify role = admin
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (prof?.role !== 'admin') {
        // Sign out immediately if not admin — never reveal role mismatch
        await supabase.auth.signOut();
        throw new Error('denied');
      }

      navigate(`/${ADMIN_ROUTE}/dashboard`, { replace: true });
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) {
        setLocked(true);
        setError('Too many failed attempts. Try again later.');
      } else {
        setError('Access denied.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'var(--ink)' }}>
      <div className="w-full max-w-sm">
        {/* No branding visible from outside */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
               style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ShieldAlert size={22} style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="font-display text-2xl text-white">Staff Portal</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Restricted access — authorised personnel only
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{ color: 'rgba(255,255,255,0.6)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
              disabled={locked}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border:     '1px solid rgba(255,255,255,0.12)',
                color:      '#fff',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{ color: 'rgba(255,255,255,0.6)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={locked}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none pr-11"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border:     '1px solid rgba(255,255,255,0.12)',
                  color:      '#fff',
                }}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs rounded-xl px-3 py-2.5 text-center"
               style={{ background: 'rgba(196,104,79,0.2)', color: '#f87171' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || locked}
            className="w-full py-3 rounded-2xl text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            {loading ? 'Verifying…' : 'Access portal'}
          </button>
        </form>

        {/* Rate-limit hint */}
        {attempts > 0 && !locked && (
          <p className="text-center text-xs mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>
    </div>
  );
}
