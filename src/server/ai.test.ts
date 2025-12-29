import { describe, expect, it, vi } from 'vitest'

import {
  aiProductDetailsSchema,
  generateCompositeImageWithGemini,
  generateProductDetails,
  generateCompositeImageSchema,
  ASPECT_RATIOS,
} from './ai'

// Mock Gemini - unified @google/genai SDK
// This mock handles both text generation (for product details) and image generation
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockImplementation(({ config }) => {
        // Image generation mode
        if (config?.responseModalities?.includes('IMAGE')) {
          return Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        data: 'MOCK_GENERATED_IMAGE',
                        mimeType: 'image/png',
                      },
                    },
                  ],
                },
              },
            ],
          })
        }
        // Text generation mode (for product details)
        return Promise.resolve({
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
        })
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
      // Gemini mock returns 'Silk Scarf'
      expect(result.name.en).toBe('Silk Scarf')
    })

    it('should pass mimeType to OpenAI for base64 images', async () => {
      const result = await generateProductDetails({
        imageBase64: 'SGVsbG8gV29ybGQ=',
        mimeType: 'image/png',
        provider: 'openai',
        apiKey: 'test-key',
      })
      // Should succeed without error
      expect(result.name.en).toBe('Leather Bag')
    })

    it('should pass mimeType to Gemini for base64 images', async () => {
      const result = await generateProductDetails({
        imageBase64: 'SGVsbG8gV29ybGQ=',
        mimeType: 'image/webp',
        provider: 'gemini',
        apiKey: 'test-key',
      })
      // Should succeed without error
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

  describe('generateCompositeImageWithGemini', () => {
    it('should generate an image with valid inputs', async () => {
      const result = await generateCompositeImageWithGemini({
        backgroundImage: { base64: 'BG_DATA', mimeType: 'image/jpeg' },
        productImage: { base64: 'PROD_DATA', mimeType: 'image/png' },
        apiKey: 'test-key',
      })

      expect(result.imageBase64).toBe('MOCK_GENERATED_IMAGE')
      expect(result.mimeType).toBe('image/png')
    })

    it('should use default prompts if not provided', async () => {
      const result = await generateCompositeImageWithGemini({
        backgroundImage: { base64: 'BG', mimeType: 'image/jpeg' },
        productImage: { base64: 'PROD', mimeType: 'image/jpeg' },
        apiKey: 'test-key',
      })
      expect(result.imageBase64).toBe('MOCK_GENERATED_IMAGE')
    })

    it('should accept optional prompt parameter', async () => {
      const result = await generateCompositeImageWithGemini({
        backgroundImage: { base64: 'BG', mimeType: 'image/jpeg' },
        productImage: { base64: 'PROD', mimeType: 'image/jpeg' },
        prompt: 'Custom variant prompt',
        apiKey: 'test-key',
      })
      expect(result.imageBase64).toBe('MOCK_GENERATED_IMAGE')
    })

    it('should accept optional aspectRatio parameter', async () => {
      const result = await generateCompositeImageWithGemini({
        backgroundImage: { base64: 'BG', mimeType: 'image/jpeg' },
        productImage: { base64: 'PROD', mimeType: 'image/jpeg' },
        aspectRatio: '4:5',
        apiKey: 'test-key',
      })
      expect(result.imageBase64).toBe('MOCK_GENERATED_IMAGE')
    })
  })

  describe('generateCompositeImageSchema', () => {
    it('should validate valid input', () => {
      const validData = {
        backgroundImage: { base64: 'abc123', mimeType: 'image/jpeg' },
        productImage: { base64: 'def456', mimeType: 'image/png' },
      }
      const result = generateCompositeImageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate with optional prompt', () => {
      const validData = {
        backgroundImage: { base64: 'abc123', mimeType: 'image/jpeg' },
        productImage: { base64: 'def456', mimeType: 'image/png' },
        prompt: 'Apply Almond shape',
      }
      const result = generateCompositeImageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate with optional aspectRatio', () => {
      const validData = {
        backgroundImage: { base64: 'abc123', mimeType: 'image/jpeg' },
        productImage: { base64: 'def456', mimeType: 'image/png' },
        aspectRatio: '1:1',
      }
      const result = generateCompositeImageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should fail on missing backgroundImage', () => {
      const invalidData = {
        productImage: { base64: 'def456', mimeType: 'image/png' },
      }
      const result = generateCompositeImageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should fail on missing productImage', () => {
      const invalidData = {
        backgroundImage: { base64: 'abc123', mimeType: 'image/jpeg' },
      }
      const result = generateCompositeImageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should fail on invalid aspectRatio', () => {
      const invalidData = {
        backgroundImage: { base64: 'abc123', mimeType: 'image/jpeg' },
        productImage: { base64: 'def456', mimeType: 'image/png' },
        aspectRatio: '5:5', // not a valid ratio
      }
      const result = generateCompositeImageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should use default mimeType when not provided', () => {
      const validData = {
        backgroundImage: { base64: 'abc123' },
        productImage: { base64: 'def456' },
      }
      const result = generateCompositeImageSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.backgroundImage.mimeType).toBe('image/jpeg')
        expect(result.data.productImage.mimeType).toBe('image/jpeg')
      }
    })
  })

  describe('ASPECT_RATIOS', () => {
    it('should contain all expected ratios', () => {
      expect(ASPECT_RATIOS).toContain('1:1')
      expect(ASPECT_RATIOS).toContain('4:5')
      expect(ASPECT_RATIOS).toContain('16:9')
      expect(ASPECT_RATIOS).toContain('9:16')
      expect(ASPECT_RATIOS).toContain('3:4')
      expect(ASPECT_RATIOS).toContain('4:3')
    })

    it('should have 9 aspect ratios', () => {
      expect(ASPECT_RATIOS.length).toBe(9)
    })
  })
})
