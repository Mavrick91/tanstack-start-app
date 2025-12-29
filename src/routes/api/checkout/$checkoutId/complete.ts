import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts, orders, orderItems } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'

import type { PaymentProvider } from '../../../../types/checkout'

export const Route = createFileRoute('/api/checkout/$checkoutId/complete')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
          const body = await request.json()
          const { paymentProvider, paymentId } = body as {
            paymentProvider: PaymentProvider
            paymentId: string
          }

          if (!paymentProvider || !paymentId) {
            return simpleErrorResponse(
              'Payment provider and payment ID are required',
            )
          }

          // Get checkout
          const [checkout] = await db
            .select()
            .from(checkouts)
            .where(eq(checkouts.id, checkoutId))
            .limit(1)

          if (!checkout) {
            return simpleErrorResponse('Checkout not found', 404)
          }

          if (checkout.completedAt) {
            return simpleErrorResponse(
              'Checkout has already been completed',
              410,
            )
          }

          // Validate checkout is ready for completion
          if (!checkout.email) {
            return simpleErrorResponse('Customer email is required')
          }

          if (!checkout.shippingAddress) {
            return simpleErrorResponse('Shipping address is required')
          }

          if (!checkout.shippingRateId) {
            return simpleErrorResponse('Shipping method is required')
          }

          // Create order in a transaction
          const order = await db.transaction(async (tx) => {
            // Create order
            const [newOrder] = await tx
              .insert(orders)
              .values({
                customerId: checkout.customerId,
                email: checkout.email!,
                subtotal: checkout.subtotal,
                shippingTotal: checkout.shippingTotal || '0',
                taxTotal: checkout.taxTotal || '0',
                total: checkout.total,
                currency: checkout.currency,
                status: 'pending',
                paymentStatus: 'paid',
                fulfillmentStatus: 'unfulfilled',
                shippingMethod: checkout.shippingMethod,
                shippingAddress: checkout.shippingAddress!,
                billingAddress: checkout.billingAddress,
                paymentProvider,
                paymentId,
                paidAt: new Date(),
              })
              .returning()

            // Create order items from checkout cart items
            const cartItems = checkout.cartItems as Array<{
              productId: string
              variantId?: string
              quantity: number
              title: string
              variantTitle?: string
              sku?: string
              price: number
              imageUrl?: string
            }>

            await tx.insert(orderItems).values(
              cartItems.map((item) => ({
                orderId: newOrder.id,
                productId: item.productId,
                variantId: item.variantId || null,
                title: item.title,
                variantTitle: item.variantTitle || null,
                sku: item.sku || null,
                price: item.price.toFixed(2),
                quantity: item.quantity,
                total: (item.price * item.quantity).toFixed(2),
                imageUrl: item.imageUrl || null,
              })),
            )

            // Mark checkout as completed
            await tx
              .update(checkouts)
              .set({
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(checkouts.id, checkoutId))

            return newOrder
          })

          return successResponse({
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              email: order.email,
              total: parseFloat(order.total),
              currency: order.currency,
              status: order.status,
              paymentStatus: order.paymentStatus,
            },
          })
        } catch (error) {
          return errorResponse('Failed to complete checkout', error)
        }
      },
    },
  },
})
