/**
 * Database module.
 * For server-side usage only.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

// Re-export schema for convenience
export { schema }

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:password@localhost:5434/finenail_db'

export const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })
