import { CartItem } from '../types/store'

export type CartTotals = {
  totalItems: number
  totalPrice: number
}

export const calculateCartTotals = (items: Array<CartItem>) => {
  return items.reduce(
    (acc, item) => ({
      totalItems: acc.totalItems + item.quantity,
      totalPrice: acc.totalPrice + item.product.price * item.quantity,
    }),
    { totalItems: 0, totalPrice: 0 },
  )
}
