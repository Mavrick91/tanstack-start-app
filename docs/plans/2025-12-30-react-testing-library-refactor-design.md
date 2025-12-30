# React Testing Library Setup Refactor

## Overview

Refactor the React Testing Library setup to eliminate mock duplication, standardize patterns, and create reusable test utilities.

## Problems Addressed

1. **Mock duplication** - Same mocks (router, i18n, hooks) copy-pasted across 50+ test files
2. **Inconsistent patterns** - Different cleanup strategies, unnecessary `act()` wrappers
3. **Missing test utilities** - No custom render wrapper, no shared helpers
4. **No Zustand reset** - Store state can leak between tests

## Design

### Directory Structure

```
src/test/
├── setup.ts              # Enhanced setup (cleanup, polyfills, store reset)
├── test-utils.tsx        # Custom render + re-exports
├── mocks/
│   ├── index.ts          # Barrel export
│   ├── router.ts         # TanStack Router mock factory
│   ├── i18n.ts           # react-i18next mock
│   ├── hooks.ts          # Common hook mocks (useCart, useAuth)
│   └── database.ts       # Database mock helpers
└── factories/
    ├── index.ts          # Barrel export
    └── data.ts           # Mock data factories (products, users, etc.)
```

### Custom Render (`test-utils.tsx`)

```typescript
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import userEvent from '@testing-library/user-event'

function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  }
}

export * from '@testing-library/react'
export { customRender as render }
export { default as userEvent } from '@testing-library/user-event'
```

### Router Mock (`mocks/router.ts`)

```typescript
import { vi } from 'vitest'

export const createMockNavigate = () => vi.fn()
export const createMockParams = (params = { lang: 'en' }) => () => params

export const mockRouter = (overrides = {}) => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>{children}</a>
  ),
  useNavigate: () => createMockNavigate(),
  useParams: createMockParams(),
  useRouter: () => ({ state: { location: { pathname: '/' } } }),
  useMatch: () => undefined,
  ...overrides,
})
```

### i18n Mock (`mocks/i18n.ts`)

```typescript
import { vi } from 'vitest'

type TranslationFn = (key: string, options?: Record<string, any>) => string

export const createMockT = (translations?: Record<string, string>): TranslationFn => {
  return (key: string) => translations?.[key] ?? key
}

export const mockI18n = (translations?: Record<string, string>) => ({
  useTranslation: () => ({
    t: createMockT(translations),
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
})
```

### Hook Mocks (`mocks/hooks.ts`)

```typescript
import { vi } from 'vitest'

export const createMockCart = (overrides = {}) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  ...overrides,
})

export const createMockAuth = (overrides = {}) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  ...overrides,
})
```

### Database Mock (`mocks/database.ts`)

```typescript
import { vi } from 'vitest'

export const createQueryChain = (result: any = []) => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue(result),
})

export const createMockDb = (overrides = {}) => ({
  select: vi.fn(() => createQueryChain()),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn().mockResolvedValue([]),
  })),
  transaction: vi.fn((fn) => fn(createMockDb())),
  ...overrides,
})
```

### Data Factories (`factories/data.ts`)

```typescript
let idCounter = 0
const uniqueId = (prefix: string) => `${prefix}-${++idCounter}`

export const createProduct = (overrides = {}) => ({
  id: uniqueId('product'),
  name: { en: 'Test Product', fr: 'Produit Test', id: 'Produk Tes' },
  slug: 'test-product',
  description: { en: 'A test product', fr: 'Un produit test', id: 'Produk tes' },
  price: 99.99,
  images: [],
  variants: [],
  isActive: true,
  createdAt: new Date(),
  ...overrides,
})

export const createCartItem = (overrides = {}) => ({
  id: uniqueId('cart-item'),
  productId: uniqueId('product'),
  variantId: null,
  name: 'Test Product',
  price: 99.99,
  quantity: 1,
  image: null,
  ...overrides,
})

export const createUser = (overrides = {}) => ({
  id: uniqueId('user'),
  email: `user-${idCounter}@test.com`,
  name: 'Test User',
  role: 'customer',
  createdAt: new Date(),
  ...overrides,
})

export const resetFactories = () => { idCounter = 0 }
```

### Enhanced Setup (`setup.ts`)

```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { resetFactories } from './factories/data'

import '../lib/i18n'

// Standardized cleanup after EVERY test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  resetFactories()
})

// Zustand store reset helper
const storeResetFns = new Set<() => void>()

export const registerStoreReset = (resetFn: () => void) => {
  storeResetFns.add(resetFn)
}

beforeEach(() => {
  storeResetFns.forEach((reset) => reset())
})

// jsdom polyfills for Radix UI
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Element.prototype.hasPointerCapture = () => false
Element.prototype.setPointerCapture = () => {}
Element.prototype.releasePointerCapture = () => {}
Element.prototype.scrollIntoView = () => {}

// Suppress React act() warnings
const originalError = console.error
console.error = (...args) => {
  if (args[0]?.includes?.('not wrapped in act')) return
  originalError(...args)
}
```

## Usage Example

### Before

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => ({ lang: 'en' }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const MOCK_ITEMS = [{ id: '1', name: 'Product', price: 99, quantity: 1 }]

describe('CartDrawer', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('removes item', async () => {
    const user = userEvent.setup()
    render(<CartDrawer />)
    await user.click(screen.getByRole('button', { name: /remove/i }))
  })
})
```

### After

```typescript
import { render, screen } from '@/test/test-utils'
import { mockRouter, mockI18n, createMockCart } from '@/test/mocks'
import { createCartItem } from '@/test/factories'

vi.mock('@tanstack/react-router', () => mockRouter())
vi.mock('react-i18next', () => mockI18n())

const mockCart = createMockCart({ items: [createCartItem()], itemCount: 1 })
vi.mock('@/hooks/useCart', () => ({ useCart: () => mockCart }))

describe('CartDrawer', () => {
  it('removes item', async () => {
    const { user } = render(<CartDrawer />)
    await user.click(screen.getByRole('button', { name: /remove/i }))
    expect(mockCart.removeItem).toHaveBeenCalled()
  })
})
```

## Migration Strategy

1. Create new `/src/test/` structure with all utilities
2. Update existing tests incrementally (file by file)
3. Old pattern continues to work during migration
4. Remove redundant `beforeEach` cleanup as files are migrated

## Files to Create

- `src/test/test-utils.tsx`
- `src/test/mocks/index.ts`
- `src/test/mocks/router.ts`
- `src/test/mocks/i18n.ts`
- `src/test/mocks/hooks.ts`
- `src/test/mocks/database.ts`
- `src/test/factories/index.ts`
- `src/test/factories/data.ts`

## Files to Modify

- `src/test/setup.ts` - Add standardized cleanup and Zustand reset helper
