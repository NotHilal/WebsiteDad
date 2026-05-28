import { useState, useEffect } from 'react';
import { Tag, Check } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { useNavigate } from 'react-router-dom';

export default function Rewards() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [couponCode, setCoupon]   = useState('');
  const [couponResult, setResult] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [myCoupons, setMyCoupons] = useState([]);

  useEffect(() => { if (user) loadMyCoupons(); }, [user]);

  async function loadMyCoupons() {
    const { data } = await supabase.from('coupon_uses').select('*, coupons(*)').eq('user_id', user.id).order('created_at', { ascending: false });
    setMyCoupons(data ?? []);
  }

  async function applyCoupon(e) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setLoading(true);
    setResult(null);

    const { data: coupon } = await supabase.from('coupons').select('*').eq('code', couponCode.trim().toUpperCase()).eq('active', true).single();

    if (!coupon || (coupon.expires_at && new Date(coupon.expires_at) < new Date())) {
      setResult({ ok: false, message: t('rewards_invalid_coupon') });
      setLoading(false);
      return;
    }

    if (coupon.max_uses !== null) {
      const { count } = await supabase.from('coupon_uses').select('id', { count: 'exact', head: true }).eq('coupon_id', coupon.id);
      if (count >= coupon.max_uses) { setResult({ ok: false, message: t('rewards_invalid_coupon') }); setLoading(false); return; }
    }

    const { data: alreadyUsed } = await supabase.from('coupon_uses').select('id').eq('coupon_id', coupon.id).eq('user_id', user.id).single();
    if (alreadyUsed) { setResult({ ok: false, message: t('rewards_invalid_coupon') }); setLoading(false); return; }

    const discountText = coupon.type === 'percent' ? `${coupon.value}% off` : `$${coupon.value} off`;
    setResult({ ok: true, message: t('rewards_coupon_applied'), discount: discountText, coupon });
    setLoading(false);
  }

  const points = profile?.points ?? 0;

  if (!user) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="page-header"><h1>{t('rewards_title')}</h1></div>
        <div style={{ maxWidth: '400px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px' }}>{t('nav_signin')}</p>
          <button onClick={() => navigate('/signin', { state: { from: '/rewards' } })} className="btn">{t('nav_signin')}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>{t('rewards_title')}</h1>
        <div className="breadcrumb">
          <span>Home</span><span style={{ color: 'var(--border)' }}>/</span><span>{t('rewards_title')}</span>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

        {/* Points balance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '36px 32px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '2px', height: '32px', background: 'var(--gold)' }} />
            <div>
              <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '4px' }}>{t('rewards_your_points')}</div>
              <div style={{ fontSize: '3rem', fontWeight: 300, color: '#ffffff', lineHeight: 1 }}>{points.toLocaleString()}</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.8 }}>
            {t('rewards_earn')}<br />{t('rewards_redeem')}
          </p>
        </div>

        {/* How it works */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px 32px', marginBottom: '8px' }}>
          <h3 style={{ color: '#ffffff', fontWeight: 400, fontSize: '16px', marginBottom: '8px' }}>{t('rewards_how_it_works')}</h3>
          <div style={{ width: '32px', height: '2px', background: 'var(--gold)', marginBottom: '20px' }} />
          {[t('rewards_earn'), t('rewards_redeem')].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '18px', height: '18px', border: '1px solid var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <Check size={10} color="var(--sage)" />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px 32px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Tag size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ color: '#ffffff', fontWeight: 400, fontSize: '16px' }}>{t('rewards_coupon_placeholder')}</h3>
          </div>
          <div style={{ width: '32px', height: '2px', background: 'var(--gold)', marginBottom: '20px' }} />
          <form onSubmit={applyCoupon} style={{ display: 'flex', gap: '8px' }}>
            <input
              value={couponCode}
              onChange={e => setCoupon(e.target.value.toUpperCase())}
              placeholder={t('rewards_coupon_placeholder')}
              className="field"
              style={{ flex: 1, letterSpacing: '0.15em', fontWeight: 400 }}
            />
            <button type="submit" disabled={loading || !couponCode.trim()} className="btn" style={{ opacity: (loading || !couponCode.trim()) ? 0.5 : 1 }}>
              {loading ? '...' : t('rewards_apply')}
            </button>
          </form>

          {couponResult && (
            <div style={{
              marginTop: '14px', padding: '12px 16px', fontSize: '13px',
              border: `1px solid ${couponResult.ok ? 'var(--sage)' : 'var(--clay)'}`,
              color: couponResult.ok ? 'var(--sage)' : 'var(--clay)',
              background: couponResult.ok ? 'rgba(130,181,65,0.07)' : 'rgba(204,90,74,0.07)',
            }}>
              {couponResult.message}
              {couponResult.ok && <span style={{ marginLeft: '8px', fontWeight: 400 }}>{couponResult.discount}</span>}
            </div>
          )}
        </div>

        {/* Used coupons */}
        {myCoupons.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '28px 32px' }}>
            <h3 style={{ color: '#ffffff', fontWeight: 400, fontSize: '16px', marginBottom: '8px' }}>{t('rewards_your_coupons')}</h3>
            <div style={{ width: '32px', height: '2px', background: 'var(--gold)', marginBottom: '20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
              {myCoupons.map(cu => (
                <div key={cu.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 400, letterSpacing: '0.12em', color: 'var(--gold)' }}>
                    {cu.coupons?.code}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                    {cu.coupons?.type === 'percent' ? `${cu.coupons.value}%` : `$${cu.coupons?.value}`} off
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
