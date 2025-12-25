import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '../types/store'
import { calculateCartTotals } from '../lib/cart'

type CartState = {
  items: Array<{ productId: string; variantId?: string; quantity: number }>
  addItem: (productId: string, variantId?: string) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (productId, variantId) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === productId && i.variantId === variantId,
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === productId && i.variantId === variantId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            }
          }
          return {
            items: [...state.items, { productId, variantId, quantity: 1 }],
          }
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        })),
      updateQuantity: (productId, quantity, variantId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: Math.max(0, quantity) }
              : i,
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart-storage' },
  ),
)

export const useCart = (products: Array<Product>) => {
  const { items, addItem, removeItem, updateQuantity, clearCart } =
    useCartStore()

  const cartItems: Array<CartItem> = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product)
      throw new Error(
        `Product ${item.productId} not found during cart hydration`,
      )
    return {
      ...item,
      product,
    }
  })

  const { totalItems, totalPrice } = calculateCartTotals(cartItems)

  return {
    items: cartItems,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }
}
