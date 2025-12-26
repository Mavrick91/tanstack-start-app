import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductEditForm } from './ProductEditForm'

import type { Product } from './ProductEditForm'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}))

// Mock Radix UI Select components since they can be tricky in JSDOM
vi.mock('../../ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange: (v: string) => void
  }) => (
    <div
      data-testid="mock-select"
      data-value={value}
      onClick={() => onValueChange?.('active')}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) => <div data-testid={`item-${value}`}>{children}</div>,
}))

describe('ProductEditForm Status Initialization', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const mockProduct = (status: Product['status']): Product => ({
    id: 'prod_123',
    handle: 'test-product',
    name: { en: 'Test Product', fr: 'Produit Test', id: 'Produk Tes' },
    description: { en: 'Desc', fr: 'Desc FR', id: 'Desc ID' },
    status,
    vendor: 'Test Vendor',
    productType: 'Type',
    metaTitle: null,
    metaDescription: null,
    tags: [],
    publishedAt: null,
  })

  it('should initialize with "draft" status correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductEditForm product={mockProduct('draft')} />
      </QueryClientProvider>,
    )

    const select = screen.getByTestId('mock-select')
    expect(select.getAttribute('data-value')).toBe('draft')
  })

  it('should initialize with "active" status correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductEditForm product={mockProduct('active')} />
      </QueryClientProvider>,
    )

    const select = screen.getByTestId('mock-select')
    expect(select.getAttribute('data-value')).toBe('active')
  })

  it('should initialize with "archived" status correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductEditForm product={mockProduct('archived')} />
      </QueryClientProvider>,
    )

    const select = screen.getByTestId('mock-select')
    expect(select.getAttribute('data-value')).toBe('archived')
  })

  it('should render localized name fields correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductEditForm product={mockProduct('active')} />
      </QueryClientProvider>,
    )

    expect(screen.getByPlaceholderText(/Product name in English/i)).toHaveValue(
      'Test Product',
    )
  })
})
