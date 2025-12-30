# Test Suite Improvements Design

## Overview

Systematic improvements to the test suite addressing 7 identified issues: CSS class assertions, under-tested components, form testing inconsistency, misplaced logic tests, untested drag-and-drop, missing error coverage, and deferred integration tests.

## Decisions Made

| Issue                         | Decision                                         |
| ----------------------------- | ------------------------------------------------ |
| CSS Class Assertions          | Delete styling tests entirely                    |
| Under-Tested Components       | Full coverage for CartDrawer, focused for Navbar |
| Form Testing Inconsistency    | Standardize on `userEvent.setup()`               |
| Logic Tests Outside Component | Extract to `src/lib/image-utils.ts`              |
| Drag-and-Drop Not Tested      | Test reorder callback via mock                   |
| Missing Error Coverage        | Comprehensive for all data-fetching components   |
| Integration Tests             | Deferred to separate task                        |

---

## 1. CSS Class Assertion Cleanup

### Files

- `src/components/admin/orders/OrderStatusBadge.test.tsx`
- `src/components/products/ProductGallery.test.tsx`

### Changes

**OrderStatusBadge.test.tsx:**

- Delete `describe('Status Styling')` block (lines 73-144)
- Delete `describe('Common Badge Styles')` block (lines 165-197)
- Keep: rendering tests, unknown status handling, default type

**ProductGallery.test.tsx:**

- Delete `describe('Styling')` block (lines 113-149)
- Keep: empty state, single/multiple image rendering, fancybox attributes

### Rationale

Tests coupled to Tailwind implementation break on design changes despite no functional change.

---

## 2. CartDrawer Test Expansion

### File

`src/components/cart/CartDrawer.test.tsx`

### New Tests

```typescript
describe('Cart Interactions', () => {
  it('should call updateQuantity when increment button clicked')
  it('should call updateQuantity when decrement button clicked')
  it('should call removeItem when remove button clicked')
  it('should navigate to checkout when checkout button clicked')
})

describe('Empty Cart State', () => {
  it('should show empty cart message when no items')
  it('should hide checkout button when cart is empty')
})
```

### Mock Updates

- Make `removeItem` and `updateQuantity` accessible as spies
- Add empty cart state mock configuration
- Mock `useNavigate` for checkout navigation verification

---

## 3. Navbar Test Expansion

### File

`src/components/layout/Navbar.test.tsx`

### New Tests

```typescript
describe('Cart Drawer Interaction', () => {
  it('should open cart drawer when cart button clicked')
  it('should show item count badge when cart has items')
})

describe('Navigation Links', () => {
  it('should have correct href for Products link')
  it('should have correct href for Collections link')
  it('should include language prefix in links')
})

describe('Mobile Menu', () => {
  it('should show mobile menu button on small screens')
  it('should toggle mobile menu when hamburger clicked')
  it('should close mobile menu when link clicked')
})
```

### Mock Updates

- Update `useCartStore` mock for item count
- Track CartDrawer open state
- Consider `window.matchMedia` mock for mobile tests

---

## 4. Form Testing Standardization

### Files

- `src/components/admin/products/ImageUploader.test.tsx`
- Any other form tests using `fireEvent`

### Pattern Change

```typescript
// BEFORE:
fireEvent.change(altTextInputs[0], { target: { value: 'Updated' } })

// AFTER:
const user = userEvent.setup()
await user.clear(altTextInputs[0])
await user.type(altTextInputs[0], 'Updated')
```

### Tests to Update in ImageUploader.test.tsx

- `should call onChange when alt text is updated`
- `should call onChange when image is removed`
- `should preserve remaining images after removing one`
- `should correctly pass the remaining 4 images after deletion`

---

## 5. Extract ProductForm Logic to Utility

### New File: `src/lib/image-utils.ts`

```typescript
export function isBlobUrl(url: string): boolean
export function isCloudinaryUrl(url: string): boolean
export function getImagesNeedingUpload<T extends { url: string }>(
  images: T[],
): T[]
export function getAlreadyUploadedImages<T extends { url: string }>(
  images: T[],
): T[]
export function getRemovedImageUrls(
  original: { url: string }[],
  current: { url: string }[],
): string[]
```

### New File: `src/lib/image-utils.test.ts`

Move all logic tests from ProductForm.test.tsx here.

### ProductForm.test.tsx Changes

- Delete `describe('Image Handling Logic')` block (lines 280-490)
- Keep component rendering tests only

---

## 6. ImageUploader Drag Reorder Testing

### File

`src/components/admin/products/ImageUploader.test.tsx`

### New Tests

```typescript
describe('Image Reordering', () => {
  it('should call onChange with reordered array when first image moved to last')
  it('should maintain image data integrity after reorder')
})
```

### Implementation

1. Update dnd-kit mock to capture `onDragEnd` callback
2. Call with simulated `DragEndEvent` containing `active.id` and `over.id`
3. Assert `onChange` receives correctly reordered array

---

## 7. Error Scenario Coverage

### Files to Update

- `src/components/checkout/AddressForm.test.tsx`
- `src/components/admin/products/ProductForm.test.tsx`
- `src/components/checkout/PayPalButton.test.tsx`
- `src/components/admin/products/ProductsList.test.tsx`
- `src/components/admin/orders/OrdersTable.test.tsx`

### Pattern for Form Errors

```typescript
describe('Error Handling', () => {
  it('should display error message when submission fails')
  it('should allow retry after error')
  it('should not clear form data on error')
})
```

### Pattern for Data-Fetching Errors

```typescript
describe('Error States', () => {
  it('should show error message when fetch fails')
  it('should show retry button on error')
})
```

---

## 8. Deferred: Integration Tests

Multi-step flow tests (address → shipping → payment → confirmation) deferred to separate task.

---

## Files Summary

| Action            | File                          |
| ----------------- | ----------------------------- |
| Delete tests      | `OrderStatusBadge.test.tsx`   |
| Delete tests      | `ProductGallery.test.tsx`     |
| Add tests         | `CartDrawer.test.tsx`         |
| Add tests         | `Navbar.test.tsx`             |
| Refactor          | `ImageUploader.test.tsx`      |
| Delete + refactor | `ProductForm.test.tsx`        |
| Create            | `src/lib/image-utils.ts`      |
| Create            | `src/lib/image-utils.test.ts` |
| Add tests         | `AddressForm.test.tsx`        |
| Add tests         | `PayPalButton.test.tsx`       |
| Add tests         | `ProductsList.test.tsx`       |
| Add tests         | `OrdersTable.test.tsx`        |
