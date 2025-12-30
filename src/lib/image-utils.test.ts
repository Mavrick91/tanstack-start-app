import { describe, expect, it } from 'vitest'

import {
  isBlobUrl,
  isCloudinaryUrl,
  getImagesNeedingUpload,
  getAlreadyUploadedImages,
  getRemovedImageUrls,
} from './image-utils'

describe('image-utils', () => {
  describe('isBlobUrl', () => {
    it('should return true for blob URLs', () => {
      expect(isBlobUrl('blob:http://localhost/abc123')).toBe(true)
      expect(isBlobUrl('blob:https://example.com/xyz')).toBe(true)
    })

    it('should return false for non-blob URLs', () => {
      expect(isBlobUrl('https://res.cloudinary.com/demo/image.jpg')).toBe(false)
      expect(isBlobUrl('https://example.com/image.jpg')).toBe(false)
      expect(isBlobUrl('')).toBe(false)
    })
  })

  describe('isCloudinaryUrl', () => {
    it('should return true for Cloudinary URLs', () => {
      expect(
        isCloudinaryUrl(
          'https://res.cloudinary.com/demo/image/upload/v1/test.jpg',
        ),
      ).toBe(true)
    })

    it('should return false for non-Cloudinary URLs', () => {
      expect(isCloudinaryUrl('https://example.com/image.jpg')).toBe(false)
      expect(isCloudinaryUrl('blob:http://localhost/abc')).toBe(false)
    })
  })

  describe('getImagesNeedingUpload', () => {
    it('should return only images with blob URLs', () => {
      const images = [
        { id: '1', url: 'https://res.cloudinary.com/demo/existing.jpg' },
        { id: '2', url: 'blob:http://localhost/new123' },
        { id: '3', url: 'https://res.cloudinary.com/demo/another.jpg' },
        { id: '4', url: 'blob:http://localhost/new456' },
      ]

      const result = getImagesNeedingUpload(images)

      expect(result).toHaveLength(2)
      expect(result.map((i) => i.id)).toEqual(['2', '4'])
    })

    it('should return empty array when no blob URLs', () => {
      const images = [
        { id: '1', url: 'https://res.cloudinary.com/demo/a.jpg' },
        { id: '2', url: 'https://res.cloudinary.com/demo/b.jpg' },
      ]

      expect(getImagesNeedingUpload(images)).toEqual([])
    })

    it('should handle empty array', () => {
      expect(getImagesNeedingUpload([])).toEqual([])
    })
  })

  describe('getAlreadyUploadedImages', () => {
    it('should return only images without blob URLs', () => {
      const images = [
        { id: '1', url: 'https://res.cloudinary.com/demo/existing.jpg' },
        { id: '2', url: 'blob:http://localhost/new123' },
        { id: '3', url: 'https://example.com/another.jpg' },
      ]

      const result = getAlreadyUploadedImages(images)

      expect(result).toHaveLength(2)
      expect(result.map((i) => i.id)).toEqual(['1', '3'])
    })

    it('should return all images when none are blobs', () => {
      const images = [
        { id: '1', url: 'https://a.com/1.jpg' },
        { id: '2', url: 'https://b.com/2.jpg' },
      ]

      expect(getAlreadyUploadedImages(images)).toEqual(images)
    })
  })

  describe('getRemovedImageUrls', () => {
    it('should return URLs that were in original but not in current', () => {
      const original = [
        { url: 'https://cloudinary/a.jpg' },
        { url: 'https://cloudinary/b.jpg' },
        { url: 'https://cloudinary/c.jpg' },
      ]
      const current = [{ url: 'https://cloudinary/a.jpg' }]

      const removed = getRemovedImageUrls(original, current)

      expect(removed).toEqual([
        'https://cloudinary/b.jpg',
        'https://cloudinary/c.jpg',
      ])
    })

    it('should return empty array when nothing removed', () => {
      const original = [{ url: 'https://a.jpg' }, { url: 'https://b.jpg' }]
      const current = [{ url: 'https://a.jpg' }, { url: 'https://b.jpg' }]

      expect(getRemovedImageUrls(original, current)).toEqual([])
    })

    it('should return all original URLs when current is empty', () => {
      const original = [{ url: 'https://a.jpg' }, { url: 'https://b.jpg' }]

      expect(getRemovedImageUrls(original, [])).toEqual([
        'https://a.jpg',
        'https://b.jpg',
      ])
    })

    it('should handle empty original array', () => {
      expect(getRemovedImageUrls([], [{ url: 'https://new.jpg' }])).toEqual([])
    })
  })
})
