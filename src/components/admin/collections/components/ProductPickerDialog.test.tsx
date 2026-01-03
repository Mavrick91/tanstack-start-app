import { describe, expect, it, vi } from 'vitest'

import { ProductPickerDialog } from './ProductPickerDialog'

import type { Product } from '../types'

import { render, screen, waitFor } from '@/test/test-utils'

const mockProducts: Product[] = [
  {
    id: '1',
    name: { en: 'Product 1', fr: 'Produit 1', id: 'Produk 1' },
    handle: 'product-1',
    image: 'https://example.com/image1.jpg',
  },
  {
    id: '2',
    name: { en: 'Product 2', fr: 'Produit 2', id: 'Produk 2' },
    handle: 'product-2',
    image: null,
  },
  {
    id: '3',
    name: { en: 'Product 3', fr: 'Produit 3', id: 'Produk 3' },
    handle: 'product-3',
    image: 'https://example.com/image3.jpg',
  },
]

const renderComponent = (
  props: Partial<React.ComponentProps<typeof ProductPickerDialog>> = {},
) => {
  const defaultProps: React.ComponentProps<typeof ProductPickerDialog> = {
    isOpen: true,
    onOpenChange: vi.fn(),
    products: mockProducts,
    selectedIds: [],
    onToggleSelect: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    onAdd: vi.fn(),
    onCancel: vi.fn(),
    isAdding: false,
  }

  return render(<ProductPickerDialog {...defaultProps} {...props} />)
}

