# Testing Patterns & Best Practices Guide

**Last Updated:** 2026-01-02
**Purpose:** Complete reference for writing tests in this TanStack Start e-commerce application

---

## Table of Contents

1. [File Structure](#file-structure)
2. [Import Patterns](#import-patterns)
3. [Mock Patterns](#mock-patterns)
4. [Test Types](#test-types)
5. [What to Test](#what-to-test)
6. [What NOT to Test](#what-not-to-test)
7. [Test Utilities](#test-utilities)
8. [Assertions & Queries](#assertions--queries)
9. [Quick Reference](#quick-reference)

---

## File Structure

### Location
Tests are **colocated** with source files:

```
src/
├── components/
│   ├── checkout/
│   │   ├── PaymentForm.tsx
│   │   └── PaymentForm.test.tsx         ← Test next to component
├── lib/
│   ├── validation/
│   │   ├── checkout.ts
│   │   └── checkout.test.ts             ← Test next to utility
├── hooks/
│   ├── useCart.ts
│   └── useCart.test.ts                  ← Test next to hook
└── tests/
    ├── routes/api/checkout/
    │   └── create.test.ts               ← API route tests
    └── utils/
        └── factories/                    ← Test data factories
```

### Naming Convention
- Component tests: `ComponentName.test.tsx`
- Utility tests: `utilityName.test.ts`
- File names match exactly: `PaymentForm.tsx` → `PaymentForm.test.tsx`

---

## Import Patterns

### Pattern 1: Files WITHOUT `vi.mock`

**Example:** `PaymentErrorBoundary.test.tsx`, `OrderSummary.test.tsx`

```typescript
// 1. Vitest imports
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 2. Component/module under test
import { PaymentErrorBoundary } from './PaymentErrorBoundary'

// 3. Type imports (if needed)
import type { SomeType } from '../types'

// 4. Test utilities (LAST)
import { render, screen, fireEvent } from '@/test/test-utils'
```

**Rule:** Component import → Types → Test-utils

---

### Pattern 2: Files WITH `vi.mock` (Local Mocks)

**Example:** `CheckoutLayout.test.tsx`, `PayPalButton.test.tsx`

```typescript
// 1. Comment explaining why import/order is disabled
// Component import must come after vi.mock for proper mocking
/* eslint-disable import/order */

// 2. Vitest imports
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 3. Test utilities imports
import { render, screen, fireEvent } from '@/test/test-utils'

// 4. Mock setup variables (if needed)
const mockStripe = { confirmPayment: vi.fn() }

// 5. vi.mock statements
vi.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => mockStripe,
}))

// 6. Component import (AFTER mocks)
import { StripePaymentForm } from './StripePaymentForm'
```

**Rule:** Test-utils → Mock variables → `vi.mock()` → Component

---

### Pattern 3: Partial Mock (Preserving Original)

**Example:** When you need to mock only part of a module

```typescript
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useBlocker: () => ({ status: 'idle', proceed: vi.fn() }),
  }
})
```

---

### Pattern 4: Using Actual Implementation

**Example:** `useCart.test.ts`

```typescript
// Bypass mocks to test real implementation
const { useCart, useCartStore } = await vi.importActual<{
  useCart: typeof import('./useCart').useCart
  useCartStore: typeof import('./useCart').useCartStore
}>('./useCart')
```

---

## Mock Patterns

### Global Mocks (Shared Across All Tests)

**Location:** `src/test/setup.ts`

**Global mocks include:**
- `@tanstack/react-router` (Link, useParams, useNavigate, useRouter)
- `react-i18next` (useTranslation, Trans)
- `ResizeObserver` (for Radix UI)
- `window.matchMedia` (for responsive components)

**❌ NEVER duplicate global mocks in individual test files**

```typescript
// ❌ BAD - Duplicating global mock
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }) => <a>{children}</a>,
  useParams: () => ({ lang: 'en' }),
}))

// ✅ GOOD - Global mock already exists, just use it
// No mock needed!
```

---

### Component-Specific Mocks

**When to mock:**
- External libraries (`@stripe/react-stripe-js`, `@paypal/react-paypal-js`)
- Child components that are complex or not relevant to test
- Third-party UI components that fail in JSDOM (Radix Select, Fancybox)

**Example:**

```typescript
// Mock child component to simplify testing
vi.mock('./CheckoutProgress', () => ({
  CheckoutProgress: ({ currentStep }: { currentStep: string }) => (
    <div data-testid="checkout-progress">Progress: {currentStep}</div>
  ),
}))
```

---

### API/Network Mocks

**Pattern:** Use `vi.fn()` for fetch or API calls

```typescript
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// In test
mockFetch.mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ orderId: 'ORDER-123' }),
})
```

---

### Environment Variables

```typescript
vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-api-key')
```

---

### Console Suppression

**Pattern:** Suppress expected console output in tests

```typescript
describe('ComponentWithWarnings', () => {
  const consoleError = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined)

  beforeEach(() => {
    consoleError.mockClear()
  })

  // Tests...
})
```

---

## Test Types

### 1. Component Tests

**Structure:**

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render required elements', () => {
      render(<Component />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      const onSubmit = vi.fn()
      const { user } = render(<Component onSubmit={onSubmit} />)

      await user.click(screen.getByRole('button'))

      expect(onSubmit).toHaveBeenCalled()
    })
  })

  describe('Props', () => {
    it('should apply custom className', () => {
      render(<Component className="custom" />)
      expect(screen.getByTestId('component')).toHaveClass('custom')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      render(<Component />)
      expect(screen.getByRole('button')).toHaveAccessibleName()
    })
  })
})
```

---

### 2. Hook Tests

**Pattern:** Use `renderHook` from test-utils

```typescript
import { renderHook, act } from '@/test/test-utils'

describe('useCart', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.getState().clearCart()
    })
  })

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCart(mockProducts))

    act(() => {
      result.current.addItem('product-1')
    })

    expect(result.current.items).toHaveLength(1)
  })
})
```

---

### 3. Utility/Validation Tests

**Pattern:** Pure function testing

```typescript
describe('validateCheckoutForPayment', () => {
  it('returns valid for complete checkout', () => {
    const checkout = createCheckoutForValidation()

    const result = validateCheckoutForPayment(checkout)

    expect(result).toEqual({ valid: true })
  })

  it('returns error when email is missing', () => {
    const checkout = createCheckoutForValidation({ email: null })

    const result = validateCheckoutForPayment(checkout)

    expect(result).toEqual({
      valid: false,
      error: 'Customer email is required',
      status: 400,
    })
  })
})
```

---

### 4. API/Server Function Tests

**Pattern:** Use real database with test helpers

```typescript
import {
  cleanupTestData,
  resetTestIds,
  seedProduct,
} from '@/test/helpers/db-test'

