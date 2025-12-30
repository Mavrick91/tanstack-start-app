---
name: testing
description: Write Vitest tests with mocks for API routes, hooks, components, and utilities. Use when writing tests, debugging test failures, or setting up test infrastructure.
---

# Testing Guide

Comprehensive testing patterns with Vitest for this application.

## Quick Commands

```bash
yarn test                    # Run all tests
yarn vitest run path/file    # Run single test file
yarn vitest --watch          # Watch mode
yarn vitest --coverage       # With coverage report
```

## Test File Location

Tests are colocated with source files:

```
src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts      # Test file next to source
├── hooks/
│   ├── useCart.ts
│   └── useCart.test.ts
└── server/
    ├── orders.ts
    └── orders.test.ts
```

## Basic Test Structure

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('FeatureName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('functionName', () => {
    it('should do something specific', () => {
      const result = functionName(input)
      expect(result).toBe(expected)
    })

    it('should handle edge case', () => {
      expect(() => functionName(null)).toThrow()
    })
  })
})
```

## Mocking Modules

**Important:** Mock BEFORE importing the module under test.

```typescript
// 1. Mock dependencies FIRST
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../lib/stripe', () => ({
  stripe: {
    refunds: {
      create: vi.fn(),
    },
  },
}))

// 2. THEN import the module under test
import { myFunction } from './myModule'
```

## Database Mocking

### Simple Mock

```typescript
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: '1', name: 'Test Item' }]),
  },
}))
```

### Chained Query Mock

```typescript
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
    ]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}))
```

### In-Memory State Mock

```typescript
let mockData: Array<{ id: string; name: string }> = []

vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockImplementation(() => Promise.resolve(mockData)),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((values) => {
        mockData.push(values)
        return {
          returning: vi.fn().mockResolvedValue([values]),
        }
      }),
    })),
  },
}))

beforeEach(() => {
  mockData = []
})

it('should insert and retrieve', async () => {
  await insertItem({ id: '1', name: 'Test' })
  const items = await getItems()
  expect(items).toHaveLength(1)
})
```

## Testing Utilities

```typescript
// src/lib/utils.test.ts
import { describe, expect, it } from 'vitest'
import { formatCurrency, parseDecimal, toDecimalString } from './utils'

describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
  })

  it('should handle zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })

  it('should handle negative numbers', () => {
    expect(formatCurrency(-10.5, 'USD')).toBe('-$10.50')
  })
})

describe('parseDecimal', () => {
  it('should parse decimal string to number', () => {
    expect(parseDecimal('99.99')).toBe(99.99)
    expect(parseDecimal('0.01')).toBe(0.01)
  })

  it('should round to 2 decimal places', () => {
    expect(parseDecimal('99.999')).toBe(100)
    expect(parseDecimal('99.994')).toBe(99.99)
  })
})
```

## Testing Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('../lib/api', () => ({
  fetchProducts: vi.fn().mockResolvedValue([{ id: '1', name: 'Product' }]),
}))

describe('useProducts', () => {
  it('should return initial loading state', () => {
    const { result } = renderHook(() => useProducts())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.products).toEqual([])
  })

  it('should load products', async () => {
    const { result } = renderHook(() => useProducts())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.products).toHaveLength(1)
  })
})

describe('useCart', () => {
  it('should add item to cart', async () => {
    const { result } = renderHook(() => useCart())

    act(() => {
      result.current.addItem('product-1', 'variant-1')
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].productId).toBe('product-1')
  })

  it('should increment quantity for existing item', async () => {
    const { result } = renderHook(() => useCart())

    act(() => {
      result.current.addItem('product-1', 'variant-1')
      result.current.addItem('product-1', 'variant-1')
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(2)
  })
})
```

## Testing Components

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProductCard } from './ProductCard'

