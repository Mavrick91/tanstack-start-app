import { describe, expect, it, vi } from 'vitest'

import { aiProductDetailsSchema, generateProductDetails } from './ai'

// Mock Gemini
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => ({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
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
              }),
          },
        }),
      })),
    })),
  }
})

// Mock OpenAI
vi.mock('openai', () => {
  return {
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
  }
})

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
      const result = await generateProductDetails(
        'https://example.com/image.jpg',
        'gemini',
        'test-api-key',
      )

      expect(result.name.en).toBe('Silk Scarf')
      expect(result.handle).toBe('silk-scarf')
      expect(result.tags).toContain('handmade')
    })

    it('should generate product details with OpenAI', async () => {
      const result = await generateProductDetails(
        'https://example.com/image.jpg',
        'openai',
        'test-api-key',
      )

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
        generateProductDetails(
          'https://example.com/missing.jpg',
          'gemini',
          'test-key',
        ),
      ).rejects.toThrow('Failed to fetch image: Not Found')
    })

    it('should default to Gemini when provider is gemini', async () => {
      const result = await generateProductDetails(
        'https://example.com/image.jpg',
        'gemini',
        'test-key',
      )
      // Gemini mock returns 'Silk Scarf'
      expect(result.name.en).toBe('Silk Scarf')
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
        // missing description
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
        tags: 'not-an-array', // should be array
      }

      const result = aiProductDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should allow optional fr and id fields', () => {
      const validData = {
        name: { en: 'Test' }, // only en is required
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
        name: { fr: 'Test FR' }, // missing en
        description: { en: 'Desc' },
        metaTitle: { en: 'Meta' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-handle',
        tags: [],
      }

      const result = aiProductDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
