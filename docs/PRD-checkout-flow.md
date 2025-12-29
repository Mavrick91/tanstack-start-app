# Checkout Flow - Product Requirements Document (PRD)

## Overview

Implement a complete checkout flow for the e-commerce platform, enabling customers to purchase products with support for guest checkout, optional account creation, and multiple payment providers (Stripe + PayPal).

## User Decisions

| Decision          | Choice                                |
| ----------------- | ------------------------------------- |
| Authentication    | Both guest checkout and account login |
| Payment Providers | Stripe + PayPal                       |
| Shipping          | Flat rate pricing                     |
| Tax               | No tax calculation                    |

---

## 1. User Stories

### Guest Checkout

- As a guest, I can enter my email and shipping address without creating an account
- As a guest, I can optionally create an account after completing my order
- As a guest, I receive an order confirmation email with order details

### Registered Customer

- As a customer, I can log in during checkout to use saved addresses
- As a customer, I can save my address for future orders
- As a customer, I can view my order history in my account

### Payment

- As a customer, I can pay with credit/debit card via Stripe
- As a customer, I can pay with PayPal
- As a customer, I see clear error messages if payment fails

### Order Management

- As a customer, I receive an order confirmation page after successful payment
- As an admin, I can view all orders in the admin dashboard
- As an admin, I can update order status (pending → processing → shipped → delivered)

---

## 2. Database Schema

### New Tables

```sql
-- Customer profiles (extends users table for customer-specific data)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL for guests
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  accepts_marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer addresses
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'shipping',  -- 'shipping' | 'billing'
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  province TEXT,  -- state/province
  province_code TEXT,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  zip TEXT NOT NULL,
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,  -- Human-readable order number (1001, 1002, etc.)
  customer_id UUID REFERENCES customers(id),
  email TEXT NOT NULL,

  -- Financial
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, shipped, delivered, cancelled
  payment_status TEXT NOT NULL DEFAULT 'pending',  -- pending, paid, failed, refunded
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',  -- unfulfilled, partial, fulfilled

  -- Shipping
  shipping_method TEXT,  -- 'standard', 'express'
  shipping_address JSONB NOT NULL,  -- Snapshot of address at time of order
  billing_address JSONB,

  -- Payment
  payment_provider TEXT,  -- 'stripe', 'paypal'
  payment_id TEXT,  -- Stripe PaymentIntent ID or PayPal Order ID

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- Order line items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Snapshot of product at time of order
  title TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  -- Product image snapshot
  image_url TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Shipping rates configuration
CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- 'Standard Shipping', 'Express Shipping'
  price DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),  -- Free shipping threshold
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0
);
```

### Enums

```typescript
// Order status enum
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
])

// Payment status enum
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
])

// Fulfillment status enum
export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'unfulfilled',
  'partial',
  'fulfilled',
])
```

---

## 3. API Endpoints

### Checkout APIs

```
POST /api/checkout/create
  - Creates a checkout session from cart
  - Returns: checkout_id, cart summary

POST /api/checkout/:checkoutId/customer
  - Save customer info (email, optional account creation)
  - Body: { email, firstName, lastName, createAccount?, password? }

POST /api/checkout/:checkoutId/shipping-address
  - Save shipping address
  - Body: { address object }

GET /api/checkout/:checkoutId/shipping-rates
  - Get available shipping rates

POST /api/checkout/:checkoutId/shipping-method
  - Select shipping method
  - Body: { shippingRateId }

POST /api/checkout/:checkoutId/payment/stripe
  - Create Stripe PaymentIntent
  - Returns: clientSecret for Stripe Elements

POST /api/checkout/:checkoutId/payment/paypal
  - Create PayPal order
  - Returns: PayPal order ID

POST /api/checkout/:checkoutId/complete
  - Finalize order after payment confirmation
  - Returns: order confirmation

GET /api/checkout/:checkoutId
  - Get checkout state (for resuming)
```

### Order APIs (Admin)

```
GET /api/orders
  - List orders with pagination, filtering

GET /api/orders/:orderId
  - Get order details

PATCH /api/orders/:orderId/status
  - Update order status
  - Body: { status }
```

### Customer APIs

