# Test Suite Inconsistencies Report

**Date:** 2025-12-30
**Analyzed:** 80 test files
**Status:** Review only - no changes made

---

## Executive Summary

The test suite migration to centralized utilities is partially complete. While imports are now consistent, there are significant opportunities to further standardize mocks, data factories, and patterns.

| Category       | Status | Files Affected        |
| -------------- | ------ | --------------------- |
| Imports        | Good   | All migrated          |
| Mock patterns  | Poor   | 28+ files duplicating |
| Data factories | Poor   | ~95% not using        |
| QueryClient    | Medium | 13 files redundant    |
| userEvent      | Good   | Mostly consistent     |
| Async patterns | Good   | Minor issues          |

---

## 1. Mock Duplication (Critical)

### Router Mocks - 28 files duplicating

Every file redefines the router mock instead of using a shared pattern:

```typescript
// Duplicated in each file:
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => ({ lang: 'en' }),
}))
```

**Files affected:**

- `src/components/cart/CartDrawer.test.tsx`
- `src/components/layout/Navbar.test.tsx`
- `src/components/products/ProductCard.test.tsx`
- `src/components/checkout/AddressForm.test.tsx`
- `src/components/admin/orders/*.test.tsx` (multiple)
- `src/components/admin/products/*.test.tsx` (multiple)
- And 20+ more

### i18n Mocks - Similar duplication

```typescript
// Duplicated everywhere:
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
```

**Note:** We have `mockRouter()` and `mockI18n()` in `src/test/mocks/` but they can't be used directly in `vi.mock()` due to hoisting. These serve as reference implementations.

---

## 2. Data Factory Adoption (Critical)

### Current state: ~95% tests using hardcoded data

We have factories in `src/test/factories/data.ts`:

- `createProduct()`
- `createCartItem()`
- `createUser()`
- `createOrder()`
- `createAddress()`
- etc.

**Only 1-2 files using them.** Most tests define inline constants:

```typescript
// Common pattern (bad):
const MOCK_PRODUCT = {
  id: '1',
  name: 'Test Product',
  price: 99.99,
  // ... 20 more fields
}

// Should be:
const product = createProduct({ price: 99.99 })
```

**Files with hardcoded data:**
| File | Mock Constants |
|------|---------------|
| `ProductCard.test.tsx` | `MOCK_PRODUCT` |
| `OrderDetail.test.tsx` | `MOCK_ORDER` (50+ lines) |
| `OrderSummary.test.tsx` | `MOCK_ITEMS` |
| `useCheckout.test.ts` | `MOCK_CHECKOUT`, `MOCK_SHIPPING_RATES` |
| `cart.test.ts` | `MOCK_PRODUCT_1`, `MOCK_PRODUCT_2` |
| `ProductTable.test.tsx` | `mockProducts` array |
| `CollectionTable.test.tsx` | `mockCollections` |
| And 15+ more | Various |

---

## 3. QueryClient Redundancy (High)

### 13 files creating their own QueryClient

The `test-utils.tsx` now includes `QueryClientProvider` automatically, but these files still create their own:

```typescript
// Redundant pattern:
const queryClient = new QueryClient({ ... })
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)
render(<Component />, { wrapper })

// Should just be:
render(<Component />)  // QueryClientProvider is automatic
```

**Files affected:**

- `src/components/admin/products/ProductsList.test.tsx`
- `src/components/admin/products/ProductForm.test.tsx`
- `src/components/admin/collections/CollectionForm.test.tsx`
- `src/components/admin/collections/components/CollectionTable.test.tsx`
- `src/components/admin/collections/components/BulkActionsBar.test.tsx`
- `src/components/admin/products/components/BulkActionsBar.test.tsx`
- `src/components/admin/products/components/ProductTable.test.tsx`
- `src/hooks/useProductStats.test.tsx`
- `src/hooks/useDataTable.test.tsx`
- And 4+ more

---

## 4. Unnecessary act() Wrappers (Medium)

### Navbar.test.tsx wraps render in act()

```typescript
// Current (unnecessary):
await act(async () => {
  render(<Navbar />)
})

// Should be:
render(<Navbar />)
```

**Files with unnecessary act():**

- `src/components/layout/Navbar.test.tsx` - 8 instances
- `src/components/checkout/AddressForm.test.tsx` - form ref submission

---

## 5. fireEvent vs userEvent (Low)

### 6 files still using fireEvent

Best practice is `userEvent` for user interactions, `fireEvent` only for edge cases.

```typescript
// Found in some files:
fireEvent.submit(form)

// Prefer:
await user.click(submitButton)
```

**Files using fireEvent:**

- `src/components/ui/fn-form.test.tsx`
- `src/components/checkout/AddressForm.test.tsx`
- 4 others (form submission scenarios)

---

## 6. Hook Mock Inconsistencies (Medium)

### Different patterns for same hooks

**useCartStore mocked 3 different ways:**

```typescript
// Pattern 1 (CartDrawer.test.tsx):
vi.mock('../../hooks/useCart', () => ({
  useCart: () => ({ items: MOCK_ITEMS, removeItem: mockRemoveItem }),
}))

// Pattern 2 (Navbar.test.tsx):
vi.mock('../../stores/cartStore', () => ({
  useCartStore: (selector) => selector({ items: mockCartItems }),
}))

// Pattern 3 (ProductCard.test.tsx):
vi.mock('../../hooks/useCart', () => ({
  useCartStore: { getState: () => ({ addItem: mockAddItem }) },
}))
```

---

## 7. Test Structure Inconsistencies (Low)

### Describe block naming varies

```typescript
// Some files:
describe('ComponentName Component', () => {})

// Others:
describe('ComponentName', () => {})

// Others:
describe('ComponentName Component Tests', () => {})
```

### Nested structure varies

Some tests are deeply nested (3-4 levels), others are flat.

---

## 8. Missing Test Coverage

### Areas with limited coverage:

1. **Error boundaries** - No error boundary tests found
2. **Accessibility (a11y)** - Limited ARIA/accessibility assertions
3. **Error states** - Many components only test happy path
4. **Loading states** - Inconsistent skeleton/loading testing
5. **Edge cases** - Empty states, null values, boundaries

---

## Recommendations (Prioritized)

### Phase 1: Quick Wins

1. Remove redundant QueryClient wrappers from 13 files
2. Remove unnecessary `act()` wrappers from Navbar

### Phase 2: Factory Migration

3. Migrate hardcoded test data to factories (15+ files)
4. Add missing factories for orders, collections, etc.

### Phase 3: Mock Consolidation

5. Document the "correct" mock patterns in a guide
6. Gradually update files to follow consistent patterns

### Phase 4: Coverage Gaps

7. Add error boundary tests
8. Add accessibility assertions
9. Improve error state coverage

---

## Files Requiring Most Attention

| File                             | Issues                                |
| -------------------------------- | ------------------------------------- |
| `Navbar.test.tsx`                | Unnecessary act(), redundant mocks    |
| `OrderDetail.test.tsx`           | 50+ lines hardcoded data              |
| `ProductForm.test.tsx`           | Redundant QueryClient                 |
| `CollectionForm.test.tsx`        | Redundant QueryClient                 |
| `ProductTable.test.tsx`          | Hardcoded data, redundant QueryClient |
| `BulkActionsBar.test.tsx` (both) | Redundant QueryClient                 |
| `useCheckout.test.ts`            | Large hardcoded data blocks           |
