# Testing Standards Guide

## Quick Start

```tsx
import { render, screen } from '@/test/test-utils'

describe('ComponentName', () => {
  it('does X when Y', async () => {
    const { user } = render(<Component />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
```

## Global Mocks (automatic)

These are mocked globally in `src/test/setup.ts` - do NOT re-mock them:

- `@tanstack/react-router` - Link, useNavigate, useParams, useRouter, etc.
- `react-i18next` - useTranslation, Trans

### Override when needed

If a test needs different router behavior:

```tsx
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'fr', productId: '123' }),
  useNavigate: () => mockNavigate, // capture for assertions
}))
```

## Data Factories

Use factories from `@/test/factories/data` instead of hardcoded mock objects:

```tsx
import { createProduct, createOrder, createCartItem } from '@/test/factories/data'

// Good
const product = createProduct({ price: 50 })

// Bad
const MOCK_PRODUCT = { id: '1', name: 'Test', price: 50, ... }
```

### Available Factories

- `createProduct(overrides?)` - Product with variants, options
- `createProductVariant(overrides?)`
- `createProductImage(overrides?)`
- `createCartItem(overrides?)`
- `createUser(overrides?)` / `createAdminUser(overrides?)`
- `createAddress(overrides?)`
- `createOrder(overrides?)`
- `createOrderItem(overrides?)`
- `createCollection(overrides?)`
- `createCheckout(overrides?)`
- `createShippingRate(overrides?)`

## Component Testing Patterns

### QueryClient is automatic

The `render` from `@/test/test-utils` includes QueryClientProvider:

```tsx
// Good - no wrapper needed
render(<MyComponent />)

// Bad - redundant
const queryClient = new QueryClient()
render(
  <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>,
)
```

### userEvent is included

```tsx
const { user } = render(<Component />)
await user.click(button)
await user.type(input, 'text')
```

### Async patterns

```tsx
// Prefer findBy for async
const button = await screen.findByRole('button')

// Use waitFor for complex conditions
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

## Anti-patterns

### Don't wrap render in act()

```tsx
// Bad
await act(async () => {
  render(<Component />)
})

// Good
render(<Component />)
```

### Don't create your own QueryClient

```tsx
// Bad
const queryClient = new QueryClient()
render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>,
)

// Good
render(<Component />)
```

### Don't use fireEvent for user actions

```tsx
// Bad
fireEvent.click(button)

// Good
await user.click(button)
```

### Don't re-mock router or i18n

```tsx
// Bad - already global
vi.mock('@tanstack/react-router', () => ({ ... }))
vi.mock('react-i18next', () => ({ ... }))

// Good - just use the component
render(<Component />)
```

## Test Structure

### Naming

```tsx
describe('ComponentName', () => {
  // No "Component" suffix
  describe('Section', () => {
    // Group related tests
    it('does X when Y', () => {}) // Behavior focused
  })
})
```

### Max nesting: 2 levels

```tsx
// Good
describe('Cart', () => {
  describe('adding items', () => {
    it('increases count', () => {})
  })
})

// Bad - too deep
describe('Cart', () => {
  describe('items', () => {
    describe('adding', () => {
      describe('single item', () => {})
    })
  })
})
```
