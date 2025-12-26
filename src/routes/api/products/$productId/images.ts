import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { productImages } from '../../../../db/schema'
import {
  errorResponse,
  requireAuth,
  successResponse,
} from '../../../../lib/api'
import { deleteImagesFromCloudinary } from '../../../../lib/cloudinary'

type LocalizedString = { en: string; fr?: string; id?: string }

export const Route = createFileRoute('/api/products/$productId/images')({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const { productId } = params
          const body = await request.json()
          const { images } = body as {
            images: {
              url: string
              altText: LocalizedString
              position: number
            }[]
          }

          const existingImages = await db
            .select({ url: productImages.url })
            .from(productImages)
            .where(eq(productImages.productId, productId))

          const existingUrls = new Set(existingImages.map((i) => i.url))
          const newUrls = new Set(images.map((i) => i.url))

          const removedUrls = [...existingUrls].filter(
            (url) => !newUrls.has(url),
          )
          if (removedUrls.length > 0) {
            await deleteImagesFromCloudinary(removedUrls)
          }

          await db
            .delete(productImages)
            .where(eq(productImages.productId, productId))

          if (images.length > 0) {
            await db.insert(productImages).values(
              images.map((img) => ({
                productId,
                url: img.url,
                altText: img.altText,
                position: img.position,
              })),
            )
          }

          return successResponse({})
        } catch (error) {
          return errorResponse('Failed to update images', error)
        }
      },
    },
  },
})
