# Checkout API Integration Tests Design

## Overview

Add integration tests for the checkout API routes using real database transactions that roll back after each test. This provides high-confidence testing of the critical checkout flow without leaving test data behind.

## Scope

### Routes to Test (in checkout flow order)

1. `POST /api/checkout/create` - Create checkout from cart items
2. `POST /api/checkout/$checkoutId/customer` - Save customer email
3. `POST /api/checkout/$checkoutId/shipping-address` - Save shipping address
4. `POST /api/checkout/$checkoutId/shipping-method` - Select shipping method
5. `POST /api/checkout/$checkoutId/complete` - Complete checkout, create order

### Out of Scope (for now)

- Payment endpoints (Stripe/PayPal) - require external mocking
- Webhook handlers - different testing pattern needed
- Auth routes - separate effort

## Technical Approach

### Transaction Wrapper Pattern

Each test runs inside a database transaction that rolls back on completion:

```typescript
await withTestTransaction(async (tx) => {
  // All DB operations use this transaction
  // Automatically rolls back after test
})
```

### API Handler Testing

Test route handlers directly (not via HTTP) by:
1. Creating a mock `Request` object
2. Calling the handler function
3. Asserting on the `Response`

This avoids needing a running server while still testing real handler logic.

### Dependency Injection

Use Vitest module mocking to swap the `db` import with the transaction instance for each test.

## Test Infrastructure

### New Files

```
src/test/helpers/
├── db-transaction.ts   # Transaction wrapper utility
└── api-test.ts         # Request/Response helpers for API tests
```

### Test Files

```
src/tests/routes/api/checkout/
├── create.test.ts
├── customer.test.ts
├── shipping-address.test.ts
├── shipping-method.test.ts
└── complete.test.ts
```

## Test Cases

### `create.test.ts`

| Test | Description |
|------|-------------|
| Creates checkout with valid cart items | Happy path - products exist, returns checkout ID |
| Rejects empty cart | Returns 400 error |
| Rejects invalid product IDs | Returns 500 with "Product not found" |
| Calculates totals correctly | Subtotal, tax, shipping match expected |
| Sets checkout session cookie | Response includes Set-Cookie header |
| Handles rate limiting | Returns 429 when limit exceeded |

### `customer.test.ts`

| Test | Description |
|------|-------------|
| Saves customer email | Updates checkout with email |
| Rejects invalid email format | Returns validation error |
| Rejects expired checkout | Returns 400 for expired session |
| Rejects completed checkout | Cannot modify completed checkout |

### `shipping-address.test.ts`

| Test | Description |
|------|-------------|
| Saves valid shipping address | All required fields present |
| Rejects missing required fields | Returns validation errors |
| Validates country/state codes | Rejects invalid codes |
| Updates checkout totals | Recalculates tax based on address |

### `shipping-method.test.ts`

| Test | Description |
|------|-------------|
| Saves valid shipping method | Updates checkout with rate |
| Rejects invalid shipping rate ID | Returns 400 error |
| Updates checkout total | Adds shipping cost to total |
| Requires shipping address first | Returns error if no address |

### `complete.test.ts`

| Test | Description |
|------|-------------|
| Creates order from checkout | Happy path - all data present |
| Requires customer email | Returns error if missing |
| Requires shipping address | Returns error if missing |
| Requires shipping method | Returns error if missing |
| Marks checkout as completed | Sets completedAt timestamp |
| Prevents double completion | Returns error if already completed |
| Decrements inventory | Product variant quantities updated |

## Implementation Plan

1. Create `db-transaction.ts` helper
2. Create `api-test.ts` helper with request/response utilities
3. Write `create.test.ts` with full test coverage
4. Write `customer.test.ts`
5. Write `shipping-address.test.ts`
6. Write `shipping-method.test.ts`
7. Write `complete.test.ts`
8. Run full test suite, verify no regressions

## Success Criteria

- All new tests pass
- Existing tests unaffected
- No test data left in database after runs
- Coverage increase for `src/routes/api/checkout/` files
