type LocalizedString = { en: string; fr?: string; id?: string }
type ProductStatus = 'draft' | 'active' | 'archived'
type SelectedOption = { name: string; value: string }

/**
 * Product as stored in database.
 */
export type Product = {
  id: string
  handle: string
  status: ProductStatus
  name: LocalizedString
  description?: LocalizedString
  metaTitle?: LocalizedString
  metaDescription?: LocalizedString
  vendor?: string
  productType?: string
  tags?: string[]
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Product variant.
 */
export type ProductVariant = {
  id: string
  productId: string
  title: string
  selectedOptions: SelectedOption[]
  price: string
  compareAtPrice?: string
  sku?: string
  barcode?: string
  weight?: string
  available: number
  position: number
}

/**
 * Product option (e.g., Size, Color).
 */
export type ProductOption = {
  id: string
  productId: string
  name: string
  values: string[]
  position: number
}

/**
 * Product image.
 */
export type ProductImage = {
  id: string
  productId: string
  url: string
  altText?: LocalizedString
  position: number
}

/**
 * Product with relations (for API responses).
 */
export type ProductWithRelations = Product & {
  variants: ProductVariant[]
  options: ProductOption[]
  images: ProductImage[]
  price?: string
  image?: string
}

/**
 * Creates a valid Product with sensible defaults.
 */
export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-123',
    handle: 'test-product',
    status: 'active',
    name: { en: 'Test Product' },
    description: { en: 'A test product description' },
    tags: ['test'],
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

/**
 * Creates a valid ProductVariant with sensible defaults.
 */
export function createProductVariant(
  overrides: Partial<ProductVariant> = {},
): ProductVariant {
  return {
    id: 'var-123',
    productId: 'prod-123',
    title: 'Default Title',
    selectedOptions: [],
    price: '29.99',
    available: 1,
    position: 0,
    ...overrides,
  }
}

/**
 * Creates a valid ProductOption with sensible defaults.
 */
export function createProductOption(
  overrides: Partial<ProductOption> = {},
): ProductOption {
  return {
    id: 'opt-123',
    productId: 'prod-123',
    name: 'Size',
    values: ['Small', 'Medium', 'Large'],
    position: 0,
    ...overrides,
  }
}

/**
 * Creates a valid ProductImage with sensible defaults.
 */
export function createProductImage(
  overrides: Partial<ProductImage> = {},
): ProductImage {
  return {
    id: 'img-123',
    productId: 'prod-123',
    url: 'https://example.com/image.jpg',
    altText: { en: 'Product image' },
    position: 0,
    ...overrides,
  }
}

/**
 * Creates a Product with all relations populated.
 */
export function createProductWithRelations(
  overrides: Partial<ProductWithRelations> = {},
): ProductWithRelations {
  const product = createProduct(overrides)
  const variants = overrides.variants ?? [createProductVariant()]
  const options = overrides.options ?? []
  const images = overrides.images ?? [createProductImage()]

  return {
    ...product,
    variants,
    options,
    images,
    price: variants[0]?.price ?? '29.99',
    image: images[0]?.url,
    ...overrides,
  }
}

/**
 * Pre-configured product variants for common test scenarios.
 */
export const productVariants = {
  /** Active product with default variant (default) */
  active: () => createProductWithRelations(),

  /** Draft product */
  draft: () =>
    createProductWithRelations({
      status: 'draft',
      publishedAt: undefined,
    }),

  /** Archived product */
  archived: () =>
    createProductWithRelations({
      status: 'archived',
    }),

  /** Product with size options */
  withSizeOptions: () =>
    createProductWithRelations({
      options: [
        createProductOption({
          name: 'Size',
          values: ['S', 'M', 'L', 'XL'],
        }),
      ],
      variants: [
        createProductVariant({
          id: 'var-s',
          title: 'S',
          selectedOptions: [{ name: 'Size', value: 'S' }],
          position: 0,
        }),
        createProductVariant({
          id: 'var-m',
          title: 'M',
          selectedOptions: [{ name: 'Size', value: 'M' }],
          position: 1,
        }),
        createProductVariant({
          id: 'var-l',
          title: 'L',
          selectedOptions: [{ name: 'Size', value: 'L' }],
          position: 2,
        }),
        createProductVariant({
          id: 'var-xl',
          title: 'XL',
          selectedOptions: [{ name: 'Size', value: 'XL' }],
          position: 3,
        }),
      ],
    }),

  /** Product with multiple options (size + color) */
  withMultipleOptions: () =>
    createProductWithRelations({
      options: [
        createProductOption({
          id: 'opt-1',
          name: 'Size',
          values: ['S', 'M', 'L'],
          position: 0,
        }),
        createProductOption({
          id: 'opt-2',
          name: 'Color',
          values: ['Red', 'Blue'],
          position: 1,
        }),
      ],
      variants: [
        createProductVariant({
          id: 'var-1',
          title: 'S / Red',
          selectedOptions: [
            { name: 'Size', value: 'S' },
            { name: 'Color', value: 'Red' },
          ],
          position: 0,
        }),
        createProductVariant({
          id: 'var-2',
          title: 'S / Blue',
          selectedOptions: [
            { name: 'Size', value: 'S' },
            { name: 'Color', value: 'Blue' },
          ],
          position: 1,
        }),
        createProductVariant({
          id: 'var-3',
          title: 'M / Red',
          selectedOptions: [
            { name: 'Size', value: 'M' },
            { name: 'Color', value: 'Red' },
          ],
          position: 2,
        }),
        createProductVariant({
          id: 'var-4',
          title: 'M / Blue',
          selectedOptions: [
            { name: 'Size', value: 'M' },
            { name: 'Color', value: 'Blue' },
          ],
          position: 3,
        }),
      ],
    }),

  /** Product with compare at price (on sale) */
  onSale: () =>
    createProductWithRelations({
      variants: [
        createProductVariant({
          price: '19.99',
          compareAtPrice: '29.99',
        }),
      ],
    }),

  /** Out of stock product */
  outOfStock: () =>
    createProductWithRelations({
      variants: [
        createProductVariant({
          available: 0,
        }),
      ],
    }),

  /** Product with multiple images */
  multipleImages: () =>
    createProductWithRelations({
      images: [
        createProductImage({ id: 'img-1', position: 0 }),
        createProductImage({
          id: 'img-2',
          url: 'https://example.com/image2.jpg',
          position: 1,
        }),
        createProductImage({
          id: 'img-3',
          url: 'https://example.com/image3.jpg',
          position: 2,
        }),
      ],
    }),

  /** Product with translations */
  translated: () =>
    createProductWithRelations({
      name: { en: 'Test Product', fr: 'Produit de Test', id: 'Produk Uji' },
      description: {
        en: 'English description',
        fr: 'Description en francais',
        id: 'Deskripsi dalam bahasa Indonesia',
      },
    }),

  /** Product with vendor and type */
  withMetadata: () =>
    createProductWithRelations({
      vendor: 'Test Vendor',
      productType: 'Accessories',
      tags: ['new', 'featured', 'sale'],
    }),
}

/**
 * Creates multiple products for testing lists/pagination.
 */
export function createProductList(count: number): ProductWithRelations[] {
  return Array.from({ length: count }, (_, i) =>
    createProductWithRelations({
      id: `prod-${i + 1}`,
      handle: `product-${i + 1}`,
      name: { en: `Product ${i + 1}` },
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    }),
  )
}
