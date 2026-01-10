import { inArray, sql } from 'drizzle-orm'

import { db } from '../../db'
import { orderItems } from '../../db/schema'

// Parse decimal string to number with 2 decimal places
export const parseDecimal = (value: string): number => {
  const parsed = parseFloat(value)
  return Math.round(parsed * 100) / 100
}

// Convert number to decimal string with 2 decimal places
export const toDecimalString = (value: number): string => {
  return value.toFixed(2)
}

// Get item counts for multiple orders in a single query (fixes N+1)
export const getOrderItemCounts = async (
  orderIds: string[],
): Promise<Map<string, number>> => {
  if (orderIds.length === 0) {
    return new Map()
  }

  const results = await db
    .select({
      orderId: orderItems.orderId,
      itemCount: sql<number>`count(*)::int`,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .groupBy(orderItems.orderId)

  const countMap = new Map<string, number>()
  for (const row of results) {
    countMap.set(row.orderId, row.itemCount)
  }

  // Set 0 for orders with no items
  for (const orderId of orderIds) {
    if (!countMap.has(orderId)) {
      countMap.set(orderId, 0)
    }
  }

  return countMap
}

// Get all items for multiple orders in a single query (fixes N+1)
export const getOrderItemsByOrderIds = async (
  orderIds: string[],
): Promise<Map<string, (typeof orderItems.$inferSelect)[]>> => {
  if (orderIds.length === 0) {
    return new Map()
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))

  const itemsMap = new Map<string, (typeof orderItems.$inferSelect)[]>()

  // Initialize all orders with empty arrays
  for (const orderId of orderIds) {
    itemsMap.set(orderId, [])
  }

  // Group items by order
  for (const item of items) {
    const orderItemsList = itemsMap.get(item.orderId)!
    orderItemsList.push(item)
  }

  return itemsMap
}
