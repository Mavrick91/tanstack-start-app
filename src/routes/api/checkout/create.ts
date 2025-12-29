import { createFileRoute } from '@tanstack/react-router'
import { asc, inArray } from 'drizzle-orm'

import { db } from '../../../db'
import {
  checkouts,
  products,
  productVariants,
  productImages,
} from '../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'
import {
  SHIPPING_RATES,
  FREE_SHIPPING_THRESHOLD,
} from '../../../types/checkout'

type LocalizedString = { en: string; fr?: string; id?: string }

type CartItem = {
  productId: string
  variantId?: string
  quantity: number
}

export const Route = createFileRoute('/api/checkout/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { items, currency = 'USD' } = body as {
            items: CartItem[]
            currency?: string
          }

          if (!items || !Array.isArray(items) || items.length === 0) {
            return simpleErrorResponse('Cart items are required')
          }

          // Get all product and variant data
          const productIds = [...new Set(items.map((item) => item.productId))]
          const variantIds = items
            .filter((item) => item.variantId)
            .map((item) => item.variantId!)

          const productsData = await db
            .select()
            .from(products)
            .where(inArray(products.id, productIds))

          const variantsData =
            variantIds.length > 0
              ? await db
                  .select()
                  .from(productVariants)
                  .where(inArray(productVariants.id, variantIds))
              : await db
                  .select()
                  .from(productVariants)
                  .where(inArray(productVariants.productId, productIds))
                  .orderBy(asc(productVariants.position))

          // Get first image for each product
          const imagesData = await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(asc(productImages.position))

          const productMap = new Map(productsData.map((p) => [p.id, p]))
          const variantMap = new Map(variantsData.map((v) => [v.id, v]))
          const imageMap = new Map<string, string>()
          for (const img of imagesData) {
            if (!imageMap.has(img.productId)) {
              imageMap.set(img.productId, img.url)
            }
          }

          // Build cart items with full details
          const cartItems = items.map((item) => {
            const product = productMap.get(item.productId)
            if (!product) {
              throw new Error(`Product not found: ${item.productId}`)
            }

            let variant = item.variantId ? variantMap.get(item.variantId) : null

            // If no specific variant, get first variant for this product
            if (!variant) {
              variant = variantsData.find((v) => v.productId === item.productId)
            }

            if (!variant) {
              throw new Error(
                `Variant not found for product: ${item.productId}`,
              )
            }

            const productName = (product.name as LocalizedString).en

            return {
              productId: item.productId,
              variantId: variant.id,
              quantity: item.quantity,
              title: productName,
              variantTitle:
                variant.title !== 'Default Title' ? variant.title : undefined,
              sku: variant.sku || undefined,
              price: parseFloat(variant.price),
              imageUrl: imageMap.get(item.productId),
            }
          })

          // Calculate totals
          const subtotal = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          )

          // Default shipping (standard rate or free if over threshold)
          const defaultShippingRate =
            subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATES[0].price
          const shippingTotal = defaultShippingRate
          const taxTotal = 0 // No tax calculation per PRD
          const total = subtotal + shippingTotal + taxTotal

          // Create checkout session (expires in 24 hours)
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

          const [checkout] = await db
            .insert(checkouts)
            .values({
              cartItems,
              subtotal: subtotal.toFixed(2),
              shippingTotal: shippingTotal.toFixed(2),
              taxTotal: taxTotal.toFixed(2),
              total: total.toFixed(2),
              currency,
              expiresAt,
            })
            .returning()

          return successResponse({
            checkout: {
              id: checkout.id,
              cartItems: checkout.cartItems,
              subtotal: parseFloat(checkout.subtotal),
              shippingTotal: parseFloat(checkout.shippingTotal || '0'),
              taxTotal: parseFloat(checkout.taxTotal || '0'),
              total: parseFloat(checkout.total),
              currency: checkout.currency,
              expiresAt: checkout.expiresAt,
            },
          })
        } catch (error) {
          console.error('Checkout creation error:', error)
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          return errorResponse(`Failed to create checkout: ${message}`, error)
        }
      },
    },
  },
})