// Mock router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useParams: () => ({ lang: 'en' }),
}))

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: { en: 'Test Product' },
    price: 99.99,
    imageUrl: '/image.jpg',
  }

  it('should render product name', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })

  it('should render formatted price', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('$99.99')).toBeInTheDocument()
  })

  it('should call onAddToCart when button clicked', async () => {
    const onAddToCart = vi.fn()

    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />)

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    await waitFor(() => {
      expect(onAddToCart).toHaveBeenCalledWith('1')
    })
  })

  it('should show loading state', () => {
    render(<ProductCard product={mockProduct} isLoading />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

## Testing Admin Tables

```typescript
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrdersTable } from './OrdersTable'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

const MOCK_ORDERS = [
  {
    id: '1',
    orderNumber: 1001,
    email: 'test@example.com',
    total: 99.99,
    status: 'pending',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    createdAt: new Date('2024-01-15'),
  },
]

describe('OrdersTable', () => {
  it('should render table headers', () => {
    render(<OrdersTable orders={MOCK_ORDERS} />)

    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should render order number with prefix', () => {
    render(<OrdersTable orders={MOCK_ORDERS} />)
    expect(screen.getByText('#1001')).toBeInTheDocument()
  })

  it('should render status badges', () => {
    render(<OrdersTable orders={MOCK_ORDERS} />)
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('paid')).toBeInTheDocument()
  })
})
```

## Testing API Routes

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ id: '1', name: 'Test' }]),
  },
}))

vi.mock('../lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    success: true,
    user: { id: 'user-1', role: 'admin' },
  }),
}))

import { handlers } from './products'

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return products for authenticated user', async () => {
    const request = new Request('http://localhost/api/products')

    const response = await handlers.GET({ request })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.items).toHaveLength(1)
  })

  it('should return 401 for unauthenticated user', async () => {
    const { requireAuth } = await import('../lib/auth')
    vi.mocked(requireAuth).mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }),
    })

    const request = new Request('http://localhost/api/products')
    const response = await handlers.GET({ request })

    expect(response.status).toBe(401)
  })
})
```

## Testing Without Mocks

Use `vi.importActual` to test real implementations:

```typescript
it('should work with real implementation', async () => {
  // Import actual module, bypassing mocks
  const { parseDecimal } =
    await vi.importActual<typeof import('./utils')>('./utils')

  expect(parseDecimal('99.99')).toBe(99.99)
})
```

## Common Assertions

```typescript
// Equality
expect(value).toBe(exact) // Strict equality
expect(value).toEqual(deepEqual) // Deep equality
expect(value).toStrictEqual(strict) // Strict deep equality

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

// Numbers
expect(value).toBeGreaterThan(3)
expect(value).toBeLessThan(5)
expect(value).toBeCloseTo(0.3, 5) // Floating point

// Strings
expect(string).toMatch(/regex/)
expect(string).toContain('substring')

// Arrays
expect(array).toContain(item)
expect(array).toHaveLength(3)
expect(array).toContainEqual({ id: 1 })

// Objects
expect(object).toHaveProperty('key')
expect(object).toHaveProperty('key', 'value')
expect(object).toMatchObject({ partial: true })

// Errors
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('message')
expect(() => fn()).toThrow(ErrorClass)

// Async
await expect(asyncFn()).resolves.toBe(value)
await expect(asyncFn()).rejects.toThrow('error')

// Mocks
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith(arg1, arg2)
expect(mockFn).toHaveBeenLastCalledWith(arg)
expect(mockFn).toHaveBeenNthCalledWith(1, arg)
```

## Async Testing

```typescript
// Waiting for async result
it('should load data', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})

// Using waitFor
it('should update after async action', async () => {
  const { result } = renderHook(() => useData())

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
  })

  expect(result.current.data).toHaveLength(5)
})

// Testing rejection
it('should reject with error', async () => {
  await expect(failingAsync()).rejects.toThrow('Error message')
})
```

## Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'

// Mock ResizeObserver (required for Radix UI)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

## Snapshot Testing

```typescript
it('should match snapshot', () => {
  const { container } = render(<MyComponent />)
  expect(container).toMatchSnapshot()
})

// Update snapshots: yarn vitest -u
```

## See Also

- `src/test/setup.ts` - Test setup
- `vitest.config.ts` - Vitest config
- `src/server/orders.test.ts` - Comprehensive example
- `src/hooks/useCart.test.ts` - Hook testing
