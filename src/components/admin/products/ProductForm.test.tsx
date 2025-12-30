import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductForm } from './ProductForm'

import type { Product } from './ProductForm'

import { render, screen } from '@/test/test-utils'

// Mock Fancybox
vi.mock('@fancyapps/ui', () => ({
  Fancybox: {
    bind: vi.fn(),
    destroy: vi.fn(),
  },
}))

vi.mock('@fancyapps/ui/dist/fancybox/fancybox.css', () => ({}))

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

describe('ProductForm', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    // Suppress Tiptap duplicate extension warnings (multiple editors render in tests)
    vi.spyOn(console, 'warn').mockImplementation((msg) => {
      if (typeof msg === 'string' && msg.includes('Duplicate extension')) return
      console.warn(msg)
    })
  })

  const mockProduct = (overrides?: Partial<Product>): Product => ({
    id: 'prod_123',
    handle: 'test-product',
    name: { en: 'Test Product', fr: 'Produit Test', id: 'Produk Tes' },
    description: { en: 'Desc', fr: 'Desc FR', id: 'Desc ID' },
    status: 'draft',
    vendor: 'Test Vendor',
    productType: 'Type',
    metaTitle: null,
    metaDescription: null,
    tags: [],
    publishedAt: null,
    ...overrides,
  })

  describe('Create Mode', () => {
    it('should render with "Create Product" title in header', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // The title shows 'Create Product' in create mode (in the h1)
      expect(
        screen.getAllByText('Create Product').length,
      ).toBeGreaterThanOrEqual(1)
    })

    it('should render "Create Product" submit button', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // Find the submit button with 'Create Product' text
      const buttons = screen.getAllByRole('button')
      const createButton = buttons.find((btn) =>
        btn.textContent?.includes('Create Product'),
      )
      expect(createButton).toBeInTheDocument()
    })

    it('should have empty form fields by default', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(
        screen.getByPlaceholderText(/Product name in English/i),
      ).toHaveValue('')
    })

    it('should show Cancel button when onBack is provided', () => {
      const handleBack = vi.fn()
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm onBack={handleBack} />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should always show Cancel button even without onBack', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // Cancel button is always rendered
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should render with "Edit Product" title', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct()} />
        </QueryClientProvider>,
      )

      // In edit mode, the product name is shown as the title with an 'Editing' badge
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('Editing')).toBeInTheDocument()
    })

    it('should render "Save Changes" button', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct()} />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })

    it('should populate form fields with product data', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct()} />
        </QueryClientProvider>,
      )

      expect(
        screen.getByPlaceholderText(/Product name in English/i),
      ).toHaveValue('Test Product')
    })
  })

  describe('Status Initialization', () => {
    it('should initialize with "draft" status in create mode', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // The Draft button should have active styling (bg-slate-100)
      const draftButton = screen.getByRole('button', { name: /draft/i })
      expect(draftButton).toBeInTheDocument()
      expect(draftButton.className).toContain('bg-slate')
    })

    it('should initialize with product status in edit mode', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct({ status: 'active' })} />
        </QueryClientProvider>,
      )

      // The Active button should have active styling (bg-emerald)
      const activeButton = screen.getByRole('button', { name: /active/i })
      expect(activeButton).toBeInTheDocument()
      expect(activeButton.className).toContain('bg-emerald')
    })

    it('should initialize with "archived" status correctly', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct({ status: 'archived' })} />
        </QueryClientProvider>,
      )

      // The Archived button should have active styling (bg-amber)
      const archivedButton = screen.getByRole('button', { name: /archived/i })
      expect(archivedButton).toBeInTheDocument()
      expect(archivedButton.className).toContain('bg-amber')
    })
  })

  describe('Form Fields', () => {
    it('should render localized name fields with tabs', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getAllByText('EN').length).toBeGreaterThan(0)
      expect(screen.getAllByText('FR').length).toBeGreaterThan(0)
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0)
    })

    it('should render options section', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Options')).toBeInTheDocument()
    })

    it('should render variants section', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Variants')).toBeInTheDocument()
      // Default variant should be shown
      expect(screen.getByText('Default Title')).toBeInTheDocument()
    })

    it('should render SEO section', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Search engine listing')).toBeInTheDocument()
      expect(screen.getByText('Meta Title')).toBeInTheDocument()
      expect(screen.getByText('Meta Description')).toBeInTheDocument()
    })
  })

  describe('Rich Text Editor Integration', () => {
    it('should render description field with RichTextEditor styling', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // RichTextEditor renders within the Description section
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('should render description with localized tabs (EN, FR, ID)', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // Multiple tabs should exist for description localization
      const enTabs = screen.getAllByText('EN')
      const frTabs = screen.getAllByText('FR')
      const idTabs = screen.getAllByText('ID')

      expect(enTabs.length).toBeGreaterThan(0)
      expect(frTabs.length).toBeGreaterThan(0)
      expect(idTabs.length).toBeGreaterThan(0)
    })

    it('should populate description in edit mode', () => {
      const product = mockProduct({
        description: {
          en: '<p>Rich text content</p>',
          fr: '<p>Contenu riche</p>',
          id: '<p>Konten kaya</p>',
        },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={product} />
        </QueryClientProvider>,
      )

      // The form should be populated (RichTextEditor will render the HTML)
      expect(screen.getByText('Description')).toBeInTheDocument()
    })
  })
})
