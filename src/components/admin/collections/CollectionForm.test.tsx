import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CollectionForm } from './CollectionForm'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

// Mock server functions
vi.mock('../../../server/collections', () => ({
  createCollectionFn: vi.fn().mockResolvedValue({ data: { id: 'new-id' } }),
  updateCollectionFn: vi.fn().mockResolvedValue({ data: { id: 'test-id' } }),
  addProductsToCollectionFn: vi.fn().mockResolvedValue({ success: true }),
  removeProductFromCollectionFn: vi.fn().mockResolvedValue({ success: true }),
  reorderCollectionProductsFn: vi.fn().mockResolvedValue({ success: true }),
  publishCollectionFn: vi.fn().mockResolvedValue({ success: true }),
  unpublishCollectionFn: vi.fn().mockResolvedValue({ success: true }),
  duplicateCollectionFn: vi
    .fn()
    .mockResolvedValue({ data: { id: 'duplicated-id' } }),
}))

vi.mock('../../../server/products', () => ({
  getProductsFn: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'p1',
        handle: 'product-1',
        name: { en: 'Product One' },
        image: null,
      },
      {
        id: 'p2',
        handle: 'product-2',
        name: { en: 'Product Two' },
        image: null,
      },
    ],
  }),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('CollectionForm Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('renders the form in create mode', () => {
      renderWithProviders(<CollectionForm />)

      expect(screen.getByText('New Collection')).toBeInTheDocument()
      expect(screen.getByText('Creating')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Create Collection/i }),
      ).toBeInTheDocument()
    })

    it('shows required form fields', () => {
      renderWithProviders(<CollectionForm />)

      expect(
        screen.getByPlaceholderText('Enter collection name...'),
      ).toBeInTheDocument()
      expect(screen.getByText('Collection Details')).toBeInTheDocument()
      expect(screen.getByText('Search Engine Listing')).toBeInTheDocument()
    })

    it('updates name input when typing', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CollectionForm />)

      const nameInput = screen.getByPlaceholderText('Enter collection name...')
      await user.type(nameInput, 'Best Sellers')

      // The name input should have the typed value (SEO Title also syncs)
      await waitFor(() => {
        const inputs = screen.getAllByDisplayValue('Best Sellers')
        expect(inputs.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('updates SEO preview when name changes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CollectionForm />)

      const nameInput = screen.getByPlaceholderText('Enter collection name...')
      await user.type(nameInput, 'Summer')

      // SEO preview should update - name and SEO title both sync
      await waitFor(() => {
        const inputs = screen.getAllByDisplayValue('Summer')
        // Should find at least 2: name input and SEO title input
        expect(inputs.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('does not show Products Management card in create mode', () => {
      renderWithProviders(<CollectionForm />)

      // Products card should only appear in edit mode
      expect(screen.queryByText('Products')).not.toBeInTheDocument()
      expect(screen.queryByText('Add Products')).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    const mockCollection = {
      id: 'col-123',
      handle: 'existing-collection',
      name: { en: 'Existing Collection', fr: 'Collection Existante' },
      description: { en: 'A test description' },
      metaTitle: { en: 'SEO Title' },
      metaDescription: { en: 'SEO Description' },
      publishedAt: new Date(),
      createdAt: new Date(),
      products: [
        {
          id: 'p1',
          handle: 'product-1',
          name: { en: 'Product One' },
          image: null,
        },
      ],
    }

    it('renders the form in edit mode with collection data', () => {
      renderWithProviders(<CollectionForm collection={mockCollection} isEdit />)

      expect(screen.getByText('Existing Collection')).toBeInTheDocument()
      expect(screen.getByText('Editing')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Save Changes/i }),
      ).toBeInTheDocument()
    })

    it('shows Duplicate button in edit mode', () => {
      renderWithProviders(<CollectionForm collection={mockCollection} isEdit />)

      expect(
        screen.getByRole('button', { name: /Duplicate/i }),
      ).toBeInTheDocument()
    })

    it('shows Products Management card in edit mode', () => {
      renderWithProviders(<CollectionForm collection={mockCollection} isEdit />)

      // Check for the Products card title by looking for the card description
      expect(
        screen.getByText('Manage items in this collection (Drag to reorder)'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Add Products/i }),
      ).toBeInTheDocument()
    })

    it('displays existing products in edit mode', () => {
      renderWithProviders(<CollectionForm collection={mockCollection} isEdit />)

      expect(screen.getByText('Product One')).toBeInTheDocument()
      expect(screen.getByText('/product-1')).toBeInTheDocument()
    })

    it('shows Publish/Unpublish button based on publishedAt', () => {
      renderWithProviders(<CollectionForm collection={mockCollection} isEdit />)

      // Published collection should show Unpublish
      expect(
        screen.getByRole('button', { name: /Unpublish/i }),
      ).toBeInTheDocument()
    })

    it('shows Publish button for unpublished collection', () => {
      const unpublishedCollection = { ...mockCollection, publishedAt: null }
      renderWithProviders(
        <CollectionForm collection={unpublishedCollection} isEdit />,
      )

      expect(
        screen.getByRole('button', { name: /Publish/i }),
      ).toBeInTheDocument()
    })

    it('populates form fields with existing data', () => {
      renderWithProviders(<CollectionForm collection={mockCollection} isEdit />)

      expect(
        screen.getByDisplayValue('Existing Collection'),
      ).toBeInTheDocument()
      expect(
        screen.getByDisplayValue('existing-collection'),
      ).toBeInTheDocument()
      expect(screen.getByDisplayValue('A test description')).toBeInTheDocument()
    })
  })

  describe('SEO Preview', () => {
    it('shows default SEO preview text when empty', () => {
      renderWithProviders(<CollectionForm />)

      expect(screen.getByText('Collection Title')).toBeInTheDocument()
    })

    it('shows character count for meta fields', () => {
      renderWithProviders(<CollectionForm />)

      expect(screen.getByText(/0 \/ 70 characters/)).toBeInTheDocument()
      expect(screen.getByText(/0 \/ 160 characters/)).toBeInTheDocument()
    })
  })

  describe('Status Card', () => {
    it('shows Draft badge in create mode', () => {
      renderWithProviders(<CollectionForm />)

      expect(screen.getByText('Not visible')).toBeInTheDocument()
    })

    it('shows "Not visible" text for unpublished collection', () => {
      renderWithProviders(<CollectionForm />)

      expect(screen.getByText('Not visible')).toBeInTheDocument()
    })

    it('shows "Visible on storefront" for published collection', () => {
      const publishedCollection = {
        id: 'col-123',
        handle: 'published',
        name: { en: 'Published Collection' },
        publishedAt: new Date(),
        createdAt: new Date(),
      }
      renderWithProviders(
        <CollectionForm collection={publishedCollection} isEdit />,
      )

      expect(screen.getByText('Visible on storefront')).toBeInTheDocument()
    })
  })

  describe('Product Picker Dialog', () => {
    const mockCollectionWithProducts = {
      id: 'col-123',
      handle: 'test',
      name: { en: 'Test' },
      publishedAt: null,
      createdAt: new Date(),
      products: [],
    }

    it('opens product picker dialog when clicking Add Products', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CollectionForm collection={mockCollectionWithProducts} isEdit />,
      )

      const addButton = screen.getByRole('button', { name: /Add Products/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(
          screen.getByText('Select products to include in this collection'),
        ).toBeInTheDocument()
      })
    })
  })
})
