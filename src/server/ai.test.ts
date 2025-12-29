import { describe, expect, it, vi } from 'vitest'

import { aiProductDetailsSchema, generateProductDetails } from './ai'

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    name: {
                      en: 'Silk Scarf',
                      fr: 'Écharpe en soie',
                      id: 'Syal Sutra',
                    },
                    description: {
                      en: 'A beautiful handmade silk scarf.',
                      fr: 'Une belle écharpe en soie faite à la main.',
                      id: 'Syal sutra buatan tangan yang indah.',
                    },
                    metaTitle: { en: 'Handmade Silk Scarf' },
                    metaDescription: {
                      en: 'Buy premium silk scarves online.',
                    },
                    handle: 'silk-scarf',
                    tags: ['silk', 'scarf', 'handmade'],
                    targetAudience: 'fashion-conscious women 25-40',
                  }),
                },
              ],
            },
          },
        ],
      }),
    },
  })),
}))

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: {
                    en: 'Leather Bag',
                    fr: 'Sac en cuir',
                    id: 'Tas Kulit',
                  },
                  description: {
                    en: 'Premium leather bag.',
                    fr: 'Sac en cuir premium.',
                    id: 'Tas kulit premium.',
                  },
                  metaTitle: { en: 'Premium Leather Bag' },
                  metaDescription: { en: 'Shop leather bags.' },
                  handle: 'leather-bag',
                  tags: ['leather', 'bag', 'premium'],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}))

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  headers: {
    get: () => 'image/jpeg',
  },
})

describe('AI Detail Generation Logic', () => {
  describe('generateProductDetails', () => {
    it('should generate product details with Gemini', async () => {
      const result = await generateProductDetails({
        imageUrl: 'https://example.com/image.jpg',
        provider: 'gemini',
        apiKey: 'test-api-key',
      })

      expect(result.name.en).toBe('Silk Scarf')
      expect(result.handle).toBe('silk-scarf')
      expect(result.tags).toContain('handmade')
    })

    it('should generate product details with OpenAI', async () => {
      const result = await generateProductDetails({
        imageUrl: 'https://example.com/image.jpg',
        provider: 'openai',
        apiKey: 'test-api-key',
      })

      expect(result.name.en).toBe('Leather Bag')
      expect(result.handle).toBe('leather-bag')
      expect(result.tags).toContain('premium')
    })

    it('should throw error if fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      await expect(
        generateProductDetails({
          imageUrl: 'https://example.com/missing.jpg',
          provider: 'gemini',
          apiKey: 'test-key',
        }),
      ).rejects.toThrow('Failed to fetch image: Not Found')
    })

    it('should default to Gemini when provider is gemini', async () => {
      const result = await generateProductDetails({
        imageUrl: 'https://example.com/image.jpg',
        provider: 'gemini',
        apiKey: 'test-key',
      })
      expect(result.name.en).toBe('Silk Scarf')
    })

    it('should pass mimeType to OpenAI for base64 images', async () => {
      const result = await generateProductDetails({
        imageBase64: 'SGVsbG8gV29ybGQ=',
        mimeType: 'image/png',
        provider: 'openai',
        apiKey: 'test-key',
      })
      expect(result.name.en).toBe('Leather Bag')
    })

    it('should pass mimeType to Gemini for base64 images', async () => {
      const result = await generateProductDetails({
        imageBase64: 'SGVsbG8gV29ybGQ=',
        mimeType: 'image/webp',
        provider: 'gemini',
        apiKey: 'test-key',
      })
      expect(result.name.en).toBe('Silk Scarf')
    })

    it('should include targetAudience when returned by AI', async () => {
      const result = await generateProductDetails({
        imageUrl: 'https://example.com/image.jpg',
        provider: 'gemini',
        apiKey: 'test-key',
      })
      expect(result.targetAudience).toBe('fashion-conscious women 25-40')
    })
  })

  describe('aiProductDetailsSchema', () => {
    it('should validate valid product details', () => {
      const validData = {
        name: { en: 'Test', fr: 'Test FR', id: 'Test ID' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: ['tag1', 'tag2'],
      }

      const result = aiProductDetailsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should fail on missing required fields', () => {
      const invalidData = {
        name: { en: 'Test' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: ['tag1'],
      }

      const result = aiProductDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should fail on invalid tags type', () => {
      const invalidData = {
        name: { en: 'Test' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: 'not-an-array',
      }

      const result = aiProductDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should allow optional fr and id fields', () => {
      const validData = {
        name: { en: 'Test' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: [],
      }

      const result = aiProductDetailsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should fail on missing English name', () => {
      const invalidData = {
        name: { fr: 'Test FR' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: [],
      }

      const result = aiProductDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should allow optional targetAudience field', () => {
      const validData = {
        name: { en: 'Test' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: [],
        targetAudience: 'busy professionals 30-45',
      }

      const result = aiProductDetailsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.targetAudience).toBe('busy professionals 30-45')
      }
    })

    it('should pass validation without targetAudience', () => {
      const validData = {
        name: { en: 'Test' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: [],
      }

      const result = aiProductDetailsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
