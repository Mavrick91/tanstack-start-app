export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  images: Array<string>
  category: string
  variants?: Array<ProductVariant>
  features?: Array<string>
  isFeatured?: boolean
}

export type ProductVariant = {
  id: string
  name: string
  sku: string
  price?: number // Optional if different from base product
  stock: number
}

export type CartItem = {
  productId: string
  variantId?: string
  quantity: number
  product: Product
}
