/**
 * Cloudinary Image URL Helper
 *
 * Generates optimized, responsive image URLs from Cloudinary.
 * Matches Shopify's image optimization standards (WebP/AVIF auto-format).
 */

type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original'

interface CloudinaryUrlOptions {
  width?: number
  height?: number
  crop?: 'fill' | 'fit' | 'limit' | 'thumb' | 'scale'
  quality?:
    | 'auto'
    | 'auto:low'
    | 'auto:eco'
    | 'auto:good'
    | 'auto:best'
    | number
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
}

const SIZE_PRESETS: Record<ImageSize, CloudinaryUrlOptions> = {
  thumbnail: { width: 100, height: 100, crop: 'thumb' },
  small: { width: 400, height: 400, crop: 'fill' },
  medium: { width: 800, height: 800, crop: 'fill' },
  large: { width: 1200, height: 1200, crop: 'fill' },
  original: { width: 2048, height: 2048, crop: 'limit' },
}

/**
 * Extracts the public ID from a Cloudinary URL
 */
export function getPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/v\d+\/(.+)\.\w+$/)
  return match ? match[1] : null
}

/**
 * Generates an optimized Cloudinary URL with transformations
 *
 * @example
 * // Get a medium-sized, auto-optimized image
 * getOptimizedImageUrl('https://res.cloudinary.com/.../image.jpg', 'medium')
 *
 * // Get a custom-sized image
 * getOptimizedImageUrl('https://res.cloudinary.com/.../image.jpg', { width: 600, height: 400 })
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  sizeOrOptions: ImageSize | CloudinaryUrlOptions = 'medium',
): string {
  // Handle local blob URLs (return as-is for preview)
  if (originalUrl.startsWith('blob:')) {
    return originalUrl
  }

  // Handle non-Cloudinary URLs
  if (!originalUrl.includes('res.cloudinary.com')) {
    return originalUrl
  }

  const options =
    typeof sizeOrOptions === 'string'
      ? SIZE_PRESETS[sizeOrOptions]
      : sizeOrOptions

  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options

  // Build transformation string
  const transforms: string[] = []

  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (crop) transforms.push(`c_${crop}`)
  if (quality) transforms.push(`q_${quality}`)
  if (format) transforms.push(`f_${format}`)

  const transformString = transforms.join(',')

  // Insert transformation into URL
  // Cloudinary URL format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/v{version}/{public_id}.{format}
  return originalUrl.replace(
    /\/image\/upload\//,
    `/image/upload/${transformString}/`,
  )
}

/**
 * Generates a srcSet for responsive images
 *
 * @example
 * // In a React component
 * <img
 *   src={getOptimizedImageUrl(url, 'medium')}
 *   srcSet={getResponsiveSrcSet(url)}
 *   sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
 * />
 */
export function getResponsiveSrcSet(originalUrl: string): string {
  if (
    originalUrl.startsWith('blob:') ||
    !originalUrl.includes('res.cloudinary.com')
  ) {
    return ''
  }

  const widths = [400, 800, 1200, 1600, 2048]

  return widths
    .map((w) => {
      const url = getOptimizedImageUrl(originalUrl, {
        width: w,
        crop: 'limit',
        quality: 'auto',
        format: 'auto',
      })
      return `${url} ${w}w`
    })
    .join(', ')
}

/**
 * Generates blur placeholder data URL for progressive loading
 */
export function getBlurPlaceholder(originalUrl: string): string {
  if (
    originalUrl.startsWith('blob:') ||
    !originalUrl.includes('res.cloudinary.com')
  ) {
    return ''
  }

  return getOptimizedImageUrl(originalUrl, {
    width: 10,
    height: 10,
    crop: 'fill',
    quality: 10,
    format: 'webp',
  })
}

/**
 * Deletes images from Cloudinary by their URLs
 * Skips non-Cloudinary URLs silently
 */
export async function deleteImagesFromCloudinary(
  urls: string[],
): Promise<void> {
  const cloudinaryUrls = urls.filter((url) =>
    url.includes('res.cloudinary.com'),
  )

  if (cloudinaryUrls.length === 0) return

  const { v2: cloudinary } = await import('cloudinary')

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  await Promise.all(
    cloudinaryUrls.map(async (url) => {
      const publicId = getPublicIdFromUrl(url)
      if (publicId) {
        await cloudinary.uploader.destroy(publicId)
      }
    }),
  )
}
