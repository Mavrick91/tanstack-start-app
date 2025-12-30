# Test Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize 80 test files with global mocks, data factories, and consistent patterns.

**Architecture:** Add global mocks for router/i18n in setup.ts, then systematically migrate test files to remove redundant code and use shared factories.

**Tech Stack:** Vitest, React Testing Library, @tanstack/react-router, react-i18next

---

## Task 1: Add Global Router Mock

**Files:**
- Modify: `src/test/setup.ts`

**Step 1: Add React import and router mock to setup.ts**

Add this after the existing imports in `src/test/setup.ts`:

```typescript
import React from 'react'

// =============================================================================
// Global Mocks - Router
// =============================================================================

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
    className?: string
  }) => {
    const href = params?.lang ? to.replace('$lang', params.lang) : to
    return React.createElement('a', { href, className }, children)
  },
  useNavigate: () => vi.fn(),
  useParams: () => ({ lang: 'en' }),
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  useRouter: () => ({ navigate: vi.fn() }),
}))
```

**Step 2: Run tests to verify nothing breaks**

Run: `npm run test`
Expected: All 1073 tests pass (some may fail initially due to mock conflicts - that's expected)

**Step 3: Commit**

```bash
git add src/test/setup.ts
git commit -m "feat(test): add global router mock to setup.ts"
```

---

## Task 2: Add Global i18n Mock

**Files:**
- Modify: `src/test/setup.ts`

**Step 1: Add i18n mock after the router mock**

```typescript
// =============================================================================
// Global Mocks - i18n
// =============================================================================

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
```

**Step 2: Run tests to verify**

Run: `npm run test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/test/setup.ts
git commit -m "feat(test): add global i18n mock to setup.ts"
```

---

## Task 3: Write Testing Standards Guide

**Files:**
- Create: `docs/testing-standards.md`

**Step 1: Write the guide**

```markdown
# Testing Standards Guide

## Quick Start

```tsx
import { render, screen } from '@/test/test-utils'

describe('ComponentName', () => {
  it('does X when Y', async () => {
    const { user } = render(<Component />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
```

## Global Mocks (automatic)

These are mocked globally in `src/test/setup.ts` - do NOT re-mock them:

- `@tanstack/react-router` - Link, useNavigate, useParams, useRouter, etc.
- `react-i18next` - useTranslation, Trans

### Override when needed

If a test needs different router behavior:

```tsx
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'fr', productId: '123' }),
  useNavigate: () => mockNavigate, // capture for assertions
}))
```

## Data Factories

Use factories from `@/test/factories/data` instead of hardcoded mock objects:

```tsx
import { createProduct, createOrder, createCartItem } from '@/test/factories/data'

// Good
const product = createProduct({ price: 50 })

// Bad
const MOCK_PRODUCT = { id: '1', name: 'Test', price: 50, ... }
```

### Available Factories

- `createProduct(overrides?)` - Product with variants, options
- `createProductVariant(overrides?)`
- `createProductImage(overrides?)`
- `createCartItem(overrides?)`
- `createUser(overrides?)` / `createAdminUser(overrides?)`
- `createAddress(overrides?)`
- `createOrder(overrides?)`
- `createOrderItem(overrides?)`
- `createCollection(overrides?)`
- `createCheckout(overrides?)`
- `createShippingRate(overrides?)`

## Component Testing Patterns

### QueryClient is automatic

The `render` from `@/test/test-utils` includes QueryClientProvider:

```tsx
// Good - no wrapper needed
render(<MyComponent />)

// Bad - redundant
const queryClient = new QueryClient()
render(
  <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
)
```

### userEvent is included

```tsx
const { user } = render(<Component />)
await user.click(button)
await user.type(input, 'text')
```

### Async patterns

```tsx
// Prefer findBy for async
const button = await screen.findByRole('button')

// Use waitFor for complex conditions
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

## Anti-patterns

### Don't wrap render in act()

```tsx
// Bad
await act(async () => {
  render(<Component />)
})

// Good
render(<Component />)
```

### Don't create your own QueryClient

```tsx
// Bad
const queryClient = new QueryClient()
render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>
)

// Good
render(<Component />)
```

### Don't use fireEvent for user actions

```tsx
// Bad
fireEvent.click(button)

// Good
await user.click(button)
```

### Don't re-mock router or i18n

```tsx
// Bad - already global
vi.mock('@tanstack/react-router', () => ({ ... }))
vi.mock('react-i18next', () => ({ ... }))

// Good - just use the component
render(<Component />)
```

## Test Structure

### Naming

```tsx
describe('ComponentName', () => {           // No "Component" suffix
  describe('Section', () => {               // Group related tests
    it('does X when Y', () => {})           // Behavior focused
  })
})
```

### Max nesting: 2 levels

```tsx
// Good
describe('Cart', () => {
  describe('adding items', () => {
    it('increases count', () => {})
  })
})

// Bad - too deep
describe('Cart', () => {
  describe('items', () => {
    describe('adding', () => {
      describe('single item', () => {})
    })
  })
})
```
```

**Step 2: Commit**

```bash
git add docs/testing-standards.md
git commit -m "docs: add testing standards guide"
```

---

## Task 4: Migrate Navbar.test.tsx

**Files:**
- Modify: `src/components/layout/Navbar.test.tsx`

**Step 1: Remove redundant router and i18n mocks**

Delete these blocks (lines 8-28 and 58-62):

```typescript
// DELETE THIS:
vi.mock('@tanstack/react-router', () => ({
  Link: ({ ... }) => { ... },
  useParams: () => ({ lang: 'en' }),
}))

// DELETE THIS:
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
```

**Step 2: Remove all act() wrappers around render**

Replace all instances of:
```typescript
await act(async () => {
  render(<Navbar />)
})
```

With:
```typescript
render(<Navbar />)
```

Also update the cart drawer interaction test:
```typescript
// Before:
const { user } = await act(async () => {
  return render(<Navbar />)
})

// After:
const { user } = render(<Navbar />)
```

**Step 3: Run tests**

Run: `npx vitest run src/components/layout/Navbar.test.tsx`
Expected: All 10 tests pass

**Step 4: Commit**

```bash
git add src/components/layout/Navbar.test.tsx
git commit -m "refactor(test): remove redundant mocks and act() from Navbar.test"
```

---

## Task 5: Migrate ProductForm.test.tsx

**Files:**
- Modify: `src/components/admin/products/ProductForm.test.tsx`

**Step 1: Remove QueryClient wrapper**

Delete the queryClient creation in beforeEach and remove all QueryClientProvider wrappers.

Before:
```typescript
let queryClient: QueryClient

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // ...
})

