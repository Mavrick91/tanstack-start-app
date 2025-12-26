import { createFileRoute } from '@tanstack/react-router'
import { v2 as cloudinary } from 'cloudinary'

import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../lib/api'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireAuth(request)
        if (!auth.success) return auth.response

        try {
          const formData = await request.formData()
          const file = formData.get('file') as File | null

          if (!file) {
            return simpleErrorResponse('No file provided')
          }

          // Convert file to base64 data URI
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          const base64 = buffer.toString('base64')
          const dataUri = `data:${file.type};base64,${base64}`

          // Upload to Cloudinary with optimizations
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

          return successResponse({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          })
        } catch (error) {
          return errorResponse('Failed to upload image', error)
        }
      },
    },
  },
})
