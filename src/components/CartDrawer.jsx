import { useEffect, useState } from 'react';
import { X, ShoppingBag, Trash2, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

function Countdown({ expiresAt }) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(getLeft(expiresAt));
  function getLeft(exp) {
    const ms = new Date(exp) - Date.now();
    if (ms <= 0) return null;
    return { h: Math.floor(ms / 3600000), m: Math.floor((ms % 3600000) / 60000) };
  }
  useEffect(() => {
    const id = setInterval(() => setLeft(getLeft(expiresAt)), 30000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!left) return <span style={{ color: 'var(--clay)', fontSize: '10px' }}>{t('shop_expired')}</span>;
  return (
    <span className="flex items-center gap-1" style={{ fontSize: '10px', color: 'rgba(218,214,213,0.45)' }}>
      <Clock size={10} />
      {t('shop_expires_in')} {left.h}{t('shop_hours')} {left.m}{t('shop_minutes')}
    </span>
  );
}

export default function CartDrawer({ open, onClose }) {
  const { items, cartTotal, removeFromCart, confirmReservation } = useCart();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    if (!user) { onClose(); navigate('/signin'); return; }
    setConfirming(true);
    const ok = await confirmReservation();
    setConfirming(false);
    if (ok) setDone(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full max-w-sm flex flex-col"
            style={{ background: 'var(--ink)', borderLeft: '1px solid rgba(196,150,42,0.12)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'rgba(196,150,42,0.12)' }}
            >
              <div
                className="flex items-center gap-2.5"
                style={{ fontSize: '11px', fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ffffff' }}
              >
                <ShoppingBag size={15} strokeWidth={1.5} />
                {t('shop_cart')}
              </div>
              <button
                onClick={onClose}
                className="p-1 transition-opacity hover:opacity-60"
                style={{ color: 'rgba(218,214,213,0.5)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {done ? (
                <div className="text-center py-16">
                  <div className="font-display text-5xl mb-4" style={{ color: 'var(--gold)' }}>✓</div>
                  <p style={{ fontSize: '13px', color: '#ffffff' }}>{t('shop_reservation_confirmed')}</p>
                </div>
              ) : items.length === 0 ? (
                <p className="text-center py-16" style={{ fontSize: '13px', color: 'rgba(218,214,213,0.3)' }}>
                  {t('shop_cart_empty')}
                </p>
              ) : (
                <>
                  <p
                    className="p-3 border"
                    style={{ fontSize: '11px', color: 'rgba(218,214,213,0.35)', borderColor: 'rgba(196,150,42,0.15)' }}
                  >
                    {t('shop_reservation_note')}
                  </p>
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 border"
                      style={{ borderColor: 'rgba(196,150,42,0.12)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div
                        className="w-12 h-12 flex-shrink-0 overflow-hidden"
                        style={{ background: 'var(--warm)' }}
                      >
                        {item.products?.image_url && (
                          <img src={item.products.image_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: '13px', color: '#ffffff' }} className="truncate">
                          {item.products?.name}
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '2px', color: 'rgba(218,214,213,0.4)' }}>
                          ×{item.qty} · ${(item.products?.price ?? 0).toFixed(2)}
                        </div>
                        <Countdown expiresAt={item.expires_at} />
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 flex-shrink-0 hover:opacity-60 transition-opacity"
                        style={{ color: 'var(--clay)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            {!done && items.length > 0 && (
              <div className="px-6 py-5 border-t space-y-4" style={{ borderColor: 'rgba(196,150,42,0.12)' }}>
                <div className="flex justify-between" style={{ fontSize: '13px', fontWeight: 400 }}>
                  <span style={{ color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px' }}>
                    {t('shop_total')}
                  </span>
                  <span style={{ color: 'var(--gold)', fontWeight: 400 }}>${cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-center" style={{ fontSize: '11px', color: 'rgba(218,214,213,0.3)' }}>
                  {t('shop_pay_on_site')}
                </p>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full disabled:opacity-50"
                  style={{
                    padding: '14px',
                    fontSize: '11px',
                    fontWeight: 400,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    background: 'var(--gold)',
                    color: 'var(--ink)',
                    border: 'none',
                    cursor: confirming ? 'wait' : 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {confirming ? t('loading') : t('shop_confirm_reservation')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
