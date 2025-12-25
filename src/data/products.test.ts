import { describe, expect, it } from 'vitest'
import {
  getFeaturedProducts,
  getProductBySlug,
  getProducts,
} from '../data/products'

describe('Product Service', () => {
  it('should fetch all products', async () => {
    const products = await getProducts()
    expect(products.length).toBeGreaterThan(0)
    expect(products[0]).toHaveProperty('name')
  })

  it('should fetch a product by slug', async () => {
    const products = await getProducts()
    const product = await getProductBySlug(products[0].slug)
    expect(product.id).toBe(products[0].id)
  })

  it('should throw error for non-existent slug', async () => {
    await expect(getProductBySlug('non-existent')).rejects.toThrow(
      'Product not found',
    )
  })

  it('should fetch featured products', async () => {
    const featured = await getFeaturedProducts()
    expect(featured.every((p) => p.isFeatured)).toBe(true)
  })
})
