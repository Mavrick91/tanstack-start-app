import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { generateProductDetailsFn } from '../server/ai'

type AIProvider = 'gemini' | 'openai'

type ImageItem = {
  url: string
  file?: File
}

type GeneratedProductData = {
  name: { en: string; fr?: string; id?: string }
  description: { en: string; fr?: string; id?: string }
  metaTitle: { en: string; fr?: string; id?: string }
  metaDescription: { en: string; fr?: string; id?: string }
  handle: string
  tags: string[]
}

/**
 * Convert a File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
  })
}

type UseAIGenerationOptions = {
  onSuccess?: (data: GeneratedProductData) => void
}

/**
 * Hook for AI-powered product detail generation.
 * Supports generating product details from an image URL or local file.
 */
export function useAIGeneration(options?: UseAIGenerationOptions) {
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [provider, setProvider] = useState<AIProvider>('gemini')

  const generate = useCallback(
    async (image: ImageItem) => {
      if (!image.url) {
        toast.error(t('Please add an image URL first'))
        return null
      }

      setIsGenerating(true)
      try {
        let result

        const isLocalImage = image.url.startsWith('blob:')

        if (isLocalImage) {
          if (!image.file) {
            throw new Error('Local image file is missing')
          }
          const base64 = await fileToBase64(image.file)
          result = await generateProductDetailsFn({
            data: {
              imageBase64: base64,
              mimeType: image.file.type,
              provider,
            },
          })
        } else {
          result = await generateProductDetailsFn({
            data: { imageUrl: image.url, provider },
          })
        }

        if (result.success) {
          const generatedData: GeneratedProductData = {
            name: result.data.name,
            description: result.data.description,
            metaTitle: result.data.metaTitle,
            metaDescription: result.data.metaDescription,
            handle: result.data.handle,
            tags: result.data.tags,
          }

          options?.onSuccess?.(generatedData)
          toast.success(t('Product details generated successfully!'))
          return generatedData
        }

        return null
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t('Failed to generate product details'),
        )
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [provider, options, t],
  )

  return {
    isGenerating,
    provider,
    setProvider,
    generate,
  }
}

// Re-export fileToBase64 for use elsewhere
export { fileToBase64 }
