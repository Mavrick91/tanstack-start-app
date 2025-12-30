# Test Standardization Design

**Date:** 2025-12-30
**Status:** Approved
**Scope:** All 8 categories from inconsistencies report (80 test files)

---

## Overview

Standardize the test suite by building proper infrastructure first, documenting standards, then systematically migrating existing tests.

**Approach:** Infrastructure First

1. Enhance `src/test/` utilities with global mocks and more factories
2. Write the testing standards guide
3. Migrate files systematically using the guide as reference

---

## Section 1: Infrastructure Enhancements

### Global Mocks in `src/test/setup.ts`

Add to existing setup.ts:

```typescript
// =============================================================================
// Global Mocks (tests can override with vi.mock in individual files)
// =============================================================================

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => ({ lang: 'en' }),
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}))
```

### Override Pattern for Tests

When a test needs different behavior:

```typescript
// In specific test file - this overrides the global mock
vi.mock('@tanstack/react-router', () => ({
  ...vi.importActual('@tanstack/react-router'),
  useParams: () => ({ lang: 'fr', productId: '123' }),
}))
```

---

## Section 2: Data Factories

### Extend `src/test/factories/data.ts`

Current factories (keep):

- `createProduct()`
- `createCartItem()`
- `createUser()`
- `createOrder()`
- `createAddress()`

Add missing:

- `createCollection()` - For collection tests
- `createCheckout()` - For checkout flow tests
- `createShippingRate()` - For shipping tests
- `createOrderItem()` - For order detail tests
- `createProductVariant()` - For variant-specific tests
- `createProductImage()` - For image upload tests

### Factory Design Principles

1. **Minimal defaults** - Only required fields, tests add what they need
2. **Incrementing IDs** - `product-1`, `product-2` via counter (already implemented)
3. **Override-friendly** - Spread pattern: `createProduct({ price: 50 })`
4. **Realistic relationships** - `createOrder()` includes valid `orderItems`

### Example Factory Structure

```typescript
export function createCollection(
  overrides: Partial<Collection> = {},
): Collection {
  const id = `collection-${nextId('collection')}`
  return {
    id,
    name: { en: 'Test Collection', fr: 'Collection Test' },
    slug: id,
    description: { en: 'Description', fr: 'Description' },
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
```

---

## Section 3: Testing Standards Guide

### Location & Structure

Create `docs/testing-standards.md` with these sections:

```markdown
# Testing Standards Guide

## Quick Start

- Import pattern (one-liner)
- Basic test structure template

## Global Mocks (automatic)

- What's mocked by default (router, i18n)
- How to override when needed

## Data Factories

- Available factories with examples
- When to use factories vs inline data

## Component Testing Patterns

- Rendering with QueryClient (automatic)
- userEvent setup
- Async patterns (waitFor, findBy)

## Common Scenarios

- Testing forms (FNForm)
- Testing modals/dialogs
- Testing with cart state
- Testing with auth state

## Anti-patterns

- Don't wrap render in act()
- Don't create your own QueryClient
- Don't use fireEvent for user actions
```

### Key Standards

| Topic           | Standard                                                               |
| --------------- | ---------------------------------------------------------------------- |
| Describe naming | `describe('ComponentName', () => {})` - no "Component" suffix          |
| Nesting depth   | Max 2 levels: describe → it (or describe → describe → it for variants) |
| Test naming     | `it('does X when Y')` - behavior focused                               |
| Assertions      | Prefer `getByRole` over `getByTestId`                                  |

---

## Section 4: Migration Strategy

### File Migration Order

Process files by impact, fixing ALL issues in each file before moving on:

**Batch 1: High-Impact Files (7 files)**
Files with 3+ issues from the report:

- `Navbar.test.tsx` - act() wrappers, redundant mocks
- `OrderDetail.test.tsx` - 50+ lines hardcoded data
- `ProductForm.test.tsx` - redundant QueryClient
- `CollectionForm.test.tsx` - redundant QueryClient
- `ProductTable.test.tsx` - hardcoded data, redundant QueryClient
- `BulkActionsBar.test.tsx` (products) - redundant QueryClient
- `BulkActionsBar.test.tsx` (collections) - redundant QueryClient

**Batch 2: QueryClient Cleanup (6 remaining files)**

- `ProductsList.test.tsx`
- `CollectionTable.test.tsx`
- `useProductStats.test.tsx`
- `useDataTable.test.tsx`
- Plus 2 others identified in report

**Batch 3: Factory Migration (~15 files)**
Files with hardcoded `MOCK_*` constants:

- `ProductCard.test.tsx`
- `OrderSummary.test.tsx`
- `useCheckout.test.ts`
- `cart.test.ts`
- And others

**Batch 4: Remaining Cleanup**

- fireEvent → userEvent (6 files)
- Hook mock standardization
- Describe block naming consistency

### Per-File Checklist

For each file:

1. Remove redundant `vi.mock('@tanstack/react-router')` (now global)
2. Remove redundant `vi.mock('react-i18next')` (now global)
3. Remove custom QueryClient wrapper (use automatic one)
4. Replace `MOCK_*` constants with factory calls
5. Remove unnecessary `act()` wrappers
6. Replace `fireEvent` with `userEvent` where applicable

---

## Section 5: Verification & Rollback

### After Each Batch

Run full test suite to catch regressions:

```bash
npm run test
```

If tests fail:

- Fix immediately before proceeding
- If global mock causes issues, add override in specific test file
- Document edge cases in the testing guide

### Commit Strategy

One commit per batch for easy rollback:

1. `feat(test): add global mocks for router and i18n`
2. `feat(test): add missing data factories`
3. `docs: add testing standards guide`
4. `refactor(test): migrate batch 1 high-impact files`
5. `refactor(test): remove redundant QueryClient wrappers`
6. `refactor(test): migrate to data factories`
7. `refactor(test): final cleanup (fireEvent, naming)`

### Success Criteria

| Metric                        | Before | After      |
| ----------------------------- | ------ | ---------- |
| Files with router mock        | 15     | 0 (global) |
| Files with i18n mock          | 21     | 0 (global) |
| Files with custom QueryClient | 13     | 0          |
| Files using factories         | ~5%    | ~95%       |
| All tests passing             | ✓      | ✓          |

---

## Files Reference

### High-Priority Files (from report)

| File                             | Issues                                |
| -------------------------------- | ------------------------------------- |
| `Navbar.test.tsx`                | Unnecessary act(), redundant mocks    |
| `OrderDetail.test.tsx`           | 50+ lines hardcoded data              |
| `ProductForm.test.tsx`           | Redundant QueryClient                 |
| `CollectionForm.test.tsx`        | Redundant QueryClient                 |
| `ProductTable.test.tsx`          | Hardcoded data, redundant QueryClient |
| `BulkActionsBar.test.tsx` (both) | Redundant QueryClient                 |
| `useCheckout.test.ts`            | Large hardcoded data blocks           |
