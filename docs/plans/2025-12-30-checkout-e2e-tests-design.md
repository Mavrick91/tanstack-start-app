# E2E Checkout Test Suite Design

**Date:** 2025-12-30
**Status:** Approved
**Goal:** Comprehensive regression suite covering all checkout paths

## Decisions

- **Payment testing:** Use real Stripe test mode and PayPal sandbox (not mocks)
- **Coverage:** Happy paths, validation errors, and edge cases
- **Organization:** Split by scenario type (4 test files)
- **Data isolation:** Each test seeds fresh data
- **Environment:** Local dev server + local Postgres (CI later)

---

## Test File Structure

```
e2e/
├── tests/
│   └── checkout/
│       ├── happy-paths.spec.ts      # Core successful flows
│       ├── validation.spec.ts        # Form & input validation errors
│       ├── edge-cases.spec.ts        # Navigation, session, concurrency
│       └── payments.spec.ts          # Payment-specific scenarios
├── page-objects/
│   ├── product.page.ts              # (existing)
│   ├── cart.page.ts                 # Cart interactions
│   ├── checkout-info.page.ts        # Information step
│   ├── checkout-shipping.page.ts    # Shipping step
│   ├── checkout-payment.page.ts     # Payment step
│   └── checkout-confirmation.page.ts # Confirmation page
├── helpers/
│   ├── cart.helper.ts               # (existing)
│   ├── db.helper.ts                 # Database seeding & cleanup
│   ├── stripe.helper.ts             # Stripe test card handling
│   └── paypal.helper.ts             # PayPal sandbox helpers
├── fixtures/
│   ├── test-data.ts                 # (existing) - expand with more scenarios
│   └── products.fixture.ts          # Product seeding data
└── playwright.config.ts             # (existing)
```

---

## Test Scenarios

### Happy Paths (`happy-paths.spec.ts`)

**Guest Checkout with Stripe:**

1. Add product to cart → Navigate to checkout
2. Fill customer info (email, name) without creating account
3. Enter shipping address → Select standard shipping
4. Enter Stripe test card (`4242424242424242`) → Complete payment
5. Verify confirmation page shows order number and details
6. Verify order exists in database with correct totals

**Guest Checkout with PayPal:**

1. Same flow through shipping step
2. Click PayPal button → Approve in PayPal sandbox popup
3. Verify capture completes → Confirmation displays
4. Verify order has `paymentProvider: 'paypal'`

**Registered User Checkout:**

1. Create test user account via API/DB seeding
2. Log in → Add product → Start checkout
3. Verify email pre-filled from account
4. Complete checkout with Stripe
5. Verify order linked to `customerId`

**Registered User with Saved Address:**

1. Seed user with existing saved address
2. Start checkout → Verify address auto-populated
3. Skip to shipping method → Complete payment
4. Verify saved address used in order

**Free Shipping Threshold:**

1. Add products totaling $75+ to cart
2. Verify shipping step shows $0 for standard shipping
3. Complete checkout → Verify `shippingTotal: 0` in order

---

### Validation Errors (`validation.spec.ts`)

**Information Step Validation:**

- Submit with empty email → Error message shown, cannot proceed
- Submit with invalid email format (`not-an-email`) → Validation error
- Submit with empty required address fields → Field-level errors
- Submit with invalid postal code format → Validation error

**Account Creation Validation:**

- Check "Create account" with password < 8 chars → Password error
- Check "Create account" with existing email → Duplicate account error
- Uncheck "Create account" → No password required, proceeds as guest

**Shipping Step Validation:**

- Attempt to proceed without selecting shipping method → Error shown
- Verify both Standard and Express options are selectable

**Payment Step - Stripe Errors:**

- Use declined card (`4000000000000002`) → "Card declined" error displayed
- Use insufficient funds card (`4000000000009995`) → Appropriate error
- Use expired card (`4000000000000069`) → "Expired card" error
- Use incorrect CVC card (`4000000000000127`) → CVC error
- Verify user can retry with valid card after error

**Payment Step - PayPal Errors:**

- Cancel PayPal popup → Returns to payment step, can retry
- Verify checkout not marked complete after cancellation

**Empty Cart:**

- Navigate directly to `/checkout/information` with empty cart
- Verify redirect to home or cart page with appropriate message

---

### Edge Cases (`edge-cases.spec.ts`)

**Browser Navigation:**

- Complete info step → Press back → Data persisted, can edit
- Complete shipping step → Press back twice → Info still there
- Use forward/back through entire flow → No data loss
- Refresh page mid-checkout → Session restored, continue from same step

**Session & Expiry:**

