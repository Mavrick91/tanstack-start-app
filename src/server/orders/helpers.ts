/**
 * Order Helper Functions
 *
 * Pure utility functions for decimal parsing and database batch operations.
 * Used by orders.ts and related modules.
 */

import { inArray, sql } from 'drizzle-orm'

import { db } from '../../db'
import { orderItems } from '../../db/schema'

/**
 * Parse a decimal string to a number with 2 decimal places
 * Used for converting database decimal strings to JavaScript numbers
 */
export const parseDecimal = (value: string): number => {
  const parsed = parseFloat(value)
  return Math.round(parsed * 100) / 100
}

/**
 * Convert a number to a decimal string with 2 decimal places
 * Used for formatting numbers for display
 */
export const toDecimalString = (value: number): string => {
  return value.toFixed(2)
}

/**
 * Get item counts for multiple orders in a single query
 * Fixes N+1 query problem in order listings
 *
 * @param orderIds - Array of order IDs to get item counts for
 * @returns Map of orderId -> itemCount (includes 0 for orders with no items)
 */
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

/**
 * Get all items for multiple orders in a single query
 * Fixes N+1 query problem in customer orders listing
 *
 * @param orderIds - Array of order IDs to get items for
 * @returns Map of orderId -> orderItems array
 */
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
