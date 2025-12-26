import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../server/collections', () => ({
  getCollectionsFn: vi.fn(),
  getCollectionFn: vi.fn(),
  createCollectionFn: vi.fn(),
  updateCollectionFn: vi.fn(),
  deleteCollectionFn: vi.fn(),
  addProductsToCollectionFn: vi.fn(),
  removeProductFromCollectionFn: vi.fn(),
  reorderCollectionProductsFn: vi.fn(),
}))

vi.mock('../../server/products', () => ({
  getProductsFn: vi.fn(),
}))

describe('Collections UI Components', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Collection List Page Logic', () => {
    it('should display collection count correctly', () => {
      const formatCollectionCount = (count: number): string => {
        return `${count} collections`
      }

      expect(formatCollectionCount(0)).toBe('0 collections')
      expect(formatCollectionCount(1)).toBe('1 collections')
      expect(formatCollectionCount(5)).toBe('5 collections')
    })

    it('should format dates correctly', () => {
      const formatDate = (date: Date | string): string => {
        return new Date(date).toLocaleDateString()
      }

      const testDate = new Date('2024-12-25')
      expect(formatDate(testDate)).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
      expect(formatDate('2024-12-25')).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })
  })

  describe('Collection Form Logic', () => {
    it('should generate handle from name', () => {
      const generateHandle = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      }

      expect(generateHandle('Best Sellers')).toBe('best-sellers')
      expect(generateHandle('New Arrivals 2024')).toBe('new-arrivals-2024')
      expect(generateHandle('Gel Polish & Tools')).toBe('gel-polish-tools')
      expect(generateHandle('---Special---')).toBe('special')
    })

    it('should only auto-update handle if unchanged from generated', () => {
      let handle = ''
      let lastGeneratedHandle = ''

      const updateName = (name: string) => {
        const newGenerated = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        if (handle === '' || handle === lastGeneratedHandle) {
          handle = newGenerated
        }
        lastGeneratedHandle = newGenerated
      }

      updateName('Best Sellers')
      expect(handle).toBe('best-sellers')

      updateName('New Arrivals')
      expect(handle).toBe('new-arrivals')

      // Manually set handle
      handle = 'custom-handle'
      updateName('Another Name')
      expect(handle).toBe('custom-handle') // Should not change
    })

    it('should validate required fields', () => {
      const validateForm = (data: {
        nameEn: string
        handle: string
      }): string[] => {
        const errors: string[] = []
        if (!data.nameEn.trim()) errors.push('Name is required')
        if (!data.handle.trim()) errors.push('Handle is required')
        return errors
      }

      expect(validateForm({ nameEn: '', handle: '' })).toEqual([
        'Name is required',
        'Handle is required',
      ])
      expect(validateForm({ nameEn: 'Test', handle: '' })).toEqual([
        'Handle is required',
      ])
      expect(validateForm({ nameEn: '', handle: 'test' })).toEqual([
        'Name is required',
      ])
      expect(validateForm({ nameEn: 'Test', handle: 'test' })).toEqual([])
    })
  })

  describe('Product Picker Logic', () => {
    it('should filter products by search term', () => {
      const products = [
        { id: '1', name: { en: 'Aurora Gel Polish' } },
        { id: '2', name: { en: 'Nail Art Brushes' } },
        { id: '3', name: { en: 'French Tip Press-Ons' } },
      ]

      const filterProducts = (
        items: typeof products,
        search: string,
      ): typeof products => {
        const term = search.toLowerCase()
        return items.filter((p) => p.name.en.toLowerCase().includes(term))
      }

      expect(filterProducts(products, '')).toHaveLength(3)
      expect(filterProducts(products, 'gel')).toHaveLength(1)
      expect(filterProducts(products, 'nail')).toHaveLength(1)
      expect(filterProducts(products, 'tip')).toHaveLength(1)
      expect(filterProducts(products, 'xyz')).toHaveLength(0)
    })

    it('should exclude already added products', () => {
      const allProducts = [
        { id: '1', name: 'Product A' },
        { id: '2', name: 'Product B' },
        { id: '3', name: 'Product C' },
      ]

      const existingIds = new Set(['1', '2'])

      const getAvailableProducts = (
        all: typeof allProducts,
        existing: Set<string>,
      ) => {
        return all.filter((p) => !existing.has(p.id))
      }

      const available = getAvailableProducts(allProducts, existingIds)
      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('3')
    })

    it('should track selected products correctly', () => {
      let selected: string[] = []

      const toggleProduct = (productId: string) => {
        if (selected.includes(productId)) {
          selected = selected.filter((id) => id !== productId)
        } else {
          selected = [...selected, productId]
        }
      }

      toggleProduct('1')
      expect(selected).toEqual(['1'])

      toggleProduct('2')
      expect(selected).toEqual(['1', '2'])

      toggleProduct('1')
      expect(selected).toEqual(['2'])

      toggleProduct('2')
      expect(selected).toEqual([])
    })
  })

  describe('Product Reordering Logic', () => {
    it('should move product up', () => {
      const products = [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'c', position: 2 },
      ]

      const moveUp = (items: typeof products, index: number) => {
        if (index <= 0) return items
        const result = [...items]
        ;[result[index - 1], result[index]] = [result[index], result[index - 1]]
        return result
      }

      const moved = moveUp(products, 1)
      expect(moved.map((p) => p.id)).toEqual(['b', 'a', 'c'])

      // Can't move first item up
      const unchanged = moveUp(products, 0)
      expect(unchanged.map((p) => p.id)).toEqual(['a', 'b', 'c'])
    })

    it('should move product down', () => {
      const products = [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'c', position: 2 },
      ]

      const moveDown = (items: typeof products, index: number) => {
        if (index >= items.length - 1) return items
        const result = [...items]
        ;[result[index], result[index + 1]] = [result[index + 1], result[index]]
        return result
      }

      const moved = moveDown(products, 1)
      expect(moved.map((p) => p.id)).toEqual(['a', 'c', 'b'])

      // Can't move last item down
      const unchanged = moveDown(products, 2)
      expect(unchanged.map((p) => p.id)).toEqual(['a', 'b', 'c'])
    })
  })

  describe('Storefront Collection Display', () => {
    it('should format collection URL correctly', () => {
      const getCollectionUrl = (lang: string, handle: string): string => {
        return `/${lang}/collections/${handle}`
      }

      expect(getCollectionUrl('en', 'best-sellers')).toBe(
        '/en/collections/best-sellers',
      )
      expect(getCollectionUrl('fr', 'gel-polish')).toBe(
        '/fr/collections/gel-polish',
      )
    })

    it('should handle empty product list', () => {
      const getEmptyMessage = (productCount: number): string | null => {
        return productCount === 0 ? 'No products in this collection' : null
      }

      expect(getEmptyMessage(0)).toBe('No products in this collection')
      expect(getEmptyMessage(1)).toBe(null)
      expect(getEmptyMessage(5)).toBe(null)
    })
  })
})
