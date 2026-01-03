import { Package, Users } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { AdminPageHeader } from './AdminPageHeader'

import { render, screen } from '@/test/test-utils'

describe('AdminPageHeader', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminPageHeader>> = {},
  ) => {
    const defaultProps = {
      title: 'Products',
    }
    return render(<AdminPageHeader {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders title as h1', () => {
      renderComponent()

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Products')
    })

    it('renders description when provided', () => {
      renderComponent({
        description: 'Manage your product catalog',
      })

      expect(screen.getByText('Manage your product catalog')).toBeInTheDocument()
    })

    it('does not render description when not provided', () => {
      const { container } = renderComponent()

      const description = container.querySelector('.text-muted-foreground')
      expect(description).not.toBeInTheDocument()
    })

    it('does not render action button when action is not provided', () => {
      renderComponent()

      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders action button when action is provided', () => {
      renderComponent({
        action: { label: 'Add Product', href: '/admin/products/new' },
      })

      expect(
        screen.getByRole('button', { name: /add product/i }),
      ).toBeInTheDocument()
    })

    it('renders link with correct href', () => {
      renderComponent({
        action: { label: 'Add Product', href: '/admin/products/new' },
      })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/products/new')
    })

    it('renders default Plus icon when no custom icon provided', () => {
      const { container } = renderComponent({
        action: { label: 'Add Product', href: '/admin/products/new' },
      })

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-4', 'h-4')
    })

    it('renders custom icon when provided', () => {
      const { container } = renderComponent({
        action: {
          label: 'Add Product',
          href: '/admin/products/new',
          icon: Package,
        },
      })

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Combinations', () => {
    it('renders all props together', () => {
      renderComponent({
        title: 'Products',
        description: 'Manage your product catalog',
        action: {
          label: 'Add Product',
          href: '/admin/products/new',
          icon: Package,
        },
      })

      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Manage your product catalog')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /add product/i }),
      ).toBeInTheDocument()

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/products/new')
    })

    it('renders title with description but no action', () => {
      renderComponent({
        title: 'Products',
        description: 'Manage your product catalog',
      })

      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Manage your product catalog')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders title with action but no description', () => {
      renderComponent({
        title: 'Products',
        action: { label: 'Add Product', href: '/admin/products/new' },
      })

      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.queryByText(/manage/i)).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /add product/i }),
      ).toBeInTheDocument()
    })

    it('button is wrapped in link', () => {
      renderComponent({
        action: { label: 'Add Product', href: '/admin/products/new' },
      })

      const button = screen.getByRole('button', { name: /add product/i })
      const link = screen.getByRole('link')

      expect(link).toContainElement(button)
    })
  })

  describe('Variants', () => {
    it('renders with different title', () => {
      renderComponent({ title: 'Customers' })

      expect(screen.getByText('Customers')).toBeInTheDocument()
    })

    it('renders with different action label and href', () => {
      renderComponent({
        title: 'Collections',
        action: { label: 'Add Collection', href: '/admin/collections/new' },
      })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/collections/new')
    })

    it('renders with different custom icon', () => {
      const { container } = renderComponent({
        title: 'Customers',
        action: {
          label: 'Add Customer',
          href: '/admin/customers/new',
          icon: Users,
        },
      })

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles long title', () => {
      renderComponent({ title: 'Product Inventory Management System Dashboard' })

      expect(
        screen.getByText('Product Inventory Management System Dashboard'),
      ).toBeInTheDocument()
    })

    it('handles long description', () => {
      const longDescription =
        'Manage your entire product catalog including variants, pricing, inventory levels, and product images across all channels'

      renderComponent({ description: longDescription })

      expect(screen.getByText(longDescription)).toBeInTheDocument()
    })

    it('handles special characters in title', () => {
      renderComponent({ title: 'Products & Collections' })

      expect(screen.getByText('Products & Collections')).toBeInTheDocument()
    })

    it('handles special characters in description', () => {
      renderComponent({
        description: 'Manage items, prices & inventory',
      })

      expect(
        screen.getByText('Manage items, prices & inventory'),
      ).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('has correct heading styles', () => {
      renderComponent()

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-2xl', 'font-bold', 'tracking-tight')
    })

    it('has correct description styles', () => {
      const { container } = renderComponent({
        description: 'Manage your product catalog',
      })

      const description = container.querySelector('.text-muted-foreground')
      expect(description).toHaveClass('text-sm')
    })
  })
})