describe('createCheckout', () => {
  beforeEach(() => {
    resetTestIds()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('creates checkout with valid cart items', async () => {
    const { product, variant } = await seedProduct({
      name: 'Test Product',
      price: 49.99,
    })

    const result = await createCheckout({
      items: [{ productId: product.id, variantId: variant.id, quantity: 2 }],
    })

    expect(result.success).toBe(true)
    expect(result.checkout!.cartItems).toHaveLength(1)
  })
})
```

---

## What to Test

### ✅ DO Test

#### 1. **User-Visible Behavior**
- Elements render correctly
- User interactions work (clicks, typing, form submission)
- Correct content is displayed based on props/state
- Loading states, error states, success states

```typescript
it('should show loading state while fetching', () => {
  render(<ProductList isLoading={true} />)
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
})

it('should show error message on failure', () => {
  render(<ProductList error="Failed to load" />)
  expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
})
```

#### 2. **Accessibility**
- ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility

```typescript
it('should have accessible form labels', () => {
  render(<LoginForm />)
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Password')).toBeInTheDocument()
})

it('should have accessible button', () => {
  render(<SubmitButton />)
  expect(screen.getByRole('button')).toHaveAccessibleName()
})
```

#### 3. **State Changes**
- State updates correctly on user actions
- Props changes trigger re-renders
- Side effects occur as expected

```typescript
it('should toggle expanded state on click', () => {
  render(<Accordion />)

  const toggle = screen.getByRole('button')
  expect(screen.queryByText('Content')).not.toBeInTheDocument()

  fireEvent.click(toggle)
  expect(screen.getByText('Content')).toBeInTheDocument()
})
```

#### 4. **Edge Cases**
- Empty states (no data, empty arrays)
- Null/undefined values
- Maximum/minimum values
- Error conditions

```typescript
it('should handle empty cart gracefully', () => {
  render(<Cart items={[]} />)
  expect(screen.getByText(/cart is empty/i)).toBeInTheDocument()
})

it('should not allow negative quantity', () => {
  const { result } = renderHook(() => useCart())
  act(() => {
    result.current.updateQuantity('item-1', -1)
  })
  expect(result.current.items[0].quantity).toBe(0)
})
```

#### 5. **Validation Logic**
- Form validation rules
- Input constraints
- Business logic rules

```typescript
it('should validate email format', () => {
  const result = validateEmail('invalid-email')
  expect(result.valid).toBe(false)
  expect(result.error).toBe('Invalid email format')
})
```

#### 6. **Callbacks/Event Handlers**
- Functions are called with correct arguments
- Events bubble correctly

```typescript
it('should call onSubmit with form values', async () => {
  const onSubmit = vi.fn()
  const { user } = render(<Form onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText('Name'), 'John')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John' })
})
```

---

## What NOT to Test

### ❌ DON'T Test

#### 1. **Implementation Details**
- Internal component state variable names
- Private functions
- CSS class names (unless part of API)
- Exact HTML structure

```typescript
// ❌ BAD - Testing implementation
it('should have state.isOpen = true', () => {
  // Don't access internal state
})

// ✅ GOOD - Testing user-visible outcome
it('should show menu when button clicked', () => {
  render(<Menu />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('menu')).toBeVisible()
})
```

#### 2. **Third-Party Libraries**
- Don't test React itself
- Don't test library internals
- Trust that libraries work

```typescript
// ❌ BAD - Testing React Router works
it('should navigate when Link clicked', () => {
  // React Router is already tested
})

// ✅ GOOD - Test your usage of router
it('should have correct href attribute', () => {
  render(<NavigationLink to="/products" />)
  expect(screen.getByRole('link')).toHaveAttribute('href', '/products')
})
```

#### 3. **Styles and Layout**
- Specific pixel values
- CSS properties (unless critical to functionality)
- Responsive breakpoints (use visual regression instead)

```typescript
// ❌ BAD - Testing CSS
it('should have padding of 16px', () => {
  // CSS is already visually tested
})

// ✅ GOOD - Test visibility/display logic
it('should hide on mobile when minimized', () => {
  render(<Sidebar minimized={true} />)
  expect(screen.queryByText('Content')).not.toBeVisible()
})
```

#### 4. **Browser APIs**
- Don't test `localStorage`, `fetch`, etc.
- Mock them instead

#### 5. **Constants and Static Data**
- Don't test hardcoded values unless they're computed

```typescript
// ❌ BAD
it('should have 3 items', () => {
  expect(MENU_ITEMS.length).toBe(3)
})

// ✅ GOOD - Test derived/computed values
it('should calculate total correctly', () => {
  expect(calculateTotal([10, 20, 30])).toBe(60)
})
```

---

## Test Utilities

### Custom Render (from `@/test/test-utils`)

**Automatically includes:**
- `QueryClientProvider` wrapper
- Fresh `userEvent` instance per render

```typescript
import { render, screen } from '@/test/test-utils'

// Basic usage
const { user } = render(<Component />)
await user.click(screen.getByRole('button'))

// With custom wrapper
render(<Component />, {
  wrapper: ({ children }) => (
    <CustomProvider>{children}</CustomProvider>
  )
})
```

---

### Test Data Factories

**Location:** `src/test/factories/data.ts`

**Purpose:** Create consistent mock data with unique IDs

```typescript
import { createProduct, createCartItem, createAddress } from '@/test/factories'

// Use in tests
const product = createProduct()
const premiumProduct = createProduct({
  price: 999.99,
  name: { en: 'Premium Item' }
})

const item = createCartItem({ quantity: 5 })
const address = createAddress({ city: 'New York' })
```

**Auto-reset:** Factories reset ID counters in `afterEach` via `resetFactories()`

---

### Database Test Helpers

**Location:** `src/test/helpers/db-test.ts`

**For integration tests with real database:**

```typescript
import {
  seedProduct,
  seedProductWithImage,
  cleanupTestData,
  resetTestIds,
} from '@/test/helpers/db-test'

describe('Server Function', () => {
  beforeEach(() => {
    resetTestIds()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('works with real data', async () => {
    const { product, variant } = await seedProduct({
      name: 'Test Product',
      price: 99.99,
    })

    // Test with real DB
  })
})
```

---

## Assertions & Queries

### Query Priority (React Testing Library)

**Use in this order:**

1. **Accessible queries (prefer these):**
   - `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`

2. **Semantic queries:**
   - `getByAltText`, `getByTitle`

3. **Test IDs (last resort):**
   - `getByTestId`

```typescript
// ✅ BEST - Accessible query
screen.getByRole('button', { name: /submit/i })

// ✅ GOOD - Label query
screen.getByLabelText('Email')

// ⚠️ OK - Text query
screen.getByText('Welcome back')

// ❌ AVOID - Test ID (only if no better option)
screen.getByTestId('submit-button')
```

---

### Query Variants

| Query | Returns | Throws? | Use When |
|-------|---------|---------|----------|
| `getBy*` | Element | Yes (if not found) | Element should exist |
| `queryBy*` | Element \| null | No | Checking absence |
| `findBy*` | Promise<Element> | Yes (if not found/timeout) | Async appearance |

```typescript
// Element should exist
expect(screen.getByText('Hello')).toBeInTheDocument()

// Element should NOT exist
expect(screen.queryByText('Goodbye')).not.toBeInTheDocument()

// Element appears asynchronously
await screen.findByText('Loaded!')
```

---

### Common Assertions

```typescript
// Presence
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeInTheViewport()

// Attributes
expect(element).toHaveAttribute('href', '/home')
expect(element).toHaveClass('active')
expect(element).toHaveStyle({ color: 'red' })

// Values
expect(input).toHaveValue('john@example.com')
expect(checkbox).toBeChecked()
expect(button).toBeDisabled()

// Accessibility
expect(button).toHaveAccessibleName('Submit form')
expect(button).toHaveAccessibleDescription('Submits the login form')

// Text content
expect(element).toHaveTextContent('Welcome')
expect(element).toContainHTML('<span>Hello</span>')

// Mock functions
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenLastCalledWith('arg')
```

---

### User Interactions

**Use `user` from render (recommended):**

```typescript
const { user } = render(<Component />)

// Typing
await user.type(screen.getByLabelText('Email'), 'test@example.com')

// Clicking
await user.click(screen.getByRole('button'))
await user.dblClick(element)

// Selecting
await user.selectOptions(screen.getByRole('combobox'), 'option1')

// Clearing
await user.clear(screen.getByLabelText('Email'))

// Keyboard
await user.keyboard('{Enter}')
await user.tab()
```

**Or use `fireEvent` for simple cases:**

```typescript
fireEvent.click(button)
fireEvent.change(input, { target: { value: 'new value' } })
```

---

## Quick Reference

### Test File Template

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ComponentName } from './ComponentName'

import { render, screen, fireEvent } from '@/test/test-utils'

describe('ComponentName', () => {
  const defaultProps = {
    // Common props
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render basic elements', () => {
      render(<ComponentName {...defaultProps} />)
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle user actions', async () => {
      const onAction = vi.fn()
      const { user } = render(<ComponentName onAction={onAction} />)

      await user.click(screen.getByRole('button'))

      expect(onAction).toHaveBeenCalled()
    })
  })
})
```

---

### Checklist for New Tests

- [ ] Import order follows pattern (Pattern 1 or 2)
- [ ] No duplicate global mocks
- [ ] Uses `@/test/test-utils` instead of direct RTL imports
- [ ] Uses accessible queries (`getByRole`, `getByLabelText`)
- [ ] Tests user-visible behavior, not implementation
- [ ] Has `beforeEach` cleanup if needed
- [ ] Mock functions use `vi.fn()`
- [ ] Async interactions use `await user.*` or `waitFor`
- [ ] Uses factories for test data
- [ ] Organized into logical `describe` blocks

---

### Running Tests

```bash
npm test                     # Run all tests
npm test -- Component.test   # Run specific file
npm test -- --watch          # Watch mode
npm test -- --coverage       # With coverage
```

---

## Best Practices Summary

1. **Test behavior, not implementation**
2. **Use accessible queries** (getByRole, getByLabelText)
3. **Never duplicate global mocks** (check `src/test/setup.ts`)
4. **Follow import patterns** (Pattern 1 or 2)
5. **Use factories for test data** consistency
6. **Test edge cases** (null, undefined, empty, max/min)
7. **Mock external dependencies**, not your own code
8. **Use `await user.*`** for interactions (better than fireEvent)
9. **Write descriptive test names** ("should X when Y")
10. **Organize with nested `describe` blocks**

---

**For more examples, see:**
- Component tests: `src/components/checkout/*.test.tsx`
- Hook tests: `src/hooks/*.test.ts`
- Validation tests: `src/lib/validation/*.test.ts`
- API tests: `src/tests/routes/api/**/*.test.ts`
