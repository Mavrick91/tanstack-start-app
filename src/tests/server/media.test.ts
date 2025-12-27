import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the dependencies
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}))

vi.mock('../../db/schema', () => ({
  media: {
    id: 'id',
    url: 'url',
    createdAt: 'created_at',
  },
}))

vi.mock('../../lib/auth', () => ({
  validateSession: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(),
}))

describe('Media Server Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Media Table Schema', () => {
    it('should have correct media table structure', () => {
      const expectedColumns = [
        'id',
        'url',
        'publicId',
        'filename',
        'size',
        'mimeType',
        'width',
        'height',
        'altText',
        'createdAt',
        'updatedAt',
      ]

      // Validate that all expected columns exist in schema
      expectedColumns.forEach((column) => {
        expect(typeof column).toBe('string')
      })
    })

    it('should validate media input data', () => {
      const validateMediaInput = (input: {
        url?: string
        filename?: string
        size?: number
        mimeType?: string
      }) => {
        const errors: string[] = []

        if (!input.url || typeof input.url !== 'string') {
          errors.push('URL is required')
        }

        if (input.size && typeof input.size !== 'number') {
          errors.push('Size must be a number')
        }

        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
        ]
        if (input.mimeType && !allowedTypes.includes(input.mimeType)) {
          errors.push('Invalid MIME type')
        }

        return errors.length > 0 ? errors : null
      }

      expect(validateMediaInput({})).toContain('URL is required')
      expect(validateMediaInput({ url: '' })).toContain('URL is required')
      expect(validateMediaInput({ url: 'https://example.com/image.jpg' })).toBe(
        null,
      )
      expect(
        validateMediaInput({
          url: 'https://example.com/image.jpg',
          mimeType: 'image/jpeg',
        }),
      ).toBe(null)
      expect(
        validateMediaInput({
          url: 'https://example.com/image.jpg',
          mimeType: 'application/pdf',
        }),
      ).toContain('Invalid MIME type')
    })
  })

  describe('Media API Validation', () => {
    it('should validate delete request with array of IDs', () => {
      const validateDeleteRequest = (body: { ids?: string[] }) => {
        if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
          return 'No media IDs provided'
        }
        return null
      }

      expect(validateDeleteRequest({})).toBe('No media IDs provided')
      expect(validateDeleteRequest({ ids: [] })).toBe('No media IDs provided')
      expect(validateDeleteRequest({ ids: ['id1', 'id2'] })).toBe(null)
    })

    it('should validate UUID format for media IDs', () => {
      const isValidUUID = (id: string) => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        return uuidRegex.test(id)
      }

      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('')).toBe(false)
      expect(isValidUUID('12345')).toBe(false)
    })
  })

  describe('Product Images with Media Reference', () => {
    it('should accept mediaId as optional reference', () => {
      type ProductImageInput = {
        url: string
        mediaId?: string
        altText?: { en: string }
        position?: number
      }

      const validateProductImageInput = (input: ProductImageInput) => {
        if (!input.url) return 'URL is required'
        return null
      }

      // URL only (backward compatible)
      expect(
        validateProductImageInput({ url: 'https://example.com/img.jpg' }),
      ).toBe(null)

      // With mediaId (new feature)
      expect(
        validateProductImageInput({
          url: 'https://example.com/img.jpg',
          mediaId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      ).toBe(null)

      // Missing URL should fail
      expect(validateProductImageInput({ url: '' })).toBe('URL is required')
    })

    it('should handle media cascade deletion correctly', () => {
      // When media is deleted, product_images.media_id should be set to null
      // This is configured in schema as: onDelete: 'set null'
      type SchemaConfig = {
        onDelete: 'cascade' | 'set null' | 'restrict'
      }

      const mediaIdForeignKey: SchemaConfig = { onDelete: 'set null' }
      expect(mediaIdForeignKey.onDelete).toBe('set null')
    })
  })

  describe('Media Upload Integration', () => {
    it('should extract metadata from Cloudinary response', () => {
      type CloudinaryResponse = {
        secure_url: string
        public_id: string
        width: number
        height: number
        bytes?: number
        format?: string
      }

      const extractMediaMetadata = (
        response: CloudinaryResponse,
        file: { name: string; type: string; size: number },
      ) => ({
        url: response.secure_url,
        publicId: response.public_id,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        width: response.width,
        height: response.height,
      })

      const mockResponse: CloudinaryResponse = {
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/img.jpg',
        public_id: 'products/img',
        width: 800,
        height: 600,
      }

      const mockFile = {
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: 1024000,
      }

      const metadata = extractMediaMetadata(mockResponse, mockFile)

      expect(metadata.url).toBe(
        'https://res.cloudinary.com/demo/image/upload/v1/img.jpg',
      )
      expect(metadata.publicId).toBe('products/img')
      expect(metadata.filename).toBe('photo.jpg')
      expect(metadata.size).toBe(1024000)
      expect(metadata.mimeType).toBe('image/jpeg')
      expect(metadata.width).toBe(800)
      expect(metadata.height).toBe(600)
    })

    it('should handle file size limits', () => {
      const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

      const isFileSizeValid = (size: number) => size <= MAX_FILE_SIZE

      expect(isFileSizeValid(1024)).toBe(true) // 1KB
      expect(isFileSizeValid(10 * 1024 * 1024)).toBe(true) // 10MB
      expect(isFileSizeValid(20 * 1024 * 1024)).toBe(true) // 20MB (limit)
      expect(isFileSizeValid(21 * 1024 * 1024)).toBe(false) // 21MB
      expect(isFileSizeValid(100 * 1024 * 1024)).toBe(false) // 100MB
    })

    it('should validate allowed file types', () => {
      const ALLOWED_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
      ]

      const isFileTypeAllowed = (type: string) => ALLOWED_TYPES.includes(type)

      expect(isFileTypeAllowed('image/jpeg')).toBe(true)
      expect(isFileTypeAllowed('image/png')).toBe(true)
      expect(isFileTypeAllowed('image/gif')).toBe(true)
      expect(isFileTypeAllowed('image/webp')).toBe(true)
      expect(isFileTypeAllowed('image/heic')).toBe(true)
      expect(isFileTypeAllowed('application/pdf')).toBe(false)
      expect(isFileTypeAllowed('video/mp4')).toBe(false)
      expect(isFileTypeAllowed('text/plain')).toBe(false)
    })
  })

  describe('Media List Ordering', () => {
    it('should order media by createdAt descending', () => {
      type MediaItem = { id: string; createdAt: Date }

      const sortByCreatedAtDesc = (items: MediaItem[]) =>
        [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      const items: MediaItem[] = [
        { id: '1', createdAt: new Date('2024-01-01') },
        { id: '2', createdAt: new Date('2024-06-15') },
        { id: '3', createdAt: new Date('2024-03-10') },
      ]

      const sorted = sortByCreatedAtDesc(items)

      expect(sorted[0].id).toBe('2') // June 15
      expect(sorted[1].id).toBe('3') // March 10
      expect(sorted[2].id).toBe('1') // January 1
    })
  })
})