- Start checkout → Clear `checkout_session` cookie → Verify graceful handling
- Manually set checkout `expiresAt` to past → "Checkout expired" error
- Start checkout → Simulate 24hr expiry → Cannot complete

**Checkout Recovery:**

- Fill info step → Close browser → Reopen → Checkout ID in localStorage allows resumption
- Complete through payment step → Payment fails → Can retry without re-entering info

**Concurrent/Duplicate Submissions:**

- Double-click submit on payment → Only one order created (idempotency)
- Open checkout in two tabs → Complete in one → Second tab shows appropriate state

**Cart Modifications:**

- Start checkout → Open new tab → Remove item from cart → Original checkout unaffected
- Verify checkout uses price at time of creation

**Address Edge Cases:**

- International address with special characters (ü, ñ, 日本語)
- Very long address lines (near field limits)
- Address with apartment/unit number in line2

---

### Payment-Specific Scenarios (`payments.spec.ts`)

**Stripe Deep Testing:**

- 3D Secure required (`4000002500003155`) → Complete auth → Order created
- 3D Secure fails → Payment rejected, can retry
- Different card brands (Visa, Mastercard, Amex test numbers)
- Verify PaymentIntent metadata contains checkout ID

**PayPal Deep Testing:**

- Complete PayPal sandbox flow with test buyer account
- Verify captured amount matches checkout total exactly
- PayPal order amount mismatch → Capture rejected

**Payment Provider Switching:**

- Start with Stripe → Switch to PayPal → Complete with PayPal
- Verify no orphaned PaymentIntents cause issues
- Switch back to Stripe after PayPal cancellation

**Webhook Verification (optional):**

- Complete Stripe payment → Verify webhook updates order status
- May require webhook tunnel (ngrok) or mock webhook delivery

**Amount Verification:**

- Multiple items → Verify total calculated correctly
- Shipping + tax → Verify payment = subtotal + shipping + tax
- Free shipping → Verify correct final amount charged

---

## Helpers & Fixtures

### Database Helper (`db.helper.ts`)

```typescript
// Seed a test product with variants and images
async function seedProduct(overrides?: Partial<Product>): Promise<Product>

// Seed a test customer (optionally with saved addresses)
async function seedCustomer(options?: {
  withAddress?: boolean
  verified?: boolean
}): Promise<Customer>

// Clean up test data by prefix
async function cleanupTestData(): Promise<void>

// Direct DB connection for assertions
async function getOrder(orderId: string): Promise<Order>
async function getCheckout(checkoutId: string): Promise<Checkout>
```

### Stripe Helper (`stripe.helper.ts`)

```typescript
export const TEST_CARDS = {
  valid: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  expired: '4000000000000069',
  incorrectCvc: '4000000000000127',
  requires3ds: '4000002500003155',
}

// Fill Stripe Elements iframe
async function fillStripeCard(page: Page, cardNumber: string): Promise<void>
```

### PayPal Helper (`paypal.helper.ts`)

```typescript
// Handle PayPal sandbox popup authentication
async function completePayPalSandbox(page: Page, popup: Page): Promise<void>

export const PAYPAL_SANDBOX_BUYER = {
  email: 'sb-buyer@personal.example.com',
  password: 'test-password',
}
```

---

## Configuration

### Playwright Config Updates

```typescript
export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60_000, // Increased for payment flows
  retries: 1,
  fullyParallel: false,
  workers: 3,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

### Environment Variables (`.env.test`)

```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
PAYPAL_CLIENT_ID=sandbox_xxx
PAYPAL_CLIENT_SECRET=sandbox_xxx
PAYPAL_MODE=sandbox
DATABASE_URL=postgresql://...
E2E_TEST_MODE=true
```

### Global Setup (`e2e/global-setup.ts`)

- Verify database connection
- Run migrations if needed
- Clear stale test data from previous runs

---

## Summary

**Test Count:** ~42 tests total

- Happy paths: ~6 tests
- Validation errors: ~12 tests
- Edge cases: ~14 tests
- Payment-specific: ~10 tests

**New Files:**

- 4 test files in `e2e/tests/checkout/`
- 3 helper files in `e2e/helpers/`
- 2 new page objects
- 1 products fixture file
- 1 global setup file
- Updates to `playwright.config.ts`

**Prerequisites:**

- Stripe test mode API keys
- PayPal sandbox account with test buyer
- Local Postgres with dev database

**Execution:**

```bash
npx playwright test checkout/              # All checkout tests
npx playwright test checkout/happy-paths   # Quick smoke test
npx playwright test checkout/ --ui         # Debug with UI
```
