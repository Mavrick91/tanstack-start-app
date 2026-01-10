# FineNail E-Commerce Platform

TanStack Start (SSR/SSG) + PostgreSQL e-commerce application with admin dashboard, multi-language support (en/fr/id), and dual payment processing (Stripe/PayPal). Uses Drizzle ORM, Zustand for client state, React Query for server state, and custom FNForm component for all forms.

---

## Critical Rules

### Component Patterns

- **ALWAYS use FNForm** for forms - never raw form elements or other form libraries
- **NEVER use direct React Testing Library imports** - always import from `@/test/test-utils`
- **UI components from shadcn pattern** - use existing components in `src/components/ui/`, don't create alternatives

### Import Organization

- **Test files follow strict patterns** (see testing-patterns-guide.md):
  - Pattern 1 (no mocks): vitest → component → types → test-utils
  - Pattern 2 (with mocks): vitest → test-utils → mock setup → vi.mock() → component
  - NEVER duplicate global mocks from `src/test/setup.ts`
- **Server function imports**: Use top-level imports (db, schemas) at file top, never inside handlers
- **Path aliases**: Always use `@/` for src imports, never relative paths across directories

### Server Functions Pattern (MANDATORY)

- **PREFER server functions** over API routes for all data operations
- **Structure**:

  ```typescript
  // Top-level imports (db, schemas, middleware)
  import { createServerFn } from '@tanstack/react-start'
  import { db } from '../db'
  import { adminMiddleware } from './middleware'

  export const myServerFn = createServerFn({ method: 'POST' })
    .middleware([adminMiddleware])  // or [authMiddleware]
    .handler(async ({ context }) => {
      // context.user is available and typed
      return { success: true, data: {...} }
    })
  ```

- **Middleware choices**:
  - `adminMiddleware` - Admin-only operations (products, orders management)
  - `authMiddleware` - Any authenticated user
  - No middleware - Public operations

### API Routes (LIMITED USE)

- **ONLY for authentication flows**: login, logout, OAuth callbacks, customer registration
- **Location**: `src/routes/api/auth/` only
- **Pattern**: TanStack Router `createFileRoute` with server handlers
- **Helpers**: Use `successResponse()`, `errorResponse()`, `simpleErrorResponse()` from `@/lib/api`

### File Organization

- **Tests colocated** with source files (ComponentName.test.tsx next to ComponentName.tsx)
- **Server functions** in `src/server/` modules (products.ts, orders.ts, etc.)
- **API routes** in `src/routes/api/auth/` (authentication only)
- **No new utilities** without checking if one already exists in `src/lib/`

---

## Skills Quick Reference

### Mandatory Skills

- **`testing`** - REQUIRED for ANY interaction with test files (.test.ts, .test.tsx)
  - Use BEFORE reading, writing, modifying, or debugging tests
  - Enforces patterns from testing-patterns-guide.md
  - Prevents import order violations and mock duplication

### Architectural Skills

- **`codebase-guide`** - Master reference for understanding the application
  - Use when: Onboarding, exploring architecture, understanding how systems connect
  - Contains: Tech stack overview, directory structure, key patterns
- **`typescript-lsp`** - Code intelligence for navigation
  - Use INSTEAD of grep for: go-to-definition, find references, type checking
  - Faster and more accurate than text search

### Feature Development Skills

- **`forms`** - Build forms with FNForm component
  - Use when: Creating forms, adding validation, building complex form UIs
  - Covers: Grid layouts, custom fields, external control, validation patterns
- **`admin-crud`** - Generate admin dashboard pages
  - Use when: Building admin interfaces, management pages, data tables
  - Covers: Tables, filters, bulk actions, dialogs, forms
- **`database`** - Drizzle ORM operations
  - Use when: Modifying schema, writing queries, migrations, performance optimization
  - Covers: Schema design, relations, migrations, query patterns
- **`i18n`** - Internationalization
  - Use when: Adding translations, working with localized content
  - Covers: i18next for UI, JSONB for database content (en/fr/id)
- **`checkout`** - Checkout flow operations
  - Use when: Modifying checkout, debugging payment issues
  - Covers: Cart, shipping, Stripe/PayPal integration, order completion
- **`design-system`** - Frontend interface design
  - Use when: Building web components, pages, or applications
  - Generates: Production-grade, distinctive UI (avoids generic AI aesthetics)

### Support Skills

