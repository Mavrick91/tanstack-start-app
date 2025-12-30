import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts, orders, orderItems } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import { validateCheckoutAccess } from '../../../../lib/checkout-auth'
import { sendOrderConfirmationEmail } from '../../../../lib/email'

import type { PaymentProvider } from '../../../../types/checkout'

export const Route = createFileRoute('/api/checkout/$checkoutId/complete')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
          const body = await request.clone().json()
          const { paymentProvider, paymentId } = body as {
            paymentProvider: PaymentProvider
            paymentId: string
          }

          if (!paymentProvider || !paymentId) {
            return simpleErrorResponse(
              'Payment provider and payment ID are required',
            )
          }

          const access = await validateCheckoutAccess(checkoutId, request)
          if (!access.valid && access.error !== 'Checkout already completed') {
            const status =
              access.error === 'Checkout not found'
                ? 404
                : access.error === 'Unauthorized'
                  ? 403
                  : 410
            return new Response(JSON.stringify({ error: access.error }), {
              status,
              headers: { 'Content-Type': 'application/json' },
            })
          }

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

          if (!checkout.email) {
            return simpleErrorResponse('Customer email is required')
          }

          if (!checkout.shippingAddress) {
            return simpleErrorResponse('Shipping address is required')
          }

          if (!checkout.shippingRateId) {
            return simpleErrorResponse('Shipping method is required')
          }

          let order
          try {
            order = await db.transaction(async (tx) => {
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

              await tx
                .update(checkouts)
                .set({
                  completedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(checkouts.id, checkoutId))

              return newOrder
            })
          } catch (txError) {
            const error = txError as { code?: string }
            if (error.code === '23505') {
              const [existingOrder] = await db
                .select()
                .from(orders)
                .where(eq(orders.paymentId, paymentId))
                .limit(1)

              if (existingOrder) {
                return successResponse({
                  order: {
                    id: existingOrder.id,
                    orderNumber: existingOrder.orderNumber,
                    email: existingOrder.email,
                    total: parseFloat(existingOrder.total),
                    currency: existingOrder.currency,
                    status: existingOrder.status,
                    paymentStatus: existingOrder.paymentStatus,
                  },
                  idempotent: true,
                })
              }
            }
            throw txError
          }

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

          sendOrderConfirmationEmail({
            id: order.id,
            orderNumber: order.orderNumber,
            email: order.email,
            total: parseFloat(order.total),
            currency: order.currency,
            items: cartItems.map((item) => ({
              title: item.title,
              variantTitle: item.variantTitle,
              quantity: item.quantity,
              price: item.price,
            })),
            shippingAddress: checkout.shippingAddress!,
          }).catch((err) =>
            console.error('Failed to send order confirmation email:', err),
          )

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
