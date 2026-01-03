/**
 * AI Server Functions
 *
 * Uses standardized patterns:
 * - Middleware for authentication (adminMiddleware)
 * - Error helpers for consistent responses
 */

import { GoogleGenAI } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import OpenAI from 'openai'
import { z } from 'zod'

import { adminMiddleware } from './middleware'

const GEMINI_TEXT_MODEL = 'gemini-2.0-flash' as const

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
  targetAudience: z.string().optional(),
})

export type AIProductDetails = z.infer<typeof aiProductDetailsSchema>
export type AIProvider = 'gemini' | 'openai'

const AI_PROMPT = `
You are a senior e-commerce copywriter for a premium nail art and beauty brand. Your copy converts browsers into buyers.

## Brand Context
- Industry: Nail art / Press-on nails / Beauty accessories
- Tone: Elegant, confident, empowering (NOT cutesy or overly casual)
- Target Market: Style-conscious women who value quality and convenience

## Content Requirements

### 1. Product Name (EN, FR, ID)
- Format: [Style/Collection Name] + [Product Type]
- Example: "Parisian Elegance Press-On Nail Set"
- Max 50 characters, capitalize each word

### 2. Description (EN, FR, ID) - HTML Formatted
Use the AIDA framework:

**Attention** (opening hook):
<p><strong>[One compelling sentence that creates desire]</strong></p>

**Interest** (key benefits - NOT features):
<h3>Why You'll Love These</h3>
<ul>
  <li>[Benefit 1: What problem does it solve?]</li>
  <li>[Benefit 2: How does it make them feel?]</li>
  <li>[Benefit 3: What makes it better than alternatives?]</li>
</ul>

**Desire** (paint the picture):
<p>[Describe the experience/result they'll have]</p>

**Action** (CTA):
<p><strong>Add to cart and [specific outcome].</strong></p>

IMPORTANT: Write BENEFITS, not features.
- BAD Feature: "Made with high-quality gel"
- GOOD Benefit: "Stays flawless for 2+ weeks without chipping"

### 3. SEO Meta Title (EN only)
- Format: [Primary Keyword] | [Benefit] | [Brand Feel]
- 50-60 characters
- Example: "French Tip Nails | Salon-Quality at Home | Shop Now"

### 4. SEO Meta Description (EN only)
- 150-160 characters
- Include: primary keyword, key benefit, soft CTA
- Example: "Achieve salon-perfect French tips in minutes. Our premium press-on nails last 2+ weeks. Free shipping on orders over $35."

### 5. Handle (URL slug)
- Lowercase, hyphens only
- Format: [style]-[type]-[key-attribute]
- Example: "french-tip-press-on-nails-elegant"

### 6. Tags (for search/filtering)
Array of 6-8 terms:
- Product type (press-on nails, nail set)
- Style (french tip, ombre, glitter)
- Occasion (wedding, everyday, party)
- Attribute (long-lasting, easy-apply)
- Collection name if applicable

### 7. Target Audience
Specific segment, e.g., "busy professionals who want salon results without appointments"

## Output Format (JSON only):
{
  "name": { "en": "...", "fr": "...", "id": "..." },
  "description": { "en": "<p><strong>...</strong></p><h3>Why You'll Love These</h3><ul><li>...</li></ul><p>...</p><p><strong>...</strong></p>", "fr": "...", "id": "..." },
  "metaTitle": { "en": "..." },
  "metaDescription": { "en": "..." },
  "handle": "...",
  "tags": ["...", "..."],
  "targetAudience": "..."
}

Return ONLY valid JSON. No markdown, no explanations.
`

export const generateWithGemini = async (
  imageUrl: string | undefined,
  imageBase64: string | undefined,
  mimeType: string | undefined,
  apiKey: string,
) => {
  const ai = new GoogleGenAI({ apiKey })

  let data = imageBase64
  let type = mimeType

  if (imageUrl && !data) {
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }
    const imageBuffer = await imageResponse.arrayBuffer()
    data = Buffer.from(imageBuffer).toString('base64')
    type = imageResponse.headers.get('content-type') || 'image/jpeg'
  }

  if (!data) throw new Error('No image data provided')

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [
      { text: AI_PROMPT },
      {
        inlineData: {
          data,
          mimeType: type || 'image/jpeg',
        },
      },
    ],
  })

  const candidate = response.candidates?.[0]
  if (!candidate?.content?.parts) {
    throw new Error('Gemini returned empty response')
  }

  let text = ''
  for (const part of candidate.content.parts) {
    if ('text' in part && part.text) {
      text += part.text
    }
  }

  if (!text) {
    throw new Error('Gemini returned no text content')
  }

  const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error(
      `Gemini returned invalid JSON: ${jsonStr.substring(0, 200)}...`,
    )
  }
  return aiProductDetailsSchema.parse(parsed)
}

const generateWithOpenAI = async (
  imageUrl: string | undefined,
  imageBase64: string | undefined,
  mimeType: string | undefined,
  apiKey: string,
) => {
  const openai = new OpenAI({ apiKey })

  const content: (
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  )[] = [{ type: 'text', text: AI_PROMPT }]

  if (imageBase64) {
    content.push({
      type: 'image_url',
      image_url: {
        url: imageBase64.startsWith('data:')
          ? imageBase64
          : `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
      },
    })
  } else if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } })
  } else {
    throw new Error('No image data provided')
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    max_tokens: 1500,
  })

  const text = response.choices[0]?.message?.content
  if (!text) {
    throw new Error('OpenAI returned empty response')
  }
  const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error(
      `OpenAI returned invalid JSON: ${jsonStr.substring(0, 200)}...`,
    )
  }
  return aiProductDetailsSchema.parse(parsed)
}

export const generateProductDetails = async (params: {
  imageUrl?: string
  imageBase64?: string
  mimeType?: string
  provider: AIProvider
  apiKey: string
}) => {
  if (params.provider === 'openai') {
    return generateWithOpenAI(
      params.imageUrl,
      params.imageBase64,
      params.mimeType,
      params.apiKey,
    )
  }
  return generateWithGemini(
    params.imageUrl,
    params.imageBase64,
    params.mimeType,
    params.apiKey,
  )
}

const generateProductDetailsInputSchema = z.object({
  imageUrl: z.string().optional(),
  imageBase64: z.string().optional(),
  mimeType: z.string().optional(),
  provider: z.enum(['gemini', 'openai']).default('gemini'),
})

export const generateProductDetailsFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    generateProductDetailsInputSchema.parse(data),
  )
  .handler(async ({ data }) => {
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
      const result = await generateProductDetails({
        imageUrl: data.imageUrl,
        imageBase64: data.imageBase64,
        mimeType: data.mimeType,
        provider: data.provider,
        apiKey,
      })
      return { success: true, data: result }
    } catch (error) {
      console.error('AI Generation Error:', error)
      throw new Error(
        error instanceof Error ? error.message : 'Failed to generate details',
      )
    }
  })
