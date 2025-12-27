export type ProductOption = {
  name: string
  values: Array<string>
}

export type SelectedOption = {
  name: string
  value: string
}

export type ProductVariant = {
  id: string
  title: string
  price: number
  sku?: string
  available: boolean
  selectedOptions: Array<SelectedOption>
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  images: Array<string>
  category: string
  options?: Array<ProductOption>
  variants?: Array<ProductVariant>
  features?: Array<string>
  isFeatured?: boolean
}

export type CartItem = {
  productId: string
  variantId?: string
  quantity: number
  product: Product
}
