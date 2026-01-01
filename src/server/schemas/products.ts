import { z } from 'zod'

// Localized string schema (required en, optional fr/id)
export const localizedStringSchema = z.object({
  en: z.string().min(1, 'English text is required'),
  fr: z.string().optional(),
  id: z.string().optional(),
})

// Optional localized string (can be null/undefined)
export const optionalLocalizedStringSchema = z
  .object({
    en: z.string(),
    fr: z.string().optional(),
    id: z.string().optional(),
  })
  .optional()
  .nullable()

// Product ID schema
export const productIdSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
})

// Product option input
export const productOptionInputSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  values: z.array(z.string().min(1)).min(1, 'At least one value is required'),
})

// Selected option for variants
export const selectedOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
})

// Variant input
export const productVariantInputSchema = z.object({
  title: z.string().optional(),
  selectedOptions: z.array(selectedOptionSchema).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  compareAtPrice: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  weight: z.string().optional(),
  available: z.boolean().optional(),
})

// Product input for creation
export const productInputSchema = z.object({
  name: localizedStringSchema,
  handle: z
    .string()
    .min(1, 'Handle is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Handle must be lowercase alphanumeric with hyphens',
    ),
  description: optionalLocalizedStringSchema,
  vendor: z.string().optional(),
  productType: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: optionalLocalizedStringSchema,
  metaDescription: optionalLocalizedStringSchema,
  images: z
    .array(
      z.object({
        url: z.string().url('Invalid image URL'),
        altText: optionalLocalizedStringSchema,
      }),
    )
    .optional(),
  options: z.array(productOptionInputSchema).optional(),
  variants: z.array(productVariantInputSchema).optional(),
  price: z.string().optional(),
  compareAtPrice: z.string().optional(),
})

// Update product status
export const updateProductStatusSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  status: z.enum(['draft', 'active', 'archived']),
})

// Type exports for use in handlers
export type ProductInput = z.infer<typeof productInputSchema>
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>
export type ProductOptionInput = z.infer<typeof productOptionInputSchema>
