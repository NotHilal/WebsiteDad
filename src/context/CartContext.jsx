import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

const HOLD_HOURS = 48;

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems]   = useState([]);   // { product, qty, expiresAt }
  const [loading, setLoading] = useState(false);

  // Load cart from Supabase when user signs in
  useEffect(() => {
    if (user) loadCart();
    else setItems([]);
  }, [user]);

  async function loadCart() {
    setLoading(true);
    const now = new Date().toISOString();
    // Remove expired
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', now);

    const { data } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', user.id)
      .gt('expires_at', now);

    setItems(data ?? []);
    setLoading(false);
  }

  async function addToCart(product, qty = 1) {
    if (!user) return false;
    const existing = items.find(i => i.product_id === product.id);
    const expiresAt = new Date(Date.now() + HOLD_HOURS * 3600 * 1000).toISOString();

    if (existing) {
      await supabase
        .from('cart_items')
        .update({ qty: existing.qty + qty, expires_at: expiresAt })
        .eq('id', existing.id);
    } else {
      await supabase.from('cart_items').insert({
        user_id:    user.id,
        product_id: product.id,
        qty,
        expires_at: expiresAt,
      });
    }
    await loadCart();
    return true;
  }

  async function removeFromCart(itemId) {
    await supabase.from('cart_items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  async function clearCart() {
    if (!user) return;
    await supabase.from('cart_items').delete().eq('user_id', user.id);
    setItems([]);
  }

  async function confirmReservation() {
    if (!user || items.length === 0) return false;
    const total = items.reduce((s, i) => s + (i.products?.price ?? 0) * i.qty, 0);
    const { error } = await supabase.from('orders').insert({
      user_id:    user.id,
      items:      items.map(i => ({ product_id: i.product_id, qty: i.qty, price: i.products?.price })),
      total,
      status:     'pending',
      pay_method: 'on_site',
    });
    if (error) return false;
    await clearCart();
    return true;
  }

  const cartTotal = items.reduce((s, i) => s + (i.products?.price ?? 0) * i.qty, 0);
  const cartCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, loading, cartTotal, cartCount, addToCart, removeFromCart, clearCart, confirmReservation, reload: loadCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