- **`debugging`** - Systematic debugging
  - Use when: Encountering bugs, test failures, unexpected behavior
  - Covers: Auth issues, payments, database queries, React components, API routes
- **`security`** - Security auditing
  - Use when: Reviewing security, adding auth, hardening endpoints
  - Covers: Authentication, rate limiting, CSRF, input validation, secure coding
- **`api-routes`** - API endpoint generation (RARELY USED)
  - Use ONLY when: Creating authentication endpoints in `src/routes/api/auth/`
  - Note: For data operations, use server functions instead

### Skill Invocation Rule

**If there's even a 1% chance a skill applies, invoke it.** Skills prevent mistakes and enforce patterns. Don't rationalize skipping them.

---

## Key Utilities (Do Not Reimplement)

### Formatting (`src/lib/format.ts`)

```typescript
import { formatCurrency, formatDate } from '@/lib/format'

// Currency formatting
formatCurrency({ value: 99.99, currency: 'USD', locale: 'en-US' })
// → "$99.99"

// Date formatting
formatDate(new Date(), 'medium') // → "Jan 3, 2026"
formatDate(new Date(), 'datetime') // → "Jan 3, 2026, 10:30 AM"
```

**Rule**: ALWAYS use these for currency/date display. Never reimplement.

### Class Names (`src/lib/utils.ts`)

```typescript
import { cn } from '@/lib/utils'

// Merge Tailwind classes with conflict resolution
cn('px-2 py-1', props.className)
```

**Rule**: Use `cn()` for all className merging. Never use string concatenation.

### API Helpers (`src/lib/api.ts`)

```typescript
// For API routes only (auth endpoints)
import {
  successResponse, // { success: true, ...data }
  errorResponse, // { success: false, error, details }
  simpleErrorResponse, // { success: false, error }
  requireAuth, // Check authentication
  requireAdmin, // Check admin role
  emptyToNull, // Convert empty strings to null
} from '@/lib/api'
```

### Server Middleware (`src/server/middleware.ts`)

```typescript
// For server functions (primary pattern)
import {
  authMiddleware, // Requires valid session
  adminMiddleware, // Requires admin role
  customerMiddleware, // Requires customer profile
} from '@/server/middleware'
```

### Session Management (`src/server/session.ts`)

```typescript
import { getAppSession } from '@/server/session'

const session = await getAppSession()
// session.data contains: { userId, email, role }
```

### Database (`src/db/`)

```typescript
import { db } from '@/db'
import { products, orders, users } from '@/db/schema'
```

**Rule**: Import db and schemas at top-level in server functions. Never inside handlers.

### Other Critical Utilities

- **Authentication**: `src/lib/auth.ts` - verifyPassword, hashPassword, session management
- **CSRF Protection**: `src/lib/csrf.ts` - validateCsrf, generateCsrfToken
- **Rate Limiting**: `src/lib/rate-limit.ts` - rateLimiter
- **i18n**: `src/lib/i18n.ts` - getLocalizedValue, localization helpers
- **Payments**: `src/lib/stripe.ts`, `src/lib/paypal.ts` - Payment integrations
- **Images**: `src/lib/cloudinary.ts`, `src/lib/image-utils.ts` - Upload/optimization
- **Email**: `src/lib/email.ts` - SendGrid integration

### Discovery Rule

**Before creating any utility function, check if it exists in `src/lib/` or `src/server/`**. Use Glob or typescript-lsp to search.

---

## Architecture Principles (Why Things Work This Way)

### Server Functions Over API Routes

**Why**: Type safety, better DX, automatic serialization, no manual Response objects

- Server functions share types between client/server automatically
- Middleware provides reusable authentication/authorization
- Only use API routes for auth flows that need specific HTTP handling (cookies, OAuth redirects)

### Middleware Pattern

**Why**: Type safety, reusability, consistent error handling

- `adminMiddleware` and `authMiddleware` provide typed `context.user`
- `customerMiddleware` provides typed `context.customer` for customer-authenticated operations
- Middleware chains correctly: `adminMiddleware` and `customerMiddleware` inherit `authMiddleware`

### Import Patterns in Server Functions

Server functions support two import patterns: **top-level imports** (default) and **dynamic imports** (for client-shared files).

#### Top-Level Imports (Default)

**Why**: Prevents runtime module loading issues, better performance

