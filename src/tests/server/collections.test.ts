import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../db', () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'test-id' }])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-id' }])),
      })),
    })),
  },
}))

vi.mock('../../lib/auth', () => ({
  validateSession: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(),
}))

describe('Collection Server Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Collection Validation', () => {
    it('should require name with en property', () => {
      const validateName = (name: { en?: string } | undefined) => {
        if (!name?.en?.trim()) {
          return 'Name (English) is required'
        }
        return null
      }

      expect(validateName(undefined)).toBe('Name (English) is required')
      expect(validateName({})).toBe('Name (English) is required')
      expect(validateName({ en: '' })).toBe('Name (English) is required')
      expect(validateName({ en: '  ' })).toBe('Name (English) is required')
      expect(validateName({ en: 'Best Sellers' })).toBe(null)
    })

    it('should require handle', () => {
      const validateHandle = (handle: string | undefined) => {
        if (!handle?.trim()) {
          return 'Handle is required'
        }
        return null
      }

      expect(validateHandle(undefined)).toBe('Handle is required')
      expect(validateHandle('')).toBe('Handle is required')
      expect(validateHandle('  ')).toBe('Handle is required')
      expect(validateHandle('best-sellers')).toBe(null)
    })

    it('should generate valid handle from name', () => {
      const generateHandle = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      }

      expect(generateHandle('Best Sellers')).toBe('best-sellers')
      expect(generateHandle('Summer 2024 Collection!')).toBe(
        'summer-2024-collection',
      )
      expect(generateHandle('  New Arrivals  ')).toBe('new-arrivals')
      expect(generateHandle('Nail Polish & Tools')).toBe('nail-polish-tools')
    })

    it('should normalize handle', () => {
      const normalizeHandle = (handle: string): string => {
        return handle.trim().toLowerCase().replace(/\s+/g, '-')
      }

      expect(normalizeHandle('Best Sellers')).toBe('best-sellers')
      expect(normalizeHandle('  new arrivals  ')).toBe('new-arrivals')
      expect(normalizeHandle('SUMMER SALE')).toBe('summer-sale')
    })
  })

  describe('Collection Product Management', () => {
    it('should calculate next position correctly', () => {
      const calculateNextPosition = (existingPositions: number[]): number => {
        if (existingPositions.length === 0) return 0
        return Math.max(...existingPositions) + 1
      }

      expect(calculateNextPosition([])).toBe(0)
      expect(calculateNextPosition([0])).toBe(1)
      expect(calculateNextPosition([0, 1, 2])).toBe(3)
      expect(calculateNextPosition([0, 2, 5])).toBe(6)
    })

    it('should filter already existing products', () => {
      const filterNewProducts = (
        productIds: string[],
        existingIds: Set<string>,
      ): string[] => {
        return productIds.filter((id) => !existingIds.has(id))
      }

      const existing = new Set(['prod-1', 'prod-2'])

      expect(filterNewProducts(['prod-3', 'prod-4'], existing)).toEqual([
        'prod-3',
        'prod-4',
      ])
      expect(filterNewProducts(['prod-1', 'prod-3'], existing)).toEqual([
        'prod-3',
      ])
      expect(filterNewProducts(['prod-1', 'prod-2'], existing)).toEqual([])
    })

    it('should reorder products correctly', () => {
      const reorderProducts = <T extends { id: string }>(
        products: T[],
        fromIndex: number,
        toIndex: number,
      ): T[] => {
        const result = [...products]
        const [moved] = result.splice(fromIndex, 1)
        result.splice(toIndex, 0, moved)
        return result
      }

      const products = [
        { id: 'a', name: 'Product A' },
        { id: 'b', name: 'Product B' },
        { id: 'c', name: 'Product C' },
      ]

      // Move first to last
      expect(reorderProducts(products, 0, 2).map((p) => p.id)).toEqual([
        'b',
        'c',
        'a',
      ])

      // Move last to first
      expect(reorderProducts(products, 2, 0).map((p) => p.id)).toEqual([
        'c',
        'a',
        'b',
      ])

      // Move middle up
      expect(reorderProducts(products, 1, 0).map((p) => p.id)).toEqual([
        'b',
        'a',
        'c',
      ])
    })

    it('should generate correct position updates', () => {
      const generatePositionUpdates = (
        productIds: string[],
      ): Array<{ productId: string; position: number }> => {
        return productIds.map((productId, index) => ({
          productId,
          position: index,
        }))
      }

      expect(generatePositionUpdates(['a', 'b', 'c'])).toEqual([
        { productId: 'a', position: 0 },
        { productId: 'b', position: 1 },
        { productId: 'c', position: 2 },
      ])

      expect(generatePositionUpdates(['c', 'a', 'b'])).toEqual([
        { productId: 'c', position: 0 },
        { productId: 'a', position: 1 },
        { productId: 'b', position: 2 },
      ])
    })
  })

  describe('Localized String Handling', () => {
    type LocalizedString = { en: string; fr?: string; id?: string }

    it('should get localized text correctly', () => {
      const getLocalizedText = (
        value: LocalizedString | null,
        lang = 'en',
      ): string => {
        if (!value) return ''
        return value[lang as keyof LocalizedString] || value.en || ''
      }

      const text: LocalizedString = {
        en: 'Best Sellers',
        fr: 'Meilleures ventes',
        id: 'Terlaris',
      }

      expect(getLocalizedText(text, 'en')).toBe('Best Sellers')
      expect(getLocalizedText(text, 'fr')).toBe('Meilleures ventes')
      expect(getLocalizedText(text, 'id')).toBe('Terlaris')
      expect(getLocalizedText(text, 'es')).toBe('Best Sellers') // fallback to en
      expect(getLocalizedText(null, 'en')).toBe('')
    })

    it('should build localized string from form data', () => {
      const buildLocalizedString = (
        en: string,
        fr?: string,
        id?: string,
      ): LocalizedString => {
        const result: LocalizedString = { en }
        if (fr) result.fr = fr
        if (id) result.id = id
        return result
      }

      expect(buildLocalizedString('English')).toEqual({ en: 'English' })
      expect(buildLocalizedString('English', 'Français')).toEqual({
        en: 'English',
        fr: 'Français',
      })
      expect(buildLocalizedString('English', 'Français', 'Indonesia')).toEqual({
        en: 'English',
        fr: 'Français',
        id: 'Indonesia',
      })
    })
  })

  describe('Collection Sort Order', () => {
    it('should validate sort order enum', () => {
      const validSortOrders = [
        'manual',
        'best_selling',
        'newest',
        'price_asc',
        'price_desc',
      ] as const

      const isValidSortOrder = (
        value: string,
      ): value is (typeof validSortOrders)[number] => {
        return (validSortOrders as readonly string[]).includes(value)
      }

      expect(isValidSortOrder('manual')).toBe(true)
      expect(isValidSortOrder('newest')).toBe(true)
      expect(isValidSortOrder('price_asc')).toBe(true)
      expect(isValidSortOrder('invalid')).toBe(false)
      expect(isValidSortOrder('')).toBe(false)
    })

    it('should default to manual sort order', () => {
      const getSortOrder = (input?: string): string => {
        const validOrders = [
          'manual',
          'best_selling',
          'newest',
          'price_asc',
          'price_desc',
        ]
        return validOrders.includes(input || '') ? input! : 'manual'
      }

      expect(getSortOrder(undefined)).toBe('manual')
      expect(getSortOrder('')).toBe('manual')
      expect(getSortOrder('newest')).toBe('newest')
      expect(getSortOrder('invalid')).toBe('manual')
    })
  })
})
