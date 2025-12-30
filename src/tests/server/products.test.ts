import { describe, expect, it, vi } from 'vitest'

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

describe('Cloudinary Image Utilities', () => {
  describe('getPublicIdFromUrl', () => {
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
  })

  describe('deleteImagesFromCloudinary', () => {
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
