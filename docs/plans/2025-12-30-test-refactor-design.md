# Integration Test Refactoring Design

## Problem Statement

The current test suite has four critical issues:

1. **Tests that test themselves, not production code** - Validation functions are defined inline within test files, then tested. The actual production code is never verified.

2. **Business logic trapped in route handlers** - Route files like `complete.ts` contain 270+ lines mixing validation, payment verification, order creation, and email logic. Impossible to unit test without spinning up the server.

3. **Mock complexity hiding real problems** - Tests mock entire DB chains. If query shapes change, tests still pass.

4. **No shared test infrastructure** - Every test file recreates mocks, test data, and utilities from scratch across 76 test files.

## Solution: Extract Business Logic into Testable Modules

### Architecture

```
src/
├── lib/
│   ├── validation/           # Pure validation functions
│   │   ├── checkout.ts       # validateCheckoutForPayment, validateCartItems
│   │   ├── address.ts        # validateShippingAddress
│   │   ├── payment.ts        # validatePaymentProvider, validatePaymentAmount
│   │   └── product.ts        # validateProductInput
│   │
│   ├── business/             # Business logic (no DB, no HTTP)
│   │   ├── checkout.ts       # calculateTotals, buildOrderFromCheckout
│   │   ├── shipping.ts       # calculateShippingCost, getAvailableRates
│   │   ├── pricing.ts        # applyDiscounts, calculateTax
│   │   └── variants.ts       # generateVariantCombinations (already exists)
│   │
│   └── services/             # Orchestration (uses DB + external APIs)
│       ├── checkout.service.ts   # completeCheckout, verifyPayment
│       ├── order.service.ts      # createOrder, updateOrderStatus
│       └── payment.service.ts    # verifyStripePayment, verifyPayPalPayment
│
├── routes/api/               # Thin handlers - just HTTP concerns
│   └── checkout/$checkoutId/
│       └── complete.ts       # Parse request -> call service -> format response
│
└── tests/
    └── utils/
        ├── mocks/
        │   ├── db.mock.ts
        │   ├── stripe.mock.ts
        │   ├── paypal.mock.ts
        │   └── index.ts
        ├── factories/
        │   ├── checkout.factory.ts
        │   ├── order.factory.ts
        │   ├── product.factory.ts
        │   └── address.factory.ts
        └── builders/
            └── request.builder.ts
```

### Key Principles

- **Route handlers become thin wrappers** - Only HTTP concerns (parse request, call service, format response)
- **validation/ and business/ are pure functions** - No side effects, trivial to test
- **services/ orchestrate DB + APIs** - Use dependency injection for testability
- **Shared test utilities** - Factories and mocks reused across all tests

## Testing Strategy: Three Layers

### Layer 1: Pure Functions (validation/, business/)

No mocks. No setup. Just input -> output.

```typescript
// src/lib/validation/checkout.test.ts
import { validateCheckoutForPayment } from './checkout'
import { createCheckout } from '@/tests/utils/factories'

describe('validateCheckoutForPayment', () => {
  it('requires email', () => {
    const checkout = createCheckout({ email: null })
    expect(validateCheckoutForPayment(checkout)).toEqual({
      valid: false,
      error: 'Customer email is required',
    })
  })

  it('passes when complete', () => {
    const checkout = createCheckout()
    expect(validateCheckoutForPayment(checkout)).toEqual({ valid: true })
  })
})
```

### Layer 2: Services (services/)

Mock only external boundaries (DB, Stripe, PayPal). Test orchestration logic.

```typescript
// src/lib/services/checkout.service.test.ts
import { completeCheckout } from './checkout.service'
import { createMockDb, createMockStripe } from '@/tests/utils/mocks'
import { createCheckout } from '@/tests/utils/factories'

describe('completeCheckout', () => {
  it('creates order when Stripe payment succeeds', async () => {
    const checkout = createCheckout({ total: '35.98' })
    const db = createMockDb({ checkouts: [checkout] })
    const stripe = createMockStripe({
      paymentStatus: 'succeeded',
      amount: 3598,
    })

    const result = await completeCheckout(
      checkout.id,
      { paymentProvider: 'stripe', paymentId: 'pi_123' },
      { db, stripeClient: stripe },
    )

    expect(result.order.paymentStatus).toBe('paid')
  })

  it('rejects when payment amount mismatches', async () => {
    const checkout = createCheckout({ total: '35.98' })
    const db = createMockDb({ checkouts: [checkout] })
    const stripe = createMockStripe({
      paymentStatus: 'succeeded',
      amount: 1000,
    })

    await expect(
      completeCheckout(
        checkout.id,
        { paymentProvider: 'stripe', paymentId: 'pi_123' },
        { db, stripeClient: stripe },
      ),
    ).rejects.toThrow('Payment amount mismatch')
  })
})
```

