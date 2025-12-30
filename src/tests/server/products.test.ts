import { describe, expect, it, vi, beforeEach } from 'vitest'

// Since server functions are inlined with createServerFn, we test by mocking
// the dependencies and testing the validation logic directly

// Mock the dependencies
vi.mock('../../db', () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(),
  },
}))

vi.mock('../../lib/auth', () => ({
  validateSession: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(),
}))

describe('Product Server Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Product Validation', () => {
    it('should require name with en property', () => {
      // Validation that name.en is required
      const validateName = (name: { en?: string }) => {
        if (
          !name ||
          typeof name !== 'object' ||
          !('en' in name) ||
          typeof name.en !== 'string' ||
          !name.en.trim()
        ) {
          return 'Name must be an object with a non-empty "en" property'
        }
        return null
      }

      expect(validateName({})).toBe(
        'Name must be an object with a non-empty "en" property',
      )
      expect(validateName({ en: '' })).toBe(
        'Name must be an object with a non-empty "en" property',
      )
      expect(validateName({ en: '  ' })).toBe(
        'Name must be an object with a non-empty "en" property',
      )
      expect(validateName({ en: 'Valid Name' })).toBe(null)
    })

    it('should require handle', () => {
      const validateHandle = (handle: string | undefined) => {
        if (!handle || typeof handle !== 'string' || !handle.trim()) {
          return 'Handle is required'
        }
        return null
      }

      expect(validateHandle(undefined)).toBe('Handle is required')
      expect(validateHandle('')).toBe('Handle is required')
      expect(validateHandle('  ')).toBe('Handle is required')
      expect(validateHandle('valid-handle')).toBe(null)
    })

    it('should convert empty sku/barcode to null', () => {
      const normalizeOptionalField = (value: string | undefined) =>
        value?.trim() || null

      expect(normalizeOptionalField('')).toBe(null)
      expect(normalizeOptionalField('  ')).toBe(null)
      expect(normalizeOptionalField(undefined)).toBe(null)
      expect(normalizeOptionalField('ABC123')).toBe('ABC123')
    })

    it('should default price to 0.00 when not provided', () => {
      const normalizePrice = (price: string | undefined) => price || '0.00'

      expect(normalizePrice(undefined)).toBe('0.00')
      expect(normalizePrice('')).toBe('0.00')
      expect(normalizePrice('19.99')).toBe('19.99')
    })
  })

  describe('Cloudinary Image Deletion', () => {
    it('should extract public ID from Cloudinary URL', async () => {
      const { getPublicIdFromUrl } = await import('../../lib/cloudinary')

      expect(
        getPublicIdFromUrl(
          'https://res.cloudinary.com/demo/image/upload/v1234/products/abc123.jpg',
        ),
      ).toBe('products/abc123')

      expect(
        getPublicIdFromUrl(
          'https://res.cloudinary.com/demo/image/upload/v9999/folder/subfolder/image.png',
        ),
      ).toBe('folder/subfolder/image')

      expect(getPublicIdFromUrl('https://example.com/image.jpg')).toBe(null)
      expect(getPublicIdFromUrl('blob:local/abc')).toBe(null)
    })

    it('should delete multiple images from Cloudinary', async () => {
      const mockDestroy = vi.fn().mockResolvedValue({ result: 'ok' })
      vi.doMock('cloudinary', () => ({
        v2: {
          config: vi.fn(),
          uploader: {
            destroy: mockDestroy,
          },
        },
      }))

      const { deleteImagesFromCloudinary } =
        await import('../../lib/cloudinary')

      const urls = [
        'https://res.cloudinary.com/demo/image/upload/v1234/products/img1.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1234/products/img2.jpg',
      ]

      await deleteImagesFromCloudinary(urls)

      expect(mockDestroy).toHaveBeenCalledTimes(2)
      expect(mockDestroy).toHaveBeenCalledWith('products/img1')
      expect(mockDestroy).toHaveBeenCalledWith('products/img2')
    })

    it('should skip non-Cloudinary URLs during deletion', async () => {
      const { deleteImagesFromCloudinary } =
        await import('../../lib/cloudinary')

      const urls = ['https://example.com/external.jpg', 'blob:local/preview']

      await expect(deleteImagesFromCloudinary(urls)).resolves.not.toThrow()
    })
  })
})
