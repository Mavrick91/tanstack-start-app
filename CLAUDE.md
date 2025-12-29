# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run test         # Run all tests (Vitest)
npm run lint         # ESLint
npm run format       # Prettier format
npm run check        # Prettier + ESLint fix
npm run typecheck    # TypeScript type checking

# Database (Drizzle + PostgreSQL)
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Open Drizzle Studio GUI

# i18n
npm run locales:scan # Scan source for translation keys
```

## Architecture

### Tech Stack

- **Framework:** TanStack Start (SSR/SSG with Vite + Nitro)
- **Router:** TanStack Router (file-based routing)
- **Database:** Drizzle ORM + PostgreSQL
- **State:** Zustand with localStorage persistence
- **UI:** Radix UI + shadcn patterns + TailwindCSS v4
- **i18n:** i18next with react-i18next
- **Payments:** Stripe + PayPal
- **Testing:** Vitest + Testing Library

### Directory Structure

- `/src/routes` - File-based routing (pages + API)
  - `/$lang/` - Localized customer pages (en, fr, id)
  - `/admin/` - Admin dashboard
  - `/api/` - REST API endpoints
- `/src/components` - React components
  - `/ui/` - Reusable shadcn/Radix components
- `/src/lib` - Utilities (auth.ts, api.ts, stripe.ts, paypal.ts, i18n.ts)
- `/src/hooks` - Custom hooks (useCart, useAuth, useCheckout)
- `/src/db` - Database client and schema
- `/src/server` - Server-side business logic
- `/src/i18n/locales` - Translation JSON files
- `/drizzle` - Generated migrations

### API Routes Pattern

Routes use TanStack Router with server handlers:

```typescript
export const Route = createFileRoute('/api/example')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return Response.json({ data })
      },
      POST: async ({ request }) => {
        const body = await request.json()
        return Response.json({ success: true })
      },
    },
  },
})
```

### Authentication

Session-based auth with HTTP-only cookies:

- `hashPassword()` / `verifyPassword()` - bcrypt-ts
- `validateSession(request)` - Check session validity
- `requireAuth(request)` - Middleware returning user or error Response
- Sessions stored in DB with 7-day expiry

### Database Schema

Key tables: `users`, `sessions`, `products`, `productVariants`, `productOptions`, `productImages`, `collections`, `checkouts`, `orders`, `orderItems`, `customers`, `addresses`, `shippingRates`

Localized content uses JSONB columns: `{ en: "...", fr: "...", id: "..." }`

### State Management

Cart uses Zustand with persistence:

```typescript
const items = useCartStore((state) => state.items)
useCartStore.getState().addItem(productId, variantId)
```

### i18n

- URL pattern: `/$lang/page` (en, fr, id)
- Translation files: `/src/i18n/locales/{lang}.json`
- Usage: `const { t } = useTranslation(); t('key')`

### Testing

Vitest with jsdom. Setup mocks ResizeObserver for Radix UI compatibility.

```bash
npm run test              # Run all tests
npx vitest run path/file  # Run single test file
```

### Forms (FNForm)

Use the centralized `FNForm` component for all forms. Located at `/src/components/ui/fn-form.tsx`.

#### Basic Usage

```typescript
import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

const formDefinition: FormDefinition = {
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'name', type: 'text', label: 'Name', placeholder: 'Your name' },
  ],
}

<FNForm
  formDefinition={formDefinition}
  onSubmit={(values) => handleSubmit(values)}
  defaultValues={{ email: 'user@example.com' }}
/>
```

#### Field Types

- `text`, `email`, `password`, `number` - Standard inputs
- `textarea` - Multi-line text
- `select` - Dropdown with `options: [{ value, label }]`
- `checkbox`, `switch` - Boolean toggles
- `hidden` - Hidden field (included in submission)
- `custom` - Custom render with `render` function

#### Grid Layouts

Use `rows` with `columns` for multi-column layouts:

```typescript
const formDefinition: FormDefinition = {
  rows: [
    { fields: [{ name: 'email', type: 'email', label: 'Email' }] },
    {
      columns: 2,
      fields: [
        { name: 'firstName', type: 'text', label: 'First Name' },
        { name: 'lastName', type: 'text', label: 'Last Name' },
      ],
    },
    {
      columns: 3,
      fields: [
        { name: 'city', type: 'text', label: 'City' },
        { name: 'state', type: 'text', label: 'State' },
        { name: 'zip', type: 'text', label: 'ZIP' },
      ],
    },
  ],
}
```

#### Custom Fields

For special inputs (masked inputs, autocomplete, etc.):

```typescript
{
  name: 'phone',
  type: 'custom',
  label: 'Phone',
  render: (props) => (
    <IMaskInput
      id={props.id}
      mask="+{1} (000) 000-0000"
      value={String(props.value ?? '')}
      onAccept={(value) => props.onChange(value)}
    />
  ),
}
```

#### Form Ref (External Control)

```typescript
const formRef = useRef<FNFormRef | null>(null)

<FNForm formRef={formRef} hideSubmitButton ... />

// External submit
formRef.current?.submit()

// Get/set values
formRef.current?.getValues()
formRef.current?.setFieldValue('email', 'new@example.com')
```

#### Field Change Callbacks

For cross-field dependencies:

```typescript
<FNForm
  onFieldChange={(name, value, setFieldValue) => {
    if (name === 'countryCode') {
      setFieldValue('country', countryMap[value])
    }
  }}
  ...
/>
```

#### Field Options

```typescript
interface FieldDefinition {
  name: string
  type: FieldType
  label: string
  placeholder?: string
  required?: boolean // Shows * and validates
  optional?: boolean // Shows "(optional)"
  disabled?: boolean
  options?: SelectOption[] // For select type
  validate?: (value) => string | undefined
  inputClassName?: string
  className?: string
  render?: (props) => ReactNode // For custom type
}
```

## Code Style

- No semicolons, single quotes, trailing commas (Prettier)
- Path alias: `@/*` maps to `src/*`
- Components use CVA (class-variance-authority) for variants
