import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import {
  productImages,
  productOptions,
  productOptionValues,
  products,
  productVariants,
  variantOptionValues,
} from '../../../db/schema'
import { validateSession } from '../../../lib/auth'

export const Route = createFileRoute('/api/products/$productId')({
  server: {
    handlers: {
      // GET /api/products/:productId - Get single product with all relations (requires auth)
      GET: async ({ params, request }) => {
        try {
          // Validate session
          const auth = await validateSession(request)
          if (!auth.success) {
            return Response.json(
              { success: false, error: auth.error },
              { status: auth.status },
            )
          }

          const { productId } = params

          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, productId))

          if (!product) {
            return Response.json(
              { success: false, error: 'Product not found' },
              { status: 404 },
            )
          }

          // Get options with values
          const options = await db
            .select()
            .from(productOptions)
            .where(eq(productOptions.productId, productId))
            .orderBy(productOptions.position)

          const optionsWithValues = await Promise.all(
            options.map(async (option) => {
              const values = await db
                .select()
                .from(productOptionValues)
                .where(eq(productOptionValues.optionId, option.id))
                .orderBy(productOptionValues.position)

              return { ...option, values }
            }),
          )

          // Get variants with their option values
          const variants = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.productId, productId))
            .orderBy(productVariants.position)

          const variantsWithOptions = await Promise.all(
            variants.map(async (variant) => {
              const optionValueIds = await db
                .select({ optionValueId: variantOptionValues.optionValueId })
                .from(variantOptionValues)
                .where(eq(variantOptionValues.variantId, variant.id))

              return {
                ...variant,
                optionValueIds: optionValueIds.map((v) => v.optionValueId),
              }
            }),
          )

          // Get images
          const images = await db
            .select()
            .from(productImages)
            .where(eq(productImages.productId, productId))
            .orderBy(productImages.position)

          return Response.json({
            success: true,
            product: {
              ...product,
              options: optionsWithValues,
              variants: variantsWithOptions,
              images,
            },
          })
        } catch (error) {
          console.error('Error fetching product:', error)
          return Response.json(
            { success: false, error: 'Failed to fetch product' },
            { status: 500 },
          )
        }
      },

      // PUT /api/products/:productId - Update product (requires auth)
      PUT: async ({ params, request }) => {
        try {
          // Validate session
          const auth = await validateSession(request)
          if (!auth.success) {
            return Response.json(
              { success: false, error: auth.error },
              { status: auth.status },
            )
          }

          const { productId } = params
          const body = await request.json()

          const [updated] = await db
            .update(products)
            .set({
              ...body,
              updatedAt: new Date(),
            })
            .where(eq(products.id, productId))
            .returning()

          if (!updated) {
            return Response.json(
              { success: false, error: 'Product not found' },
              { status: 404 },
            )
          }

          return Response.json({ success: true, product: updated })
        } catch (error) {
          console.error('Error updating product:', error)
          return Response.json(
            { success: false, error: 'Failed to update product' },
            { status: 500 },
          )
        }
      },

      // DELETE /api/products/:productId - Delete product (requires auth)
      DELETE: async ({ params, request }) => {
        try {
          // Validate session
          const auth = await validateSession(request)
          if (!auth.success) {
            return Response.json(
              { success: false, error: auth.error },
              { status: auth.status },
            )
          }

          const { productId } = params

          const [deleted] = await db
            .delete(products)
            .where(eq(products.id, productId))
            .returning()

          if (!deleted) {
            return Response.json(
              { success: false, error: 'Product not found' },
              { status: 404 },
            )
          }

          return Response.json({ success: true })
        } catch (error) {
          console.error('Error deleting product:', error)
          return Response.json(
            { success: false, error: 'Failed to delete product' },
            { status: 500 },
          )
        }
      },
    },
  },
})
