import { z } from 'zod'

import {
  localizedStringSchema,
  optionalLocalizedStringSchema,
} from './products'

// Collection ID schema
export const collectionIdSchema = z.object({
  id: z.string().uuid('Invalid collection ID'),
})

// Collection input for creation/update
export const collectionInputSchema = z.object({
  name: localizedStringSchema,
  handle: z
    .string()
    .min(1, 'Handle is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Handle must be lowercase alphanumeric with hyphens',
    ),
  description: optionalLocalizedStringSchema,
  sortOrder: z
    .enum(['manual', 'best_selling', 'newest', 'price_asc', 'price_desc'])
    .optional(),
  metaTitle: optionalLocalizedStringSchema,
  metaDescription: optionalLocalizedStringSchema,
})

// Collection state for listing
export const collectionsStateSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'draft']).optional(),
  sortKey: z.enum(['name', 'productCount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Bulk operations
export const bulkCollectionIdsSchema = z.object({
  ids: z.array(z.string().uuid('Invalid collection ID')),
})

export const bulkCollectionStatusSchema = z.object({
  ids: z.array(z.string().uuid('Invalid collection ID')),
  action: z.enum(['publish', 'unpublish']),
})

// Add products to collection
export const addProductsToCollectionSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  productIds: z.array(z.string().uuid('Invalid product ID')),
})

// Remove product from collection
export const removeProductFromCollectionSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  productId: z.string().uuid('Invalid product ID'),
})

// Reorder products in collection
export const reorderCollectionProductsSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  productIds: z.array(z.string().uuid('Invalid product ID')),
})

// Update collection
export const updateCollectionSchema = collectionIdSchema.merge(
  collectionInputSchema.partial(),
)

// Type exports
export type CollectionInput = z.infer<typeof collectionInputSchema>
export type CollectionsState = z.infer<typeof collectionsStateSchema>
