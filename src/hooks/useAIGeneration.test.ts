import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderHook, act, waitFor } from '@/test/test-utils'

// Mock dependencies - must be defined before vi.mock calls
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../server/ai', () => ({
  generateProductDetailsFn: vi.fn(),
}))

import { toast } from 'sonner'

import { generateProductDetailsFn } from '../server/ai'

import { useAIGeneration } from './useAIGeneration'

describe('useAIGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useAIGeneration())

      expect(result.current.isGenerating).toBe(false)
      expect(result.current.provider).toBe('gemini')
      expect(typeof result.current.generate).toBe('function')
      expect(typeof result.current.setProvider).toBe('function')
    })

    it('initializes with custom provider', () => {
      const { result } = renderHook(() => useAIGeneration())

      act(() => {
        result.current.setProvider('openai')
      })

      expect(result.current.provider).toBe('openai')
    })
  })

  describe('Provider management', () => {
    it('allows changing provider', () => {
      const { result } = renderHook(() => useAIGeneration())

      expect(result.current.provider).toBe('gemini')

      act(() => {
        result.current.setProvider('openai')
      })

      expect(result.current.provider).toBe('openai')

      act(() => {
        result.current.setProvider('gemini')
      })

      expect(result.current.provider).toBe('gemini')
    })
  })

  describe('Image URL generation', () => {
    it('generates product details from image URL successfully', async () => {
      const mockData = {
        name: { en: 'Test Product', fr: 'Produit Test' },
        description: { en: 'Description' },
        metaTitle: { en: 'Meta Title' },
        metaDescription: { en: 'Meta Desc' },
        handle: 'test-product',
        tags: ['tag1', 'tag2'],
      }

      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: true,
        data: mockData,
      })

      const onSuccess = vi.fn()
      const { result } = renderHook(() => useAIGeneration({ onSuccess }))

      let generatedData: unknown

      await act(async () => {
        generatedData = await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      await waitFor(() => {
        expect(generateProductDetailsFn).toHaveBeenCalledWith({
          data: {
            imageUrl: 'https://example.com/image.jpg',
            provider: 'gemini',
          },
        })
      })

      expect(generatedData).toEqual(mockData)
      expect(onSuccess).toHaveBeenCalledWith(mockData)
      expect(toast.success).toHaveBeenCalledWith(
        'Product details generated successfully!',
      )
      expect(result.current.isGenerating).toBe(false)
    })

    it('shows error toast when image URL is missing', async () => {
      const { result } = renderHook(() => useAIGeneration())

      let generatedData: unknown

      await act(async () => {
        generatedData = await result.current.generate({ url: '' })
      })

      expect(generatedData).toBeNull()
      expect(toast.error).toHaveBeenCalledWith(
        'Please add an image URL first',
      )
      expect(generateProductDetailsFn).not.toHaveBeenCalled()
    })

    it('handles generation failure with error message', async () => {
      const errorMessage = 'API rate limit exceeded'
      vi.mocked(generateProductDetailsFn).mockRejectedValueOnce(
        new Error(errorMessage),
      )

      const { result } = renderHook(() => useAIGeneration())

      let generatedData: unknown

      await act(async () => {
        generatedData = await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage)
      })

      expect(generatedData).toBeNull()
      expect(result.current.isGenerating).toBe(false)
    })

    it('handles non-Error failures with generic message', async () => {
      vi.mocked(generateProductDetailsFn).mockRejectedValueOnce('String error')

      const { result } = renderHook(() => useAIGeneration())

      await act(async () => {
        await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to generate product details',
        )
      })
    })
  })

  describe('Local file generation', () => {
    it('generates product details from local file', async () => {
      const mockFile = new File(['image content'], 'test.jpg', {
        type: 'image/jpeg',
      })

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as ((this: FileReader, ev: ProgressEvent) => void) | null,
        onerror: null as ((this: FileReader, ev: ProgressEvent) => void) | null,
        result: 'data:image/jpeg;base64,mockBase64String',
      }

      global.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader

      const mockData = {
        name: { en: 'Local Product' },
        description: { en: 'Description' },
        metaTitle: { en: 'Title' },
        metaDescription: { en: 'Desc' },
        handle: 'local-product',
        tags: ['local'],
      }

      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: true,
        data: mockData,
      })

      const { result } = renderHook(() => useAIGeneration())

      const generatePromise = act(async () => {
        return result.current.generate({
          url: 'blob:http://localhost/abc-123',
          file: mockFile,
        })
      })

      // Trigger FileReader onload
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload.call(
            mockFileReader as unknown as FileReader,
            {} as ProgressEvent,
          )
        }
      })

      await generatePromise

      await waitFor(() => {
        expect(generateProductDetailsFn).toHaveBeenCalledWith({
          data: {
            imageBase64: 'mockBase64String',
            mimeType: 'image/jpeg',
            provider: 'gemini',
          },
        })
      })

      expect(toast.success).toHaveBeenCalled()
    })

    it('handles missing file for local image', async () => {
      const { result } = renderHook(() => useAIGeneration())

      await act(async () => {
        await result.current.generate({
          url: 'blob:http://localhost/abc-123',
          // file is missing
        })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Local image file is missing',
        )
      })
    })
  })

  describe('Loading state', () => {
    it('sets isGenerating during and after generation', async () => {
      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: true,
        data: {
          name: { en: 'Product' },
          description: { en: 'Desc' },
          metaTitle: { en: 'Title' },
          metaDescription: { en: 'Meta' },
          handle: 'product',
          tags: [],
        },
      })

      const { result } = renderHook(() => useAIGeneration())

      expect(result.current.isGenerating).toBe(false)

      await act(async () => {
        await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      // Should be false after completion
      expect(result.current.isGenerating).toBe(false)
    })

    it('sets isGenerating to false even after error', async () => {
      vi.mocked(generateProductDetailsFn).mockRejectedValueOnce(
        new Error('Failed'),
      )

      const { result } = renderHook(() => useAIGeneration())

      await act(async () => {
        await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      expect(result.current.isGenerating).toBe(false)
    })
  })

  describe('Success callback', () => {
    it('calls onSuccess callback when provided', async () => {
      const mockData = {
        name: { en: 'Product' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Title' },
        metaDescription: { en: 'Meta' },
        handle: 'product',
        tags: ['tag'],
      }

      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: true,
        data: mockData,
      })

      const onSuccess = vi.fn()
      const { result } = renderHook(() => useAIGeneration({ onSuccess }))

      await act(async () => {
        await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledWith(mockData)
    })

    it('does not crash when onSuccess is not provided', async () => {
      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: true,
        data: {
          name: { en: 'Product' },
          description: { en: 'Desc' },
          metaTitle: { en: 'Title' },
          metaDescription: { en: 'Meta' },
          handle: 'product',
          tags: [],
        },
      })

      const { result } = renderHook(() => useAIGeneration())

      await expect(
        act(async () => {
          await result.current.generate({
            url: 'https://example.com/image.jpg',
          })
        }),
      ).resolves.not.toThrow()
    })
  })

  describe('Provider selection', () => {
    it('uses selected provider in API call', async () => {
      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: true,
        data: {
          name: { en: 'Product' },
          description: { en: 'Desc' },
          metaTitle: { en: 'Title' },
          metaDescription: { en: 'Meta' },
          handle: 'product',
          tags: [],
        },
      })

      const { result } = renderHook(() => useAIGeneration())

      act(() => {
        result.current.setProvider('openai')
      })

      await act(async () => {
        await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      expect(generateProductDetailsFn).toHaveBeenCalledWith({
        data: {
          imageUrl: 'https://example.com/image.jpg',
          provider: 'openai',
        },
      })
    })
  })

  describe('Return value handling', () => {
    it('returns null when generation fails', async () => {
      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const { result } = renderHook(() => useAIGeneration())

      let returnValue: unknown

      await act(async () => {
        returnValue = await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      expect(returnValue).toBeNull()
    })

    it('returns generated data when successful', async () => {
      const mockData = {
        name: { en: 'Product' },
        description: { en: 'Desc' },
        metaTitle: { en: 'Title' },
        metaDescription: { en: 'Meta' },
        handle: 'product',
        tags: ['tag'],
      }

      vi.mocked(generateProductDetailsFn).mockResolvedValueOnce({
        success: true,
        data: mockData,
      })

      const { result } = renderHook(() => useAIGeneration())

      let returnValue: unknown

      await act(async () => {
        returnValue = await result.current.generate({
          url: 'https://example.com/image.jpg',
        })
      })

      expect(returnValue).toEqual(mockData)
    })
  })
})