```typescript
// ✅ CORRECT - Top-level imports for server-only modules
import { db } from '../db'
import { products } from '../db/schema'
import { adminMiddleware } from './middleware'

export const getProductsFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async () => {
    return await db.select().from(products)
  })
```

**Use top-level imports for:**

- Database (`db`, schemas)
- Middleware (`authMiddleware`, `adminMiddleware`, `customerMiddleware`)
- Server-only utilities
- Validation schemas (Zod)

#### Dynamic Imports (For Client-Shared Files)

**Why**: Prevents Node.js-specific code from leaking into the client bundle

Some modules contain Node.js dependencies (like `stripe` SDK) that cause build errors if bundled into client code. When a server function is imported by a client-side file, TanStack Start extracts the server code, but static imports at the top of the file are analyzed during bundling.

```typescript
// ✅ CORRECT - Dynamic import for Node.js-specific modules
export const createStripePaymentIntentFn = createServerFn({
  method: 'GET',
}).handler(async ({ data }) => {
  // Dynamic import prevents Stripe SDK from bundling into client
  const { createPaymentIntent, getStripePublishableKey } =
    await import('../lib/stripe')
  const { dollarsToCents } = await import('../lib/currency')

  // ... use the imported functions
})
```

**Use dynamic imports when:**

- The module uses Node.js-only dependencies (Stripe SDK, PayPal SDK, Node crypto)
- The server function file is imported by client components
- You see build errors about missing Node.js modules in the client bundle

**Reference**: See `src/server/checkout.ts` for comprehensive examples of dynamic imports for payment processing, cookies, and auth utilities.

### FNForm Standardization

**Why**: Consistency, maintainability, reduced duplication

- Single form component handles: validation, grid layouts, custom fields, i18n
- TanStack Form integration provides type-safe field management
- All forms look and behave consistently across admin/customer UI

### Test Colocation

**Why**: Easier to find, easier to maintain, enforces test coverage

- `ComponentName.tsx` and `ComponentName.test.tsx` live together
- Reduces friction: no hunting for test files
- Test patterns guide in `docs/testing-patterns-guide.md`

### i18n Database Pattern

**Why**: Performance, flexibility, type safety

- JSONB fields store translations: `{ en: "English", fr?: "French", id?: "Indonesian" }`
- Single query returns all languages (no joins)
- Optional translations: French/Indonesian can be null
- Helper: `getLocalizedValue(obj, lang)` extracts correct language

### State Management Split

**Why**: Right tool for each job

- **Zustand** (client state): Cart, auth - needs persistence, simple updates
- **React Query** (server state): Products, orders - needs caching, refetch, optimistic updates
- **TanStack Form** (form state): Validation, field-level control, submission
- Don't mix: server data in Zustand causes stale data issues

### Security Layers

**Why**: Defense in depth

- Rate limiting on all endpoints (prevents brute force)
- CSRF tokens for mutations (prevents cross-site attacks)
- Session-based auth with HTTP-only cookies (prevents XSS token theft)
- Input validation with Zod schemas (prevents injection)
- Security headers on all responses (XSS, clickjacking protection)

### Performance Patterns

- Database queries use `inArray` for batch loading (reduces N+1 queries)
- Images served via Cloudinary CDN (automatic optimization, caching)
- Server functions minimize client bundle (code stays on server)
- React Query caching reduces redundant fetches

---

## File Organization

### Directory Rules

#### Components

```
src/components/
├── ui/                    # Reusable UI primitives (shadcn pattern)
│   ├── button.tsx        # Base components
│   ├── fn-form.tsx       # THE form component
│   └── ...
├── admin/                # Admin-specific components
│   ├── products/         # Product management UI
│   ├── orders/           # Order management UI
│   ├── collections/      # Collection management UI
│   └── components/       # Shared admin components
└── checkout/             # Checkout flow components
```

**Rules**:

- UI components are **primitives only** - no business logic
- Admin components can be feature-specific
- Never create a new form component - use FNForm

#### Server Functions

```
src/server/
├── products.ts           # Product CRUD operations
├── orders.ts             # Order management
├── collections.ts        # Collection management
├── auth.ts               # Authentication functions
├── middleware.ts         # Auth/admin middleware
├── session.ts            # Session management
└── schemas/              # Zod validation schemas
    ├── products.ts
    └── collections.ts
```

**Rules**:

- One file per domain (products, orders, collections)
- Export multiple server functions from same file
- Keep validation schemas in `schemas/` subdirectory
- Top-level imports only

