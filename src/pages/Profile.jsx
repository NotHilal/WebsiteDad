import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: profile?.name ?? '', phone: profile?.phone ?? '' });

  if (!user) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="page-header"><h1>{t('nav_profile') || 'Profile'}</h1></div>
        <div style={{ maxWidth: '400px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px' }}>{t('auth_signin')}</p>
          <button onClick={() => navigate('/signin')} className="btn">{t('nav_signin')}</button>
        </div>
      </div>
    );
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('profiles').update({ name: form.name, phone: form.phone }).eq('id', user.id);
    setSaving(false);
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>{t('nav_profile') || 'My Account'}</h1>
        <div className="breadcrumb">
          <span>Home</span><span style={{ color: 'var(--border)' }}>/</span><span>Account</span>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 24px' }}>
        {/* Profile card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px 32px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '52px', height: '52px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 400, color: 'var(--gold)', flexShrink: 0 }}>
            {profile?.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 400, color: '#ffffff' }}>{profile?.name || user.email}</div>
            <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '3px' }}>{user.email}</div>
            <div style={{ fontSize: '11px', marginTop: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)' }}>
              {(profile?.points ?? 0)} points
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px 32px', marginBottom: '2px' }}>
          <h3 style={{ color: '#ffffff', fontWeight: 400, fontSize: '15px', marginBottom: '8px' }}>Account Details</h3>
          <div style={{ width: '32px', height: '2px', background: 'var(--gold)', marginBottom: '24px' }} />

          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{t('auth_name')}</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="field" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{t('auth_phone')}</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel" className="field" />
            </div>
            <button type="submit" disabled={saving} className="btn" style={{ marginTop: '8px', opacity: saving ? 0.6 : 1 }}>
              {saving ? t('loading') : t('save')}
            </button>
          </form>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px 32px' }}>
          <button onClick={async () => { await signOut(); navigate('/'); }}
            style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.2s' }}>
            {t('nav_signout')}
          </button>
        </div>
      </div>
    </div>
  );
}
