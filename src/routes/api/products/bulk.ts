import { createFileRoute } from '@tanstack/react-router'
import { inArray } from 'drizzle-orm'

import { db } from '../../../db'
import { productImages, products } from '../../../db/schema'
import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'
import { deleteImagesFromCloudinary } from '../../../lib/cloudinary'

export const Route = createFileRoute('/api/products/bulk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const body = await request.json()
          const { action, ids } = body as {
            action: 'delete' | 'archive' | 'activate'
            ids: string[]
          }

          if (!action || !['delete', 'archive', 'activate'].includes(action)) {
            return simpleErrorResponse(
              'Invalid action. Must be delete, archive, or activate.',
            )
          }

          if (!Array.isArray(ids) || ids.length === 0) {
            return simpleErrorResponse(
              'ids must be a non-empty array of product IDs.',
            )
          }

          // Limit batch size to prevent abuse
          if (ids.length > 100) {
            return simpleErrorResponse('Maximum 100 items per batch operation.')
          }

          if (action === 'delete') {
            // Get all image URLs before deletion
            const images = await db
              .select({ url: productImages.url })
              .from(productImages)
              .where(inArray(productImages.productId, ids))

            // Delete from Cloudinary
            if (images.length > 0) {
              await deleteImagesFromCloudinary(images.map((img) => img.url))
            }

            // Delete products (cascade deletes images)
            await db.delete(products).where(inArray(products.id, ids))

            return successResponse({ deleted: ids.length })
          }

          // Archive or Activate
          const newStatus = action === 'archive' ? 'archived' : 'active'
          await db
            .update(products)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(inArray(products.id, ids))

          return successResponse({ updated: ids.length, status: newStatus })
        } catch (error) {
          return errorResponse('Bulk operation failed', error)
        }
      },
    },
  },
})
