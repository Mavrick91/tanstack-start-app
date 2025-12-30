import { createServerFn } from '@tanstack/react-start'
import { v2 as cloudinary } from 'cloudinary'
import { desc, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { getMeFn } from './auth'
import { media } from '../db/schema'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Helper to require admin access
async function requireAdmin() {
  const user = await getMeFn()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return user
}

// Get all media items
export const getMediaFn = createServerFn().handler(async () => {
  await requireAdmin()

  const allMedia = await db.select().from(media).orderBy(desc(media.createdAt))

  return allMedia
})

// Delete media items by IDs
const deleteMediaSchema = z.object({
  ids: z.array(z.string().uuid()),
})

export const deleteMediaFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => deleteMediaSchema.parse(data))
  .handler(async ({ data }) => {
    await requireAdmin()

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
