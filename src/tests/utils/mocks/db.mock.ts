import { vi } from 'vitest'

/**
 * Options for creating a mock database.
 */
export interface MockDbOptions {
  /** Pre-populated data for queries */
  data?: {
    checkouts?: unknown[]
    orders?: unknown[]
    orderItems?: unknown[]
    products?: unknown[]
    productVariants?: unknown[]
    productOptions?: unknown[]
    productImages?: unknown[]
    customers?: unknown[]
    addresses?: unknown[]
    users?: unknown[]
    sessions?: unknown[]
  }
  /** Should queries fail? */
  failQuery?: boolean
  /** Should inserts fail? */
  failInsert?: boolean
  /** Should updates fail? */
  failUpdate?: boolean
  /** Should deletes fail? */
  failDelete?: boolean
  /** Error to throw */
  error?: Error
}

/**
 * Creates a mock database for testing.
 * Supports common Drizzle ORM patterns with method chaining.
 *
 * @example
 * ```typescript
 * const db = createMockDb({
 *   data: {
 *     checkouts: [createCheckout()],
 *     orders: [],
 *   },
 * })
 *
 * // Use in service tests
 * const result = await completeCheckout(checkoutId, payment, { db })
 *
 * // Verify insert was called
 * expect(db.insert).toHaveBeenCalled()
 * ```
 */
export function createMockDb(options: MockDbOptions = {}) {
  const data = options.data ?? {}
  const error = options.error ?? new Error('Database error')

  // Helper to get data for a table
  const getTableData = (table: string): unknown[] => {
    const tableMap: Record<string, unknown[] | undefined> = {
      checkouts: data.checkouts,
      orders: data.orders,
      order_items: data.orderItems,
      products: data.products,
      product_variants: data.productVariants,
      product_options: data.productOptions,
      product_images: data.productImages,
      customers: data.customers,
      addresses: data.addresses,
      users: data.users,
      sessions: data.sessions,
    }
    return tableMap[table] ?? []
  }

  // Track inserts for verification
  const insertedData: Record<string, unknown[]> = {}

  // Create select chain
  const createSelectChain = () => {
    if (options.failQuery) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(error),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(error),
            }),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(error),
          }),
          limit: vi.fn().mockRejectedValue(error),
        }),
      }
    }

    let currentTable = ''
    let currentData: unknown[] = []

    return {
      from: vi
        .fn()
        .mockImplementation((table: { _: { name: string } } | string) => {
          currentTable =
            typeof table === 'string' ? table : (table?._.name ?? 'unknown')
          currentData = getTableData(currentTable)

          return {
            where: vi.fn().mockImplementation(() => ({
              limit: vi.fn().mockResolvedValue(currentData.slice(0, 1)),
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(currentData),
                offset: vi.fn().mockResolvedValue(currentData),
              }),
            })),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(currentData),
              offset: vi.fn().mockResolvedValue(currentData),
            }),
            limit: vi.fn().mockResolvedValue(currentData),
          }
        }),
    }
  }

  // Create insert chain
  const createInsertChain = () => {
    if (options.failInsert) {
      return vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(error),
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(error),
          }),
        }),
      })
    }

    return vi
      .fn()
      .mockImplementation((table: { _: { name: string } } | string) => {
        const tableName =
          typeof table === 'string' ? table : (table?._.name ?? 'unknown')

        return {
          values: vi.fn().mockImplementation((values: unknown) => {
            // Track inserted data
            if (!insertedData[tableName]) insertedData[tableName] = []
            const insertedValues = Array.isArray(values) ? values : [values]
            insertedData[tableName].push(...insertedValues)

            return {
              returning: vi.fn().mockResolvedValue(
                insertedValues.map((v, i) => ({
                  ...(typeof v === 'object' ? v : {}),
                  id: `${tableName}-${Date.now()}-${i}`,
                  orderNumber: tableName === 'orders' ? 1001 : undefined,
                })),
              ),
              onConflictDoUpdate: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue(insertedValues),
              }),
            }
          }),
        }
      })
  }

  // Create update chain
  const createUpdateChain = () => {
    if (options.failUpdate) {
      return vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(error),
        }),
      })
    }

    return vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'updated-1' }]),
        returning: vi.fn().mockResolvedValue([{ id: 'updated-1' }]),
      }),
    })
  }

  // Create delete chain
  const createDeleteChain = () => {
    if (options.failDelete) {
      return vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(error),
      })
    }

    return vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    })
  }

  // Create transaction mock
  const createTransactionMock = () => {
    return vi
      .fn()
      .mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          // Create a transaction context that has the same interface
          const tx = {
            select: vi.fn().mockReturnValue(createSelectChain()),
            insert: createInsertChain(),
            update: createUpdateChain(),
            delete: createDeleteChain(),
          }
          return callback(tx)
        },
      )
  }

  return {
    select: vi.fn().mockReturnValue(createSelectChain()),
    insert: createInsertChain(),
    update: createUpdateChain(),
    delete: createDeleteChain(),
    transaction: createTransactionMock(),
    // Helper to check what was inserted
    _getInsertedData: () => insertedData,
  }
}

/**
 * Pre-configured database scenarios for common test cases.
 */
export const dbScenarios = {
  /** Empty database */
  empty: () => createMockDb(),

  /** Database query error */
  queryError: () => createMockDb({ failQuery: true }),

  /** Database insert error */
  insertError: () => createMockDb({ failInsert: true }),

  /** Database update error */
  updateError: () => createMockDb({ failUpdate: true }),

  /** Unique constraint violation (duplicate) */
  duplicateError: () =>
    createMockDb({
      failInsert: true,
      error: Object.assign(new Error('Unique constraint violation'), {
        code: '23505',
      }),
    }),

  /** Connection error */
  connectionError: () =>
    createMockDb({
      failQuery: true,
      error: new Error('ECONNREFUSED'),
    }),
}

/**
 * Helper to mock the db module in tests.
 *
 * @example
 * ```typescript
 * // In test file
 * vi.mock('../../db', () => mockDbModule({ data: { checkouts: [checkout] } }))
 * ```
 */
export function mockDbModule(options: MockDbOptions = {}) {
  return {
    db: createMockDb(options),
  }
}