// In each test:
render(
  <QueryClientProvider client={queryClient}>
    <ProductForm />
  </QueryClientProvider>,
)
```

After (keep the console.warn mock):
```typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation((msg) => {
    if (typeof msg === 'string' && msg.includes('Duplicate extension')) return
    console.warn(msg)
  })
})

// In each test:
render(<ProductForm />)
```

**Step 2: Remove redundant router mock**

Delete (lines 20-23):
```typescript
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}))
```

**Step 3: Remove unused imports**

Remove from line 1:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
```

**Step 4: Run tests**

Run: `npx vitest run src/components/admin/products/ProductForm.test.tsx`
Expected: All 18 tests pass

**Step 5: Commit**

```bash
git add src/components/admin/products/ProductForm.test.tsx
git commit -m "refactor(test): remove redundant QueryClient and router mock from ProductForm.test"
```

---

## Task 6: Migrate OrderDetail.test.tsx to Factories

**Files:**
- Modify: `src/components/admin/orders/OrderDetail.test.tsx`

**Step 1: Import factory**

Add at top:
```typescript
import { createOrder, createOrderItem, createAddress } from '@/test/factories/data'
```

**Step 2: Replace MOCK_ORDER with factory**

Delete the 47-line MOCK_ORDER constant and replace with:

```typescript
const createTestOrder = (overrides = {}) => ({
  ...createOrder(),
  orderNumber: 1001,
  email: 'customer@example.com',
  subtotal: 89.99,
  shippingTotal: 5.99,
  taxTotal: 8.25,
  total: 104.23,
  currency: 'USD',
  paymentStatus: 'paid',
  fulfillmentStatus: 'unfulfilled',
  shippingMethod: 'Standard Shipping',
  shippingAddress: {
    ...createAddress(),
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Inc',
    address1: '123 Main St',
    address2: 'Suite 100',
    city: 'New York',
    province: 'NY',
    zip: '10001',
    country: 'United States',
    countryCode: 'US',
    phone: '+1-555-1234',
  },
  paymentProvider: 'stripe',
  paymentId: 'pi_123456789',
  paidAt: new Date('2024-01-15T10:31:00'),
  items: [
    {
      ...createOrderItem(),
      title: 'Test Product',
      variantTitle: 'Size M / Blue',
      sku: 'SKU-001',
      price: 44.99,
      quantity: 2,
      total: 89.98,
      imageUrl: 'https://example.com/image.jpg',
    },
  ],
  ...overrides,
})

const MOCK_ORDER = createTestOrder()
```

