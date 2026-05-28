import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

export default function SignIn() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch {
      setError(t('auth_error_invalid'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>{t('nav_signin')}</h1>
        <div className="breadcrumb">
          <span>Home</span><span style={{ color: 'var(--border)' }}>/</span><span>{t('nav_signin')}</span>
        </div>
      </div>

      <div style={{ maxWidth: '420px', margin: '60px auto', padding: '0 24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '40px' }}>
          <h2 style={{ color: '#ffffff', fontWeight: 400, fontSize: '1.4rem', marginBottom: '8px' }}>{t('auth_welcome')}</h2>
          <div style={{ width: '32px', height: '2px', background: 'var(--gold)', marginBottom: '28px' }} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{t('auth_email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="field" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '8px' }}>{t('auth_password')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="field" style={{ paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: '12px', color: 'var(--clay)', padding: '10px 12px', border: '1px solid var(--clay)' }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn" style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.6 : 1 }}>
              {loading ? t('auth_signing_in') : t('auth_signin')}
            </button>
          </form>

          <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text)', textAlign: 'center' }}>
            {t('auth_no_account')}{' '}
            <Link to="/signup" style={{ color: 'var(--gold)' }}>{t('auth_signup')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