```
POST /api/customers/register
  - Create customer account

GET /api/customers/me
  - Get current customer profile

GET /api/customers/me/orders
  - Get customer order history

GET /api/customers/me/addresses
  - Get saved addresses

POST /api/customers/me/addresses
  - Add new address

DELETE /api/customers/me/addresses/:addressId
  - Delete address
```

---

## 4. Checkout Flow (Pages)

### Route Structure

```
src/routes/$lang/checkout/
  ├── index.tsx           # Redirect to cart or first step
  ├── information.tsx     # Step 1: Email + Shipping address
  ├── shipping.tsx        # Step 2: Shipping method selection
  ├── payment.tsx         # Step 3: Payment (Stripe/PayPal)
  └── confirmation.tsx    # Order confirmation (thank you page)
```

### Step 1: Information (`/checkout/information`)

**UI Components:**

- Email input (with "already have account? Log in" link)
- Login modal/drawer (optional)
- Shipping address form:
  - First name, Last name
  - Company (optional)
  - Address line 1, Address line 2 (optional)
  - City, State/Province, ZIP/Postal code
  - Country (dropdown)
  - Phone (optional)
- "Save this address" checkbox (if logged in)
- Order summary sidebar (cart items, subtotal)

**Validation:**

- Email: required, valid format
- First/Last name: required
- Address1, City, Country, ZIP: required

### Step 2: Shipping (`/checkout/shipping`)

**UI Components:**

- Shipping address summary (with "Change" link)
- Shipping method options:
  - Standard Shipping - $X.XX (5-7 business days)
  - Express Shipping - $X.XX (2-3 business days)
  - Free Shipping (if over threshold)
- Order summary with shipping cost added

### Step 3: Payment (`/checkout/payment`)

**UI Components:**

- Contact & shipping summary
- Payment method tabs:
  - **Credit Card (Stripe)**
    - Stripe Elements (Card Number, Expiry, CVC)
    - Billing address (same as shipping checkbox)
  - **PayPal**
    - PayPal button (redirects to PayPal)
- Order summary with final total
- "Complete Order" button

**Stripe Integration:**

- Use `@stripe/stripe-js` and `@stripe/react-stripe-js`
- Create PaymentIntent on server
- Handle 3D Secure authentication
- Confirm payment on client

**PayPal Integration:**

- Use `@paypal/react-paypal-js`
- Create order on server
- Capture payment after approval

### Step 4: Confirmation (`/checkout/confirmation`)

**UI Components:**

- Success message with order number
- Order details:
  - Items purchased
  - Shipping address
  - Shipping method
  - Payment method (last 4 digits for card)
  - Order total
- "Create Account" prompt (for guests)
- "Continue Shopping" button
- Email confirmation notice

---

## 5. Shipping Configuration

### Flat Rate Options

```typescript
const SHIPPING_RATES = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 5.99,
    estimatedDays: '5-7 business days',
  },
  {
    id: 'express',
    name: 'Express Shipping',
    price: 14.99,
    estimatedDays: '2-3 business days',
  },
]

// Optional: Free shipping threshold
const FREE_SHIPPING_THRESHOLD = 75.0
```

---

## 6. Payment Integration

### Stripe Setup

**Environment Variables:**

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Webhook Events to Handle:**

- `payment_intent.succeeded` - Mark order as paid
- `payment_intent.payment_failed` - Mark payment failed

### PayPal Setup

**Environment Variables:**

```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # or 'live'
```

**Flow:**

1. Create order on server
2. Customer approves on PayPal
3. Capture payment on server
4. Finalize order

---

## 7. Email Notifications

### Transactional Emails (via Resend/SendGrid)

1. **Order Confirmation**
   - Sent after successful payment
   - Contains: order number, items, totals, shipping address

2. **Shipping Confirmation** (future)
   - Sent when order marked as shipped
   - Contains: tracking number, carrier link

---

## 8. Admin Order Management

### Orders List Page (`/admin/orders`)

**Features:**

- Table with columns: Order #, Customer, Total, Payment Status, Fulfillment, Date
- Filters: status, payment status, date range
- Search by order number or email
- Pagination

### Order Detail Page (`/admin/orders/:orderId`)

**Features:**

- Order summary (items, totals)
- Customer info (email, phone)
- Shipping address
- Payment details
- Status update dropdown
- Order timeline (status changes)

---

## 9. Implementation Phases

