import { CartItem } from '../types/store'

export type CartTotals = {
  totalItems: number
  totalPrice: number
}

/**
 * Calculates total items and total price for a given set of cart items.
 */
export const calculateCartTotals = (items: Array<CartItem>): CartTotals => {
  return items.reduce(
    (acc, item) => ({
      totalItems: acc.totalItems + item.quantity,
      totalPrice: acc.totalPrice + item.product.price * item.quantity,
    }),
    { totalItems: 0, totalPrice: 0 },
  )
}
