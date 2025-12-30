import { createFileRoute } from '@tanstack/react-router'
import { v2 as cloudinary } from 'cloudinary'
import { desc, inArray } from 'drizzle-orm'

import { db } from '../../../db'
import { media } from '../../../db/schema'
import {
  errorResponse,
  requireAdmin,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const Route = createFileRoute('/api/media/')({
  server: {
    handlers: {
      // GET: List all media items
      GET: async ({ request }) => {
        const auth = await requireAdmin(request)
        if (!auth.success) return auth.response

        try {
          const items = await db
            .select()
            .from(media)
            .orderBy(desc(media.createdAt))

          return successResponse({ items })
        } catch (error) {
          return errorResponse('Failed to fetch media', error)
        }
      },

      // DELETE: Delete media items by ID
      DELETE: async ({ request }) => {
        const auth = await requireAdmin(request)
        if (!auth.success) return auth.response

        try {
          const body = await request.json()
          const ids: string[] = body.ids

          if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return simpleErrorResponse('No media IDs provided')
          }

          // Get media items to delete (for Cloudinary cleanup)
          const itemsToDelete = await db
            .select()
            .from(media)
            .where(inArray(media.id, ids))

          // Delete from Cloudinary
          for (const item of itemsToDelete) {
            if (item.publicId) {
              try {
                await cloudinary.uploader.destroy(item.publicId)
              } catch (e) {
                console.warn(
                  `Failed to delete from Cloudinary: ${item.publicId}`,
                  e,
                )
              }
            }
          }

          // Delete from database
          await db.delete(media).where(inArray(media.id, ids))

          return successResponse({ deleted: ids.length })
        } catch (error) {
          return errorResponse('Failed to delete media', error)
        }
      },
    },
  },
})