### Phase 1: Foundation (Database + Basic APIs)

1. Create database migrations for new tables
2. Implement customer registration/login
3. Create checkout session API
4. Build address form component

### Phase 2: Checkout UI

1. Create checkout layout with progress steps
2. Build information page (email + address)
3. Build shipping page (method selection)
4. Implement order summary component

### Phase 3: Payment Integration

1. Integrate Stripe Elements
2. Create PaymentIntent API
3. Handle payment confirmation
4. Integrate PayPal SDK
5. Create PayPal order API

### Phase 4: Order Completion

1. Create order from checkout
2. Build confirmation page
3. Clear cart after success
4. Implement order confirmation email

### Phase 5: Admin Orders

1. Build orders list page
2. Build order detail page
3. Implement status updates
4. Add orders to admin nav

### Phase 6: Customer Account

1. Customer order history page
2. Saved addresses management
3. Account settings page

---

## 10. Files to Create/Modify

### New Files

```
# Database
src/db/schema.ts (modify - add new tables)
drizzle/migrations/XXXX_add_checkout_tables.sql

# API Routes
src/routes/api/checkout/create.ts
src/routes/api/checkout/[checkoutId]/customer.ts
src/routes/api/checkout/[checkoutId]/shipping-address.ts
src/routes/api/checkout/[checkoutId]/shipping-rates.ts
src/routes/api/checkout/[checkoutId]/shipping-method.ts
src/routes/api/checkout/[checkoutId]/payment/stripe.ts
src/routes/api/checkout/[checkoutId]/payment/paypal.ts
src/routes/api/checkout/[checkoutId]/complete.ts
src/routes/api/orders/index.ts
src/routes/api/orders/[orderId].ts
src/routes/api/customers/register.ts
src/routes/api/customers/me.ts
src/routes/api/customers/me/orders.ts
src/routes/api/customers/me/addresses.ts
src/routes/api/webhooks/stripe.ts
src/routes/api/webhooks/paypal.ts

# Checkout Pages
src/routes/$lang/checkout/index.tsx
src/routes/$lang/checkout/information.tsx
src/routes/$lang/checkout/shipping.tsx
src/routes/$lang/checkout/payment.tsx
src/routes/$lang/checkout/confirmation.tsx

# Customer Account Pages
src/routes/$lang/account/index.tsx
src/routes/$lang/account/orders.tsx
src/routes/$lang/account/orders/[orderId].tsx
src/routes/$lang/account/addresses.tsx

# Admin Order Pages
src/routes/admin/orders/index.tsx
src/routes/admin/orders/[orderId].tsx

# Components
src/components/checkout/CheckoutLayout.tsx
src/components/checkout/OrderSummary.tsx
src/components/checkout/AddressForm.tsx
src/components/checkout/ShippingMethodSelector.tsx
src/components/checkout/StripePaymentForm.tsx
src/components/checkout/PayPalButton.tsx
src/components/checkout/CheckoutProgress.tsx
src/components/admin/orders/OrdersTable.tsx
src/components/admin/orders/OrderDetail.tsx
src/components/admin/orders/OrderStatusBadge.tsx

# Hooks
src/hooks/useCheckout.ts
src/hooks/useCustomer.ts

# Libraries
src/lib/stripe.ts
src/lib/paypal.ts
src/lib/email.ts

# Types
src/types/checkout.ts
src/types/order.ts
```

### Dependencies to Add

```json
{
  "@stripe/stripe-js": "^2.x",
  "@stripe/react-stripe-js": "^2.x",
  "stripe": "^14.x",
  "@paypal/react-paypal-js": "^8.x",
  "@paypal/paypal-js": "^8.x"
}
```

---

## 11. Security Considerations

1. **Payment Security**
   - Never store full card numbers
   - Use Stripe Elements (PCI compliant)
   - Validate webhook signatures

2. **Session Security**
   - Checkout sessions expire after 24 hours
   - Validate checkout ownership

3. **Input Validation**
   - Validate all address fields
   - Sanitize email input
   - Verify cart items exist and are available

4. **Rate Limiting**
   - Limit checkout creation (prevent abuse)
   - Limit payment attempts

---

## 12. Success Metrics

- Checkout completion rate
- Average time to complete checkout
- Payment success rate
- Cart abandonment rate
- Most used payment method
