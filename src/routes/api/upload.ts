import { createFileRoute } from '@tanstack/react-router'
import { v2 as cloudinary } from 'cloudinary'

import { validateSession } from '../../lib/auth'

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
        // Auth check
        const auth = await validateSession(request)
        if (!auth.success) {
          return Response.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 },
          )
        }

        try {
          const formData = await request.formData()
          const file = formData.get('file') as File | null

          if (!file) {
            return Response.json(
              { success: false, error: 'No file provided' },
              { status: 400 },
            )
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
            // Shopify-style optimizations
            transformation: [
              {
                width: 2048,
                height: 2048,
                crop: 'limit', // Don't upscale, just limit max dimensions
                quality: 'auto:good',
                fetch_format: 'auto', // Serve WebP/AVIF based on browser
              },
            ],
            // Generate responsive variants eagerly
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

          return Response.json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          })
        } catch (error) {
          console.error('Upload error:', error)
          return Response.json(
            {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to upload image',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
