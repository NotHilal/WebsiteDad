import { useState, useEffect } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { useNavigate } from 'react-router-dom';

const DEMO_PRODUCTS = [
  { id: 'p1', name: 'Argan Oil Serum',          name_ar: 'سيروم زيت الأرجان',  price: 32, category: 'Treatment',   image_url: null },
  { id: 'p2', name: 'Colour Protection Shampoo', name_ar: 'شامبو حماية اللون',  price: 24, category: 'Shampoo',     image_url: null },
  { id: 'p3', name: 'Deep Moisture Mask',         name_ar: 'قناع الترطيب العميق',price: 28, category: 'Mask',        image_url: null },
  { id: 'p4', name: 'Heat Protector Spray',       name_ar: 'بخاخ حماية الحرارة', price: 19, category: 'Styling',     image_url: null },
  { id: 'p5', name: 'Scalp Treatment',            name_ar: 'علاج فروة الرأس',    price: 38, category: 'Treatment',   image_url: null },
  { id: 'p6', name: 'Leave-in Conditioner',       name_ar: 'بلسم لا يغسل',       price: 22, category: 'Conditioner', image_url: null },
];

export default function Shop() {
  const { t, lang } = useTranslation();
  const { addToCart, items: cartItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [category, setCategory] = useState('All');
  const [adding, setAdding]     = useState(null);
  const [added, setAdded]       = useState(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('active', true);
    if (data?.length) setProducts(data);
  }

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered   = category === 'All' ? products : products.filter(p => p.category === category);
  const inCart     = (id) => cartItems.some(i => i.product_id === id || i.id === id);

  async function handleAdd(product) {
    if (!user) { navigate('/signin', { state: { from: '/shop' } }); return; }
    setAdding(product.id);
    await addToCart(product);
    setAdding(null);
    setAdded(product.id);
    setTimeout(() => setAdded(null), 2000);
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Page header */}
      <div className="page-header">
        <h1>{t('shop_title')}</h1>
        <div className="breadcrumb">
          <span>Home</span>
          <span style={{ color: 'var(--border)', fontSize: '10px' }}>/</span>
          <span>{t('shop_title')}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-14">
        {/* Reservation note */}
        <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '28px', padding: '12px 16px', border: '1px solid var(--border-gold)' }}>
          {t('shop_reservation_note')}
        </p>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '8px 20px',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                border: '1px solid',
                borderColor: category === c ? 'var(--gold)' : 'var(--border)',
                background: category === c ? 'var(--gold)' : 'transparent',
                color: category === c ? '#1a1917' : 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '1px', background: 'var(--border)' }}>
          {filtered.map(p => (
            <div
              key={p.id}
              style={{ background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}
            >
              {/* Image area */}
              <div style={{ aspectRatio: '4/3', background: '#2a2825', position: 'relative', overflow: 'hidden' }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)', fontWeight: 400 }}>
                        {p.category}
                      </div>
                    </div>
                  </div>
                )}
                {p.category && (
                  <span style={{
                    position: 'absolute', top: '12px', left: '12px',
                    fontSize: '10px', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '4px 10px', background: 'var(--gold)', color: '#1a1917',
                  }}>
                    {p.category}
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '15px', fontWeight: 400, color: '#ffffff', marginBottom: '4px' }}>
                  {lang === 'ar' && p.name_ar ? p.name_ar : p.name}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--gold)' }}>
                    ${p.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={adding === p.id || inCart(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', fontSize: '10px', fontWeight: 400,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      border: '1px solid',
                      borderColor: inCart(p.id) || added === p.id ? 'var(--sage)' : 'var(--gold)',
                      background: inCart(p.id) || added === p.id ? 'rgba(130,181,65,0.15)' : 'var(--gold)',
                      color: inCart(p.id) || added === p.id ? 'var(--sage)' : '#1a1917',
                      cursor: adding === p.id || inCart(p.id) ? 'default' : 'pointer',
                      opacity: adding === p.id ? 0.6 : 1,
                      transition: 'all 0.2s', fontFamily: 'inherit',
                    }}
                  >
                    {inCart(p.id) || added === p.id
                      ? <><Check size={11} /> {t('shop_in_cart')}</>
                      : <><ShoppingBag size={11} /> {adding === p.id ? '...' : t('shop_add_cart')}</>
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
