export type ProductStatus = 'draft' | 'active' | 'archived'

export type Product = {
  id: string
  handle: string
  name: { en: string; fr?: string; id?: string }
  status: ProductStatus
  vendor: string | null
  productType: string | null
  price: string | null
  compareAtPrice: string | null
  sku: string | null
  createdAt: string
  firstImageUrl: string | null
}
