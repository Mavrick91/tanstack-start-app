import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductActionsDropdown } from './ProductActionsDropdown'
import {
  deleteProductFn,
  duplicateProductFn,
  updateProductStatusFn,
} from '../../../server/products'

// Mock server functions
vi.mock('../../../server/products', () => ({
  deleteProductFn: vi.fn(),
  duplicateProductFn: vi.fn(),
  updateProductStatusFn: vi.fn(),
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('ProductActionsDropdown', () => {
  let queryClient: QueryClient
  const mockOnSuccess = vi.fn()
  const user = userEvent.setup()

  const defaultProps = {
    productId: 'product-123',
    productName: 'Test Product',
    status: 'draft' as 'draft' | 'active' | 'archived',
    onSuccess: mockOnSuccess,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderWithProviders = (props: Partial<typeof defaultProps> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProductActionsDropdown {...defaultProps} {...props} />
      </QueryClientProvider>,
    )
  }

  describe('Dropdown Menu', () => {
    it('should render the dropdown trigger button', () => {
      renderWithProviders()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should open dropdown and show Edit option', async () => {
      renderWithProviders()
      await user.click(screen.getByRole('button'))
      expect(await screen.findByText('Edit')).toBeInTheDocument()
    })

    it('should open dropdown and show Duplicate option', async () => {
      renderWithProviders()
      await user.click(screen.getByRole('button'))
      expect(await screen.findByText('Duplicate')).toBeInTheDocument()
    })

    it('should open dropdown and show Delete option', async () => {
      renderWithProviders()
      await user.click(screen.getByRole('button'))
      expect(await screen.findByText('Delete')).toBeInTheDocument()
    })

    it('should show Archive when status is active', async () => {
      renderWithProviders({ status: 'active' })
      await user.click(screen.getByRole('button'))
      expect(await screen.findByText('Archive')).toBeInTheDocument()
    })

    it('should show Activate when status is archived', async () => {
      renderWithProviders({ status: 'archived' })
      await user.click(screen.getByRole('button'))
      expect(await screen.findByText('Activate')).toBeInTheDocument()
    })
  })

  describe('Server function calls', () => {
    it('should call duplicateProductFn when Duplicate is clicked', async () => {
      vi.mocked(duplicateProductFn).mockResolvedValue({
        success: true,
        data: {
          id: 'new-product',
          name: { en: 'Test' },
          handle: 'test-copy',
          status: 'draft',
          description: null,
          vendor: null,
          productType: null,
          tags: [],
          metaTitle: null,
          metaDescription: null,
          publishedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          // Pricing & Inventory fields
          price: null,
          compareAtPrice: null,
          sku: null,
          barcode: null,
          inventoryQuantity: 0,
          weight: null,
        },
      })

      renderWithProviders()
      await user.click(screen.getByRole('button'))
      const duplicateButton = await screen.findByText('Duplicate')
      await user.click(duplicateButton)

      expect(duplicateProductFn).toHaveBeenCalled()
    })

    it('should call updateProductStatusFn when Archive is clicked', async () => {
      vi.mocked(updateProductStatusFn).mockResolvedValue({ success: true })

      renderWithProviders({ status: 'active' })
      await user.click(screen.getByRole('button'))
      const archiveButton = await screen.findByText('Archive')
      await user.click(archiveButton)

      expect(updateProductStatusFn).toHaveBeenCalled()
    })

    it('should show delete confirmation dialog', async () => {
      renderWithProviders()
      await user.click(screen.getByRole('button'))
      const deleteButton = await screen.findByText('Delete')
      await user.click(deleteButton)

      expect(await screen.findByText(/are you sure/i)).toBeInTheDocument()
    })

    it('should call deleteProductFn when delete is confirmed', async () => {
      vi.mocked(deleteProductFn).mockResolvedValue({ success: true })

      renderWithProviders()
      await user.click(screen.getByRole('button'))
      const deleteButton = await screen.findByText('Delete')
      await user.click(deleteButton)

      const confirmButton = await screen.findByRole('button', {
        name: /confirm/i,
      })
      await user.click(confirmButton)

      expect(deleteProductFn).toHaveBeenCalled()
    })
  })
})
