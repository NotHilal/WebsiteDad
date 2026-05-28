import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

export default function SignUp() {
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', phone: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message?.includes('already') ? t('auth_error_email_taken') : t('error_generic'));
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: 'name',  label: t('auth_name'),  type: 'text',  required: true },
    { key: 'email', label: t('auth_email'), type: 'email', required: true },
    { key: 'phone', label: t('auth_phone'), type: 'tel',   required: false },
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>{t('auth_signup')}</h1>
        <div className="breadcrumb">
          <span>Home</span><span style={{ color: 'var(--border)' }}>/</span><span>{t('auth_signup')}</span>
        </div>
      </div>

      <div style={{ maxWidth: '420px', margin: '60px auto', padding: '0 24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '40px' }}>
          <h2 style={{ color: '#ffffff', fontWeight: 400, fontSize: '1.4rem', marginBottom: '8px' }}>{t('auth_signup')}</h2>
          <div style={{ width: '32px', height: '2px', background: 'var(--gold)', marginBottom: '28px' }} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={set(f.key)} required={f.required} className="field" />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{t('auth_password')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')} required minLength={8} className="field" style={{ paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: '12px', color: 'var(--clay)', padding: '10px 12px', border: '1px solid var(--clay)' }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn" style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.6 : 1 }}>
              {loading ? t('auth_creating') : t('auth_signup')}
            </button>
          </form>

          <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text)', textAlign: 'center' }}>
            {t('auth_have_account')}{' '}
            <Link to="/signin" style={{ color: 'var(--gold)' }}>{t('auth_signin')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
