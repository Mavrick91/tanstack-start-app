import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Product } from '../types/store'

// Use importActual to ensure we get the UNMOCKED version for this test
const { useCart, useCartStore } = await vi.importActual<{
  useCart: typeof import('./useCart').useCart
  useCartStore: typeof import('./useCart').useCartStore
}>('./useCart')

const MOCK_PRODUCTS: Array<Product> = [
  {
    id: '1',
    name: 'T1',
    slug: 't-1',
    description: 'D1',
    price: 100,
    currency: 'USD',
    category: 'T',
    images: [],
  },
  {
    id: '2',
    name: 'T2',
    slug: 't-2',
    description: 'D2',
    price: 200,
    currency: 'USD',
    category: 'T',
    images: [],
  },
]

describe('useCart Hook', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.getState().clearCart()
    })
  })

  it('should start with an empty cart', () => {
    const { result } = renderHook(() => useCart(MOCK_PRODUCTS))
    expect(result.current.items).toHaveLength(0)
    expect(result.current.totalItems).toBe(0)
    expect(result.current.totalPrice).toBe(0)
  })

  it('should add an item', () => {
    const { result } = renderHook(() => useCart(MOCK_PRODUCTS))
    act(() => {
      result.current.addItem('1')
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.totalPrice).toBe(100)
  })
})
