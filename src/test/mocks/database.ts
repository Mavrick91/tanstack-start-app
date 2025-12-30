import { vi } from 'vitest'

/**
 * Creates a chainable query mock that mimics Drizzle ORM queries.
 *
 * Usage:
 * ```ts
 * const chain = createQueryChain([{ id: '1', name: 'Product' }])
 * // chain.from().where().execute() resolves to the provided result
 * ```
 */
export const createQueryChain = <T = unknown>(result: T[] = []) => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  having: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue(result),
  then: vi.fn((resolve) => resolve(result)),
})

/**
 * Creates a mock database client that mimics Drizzle ORM.
 *
 * Usage:
 * ```ts
 * vi.mock('@/db', () => ({ db: createMockDb() }))
 *
 * // With custom query results:
 * const mockDb = createMockDb()
 * mockDb.select.mockReturnValue(createQueryChain([{ id: '1' }]))
 * ```
 */
export const createMockDb = (overrides: Record<string, unknown> = {}) => ({
  select: vi.fn(() => createQueryChain()),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([]),
      onConflictDoNothing: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
      onConflictDoUpdate: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([]),
    })),
  })),
  transaction: vi.fn(async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    return fn(createMockDb())
  }),
  query: {},
  ...overrides,
})
