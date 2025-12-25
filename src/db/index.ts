import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

// For server-side usage only
const connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:password@localhost:5434/finenail_db'

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })
