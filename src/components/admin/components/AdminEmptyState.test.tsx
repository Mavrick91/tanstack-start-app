import { Package, ShoppingCart, Users } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { AdminEmptyState } from './AdminEmptyState'

import { render, screen } from '@/test/test-utils'

describe('AdminEmptyState', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminEmptyState>> = {},
  ) => {
    const defaultProps = {
      icon: Package,
      title: 'No products yet',
      description: 'Get started by creating your first product',
      actionLabel: 'Create Product',
      actionHref: '/admin/products/new',
    }
    return render(<AdminEmptyState {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders title and description', () => {
      renderComponent()

      expect(screen.getByText('No products yet')).toBeInTheDocument()
      expect(
        screen.getByText('Get started by creating your first product'),
      ).toBeInTheDocument()
    })

    it('renders with different title and description', () => {
      renderComponent({
        title: 'No orders found',
        description: 'Orders will appear here when customers make purchases',
      })

      expect(screen.getByText('No orders found')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Orders will appear here when customers make purchases',
        ),
      ).toBeInTheDocument()
    })

    it('renders action button with correct label', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: 'Create Product' }),
      ).toBeInTheDocument()
    })

    it('renders link with correct href', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/products/new')
    })

    it('renders with different action label and href', () => {
      renderComponent({
        actionLabel: 'Add Collection',
        actionHref: '/admin/collections/new',
      })

      const button = screen.getByRole('button', { name: 'Add Collection' })
      expect(button).toBeInTheDocument()

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/collections/new')
    })

    it('renders icon component', () => {
      const { container } = renderComponent()

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-7', 'h-7', 'text-coral-400')
    })

    it('renders with different icon', () => {
      const { container } = renderComponent({ icon: ShoppingCart })

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('has correct container styling', () => {
      const { container } = renderComponent()

      const mainContainer = container.querySelector(
        '.text-center.py-12.bg-white.border.border-stone-200.rounded-2xl.shadow-sm',
      )
      expect(mainContainer).toBeInTheDocument()
    })

    it('renders button with outline variant', () => {
      renderComponent()

      const button = screen.getByRole('button', { name: 'Create Product' })
      expect(button.parentElement).toHaveAttribute(
        'href',
        '/admin/products/new',
      )
    })
  })

  describe('Edge cases', () => {
    it('renders with long description text', () => {
      const longDescription =
        'This is a very long description that explains in detail what the user should do to get started with this feature and why it is important'

      renderComponent({ description: longDescription })

      expect(screen.getByText(longDescription)).toBeInTheDocument()
    })

    it('renders with special characters in title', () => {
      renderComponent({
        title: "No products found! Let's get started...",
      })

      expect(
        screen.getByText("No products found! Let's get started..."),
      ).toBeInTheDocument()
    })

    it('renders all props together', () => {
      const customProps = {
        icon: Users,
        title: 'No customers',
        description: 'Your customer list is empty',
        actionLabel: 'Invite Customer',
        actionHref: '/admin/customers/invite',
      }

      renderComponent(customProps)

      expect(screen.getByText('No customers')).toBeInTheDocument()
      expect(
        screen.getByText('Your customer list is empty'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Invite Customer' }),
      ).toBeInTheDocument()

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/customers/invite')
    })
  })
})
