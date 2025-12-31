/**
 * Image URL utilities for handling blob URLs and Cloudinary uploads
 */

export const isBlobUrl = (url: string) => {
  return url.startsWith('blob:')
}

export const isCloudinaryUrl = (url: string) => {
  return url.includes('res.cloudinary.com')
}

export const getImagesNeedingUpload = <T extends { url: string }>(
  images: T[],
) => {
  return images.filter((img) => isBlobUrl(img.url))
}

export const getAlreadyUploadedImages = <T extends { url: string }>(
  images: T[],
) => {
  return images.filter((img) => !isBlobUrl(img.url))
}

export const getRemovedImageUrls = (
  original: { url: string }[],
  current: { url: string }[],
) => {
  const currentUrls = new Set(current.map((i) => i.url))
  return original.map((i) => i.url).filter((url) => !currentUrls.has(url))
}
