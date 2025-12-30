import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Product } from '../types/store'

import { act, renderHook } from '@/test/test-utils'

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

  it('should increment quantity when adding existing item', () => {
    const { result } = renderHook(() => useCart(MOCK_PRODUCTS))
    act(() => {
      result.current.addItem('1')
      result.current.addItem('1')
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(2)
    expect(result.current.totalPrice).toBe(200)
  })

  it('should remove an item', () => {
    const { result } = renderHook(() => useCart(MOCK_PRODUCTS))
    act(() => {
      result.current.addItem('1')
      result.current.removeItem('1')
    })
    expect(result.current.items).toHaveLength(0)
  })

  it('should update quantity', () => {
    const { result } = renderHook(() => useCart(MOCK_PRODUCTS))
    act(() => {
      result.current.addItem('1')
      result.current.updateQuantity('1', 5)
    })
    expect(result.current.items[0].quantity).toBe(5)
    expect(result.current.totalPrice).toBe(500)
  })

  it('should not allow negative quantity', () => {
    const { result } = renderHook(() => useCart(MOCK_PRODUCTS))
    act(() => {
      result.current.addItem('1')
      result.current.updateQuantity('1', -1)
    })
    expect(result.current.items[0].quantity).toBe(0)
  })
})