**Step 3: Run tests**

Run: `npx vitest run src/components/admin/orders/OrderDetail.test.tsx`
Expected: All 26 tests pass

**Step 4: Commit**

```bash
git add src/components/admin/orders/OrderDetail.test.tsx
git commit -m "refactor(test): migrate OrderDetail.test to use factories"
```

---

## Task 7: Batch Migrate QueryClient Files (6 files)

**Files:**
- Modify: `src/components/admin/products/ProductsList.test.tsx`
- Modify: `src/components/admin/collections/components/CollectionTable.test.tsx`
- Modify: `src/components/admin/collections/CollectionForm.test.tsx`
- Modify: `src/components/admin/collections/components/BulkActionsBar.test.tsx`
- Modify: `src/components/admin/products/components/BulkActionsBar.test.tsx`
- Modify: `src/components/admin/products/components/ProductTable.test.tsx`

**Step 1: For each file, remove QueryClient wrapper pattern**

In each file, find and remove:
1. `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'`
2. `const queryClient = new QueryClient(...)` or `let queryClient: QueryClient`
3. `<QueryClientProvider client={queryClient}>...</QueryClientProvider>` wrappers

Replace with direct `render(<Component />)`.

**Step 2: Run tests after each file**

Run: `npm run test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/admin/products/ProductsList.test.tsx \
        src/components/admin/collections/components/CollectionTable.test.tsx \
        src/components/admin/collections/CollectionForm.test.tsx \
        src/components/admin/collections/components/BulkActionsBar.test.tsx \
        src/components/admin/products/components/BulkActionsBar.test.tsx \
        src/components/admin/products/components/ProductTable.test.tsx
git commit -m "refactor(test): remove redundant QueryClient wrappers from admin tests"
```

---

## Task 8: Batch Migrate Hook Tests (2 files)

**Files:**
- Modify: `src/hooks/useProductStats.test.tsx`
- Modify: `src/hooks/useDataTable.test.tsx`

**Step 1: Remove QueryClient wrappers**

Same pattern as Task 7 - remove redundant QueryClient creation and wrapper.

**Step 2: Run tests**

Run: `npx vitest run src/hooks/useProductStats.test.tsx src/hooks/useDataTable.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/hooks/useProductStats.test.tsx src/hooks/useDataTable.test.tsx
git commit -m "refactor(test): remove redundant QueryClient wrappers from hook tests"
```

---

## Task 9: Remove Remaining Router/i18n Mocks

**Files:** All remaining test files with redundant mocks

**Step 1: Find files with router mocks**

Run: `grep -r "vi.mock.*react-router" src --include="*.test.tsx" --include="*.test.ts" -l`

**Step 2: For each file, evaluate and remove mock if redundant**

If the mock is identical to the global mock, delete it.
If the mock has specific behavior needed for that test, keep it.

**Step 3: Find files with i18n mocks**

Run: `grep -r "vi.mock.*i18next" src --include="*.test.tsx" --include="*.test.ts" -l`

**Step 4: For each file, evaluate and remove mock if redundant**

**Step 5: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(test): remove redundant router and i18n mocks"
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All 1073+ tests pass

**Step 2: Verify metrics**

Run these commands to verify improvement:

```bash
# Router mocks remaining (should be significantly reduced)
grep -r "vi.mock.*react-router" src --include="*.test.tsx" --include="*.test.ts" | wc -l

# i18n mocks remaining (should be significantly reduced)
grep -r "vi.mock.*i18next" src --include="*.test.tsx" --include="*.test.ts" | wc -l

# QueryClient wrappers remaining (should be 0 or near 0)
grep -r "QueryClientProvider" src --include="*.test.tsx" | wc -l
```

**Step 3: Commit verification results**

Update the inconsistencies report with results, then:

```bash
git add -A
git commit -m "refactor(test): complete test standardization"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | 1 | Add global router mock |
| 2 | 1 | Add global i18n mock |
| 3 | 1 | Write testing standards guide |
| 4 | 1 | Migrate Navbar.test.tsx |
| 5 | 1 | Migrate ProductForm.test.tsx |
| 6 | 1 | Migrate OrderDetail.test.tsx to factories |
| 7 | 6 | Batch migrate QueryClient files |
| 8 | 2 | Batch migrate hook tests |
| 9 | ~20 | Remove remaining redundant mocks |
| 10 | - | Final verification |

**Total: ~35 files modified**