#### Routes

```
src/routes/
├── $lang/                # Localized customer pages (/en, /fr, /id)
│   ├── index.tsx         # Homepage
│   ├── products/         # Product catalog
│   ├── cart.tsx          # Shopping cart
│   └── checkout/         # Checkout flow
├── admin/                # Admin dashboard
│   ├── _authed/          # Protected admin routes
│   │   ├── products/     # Product management
│   │   ├── orders/       # Order management
│   │   └── collections/  # Collection management
│   └── login.tsx         # Admin login (public)
└── api/
    └── auth/             # Auth endpoints ONLY
        ├── login.ts
        ├── logout.ts
        └── google/
```

**Rules**:

- Customer routes under `$lang/` for i18n
- Admin routes under `admin/_authed/` for auth protection
- API routes ONLY in `api/auth/` - no other API routes

#### Utilities

```
src/lib/
├── format.ts             # formatCurrency, formatDate
├── utils.ts              # cn() for className merging
├── api.ts                # API response helpers (for auth routes)
├── auth.ts               # Password hashing, session utilities
├── csrf.ts               # CSRF token validation
├── rate-limit.ts         # Rate limiting
├── i18n.ts               # i18n helpers
├── stripe.ts             # Stripe integration
├── paypal.ts             # PayPal integration
└── ...
```

**Rules**:

- Check existing utilities BEFORE creating new ones
- One utility = one concern (formatting, auth, payments, etc.)
- Pure functions preferred - no side effects

#### Tests

```
src/
├── components/
│   ├── checkout/
│   │   ├── PaymentForm.tsx
│   │   └── PaymentForm.test.tsx      # Colocated
├── hooks/
│   ├── useCart.ts
│   └── useCart.test.ts                # Colocated
└── tests/
    ├── server/                         # Server function tests
    │   ├── checkout.test.ts
    │   └── products.test.ts
    └── helpers/
        └── db-test.ts                  # Test utilities
```

**Rules**:

- Tests colocated with source files (same directory)
- Naming: `FileName.test.tsx` or `fileName.test.ts`
- Server function tests in `src/tests/server/`
- Test helpers in `src/tests/helpers/`

### Naming Conventions

| Type             | Convention               | Example                          |
| ---------------- | ------------------------ | -------------------------------- |
| Components       | PascalCase               | `PaymentForm.tsx`                |
| Utilities        | camelCase                | `formatCurrency.ts`              |
| Server functions | camelCase + "Fn"         | `getProductsFn`, `createOrderFn` |
| Hooks            | camelCase + "use" prefix | `useCart.ts`, `useAuth.ts`       |
| Types/Interfaces | PascalCase               | `ProductInput`, `SessionUser`    |
| Database schema  | camelCase (plural)       | `products`, `orders`, `users`    |
| Test files       | Match source + `.test`   | `PaymentForm.test.tsx`           |

### When to Create New Files

**Create new file when**:

- New domain/feature (new server function module)
- New reusable component
- New utility with distinct concern
- File exceeds ~500 lines (consider splitting)

**DON'T create new file for**:

- One-off helpers (add to existing utility file)
- Component variations (use props instead)
- Single function (add to related module)

### Import Path Rules

- **ALWAYS use `@/` alias** for src imports: `import { db } from '@/db'`
- **NEVER use relative paths** across directories: `import { db } from '../../../db'` ❌
- Relative paths OK within same directory: `import { helper } from './helper'` ✅

---

## Development Workflow

### Commands

```bash
# Development
yarn dev              # Start dev server (port 3000)
yarn build            # Production build
yarn preview          # Preview production build

# Code Quality
yarn typecheck        # TypeScript type checking
yarn lint             # ESLint
yarn format           # Prettier formatting
yarn check            # Format + lint fix (run before commits)

# Testing
yarn test             # Run all tests
yarn test Component   # Run specific test file
yarn test --watch     # Watch mode
yarn test --coverage  # With coverage report

# Database
yarn db:generate      # Generate migration from schema changes
yarn db:migrate       # Apply migrations
yarn db:push          # Push schema (dev only - skips migrations)
yarn db:studio        # Open Drizzle Studio GUI

# i18n
yarn locales:scan     # Scan for translation keys

# E2E
yarn e2e              # Run Playwright tests
yarn e2e:ui           # Playwright UI mode
yarn e2e:headed       # Run with browser visible
```

