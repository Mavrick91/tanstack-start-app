/**
 * Database Context
 *
 * Re-exports database client, operators, and schema tables.
 * Uses top-level imports (vite stubServerModules plugin handles client bundling).
 */

// Drizzle ORM operators
export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'

// Database client
export { db } from '../db'

// Schema tables - re-export all
export * from '../db/schema'
