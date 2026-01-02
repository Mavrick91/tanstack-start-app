/**
 * Database query helpers.
 * Server-side only - do not import in client code.
 */

import { eq } from 'drizzle-orm'

import { db } from '../../db'
import { customers, orders } from '../../db/schema'

export const findOrderById = async (id: string) => {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)
  return order ?? null
}

export const findCustomerById = async (id: string) => {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)
  return customer ?? null
}
