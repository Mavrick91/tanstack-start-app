import { GoogleGenAI } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import OpenAI from 'openai'
import { z } from 'zod'

import { validateSession } from '../lib/auth'

const GEMINI_TEXT_MODEL = 'gemini-2.0-flash' as const
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview' as const

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

export async function generateWithGemini(
  imageUrl: string | undefined,
  imageBase64: string | undefined,
  mimeType: string | undefined,
  apiKey: string,
): Promise<AIProductDetails> {
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

async function generateWithOpenAI(
  imageUrl: string | undefined,
  imageBase64: string | undefined,
  mimeType: string | undefined,
  apiKey: string,
): Promise<AIProductDetails> {
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

export async function generateProductDetails(params: {
  imageUrl?: string
  imageBase64?: string
  mimeType?: string
  provider: AIProvider
  apiKey: string
}): Promise<AIProductDetails> {
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

export const generateProductDetailsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      imageUrl: z.string().optional(),
      imageBase64: z.string().optional(),
      mimeType: z.string().optional(),
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

export const ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
] as const
export type AspectRatio = (typeof ASPECT_RATIOS)[number]

const imageDataSchema = z.object({
  base64: z.string(),
  mimeType: z.string().default('image/jpeg'),
})

export const generateCompositeImageSchema = z.object({
  backgroundImage: imageDataSchema,
  productImage: imageDataSchema,
  prompt: z.string().optional(),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
})

export type GenerateCompositeImageInput = z.infer<
  typeof generateCompositeImageSchema
>

async function requireGeminiAuth(): Promise<string> {
  const request = getRequest()
  if (!request) throw new Error('No request found')

  const auth = await validateSession(request)
  if (!auth.success) throw new Error(auth.error || 'Unauthorized')

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  return apiKey
}

function extractImageFromResponse(
  response: Awaited<
    ReturnType<InstanceType<typeof GoogleGenAI>['models']['generateContent']>
  >,
): { imageBase64: string; mimeType: string } {
  const candidate = response.candidates?.[0]
  if (!candidate?.content?.parts) {
    throw new Error('No image generated by Gemini')
  }

  for (const part of candidate.content.parts) {
    if ('inlineData' in part && part.inlineData) {
      return {
        imageBase64: part.inlineData.data || '',
        mimeType: part.inlineData.mimeType || 'image/png',
      }
    }
  }

  throw new Error('Gemini response did not contain an image')
}

function buildImageConfig(aspectRatio?: AspectRatio) {
  return {
    imageSize: '2K' as const,
    ...(aspectRatio && { aspectRatio }),
  }
}

const IMAGE_COMPOSITION_PROMPT = `
Replace the nails visible in the first image with the nail design from the second image.

STRICT REQUIREMENTS - DO NOT CHANGE:
- OUTPUT must be EXACTLY the same dimensions and aspect ratio as the first image
- DO NOT crop, zoom, or reframe - keep the EXACT same composition as the first image
- Maintain the IDENTICAL camera angle, perspective, and distance
- The scene, framing, and all elements must remain unchanged

NAIL REPLACEMENT:
- Replace any nails in the first image with the exact nail design, art, colors, and patterns from the second image
- Match lighting, shadows, and color temperature of the first image
- Remove any watermarks, logos, or text overlays from the image

OUTPUT: The exact same image as the first image, but with the nail design from the second image replacing the existing nails. High quality, photorealistic, no watermarks.
`

export async function generateCompositeImageWithGemini(
  params: GenerateCompositeImageInput & { apiKey: string },
): Promise<{ imageBase64: string; mimeType: string }> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey })

  const userPrompt = params.prompt
    ? `Apply these variant specifications:\n${params.prompt}`
    : 'Replace the nails in the first image with the nail design from the second image.'

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: [
      { text: userPrompt },
      {
        inlineData: {
          mimeType: params.backgroundImage.mimeType,
          data: params.backgroundImage.base64,
        },
      },
      {
        inlineData: {
          mimeType: params.productImage.mimeType,
          data: params.productImage.base64,
        },
      },
    ],
    config: {
      systemInstruction: IMAGE_COMPOSITION_PROMPT,
      responseModalities: ['IMAGE'],
      imageConfig: buildImageConfig(params.aspectRatio),
    },
  })

  return extractImageFromResponse(response)
}

const REGENERATE_WITH_REF_PROMPT = `You are an expert image editor for nail product photography. You have two reference images:
1. The FIRST image is the current generated image that needs modifications
2. The SECOND image is the original nail design/product that should be preserved

Modify the first image according to the user's instructions while:
- Maintaining the nail design, colors, and patterns from the second reference image
- Keeping the overall composition, lighting, and style of the first image
- Only changing what the user specifically requests`

const REGENERATE_PROMPT = `You are an expert image editor. Modify the provided image according to the user's instructions while maintaining the overall composition, lighting, and style of the original image.`

export const regenerateImageFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      existingImage: imageDataSchema,
      referenceImage: imageDataSchema.optional(),
      editPrompt: z.string(),
      aspectRatio: z.enum(ASPECT_RATIOS).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = await requireGeminiAuth()
    const ai = new GoogleGenAI({ apiKey })

    const contents: (
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    )[] = [
      { text: data.editPrompt },
      {
        inlineData: {
          mimeType: data.existingImage.mimeType,
          data: data.existingImage.base64,
        },
      },
      ...(data.referenceImage
        ? [
            {
              inlineData: {
                mimeType: data.referenceImage.mimeType,
                data: data.referenceImage.base64,
              },
            },
          ]
        : []),
    ]

    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents,
      config: {
        systemInstruction: data.referenceImage
          ? REGENERATE_WITH_REF_PROMPT
          : REGENERATE_PROMPT,
        responseModalities: ['IMAGE'],
        imageConfig: buildImageConfig(data.aspectRatio),
      },
    })

    return { success: true, data: extractImageFromResponse(response) }
  })

const imageWithIdSchema = imageDataSchema.extend({ id: z.string() })

export const generateBatchCompositeImagesFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      backgrounds: z.array(imageWithIdSchema),
      variants: z.array(imageWithIdSchema),
      prompt: z.string().optional(),
      aspectRatio: z.enum(ASPECT_RATIOS).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = await requireGeminiAuth()

    const results = await Promise.all(
      data.backgrounds.flatMap((background) =>
        data.variants.map((variant) =>
          generateCompositeImageWithGemini({
            backgroundImage: {
              base64: background.base64,
              mimeType: background.mimeType,
            },
            productImage: {
              base64: variant.base64,
              mimeType: variant.mimeType,
            },
            prompt: data.prompt,
            aspectRatio: data.aspectRatio,
            apiKey,
          })
            .then((result) => ({
              backgroundId: background.id,
              variantId: variant.id,
              imageBase64: result.imageBase64,
              mimeType: result.mimeType,
              error: undefined as string | undefined,
            }))
            .catch((error) => ({
              backgroundId: background.id,
              variantId: variant.id,
              imageBase64: '',
              mimeType: '',
              error:
                error instanceof Error ? error.message : 'Generation failed',
            })),
        ),
      ),
    )

    return { success: true, data: results }
  })
