import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState([])

  useEffect(() => {
    if (user) loadCart()
    else setCartItems([])
  }, [user])

  async function loadCart() {
    const { data } = await supabase
      .from('cart_items')
      .select('*, products(id, name, price, image_url, stock)')
      .eq('user_id', user.id)
      .order('added_at')
    if (!data) return

    const now     = new Date()
    const expired = data.filter(i => new Date(i.expires_at) <= now)
    const valid   = data.filter(i => new Date(i.expires_at) >  now)

    if (expired.length) {
      await supabase.from('cart_items').delete().in('id', expired.map(i => i.id))
    }

    setCartItems(valid)
  }

  async function addToCart(product, qty = 1) {
    if (!user) { toast.error('Sign in to add to cart'); return }

    const existing  = cartItems.find(i => i.product_id === product.id)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    // Check stock limit (read-only — we don't modify stock)
    const { data: fresh } = await supabase.from('products').select('stock').eq('id', product.id).single()
    const stock = fresh?.stock ?? product.stock ?? 0

    if (existing) {
      const newQty = existing.quantity + qty
      if (newQty > stock) { toast.error(`Only ${stock} in stock`); return }
      setCartItems(prev => prev.map(i => i.id === existing.id ? { ...i, quantity: newQty, expires_at: expiresAt } : i))
      await supabase.from('cart_items').update({ quantity: newQty, expires_at: expiresAt }).eq('id', existing.id)
      toast.success('Cart updated')
    } else {
      if (qty > stock) { toast.error(`Only ${stock} in stock`); return }
      await supabase.from('cart_items').insert({
        user_id: user.id, product_id: product.id, quantity: qty, expires_at: expiresAt,
      })
      toast.success(`${product.name} added to cart`)
      await loadCart()
    }
  }

  async function commitQtyUpdate(item, committedQty, newQty) {
    if (newQty === committedQty) return
    // Check stock limit when increasing
    if (newQty > committedQty) {
      const { data: fresh } = await supabase.from('products').select('stock').eq('id', item.product_id).single()
      const stock = fresh?.stock ?? item.products?.stock ?? 0
      if (newQty > stock) {
        // Revert UI to stock limit
        const capped = Math.min(newQty, stock)
        setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: capped } : i))
        await supabase.from('cart_items').update({ quantity: capped }).eq('id', item.id)
        if (capped < newQty) toast.error(`Only ${stock} in stock`)
        return
      }
    }
    await supabase.from('cart_items').update({ quantity: newQty }).eq('id', item.id)
    setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
  }

  async function removeFromCart(item) {
    setCartItems(prev => prev.filter(i => i.id !== item.id))
    await supabase.from('cart_items').delete().eq('id', item.id)
  }

  async function expireItem(item) {
    setCartItems(prev => prev.filter(i => i.id !== item.id))
    await supabase.from('cart_items').delete().eq('id', item.id)
    toast.error(`${item.products?.name} expired`)
  }

  async function clearCart() {
    await supabase.from('cart_items').delete().eq('user_id', user.id)
    setCartItems([])
  }

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cartItems.reduce((s, i) => s + (parseFloat(i.products?.price) || 0) * i.quantity, 0)

  return (
    <CartContext.Provider value={{ cartItems, cartCount, cartTotal, loadCart, addToCart, commitQtyUpdate, removeFromCart, expireItem, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
