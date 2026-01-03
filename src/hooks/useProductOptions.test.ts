import { describe, it, expect } from 'vitest'


import { useProductOptions } from './useProductOptions'

import type { ProductOption } from '../components/admin/products/components/ProductOptions'
import type { Product } from '../components/admin/products/ProductForm'

import { renderHook, act } from '@/test/test-utils'

describe('useProductOptions', () => {
  describe('Initialization', () => {
    it('initializes with default variant when no product provided', () => {
      const { result } = renderHook(() => useProductOptions())

      expect(result.current.options).toEqual([])
      expect(result.current.variants).toEqual([
        {
          title: 'Default Title',
          price: '0',
          available: true,
          selectedOptions: [],
        },
      ])
    })

    it('initializes with product options when editing existing product', () => {
      const product: Partial<Product> = {
        options: [
          { name: 'Size', values: ['Small', 'Large'] },
          { name: 'Color', values: ['Red', 'Blue'] },
        ],
      }

      const { result } = renderHook(() =>
        useProductOptions(product as Product),
      )

      expect(result.current.options).toEqual([
        { name: 'Size', values: ['Small', 'Large'] },
        { name: 'Color', values: ['Red', 'Blue'] },
      ])
    })

    it('initializes with product variants when editing existing product', () => {
      const product: Partial<Product> = {
        variants: [
          {
            id: '1',
            title: 'Small / Red',
            price: '10.00',
            sku: 'SR-001',
            available: 1,
            selectedOptions: [
              { name: 'Size', value: 'Small' },
              { name: 'Color', value: 'Red' },
            ],
          },
          {
            id: '2',
            title: 'Large / Blue',
            price: '15.00',
            sku: 'LB-002',
            available: 0,
            selectedOptions: [
              { name: 'Size', value: 'Large' },
              { name: 'Color', value: 'Blue' },
            ],
          },
        ],
      }

      const { result } = renderHook(() =>
        useProductOptions(product as Product),
      )

      expect(result.current.variants).toEqual([
        {
          id: '1',
          title: 'Small / Red',
          price: '10.00',
          sku: 'SR-001',
          available: true,
          selectedOptions: [
            { name: 'Size', value: 'Small' },
            { name: 'Color', value: 'Red' },
          ],
        },
        {
          id: '2',
          title: 'Large / Blue',
          price: '15.00',
          sku: 'LB-002',
          available: false,
          selectedOptions: [
            { name: 'Size', value: 'Large' },
            { name: 'Color', value: 'Blue' },
          ],
        },
      ])
    })

    it('converts variant available from 1/0 to boolean', () => {
      const product: Partial<Product> = {
        variants: [
          {
            id: '1',
            title: 'Test',
            price: '10.00',
            available: 1,
            selectedOptions: [],
          },
          {
            id: '2',
            title: 'Test 2',
            price: '10.00',
            available: 0,
            selectedOptions: [],
          },
        ],
      }

      const { result } = renderHook(() =>
        useProductOptions(product as Product),
      )

      expect(result.current.variants[0].available).toBe(true)
      expect(result.current.variants[1].available).toBe(false)
    })
  })

  describe('Option management', () => {
    it('adds new option', () => {
      const { result } = renderHook(() => useProductOptions())

      const newOption: ProductOption = { name: 'Size', values: ['S', 'M', 'L'] }

      act(() => {
        result.current.addOption(newOption)
      })

      expect(result.current.options).toEqual([newOption])
    })

    it('removes option by index', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S', 'M'] })
        result.current.addOption({ name: 'Color', values: ['Red', 'Blue'] })
      })

      act(() => {
        result.current.removeOption(0)
      })

      expect(result.current.options).toEqual([
        { name: 'Color', values: ['Red', 'Blue'] },
      ])
    })

    it('updates option at index', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S', 'M'] })
      })

      const updatedOption: ProductOption = {
        name: 'Size',
        values: ['Small', 'Medium', 'Large'],
      }

      act(() => {
        result.current.updateOption(0, updatedOption)
      })

      expect(result.current.options).toEqual([updatedOption])
    })

    it('allows setting options directly', () => {
      const { result } = renderHook(() => useProductOptions())

      const newOptions: ProductOption[] = [
        { name: 'Size', values: ['S', 'M', 'L'] },
        { name: 'Color', values: ['Red', 'Blue'] },
      ]

      act(() => {
        result.current.setOptions(newOptions)
      })

      expect(result.current.options).toEqual(newOptions)
    })
  })

  describe('Variant generation', () => {
    it('generates combinations for single option', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S', 'M', 'L'] })
      })

      const combinations = result.current.generateVariantCombinations()

      expect(combinations).toEqual([
        [{ name: 'Size', value: 'S' }],
        [{ name: 'Size', value: 'M' }],
        [{ name: 'Size', value: 'L' }],
      ])
    })

    it('generates combinations for multiple options', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S', 'M'] })
        result.current.addOption({ name: 'Color', values: ['Red', 'Blue'] })
      })

      const combinations = result.current.generateVariantCombinations()

      expect(combinations).toEqual([
        [
          { name: 'Size', value: 'S' },
          { name: 'Color', value: 'Red' },
        ],
        [
          { name: 'Size', value: 'S' },
          { name: 'Color', value: 'Blue' },
        ],
        [
          { name: 'Size', value: 'M' },
          { name: 'Color', value: 'Red' },
        ],
        [
          { name: 'Size', value: 'M' },
          { name: 'Color', value: 'Blue' },
        ],
      ])
    })

    it('generates combinations for three options', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S', 'L'] })
        result.current.addOption({ name: 'Color', values: ['Red'] })
        result.current.addOption({ name: 'Material', values: ['Cotton', 'Poly'] })
      })

      const combinations = result.current.generateVariantCombinations()

      expect(combinations).toHaveLength(4) // 2 × 1 × 2 = 4
      expect(combinations[0]).toEqual([
        { name: 'Size', value: 'S' },
        { name: 'Color', value: 'Red' },
        { name: 'Material', value: 'Cotton' },
      ])
    })

    it('returns empty array when no options', () => {
      const { result } = renderHook(() => useProductOptions())

      const combinations = result.current.generateVariantCombinations()

      expect(combinations).toEqual([[]])
    })
  })

  describe('Variant regeneration', () => {
    it('creates default variant when no options', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.regenerateVariants('25.00')
      })

      expect(result.current.variants).toEqual([
        {
          title: 'Default Title',
          price: '25.00',
          available: true,
          selectedOptions: [],
        },
      ])
    })

    it('generates variants from options with default price', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S', 'M'] })
      })

      act(() => {
        result.current.regenerateVariants('10.00')
      })

      expect(result.current.variants).toHaveLength(2)
      expect(result.current.variants[0]).toMatchObject({
        title: 'S',
        available: true,
        selectedOptions: [{ name: 'Size', value: 'S' }],
      })
      expect(result.current.variants[1]).toMatchObject({
        title: 'M',
        available: true,
        selectedOptions: [{ name: 'Size', value: 'M' }],
      })
    })

    it('generates variant titles with slashes for multiple options', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S'] })
        result.current.addOption({ name: 'Color', values: ['Red'] })
      })

      act(() => {
        result.current.regenerateVariants()
      })

      expect(result.current.variants[0].title).toBe('S / Red')
    })

    it('preserves existing variant prices when regenerating', () => {
      const { result } = renderHook(() => useProductOptions())

      // Set up initial variants
      act(() => {
        result.current.addOption({ name: 'Size', values: ['S', 'M'] })
        result.current.regenerateVariants('10.00')
      })

      // Update a variant price
      act(() => {
        result.current.setVariants([
          {
            title: 'S',
            price: '15.00', // Changed price
            available: true,
            selectedOptions: [{ name: 'Size', value: 'S' }],
          },
          {
            title: 'M',
            price: '10.00',
            available: true,
            selectedOptions: [{ name: 'Size', value: 'M' }],
          },
        ])
      })

      // Regenerate with new default
      act(() => {
        result.current.regenerateVariants('20.00')
      })

      // Should preserve the custom price for S
      expect(result.current.variants[0].price).toBe('15.00')
      expect(result.current.variants[1].price).toBe('10.00')
    })

    it('preserves existing variant SKUs and availability when regenerating', () => {
      const { result } = renderHook(() => useProductOptions())

      act(() => {
        result.current.addOption({ name: 'Size', values: ['S'] })
        result.current.regenerateVariants('10.00')
      })

      // Update variant with SKU and availability
      act(() => {
        result.current.setVariants([
          {
            id: '1',
            title: 'S',
            price: '10.00',
            sku: 'SKU-S',
            available: false,
            selectedOptions: [{ name: 'Size', value: 'S' }],
          },
        ])
      })

      // Regenerate
      act(() => {
        result.current.regenerateVariants('15.00')
      })

      expect(result.current.variants[0]).toEqual({
        id: '1',
        title: 'S',
        price: '10.00',
        sku: 'SKU-S',
        available: false,
        selectedOptions: [{ name: 'Size', value: 'S' }],
      })
    })

    it('uses default price for new variants when regenerating', () => {
      const { result } = renderHook(() => useProductOptions())

      // Start with one option value
      act(() => {
        result.current.addOption({ name: 'Size', values: ['S'] })
        result.current.regenerateVariants('10.00')
      })

      // Manually set variant price to ensure it exists
      act(() => {
        result.current.setVariants([
          {
            title: 'S',
            price: '15.00',
            available: true,
            selectedOptions: [{ name: 'Size', value: 'S' }],
          },
        ])
      })

      // Add another value
      act(() => {
        result.current.updateOption(0, { name: 'Size', values: ['S', 'M'] })
      })

      // Regenerate with new default
      act(() => {
        result.current.regenerateVariants('25.00')
      })

      // S should keep old price, M should get new default
      expect(result.current.variants[0].price).toBe('15.00')
      expect(result.current.variants[1].price).toBe('25.00')
    })

    it('allows setting variants directly', () => {
      const { result } = renderHook(() => useProductOptions())

      const newVariants = [
        {
          title: 'Custom Variant',
          price: '99.99',
          sku: 'CUSTOM-1',
          available: true,
          selectedOptions: [],
        },
      ]

      act(() => {
        result.current.setVariants(newVariants)
      })

      expect(result.current.variants).toEqual(newVariants)
    })
  })

  describe('Edge cases', () => {
    it('handles product with empty options array', () => {
      const product: Partial<Product> = {
        options: [],
      }

      const { result } = renderHook(() =>
        useProductOptions(product as Product),
      )

      expect(result.current.options).toEqual([])
      expect(result.current.variants).toEqual([
        {
          title: 'Default Title',
          price: '0',
          available: true,
          selectedOptions: [],
        },
      ])
    })

    it('handles product with empty variants array', () => {
      const product: Partial<Product> = {
        variants: [],
      }

      const { result } = renderHook(() =>
        useProductOptions(product as Product),
      )

      expect(result.current.variants).toEqual([
        {
          title: 'Default Title',
          price: '0',
          available: true,
          selectedOptions: [],
        },
      ])
    })

    it('handles variant without SKU', () => {
      const product: Partial<Product> = {
        variants: [
          {
            id: '1',
            title: 'Test',
            price: '10.00',
            sku: null,
            available: 1,
            selectedOptions: [],
          },
        ],
      }

      const { result } = renderHook(() =>
        useProductOptions(product as Product),
      )

      expect(result.current.variants[0].sku).toBeUndefined()
    })
  })
})
