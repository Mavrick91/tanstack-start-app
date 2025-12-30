import { createFileRoute } from '@tanstack/react-router'
import { v2 as cloudinary } from 'cloudinary'

import { db } from '../../db'
import { media } from '../../db/schema'
import {
  errorResponse,
  requireAdmin,
  simpleErrorResponse,
  successResponse,
} from '../../lib/api'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_DIMENSION = 5000
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
]

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireAdmin(request)
        if (!auth.success) return auth.response

        try {
          const formData = await request.formData()
          const file = formData.get('file') as File | null

          if (!file) {
            return simpleErrorResponse('No file provided')
          }

          if (!ALLOWED_TYPES.includes(file.type)) {
            return simpleErrorResponse(
              `Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC.`,
            )
          }

          if (file.size > MAX_FILE_SIZE) {
            return simpleErrorResponse(`File too large. Maximum size is 20MB.`)
          }

          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          const base64 = buffer.toString('base64')
          const dataUri = `data:${file.type};base64,${base64}`

          const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'products',
            resource_type: 'image',
            transformation: [
              {
                width: 2048,
                height: 2048,
                crop: 'limit',
                quality: 'auto:good',
                fetch_format: 'auto',
              },
            ],
            eager: [
              {
                width: 400,
                height: 400,
                crop: 'fill',
                quality: 'auto',
                fetch_format: 'auto',
              },
              {
                width: 800,
                height: 800,
                crop: 'fill',
                quality: 'auto',
                fetch_format: 'auto',
              },
              {
                width: 1200,
                height: 1200,
                crop: 'fill',
                quality: 'auto',
                fetch_format: 'auto',
              },
            ],
            eager_async: true,
          })

          if (result.width > MAX_DIMENSION || result.height > MAX_DIMENSION) {
            console.warn(
              `Image exceeded max dimension: ${result.width}x${result.height}`,
            )
          }

          // Insert into media table
          const [mediaRecord] = await db
            .insert(media)
            .values({
              url: result.secure_url,
              publicId: result.public_id,
              filename: file.name,
              size: file.size,
              mimeType: file.type,
              width: result.width,
              height: result.height,
            })
            .returning()

          return successResponse({
            id: mediaRecord.id,
            url: mediaRecord.url,
            publicId: mediaRecord.publicId,
            filename: mediaRecord.filename,
            width: mediaRecord.width,
            height: mediaRecord.height,
            size: mediaRecord.size,
          })
        } catch (error) {
          return errorResponse('Failed to upload image', error)
        }
      },
    },
  },
})