### Git Workflow

- **Branch naming**: `feature/description`, `fix/description`, `refactor/description`
- **Commits**: Use conventional commits format when possible
- **Before committing**: Run `yarn check` to format and lint
- **Husky hooks**: Pre-commit runs type checking and tests

### Testing Requirements

- **All new components** must have tests
- **All new server functions** must have tests
- **Use `testing` skill** for ANY test file work
- **Run tests before committing**: `yarn test`
- **Colocate tests** with source files

#### Test Strategy

We follow a **testing pyramid** approach:

- **Unit Tests** (base): Fast, isolated tests for components and utilities (70%)
- **Integration Tests** (middle): Tests for server functions and API routes (20%)
- **E2E Tests** (top): Critical user journeys and business flows (10%)

#### Running Tests

```bash
# Unit & Integration Tests
yarn test              # Run all tests
yarn test Component    # Run specific test
yarn test --watch      # Watch mode
yarn test --coverage   # With coverage

# E2E Tests
yarn e2e              # Run all E2E tests
yarn e2e:ui           # Playwright UI mode
yarn e2e:headed       # Run with browser visible
```

#### When to Write Which Test

**Unit Tests (Component/Function Level)**

- ✅ Form validation rules
- ✅ Utility functions
- ✅ Component rendering logic
- ✅ State management hooks
- **Speed:** ~1ms per test
- **Examples:** Password validation, email format, date formatting

**Integration Tests (API/Server Level)**

- ✅ Server function responses
- ✅ Database queries
- ✅ Middleware authentication
- **Speed:** ~10-100ms per test
- **Examples:** Creating orders, fetching products, authentication

**E2E Tests (User Journey Level)**

- ✅ Complete checkout flow
- ✅ Payment processing (Stripe/PayPal)
- ✅ Email verification flow
- ✅ Admin access control
- **Speed:** ~5-30s per test
- **Examples:** Guest checkout, customer registration, admin login

#### E2E Testing Guidelines

See [`docs/e2e-testing-strategy.md`](docs/e2e-testing-strategy.md) for detailed guidelines.

**Quick Checklist:**

- Does it test a critical business flow? → E2E ✅
- Does it test form validation? → Unit Test ❌
- Does it use `waitForTimeout()`? → Fix it ❌
- Can it run in parallel? → Should be Yes ✅

### Database Changes

1. Modify `src/db/schema.ts`
2. Run `yarn db:generate` to create migration
3. Run `yarn db:migrate` to apply migration
4. **Never use `db:push` in production** (dev only)

### Adding Translations

1. Add keys to `src/i18n/locales/en.json` (required)
2. Add to `fr.json` and `id.json` (optional)
3. Run `yarn locales:scan` to verify
4. Use `useTranslation()` hook in components

### Common Workflows

#### Adding a New Admin Feature

1. Use **`brainstorming` skill** to plan feature
2. Use **`admin-crud` skill** for UI generation
3. Create server function in `src/server/`
4. Add route in `src/routes/admin/_authed/`
5. Use **`testing` skill** to write tests
6. Run `yarn check && yarn test`

#### Modifying Database Schema

1. Use **`database` skill** for schema guidance
2. Edit `src/db/schema.ts`
3. Run `yarn db:generate` → creates migration
4. Review migration file in `drizzle/`
5. Run `yarn db:migrate`
6. Update TypeScript types (auto-generated)

#### Fixing a Bug

1. Use **`systematic-debugging` skill**
2. Write failing test first (TDD)
3. Fix the bug
4. Ensure test passes
5. Run `yarn check && yarn test`

#### Creating a Form

1. Use **`forms` skill**
2. Always use `FNForm` component
3. Define Zod schema for validation
4. Test form validation and submission

### Pre-Deployment Checklist

- [ ] `yarn typecheck` passes
- [ ] `yarn test` passes (all tests)
- [ ] `yarn build` succeeds
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] No console errors in browser

### Performance Checks

- Bundle size: Check after `yarn build`
- Database queries: Look for N+1 patterns
- Images: Ensure Cloudinary optimization
- Server functions: Keep client bundle small

### When Stuck

1. Check **`codebase-guide` skill** for architecture
2. Check **`debugging` skill** for systematic approach
3. Check `docs/` folder for design documents
4. Check existing patterns in codebase
5. Use **`typescript-lsp` skill** for code navigation
