/**
 * Image URL utilities for handling blob URLs and Cloudinary uploads
 */

export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:')
}

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com')
}

export function getImagesNeedingUpload<T extends { url: string }>(
  images: T[],
): T[] {
  return images.filter((img) => isBlobUrl(img.url))
}

export function getAlreadyUploadedImages<T extends { url: string }>(
  images: T[],
): T[] {
  return images.filter((img) => !isBlobUrl(img.url))
}

export function getRemovedImageUrls(
  original: { url: string }[],
  current: { url: string }[],
): string[] {
  const currentUrls = new Set(current.map((i) => i.url))
  return original.map((i) => i.url).filter((url) => !currentUrls.has(url))
}
