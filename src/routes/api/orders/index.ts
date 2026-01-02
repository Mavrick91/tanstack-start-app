import { createFileRoute } from '@tanstack/react-router'
import { and, count, desc, eq, ilike, SQL, asc } from 'drizzle-orm'

import { db } from '../../../db'
import { orders } from '../../../db/schema'
import { errorResponse, requireAdmin, successResponse } from '../../../lib/api'
import { getOrderItemCounts, parseDecimal } from '../../../server/orders'

export const Route = createFileRoute('/api/orders/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await requireAdmin(request)
          if (!auth.success) return auth.response

          const url = new URL(request.url)
          const page = Math.max(
            1,
            parseInt(url.searchParams.get('page') || '1', 10),
          )
          const limit = Math.min(
            100,
            Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)),
          )
          const search = url.searchParams.get('q') || ''
          const status = url.searchParams.get('status')
          const paymentStatus = url.searchParams.get('paymentStatus')
          const fulfillmentStatus = url.searchParams.get('fulfillmentStatus')
          const sortKey = url.searchParams.get('sort') || 'createdAt'
          const sortOrder =
            url.searchParams.get('order') === 'asc' ? 'asc' : 'desc'

          const conditions: SQL[] = []

          if (status && status !== 'all') {
            conditions.push(
              eq(
                orders.status,
                status as (typeof orders.status.enumValues)[number],
              ),
            )
          }

          if (paymentStatus && paymentStatus !== 'all') {
            conditions.push(
              eq(
                orders.paymentStatus,
                paymentStatus as (typeof orders.paymentStatus.enumValues)[number],
              ),
            )
          }

          if (fulfillmentStatus && fulfillmentStatus !== 'all') {
            conditions.push(
              eq(
                orders.fulfillmentStatus,
                fulfillmentStatus as (typeof orders.fulfillmentStatus.enumValues)[number],
              ),
            )
          }

          if (search) {
            conditions.push(ilike(orders.email, `%${search}%`) as SQL)
          }

          const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined

          // Sorting
          const sortColumn =
            {
              orderNumber: orders.orderNumber,
              total: orders.total,
              status: orders.status,
              paymentStatus: orders.paymentStatus,
              fulfillmentStatus: orders.fulfillmentStatus,
              createdAt: orders.createdAt,
            }[sortKey] || orders.createdAt

          const orderBy =
            sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

          // Get total count
          const [{ total }] = await db
            .select({ total: count() })
            .from(orders)
            .where(whereClause)

          // Get orders with pagination
          const offset = (page - 1) * limit
          const ordersList = await db
            .select()
            .from(orders)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset)

          // Get item counts for all orders in a single query (fixes N+1)
          const orderIds = ordersList.map((o) => o.id)
          const itemCounts = await getOrderItemCounts(orderIds)

          const ordersWithItemCount = ordersList.map((order) => ({
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
            itemCount: itemCounts.get(order.id) || 0,
            createdAt: order.createdAt,
          }))

          return successResponse({
            orders: ordersWithItemCount,
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
