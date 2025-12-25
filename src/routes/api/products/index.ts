import { createFileRoute } from '@tanstack/react-router'
import { desc, eq } from 'drizzle-orm'

import { db } from '../../../db'
import { products, productVariants } from '../../../db/schema'
import { validateSession } from '../../../lib/auth'

type LocalizedString = { en: string; fr?: string; id?: string }

export const Route = createFileRoute('/api/products/')({
  server: {
    handlers: {
      // GET /api/products - List all products (requires auth)
      GET: async ({ request }) => {
        try {
          // Validate session
          const auth = await validateSession(request)
          if (!auth.success) {
            return Response.json(
              { success: false, error: auth.error },
              { status: auth.status },
            )
          }

          const allProducts = await db
            .select({
              id: products.id,
              handle: products.handle,
              name: products.name,
              status: products.status,
              vendor: products.vendor,
              productType: products.productType,
              publishedAt: products.publishedAt,
              createdAt: products.createdAt,
            })
            .from(products)
            .orderBy(desc(products.createdAt))

          // Get variant counts and price ranges
          const productsWithMeta = await Promise.all(
            allProducts.map(async (product) => {
              const variants = await db
                .select({
                  price: productVariants.price,
                  inventoryQuantity: productVariants.inventoryQuantity,
                })
                .from(productVariants)
                .where(eq(productVariants.productId, product.id))

              // Safely parse prices with NaN filtering
              const prices = variants
                .map((v) => Number(v.price))
                .filter((p) => !isNaN(p))

              const totalInventory = variants.reduce(
                (sum, v) => sum + v.inventoryQuantity,
                0,
              )

              return {
                ...product,
                variantCount: variants.length,
                minPrice: prices.length > 0 ? Math.min(...prices) : null,
                maxPrice: prices.length > 0 ? Math.max(...prices) : null,
                totalInventory,
              }
            }),
          )

          return Response.json({
            success: true,
            products: productsWithMeta,
          })
        } catch (error) {
          console.error('Error fetching products:', error)
          return Response.json(
            { success: false, error: 'Failed to fetch products' },
            { status: 500 },
          )
        }
      },

      // POST /api/products - Create product (requires auth)
      POST: async ({ request }) => {
        try {
          // Validate session
          const auth = await validateSession(request)
          if (!auth.success) {
            return Response.json(
              { success: false, error: auth.error },
              { status: auth.status },
            )
          }

          const body = await request.json()
          const { name, handle, description, vendor, productType, status } =
            body

          // Validate name is an object with 'en' property
          if (
            !name ||
            typeof name !== 'object' ||
            !('en' in name) ||
            typeof (name as LocalizedString).en !== 'string' ||
            !(name as LocalizedString).en.trim()
          ) {
            return Response.json(
              {
                success: false,
                error: 'Name must be an object with a non-empty "en" property',
              },
              { status: 400 },
            )
          }

          if (!handle || typeof handle !== 'string' || !handle.trim()) {
            return Response.json(
              { success: false, error: 'Handle is required' },
              { status: 400 },
            )
          }

          const [product] = await db
            .insert(products)
            .values({
              name,
              handle: handle.trim(),
              description,
              vendor,
              productType,
              status: status || 'draft',
            })
            .returning()

          return Response.json({ success: true, product }, { status: 201 })
        } catch (error) {
          console.error('Error creating product:', error)
          return Response.json(
            { success: false, error: 'Failed to create product' },
            { status: 500 },
          )
        }
      },
    },
  },
})