### Layer 3: Route Handlers

Minimal or no unit tests. These are thin wrappers - if services work, routes work.

## Shared Test Utilities

### Factories: Valid defaults with easy overrides

```typescript
// src/tests/utils/factories/checkout.factory.ts
export function createCheckout(overrides: Partial<Checkout> = {}): Checkout {
  return {
    id: 'checkout-123',
    email: 'test@example.com',
    cartItems: [
      { productId: 'prod-1', quantity: 1, price: 29.99, title: 'Test Product' },
    ],
    subtotal: '29.99',
    shippingTotal: '5.99',
    total: '35.98',
    shippingAddress: createAddress(),
    shippingRateId: 'standard',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
```

### Mocks: Consistent, predictable, inspectable

```typescript
// src/tests/utils/mocks/stripe.mock.ts
export function createMockStripe(
  options: { paymentStatus?: string; amount?: number } = {},
) {
  return {
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({
        id: 'pi_test',
        status: options.paymentStatus ?? 'succeeded',
        amount: options.amount ?? 3598,
      }),
    },
  }
}
```

### Services with Dependency Injection

```typescript
// src/lib/services/checkout.service.ts
export async function completeCheckout(
  checkoutId: string,
  payment: { paymentProvider: PaymentProvider; paymentId: string },
  deps = { db, stripeClient: stripe, paypalClient: paypal }, // Default to real deps
) {
  // Implementation uses deps.db, deps.stripeClient, etc.
  // Tests can inject mocks
}
```

## Migration Strategy

### Phase 1: Build the foundation

1. Create `src/tests/utils/` directory structure
2. Implement core factories: `checkout.factory.ts`, `order.factory.ts`, `address.factory.ts`
3. Implement core mocks: `db.mock.ts`, `stripe.mock.ts`, `paypal.mock.ts`
4. Create index files for easy imports

### Phase 2: Extract and test (per domain)

For each domain, follow this sequence:

1. Extract validation from route -> `lib/validation/`
2. Write tests for extracted validation
3. Extract business logic -> `lib/business/`
4. Write tests for extracted logic
5. Create service that uses validation + business logic
6. Write service tests with mocked dependencies
7. Update route handler to use the service
8. Delete old test file that tested inline functions

**Domain order (highest value first):**

1. **Checkout** - Most complex, most business logic in routes
2. **Webhooks** - Critical payment handling, currently testing inline functions
3. **Products** - `generateVariantCombinations` already extracted, finish the rest
4. **Orders** - Builds on checkout work

### Phase 3: Clean up

- Delete test files that only test inline functions
- Remove duplicate mock setups across remaining tests
- Update component tests to use shared factories where beneficial

### What stays unchanged

- Component tests (`OrdersTable.test.tsx`, `AddressForm.test.tsx`) - already well-structured
- Hook tests (`useCheckout.test.ts`) - already testing real code with proper mocks
- Simple utility tests (`format.test.ts`, `cart.test.ts`) - already pure functions

## Files to Delete After Migration

These test files currently test inline functions, not production code:

- `src/tests/server/checkout.test.ts` - Replace with `lib/validation/checkout.test.ts` + `lib/services/checkout.service.test.ts`
- `src/tests/server/webhooks.test.ts` - Replace with `lib/services/webhook.service.test.ts`
- `src/tests/server/products.test.ts` - Replace with `lib/validation/product.test.ts`

## Success Criteria

1. **Tests verify production code** - No inline function definitions in test files
2. **Route handlers are thin** - Under 50 lines, only HTTP concerns
3. **Shared utilities eliminate duplication** - Single source for mocks and factories
4. **Tests are fast** - Pure function tests run in milliseconds
5. **Tests are reliable** - Mocks are simple and predictable
6. **Coverage improves** - Business logic actually tested, not test-only functions

## Example: Before and After

### Before (complete.ts - 270 lines)

Route handler contains:

- Input parsing
- Validation logic
- Checkout access validation
- Payment verification (Stripe + PayPal)
- Order creation transaction
- Email sending logic
- Error handling

### After

**Route handler (30 lines):**

```typescript
POST: async ({ params, request }) => {
  const { checkoutId } = params
  const body = await request.json()

  try {
    const result = await completeCheckout(checkoutId, body)
    return successResponse(result)
  } catch (error) {
    if (error instanceof CheckoutError) {
      return simpleErrorResponse(error.message, error.status)
    }
    return errorResponse('Failed to complete checkout', error)
  }
}
```

**Validation (tested separately):**

- `validateCheckoutForPayment()` - Pure function
- `validatePaymentInput()` - Pure function

**Business logic (tested separately):**

- `buildOrderFromCheckout()` - Pure function
- `buildOrderItems()` - Pure function

**Service (tested with mocks):**

- `completeCheckout()` - Orchestrates validation, payment verification, order creation
