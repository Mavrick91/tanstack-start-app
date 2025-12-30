# Test Cleanup & Validation Extraction

## Problem

Two test files (`checkout-api.test.ts`, `customers.test.ts`) define and test fake inline functions instead of testing real code. This provides zero coverage and wastes 1,463 lines.

Example anti-pattern:
```typescript
it('should reject request without items', () => {
  const validateItems = (items: unknown) => {  // Fake function defined in test
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { valid: false, error: 'Cart items are required' }
    }
    return { valid: true }
  }
  expect(validateItems(null)).toEqual({...})  // Testing the fake, not real code
})
```

## Solution

1. Delete the fake test files
2. Extract remaining inline validation from routes into modules
3. Add proper tests for extracted validators

## Scope

### Delete (1,463 lines of fake tests)

| File | Lines | Reason |
|------|-------|--------|
| `src/tests/server/checkout-api.test.ts` | 1,055 | Tests fake inline functions |
| `src/tests/server/customers.test.ts` | 408 | Tests fake inline functions |

### Create

#### `src/lib/validation/email.ts`

```typescript
import type { ValidationResult } from './checkout'

export function validateEmailRequired(
  email: string | null | undefined
): ValidationResult

export function validateEmailFormat(email: string): ValidationResult

export function validateEmail(
  email: string | null | undefined
): ValidationResult
```

Extracted from:
- `src/routes/api/checkout/$checkoutId/customer.ts:23-30`
- `src/routes/api/customers/register.ts:47-54`

#### `src/lib/validation/address.ts`

```typescript
import type { AddressSnapshot } from '../../db/schema'
import type { ValidationResult } from './checkout'

export interface AddressInput {
  firstName?: string
  lastName?: string
  address1?: string
  city?: string
  country?: string
  countryCode?: string
  zip?: string
  company?: string
  address2?: string
  province?: string
  provinceCode?: string
  phone?: string
}

export function validateAddressFields(address: AddressInput): ValidationResult

export function normalizeAddress(address: AddressInput): AddressSnapshot
```

Extracted from:
- `src/routes/api/checkout/$checkoutId/shipping-address.ts:42-59`

#### Test Files

- `src/lib/validation/email.test.ts`
- `src/lib/validation/address.test.ts`

Following the pattern established in `src/lib/validation/checkout.test.ts`:
- Import real functions
- Use factories where applicable
- Test edge cases (null, undefined, empty, whitespace)
- No inline fake functions

### Update

#### Routes to refactor

| Route | Change |
|-------|--------|
| `src/routes/api/checkout/$checkoutId/customer.ts` | Use `validateEmail()` |
| `src/routes/api/checkout/$checkoutId/shipping-address.ts` | Use `validateAddressFields()`, `normalizeAddress()` |
| `src/routes/api/customers/register.ts` | Use `validateEmail()` |

#### Index exports

Update `src/lib/validation/index.ts` to export new modules.

## File Structure After

```
src/lib/validation/
├── checkout.ts          # existing
├── checkout.test.ts     # existing
├── payment.ts           # existing
├── payment.test.ts      # existing
├── email.ts             # new
├── email.test.ts        # new
├── address.ts           # new
├── address.test.ts      # new
└── index.ts             # updated
```

## Implementation Order

1. Create `email.ts` and `email.test.ts`
2. Create `address.ts` and `address.test.ts`
3. Update `index.ts` exports
4. Update routes to use new validators
5. Delete fake test files
6. Run tests to verify nothing broke