describe('ProductPickerDialog', () => {
  describe('Rendering', () => {
    it('renders dialog when open', () => {
      renderComponent()

      expect(screen.getByText('Add Products')).toBeInTheDocument()
      expect(
        screen.getByText('Select products to include in this collection'),
      ).toBeInTheDocument()
    })

    it('does not render dialog when closed', () => {
      renderComponent({ isOpen: false })

      expect(screen.queryByText('Add Products')).not.toBeInTheDocument()
    })

    it('renders all products in the list', () => {
      renderComponent()

      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
      expect(screen.getByText('Product 3')).toBeInTheDocument()
    })

    it('renders product handles', () => {
      renderComponent()

      expect(screen.getByText('/product-1')).toBeInTheDocument()
      expect(screen.getByText('/product-2')).toBeInTheDocument()
      expect(screen.getByText('/product-3')).toBeInTheDocument()
    })
  })

  describe('Search functionality', () => {
    it('renders search input with placeholder', () => {
      renderComponent()

      expect(
        screen.getByPlaceholderText('Search products...'),
      ).toBeInTheDocument()
    })

    it('displays current search value', () => {
      renderComponent({ search: 'test query' })

      const searchInput = screen.getByPlaceholderText('Search products...')
      expect(searchInput).toHaveValue('test query')
    })

    it('calls onSearchChange when typing in search', async () => {
      const onSearchChange = vi.fn()
      const { user } = renderComponent({ onSearchChange })

      const searchInput = screen.getByPlaceholderText('Search products...')
      await user.clear(searchInput)
      await user.type(searchInput, 'new search')

      expect(onSearchChange).toHaveBeenCalled()
    })
  })

  describe('Product selection', () => {
    it('shows selected products with visual indicator', () => {
      renderComponent({ selectedIds: ['1', '3'] })

      // Get the product containers (need to go up from text to the clickable parent)
      const product1Container = screen
        .getByText('Product 1')
        .closest('.cursor-pointer')
      const product2Container = screen
        .getByText('Product 2')
        .closest('.cursor-pointer')
      const product3Container = screen
        .getByText('Product 3')
        .closest('.cursor-pointer')

      // Selected products should have pink border class
      expect(product1Container).toHaveClass('border-pink-500')
      expect(product3Container).toHaveClass('border-pink-500')

      // Unselected product should not
      expect(product2Container).not.toHaveClass('border-pink-500')
    })

    it('calls onToggleSelect when clicking a product', async () => {
      const onToggleSelect = vi.fn()
      const { user } = renderComponent({ onToggleSelect })

      await user.click(screen.getByText('Product 1'))

      expect(onToggleSelect).toHaveBeenCalledWith('1')
    })

    it('calls onToggleSelect when clicking different products', async () => {
      const onToggleSelect = vi.fn()
      const { user } = renderComponent({ onToggleSelect })

      await user.click(screen.getByText('Product 2'))
      expect(onToggleSelect).toHaveBeenCalledWith('2')

      await user.click(screen.getByText('Product 3'))
      expect(onToggleSelect).toHaveBeenCalledWith('3')
    })
  })

  describe('Empty state', () => {
    it('shows empty state when no products', () => {
      renderComponent({ products: [] })

      expect(screen.getByText('No results found')).toBeInTheDocument()
    })

    it('does not show product list when empty', () => {
      renderComponent({ products: [] })

      expect(screen.queryByText('Product 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Product 2')).not.toBeInTheDocument()
    })
  })

  describe('Action buttons', () => {
    it('renders Cancel and Add Selected buttons', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /add selected/i }),
      ).toBeInTheDocument()
    })

    it('calls onCancel when Cancel button is clicked', async () => {
      const onCancel = vi.fn()
      const { user } = renderComponent({ onCancel })

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onAdd when Add Selected button is clicked', async () => {
      const onAdd = vi.fn()
      const { user } = renderComponent({ onAdd, selectedIds: ['1', '2'] })

      await user.click(screen.getByRole('button', { name: /add selected/i }))

      expect(onAdd).toHaveBeenCalledOnce()
    })

    it('disables Add Selected button when no products selected', () => {
      renderComponent({ selectedIds: [] })

      expect(
        screen.getByRole('button', { name: /add selected/i }),
      ).toBeDisabled()
    })

    it('enables Add Selected button when products are selected', () => {
      renderComponent({ selectedIds: ['1'] })

      expect(
        screen.getByRole('button', { name: /add selected/i }),
      ).not.toBeDisabled()
    })

    it('disables Add Selected button when isAdding is true', () => {
      renderComponent({ selectedIds: ['1'], isAdding: true })

      expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
    })

    it('shows "Adding..." text when isAdding is true', () => {
      renderComponent({ selectedIds: ['1'], isAdding: true })

      expect(
        screen.getByRole('button', { name: /adding/i }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /^add selected$/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe('Dialog control', () => {
    it('calls onOpenChange when dialog state changes', async () => {
      const onOpenChange = vi.fn()
      const { user } = renderComponent({ onOpenChange })

      // Click the X button to close
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Edge cases', () => {
    it('handles products with string names instead of localized objects', () => {
      const productsWithStringNames: Product[] = [
        {
          id: '1',
          name: 'Simple Product Name',
          handle: 'simple-product',
          image: null,
        },
      ]

      renderComponent({ products: productsWithStringNames })

      expect(screen.getByText('Simple Product Name')).toBeInTheDocument()
    })

    it('handles multiple selections correctly', () => {
      renderComponent({ selectedIds: ['1', '2', '3'] })

      const product1Container = screen
        .getByText('Product 1')
        .closest('.cursor-pointer')
      const product2Container = screen
        .getByText('Product 2')
        .closest('.cursor-pointer')
      const product3Container = screen
        .getByText('Product 3')
        .closest('.cursor-pointer')

      expect(product1Container).toHaveClass('border-pink-500')
      expect(product2Container).toHaveClass('border-pink-500')
      expect(product3Container).toHaveClass('border-pink-500')
    })

    it('handles long product names', () => {
      const productsWithLongNames: Product[] = [
        {
          id: '1',
          name: {
            en: 'This is a very long product name that should be truncated in the UI',
          },
          handle: 'long-product-name',
          image: null,
        },
      ]

      renderComponent({ products: productsWithLongNames })

      expect(
        screen.getByText(
          'This is a very long product name that should be truncated in the UI',
        ),
      ).toBeInTheDocument()
    })
  })
})
