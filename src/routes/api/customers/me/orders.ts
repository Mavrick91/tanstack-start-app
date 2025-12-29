import { createFileRoute } from '@tanstack/react-router'
import { eq, desc, count } from 'drizzle-orm'

import { db } from '../../../../db'
import { customers, orders } from '../../../../db/schema'
import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import {
  getOrderItemsByOrderIds,
  parseDecimal,
} from '../../../../server/orders'

export const Route = createFileRoute('/api/customers/me/orders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const url = new URL(request.url)
          const page = Math.max(
            1,
            parseInt(url.searchParams.get('page') || '1', 10),
          )
          const limit = Math.min(
            50,
            Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)),
          )

          // Get customer profile
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, auth.user.id))
            .limit(1)

          if (!customer) {
            return simpleErrorResponse('Customer profile not found', 404)
          }

          // Get total count
          const [{ total }] = await db
            .select({ total: count() })
            .from(orders)
            .where(eq(orders.customerId, customer.id))

          // Get orders with pagination
          const offset = (page - 1) * limit
          const customerOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.customerId, customer.id))
            .orderBy(desc(orders.createdAt))
            .limit(limit)
            .offset(offset)

          // Get order items for all orders in a single query (fixes N+1)
          const orderIds = customerOrders.map((o) => o.id)
          const itemsByOrderId = await getOrderItemsByOrderIds(orderIds)

          const ordersWithItems = customerOrders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            email: order.email,
            subtotal: parseDecimal(order.subtotal),
            shippingTotal: parseDecimal(order.shippingTotal),
            taxTotal: parseDecimal(order.taxTotal),
            total: parseDecimal(order.total),
            currency: order.currency,
            status: order.status,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            shippingMethod: order.shippingMethod,
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            items: (itemsByOrderId.get(order.id) || []).map((item) => ({
              id: item.id,
              title: item.title,
              variantTitle: item.variantTitle,
              quantity: item.quantity,
              price: parseDecimal(item.price),
              total: parseDecimal(item.total),
              imageUrl: item.imageUrl,
            })),
          }))

          return successResponse({
            orders: ordersWithItems,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          })
        } catch (error) {
          return errorResponse('Failed to fetch orders', error)
        }
      },
    },
  },
})
