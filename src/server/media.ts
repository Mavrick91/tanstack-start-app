/**
 * Media Server Functions
 *
 * Uses standardized patterns:
 * - Middleware for authentication (adminMiddleware)
 * - Top-level imports for database
 * - Standard Error throwing for React Query error handling
 */

import { createServerFn } from '@tanstack/react-start'
import { v2 as cloudinary } from 'cloudinary'
import { desc, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { adminMiddleware } from './middleware'
import { media } from '../db/schema'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ============================================
// SCHEMAS
// ============================================

const deleteMediaSchema = z.object({
  ids: z.array(z.string().uuid()),
})

// ============================================
// SERVER FUNCTIONS
// ============================================

/**
 * Get all media items (admin only)
 */
export const getMediaFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async () => {
    const allMedia = await db
      .select()
      .from(media)
      .orderBy(desc(media.createdAt))

    return allMedia
  })

/**
 * Delete media items by IDs (admin only)
 */
export const deleteMediaFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => deleteMediaSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.ids.length === 0) {
      throw new Error('No media IDs provided')
    }

    // Get media items to delete (for Cloudinary cleanup)
    const itemsToDelete = await db
      .select()
      .from(media)
      .where(inArray(media.id, data.ids))

    // Delete from Cloudinary
    for (const item of itemsToDelete) {
      if (item.publicId) {
        try {
          await cloudinary.uploader.destroy(item.publicId)
        } catch (e) {
          console.warn(`Failed to delete from Cloudinary: ${item.publicId}`, e)
        }
      }
    }

    // Delete from database
    await db.delete(media).where(inArray(media.id, data.ids))

    return { deleted: data.ids.length }
  })
