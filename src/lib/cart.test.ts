import { describe, it, expect } from 'vitest'
import { calculateCartTotals } from './cart'
import { CartItem, Product } from '../types/store'

const MOCK_PRODUCT_1: Product = {
  id: '1',
  name: 'P1',
  slug: 'p1',
  description: 'D1',
  price: 100,
  currency: 'USD',
  category: 'C1',
  images: [],
}

const MOCK_PRODUCT_2: Product = {
  id: '2',
  name: 'P2',
  slug: 'p2',
  description: 'D2',
  price: 200,
  currency: 'USD',
  category: 'C2',
  images: [],
}

describe('calculateCartTotals Utility', () => {
  it('should return zeros for an empty cart', () => {
    const totals = calculateCartTotals([])
    expect(totals.totalItems).toBe(0)
    expect(totals.totalPrice).toBe(0)
  })

  it('should calculate totals for multiple items', () => {
    const items: Array<CartItem> = [
      { productId: '1', quantity: 2, product: MOCK_PRODUCT_1 },
      { productId: '2', quantity: 1, product: MOCK_PRODUCT_2 },
    ]
    const totals = calculateCartTotals(items)
    expect(totals.totalItems).toBe(3)
    expect(totals.totalPrice).toBe(400) // (2 * 100) + (1 * 200)
  })
})
