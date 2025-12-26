import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import OpenAI from 'openai'
import { z } from 'zod'

import { validateSession } from '../lib/auth'

const localizedStringSchema = z.object({
  en: z.string(),
  fr: z.string().optional(),
  id: z.string().optional(),
})

export const aiProductDetailsSchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema,
  metaTitle: localizedStringSchema,
  metaDescription: localizedStringSchema,
  handle: z.string(),
  tags: z.array(z.string()),
})

export type AIProductDetails = z.infer<typeof aiProductDetailsSchema>
export type AIProvider = 'gemini' | 'openai'

const AI_PROMPT = `
Analyze this product image and generate the following details in JSON format:
1. Name (English, French, Indonesian)
2. Description (English, French, Indonesian) - compelling and professional
3. Meta Title (English)
4. Meta Description (English)
5. Handle (URL-friendly slug, e.g., "blue-silk-scarf")
6. Tags (Array of relevant keywords)

The output MUST be a valid JSON object matching this schema:
{
  "name": { "en": "...", "fr": "...", "id": "..." },
  "description": { "en": "...", "fr": "...", "id": "..." },
  "metaTitle": { "en": "..." },
  "metaDescription": { "en": "..." },
  "handle": "...",
  "tags": ["...", "..."]
}

Only return the JSON object, no other text or explanation.
`

async function generateWithGemini(
  imageUrl: string,
  apiKey: string,
): Promise<AIProductDetails> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
  }
  const imageBuffer = await imageResponse.arrayBuffer()
  const imageBase64 = Buffer.from(imageBuffer).toString('base64')

  const result = await model.generateContent([
    AI_PROMPT,
    {
      inlineData: {
        data: imageBase64,
        mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
      },
    },
  ])

  const response = await result.response
  const text = response.text()
  const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
  return aiProductDetailsSchema.parse(JSON.parse(jsonStr))
}

async function generateWithOpenAI(
  imageUrl: string,
  apiKey: string,
): Promise<AIProductDetails> {
  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: AI_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 1000,
  })

  const text = response.choices[0]?.message?.content || ''
  const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
  return aiProductDetailsSchema.parse(JSON.parse(jsonStr))
}

export async function generateProductDetails(
  imageUrl: string,
  provider: AIProvider,
  apiKey: string,
): Promise<AIProductDetails> {
  if (provider === 'openai') {
    return generateWithOpenAI(imageUrl, apiKey)
  }
  return generateWithGemini(imageUrl, apiKey)
}

export const generateProductDetailsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      imageUrl: z.string().min(1),
      provider: z.enum(['gemini', 'openai']).default('gemini'),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest()
    if (!request) throw new Error('No request found')

    const auth = await validateSession(request)
    if (!auth.success) {
      throw new Error(auth.error || 'Unauthorized')
    }

    const apiKey =
      data.provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error(
        `${data.provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'} is not configured`,
      )
    }

    try {
      const result = await generateProductDetails(
        data.imageUrl,
        data.provider,
        apiKey,
      )
      return { success: true, data: result }
    } catch (error) {
      console.error('AI Generation Error:', error)
      throw new Error(
        error instanceof Error ? error.message : 'Failed to generate details',
      )
    }
  })
