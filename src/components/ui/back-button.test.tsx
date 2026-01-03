import { describe, expect, it, vi, beforeEach } from 'vitest'

import { BackButton } from './back-button'

import { render, screen } from '@/test/test-utils'

describe('BackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof BackButton>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof BackButton> = {
      to: '/$lang/products',
      label: 'Back to Products',
    }
    return render(<BackButton {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders back button link', () => {
      renderComponent()

      expect(
        screen.getByRole('link', { name: /back to products/i }),
      ).toBeInTheDocument()
    })

    it('displays label text', () => {
      renderComponent({ label: 'Back to Home' })

      expect(screen.getByText('Back to Home')).toBeInTheDocument()
    })

    it('renders chevron left icon', () => {
      const { container } = renderComponent()

      const icon = container.querySelector('.lucide-chevron-left')
      expect(icon).toBeInTheDocument()
    })

    it('icon appears before label text', () => {
      renderComponent({ label: 'Back' })

      const link = screen.getByRole('link')
      const children = Array.from(link.childNodes)

      // First child should be SVG (icon), second should be text
      expect(children[0].nodeName).toBe('svg')
      expect(children[1].textContent).toBe('Back')
    })
  })

  describe('Navigation', () => {
    it('navigates to specified path template when no params provided', () => {
      renderComponent({ to: '/$lang/collections' })

      const link = screen.getByRole('link')
      // Without params, the path template remains as-is
      expect(link).toHaveAttribute('href', '/$lang/collections')
    })

    it('includes params in navigation', () => {
      renderComponent({
        to: '/$lang/products',
        params: { lang: 'fr' },
      })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/fr/products')
    })

    it('handles navigation without params', () => {
      renderComponent({ to: '/admin/dashboard' })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/dashboard')
    })

    it('supports nested paths', () => {
      renderComponent({
        to: '/$lang/products/$productId',
        params: { lang: 'en', productId: '123' },
      })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/en/products/123')
    })
  })

  describe('Styling', () => {
    it('applies default styles', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveClass('inline-flex')
      expect(link).toHaveClass('items-center')
      expect(link).toHaveClass('gap-2')
      expect(link).toHaveClass('text-sm')
    })

    it('applies default color styles', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveClass('text-muted-foreground')
      expect(link).toHaveClass('hover:text-foreground')
    })

    it('applies transition effect', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveClass('transition-colors')
    })

    it('applies default margin bottom', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveClass('mb-8')
    })

    it('applies custom className', () => {
      renderComponent({ className: 'custom-class' })

      const link = screen.getByRole('link')
      expect(link).toHaveClass('custom-class')
    })

    it('merges custom className with defaults', () => {
      renderComponent({ className: 'mt-4' })

      const link = screen.getByRole('link')
      expect(link).toHaveClass('inline-flex')
      expect(link).toHaveClass('mt-4')
    })
  })

  describe('Icon', () => {
    it('chevron icon has correct size', () => {
      const { container } = renderComponent()

      const icon = container.querySelector('.lucide-chevron-left')
      expect(icon).toHaveClass('w-4')
      expect(icon).toHaveClass('h-4')
    })

    it('renders ChevronLeft icon', () => {
      const { container } = renderComponent()

      const icon = container.querySelector('.lucide-chevron-left')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('is a semantic link element', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link.tagName).toBe('A')
    })

    it('has accessible name from label', () => {
      renderComponent({ label: 'Return to previous page' })

      const link = screen.getByRole('link', {
        name: /return to previous page/i,
      })
      expect(link).toHaveAccessibleName()
    })

    it('link is keyboard accessible', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      // Links are keyboard accessible by default
    })
  })

  describe('Different labels', () => {
    it('handles short labels', () => {
      renderComponent({ label: 'Back' })

      expect(screen.getByText('Back')).toBeInTheDocument()
    })

    it('handles long labels', () => {
      renderComponent({ label: 'Back to Product Management Dashboard' })

      expect(
        screen.getByText('Back to Product Management Dashboard'),
      ).toBeInTheDocument()
    })

    it('handles labels with special characters', () => {
      renderComponent({ label: 'Back to "Special" Products' })

      expect(screen.getByText('Back to "Special" Products')).toBeInTheDocument()
    })

    it('handles labels with emojis', () => {
      renderComponent({ label: 'Back to Products 📦' })

      expect(screen.getByText('Back to Products 📦')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles empty label', () => {
      renderComponent({ label: '' })

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      // Icon should still be visible
      const { container } = render(<BackButton to="/" label="" />)
      expect(
        container.querySelector('.lucide-chevron-left'),
      ).toBeInTheDocument()
    })

    it('handles root path', () => {
      renderComponent({ to: '/' })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/')
    })

    it('handles admin paths without lang param', () => {
      renderComponent({ to: '/admin/products' })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/admin/products')
    })

    it('handles multiple params', () => {
      renderComponent({
        to: '/$lang/collections/$collectionId',
        params: { lang: 'fr', collectionId: 'summer-2024' },
      })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/fr/collections/summer-2024')
    })

    it('handles query parameters in path', () => {
      renderComponent({
        to: '/$lang/products?sort=price',
        params: { lang: 'en' },
      })

      const link = screen.getByRole('link')
      // Should include the path part
      expect(link.getAttribute('href')).toContain('/en/products')
    })
  })

  describe('Layout behavior', () => {
    it('uses inline-flex layout', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveClass('inline-flex')
    })

    it('aligns items center', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveClass('items-center')
    })

    it('has gap between icon and text', () => {
      renderComponent()

      const link = screen.getByRole('link')
      expect(link).toHaveClass('gap-2')
    })
  })

  describe('Language variants', () => {
    it('supports English language path', () => {
      renderComponent({ to: '/$lang/products', params: { lang: 'en' } })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/en/products')
    })

    it('supports French language path', () => {
      renderComponent({ to: '/$lang/products', params: { lang: 'fr' } })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/fr/products')
    })

    it('supports Indonesian language path', () => {
      renderComponent({ to: '/$lang/products', params: { lang: 'id' } })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/id/products')
    })
  })

  describe('Custom styling scenarios', () => {
    it('can override margin with className', () => {
      renderComponent({ className: 'mb-4' })

      const link = screen.getByRole('link')
      // cn() should merge classes, with later ones taking precedence
      expect(link.className).toContain('mb-')
    })

    it('can add additional colors', () => {
      renderComponent({ className: 'text-blue-500' })

      const link = screen.getByRole('link')
      expect(link).toHaveClass('text-blue-500')
    })

    it('can override text size', () => {
      renderComponent({ className: 'text-base' })

      const link = screen.getByRole('link')
      expect(link).toHaveClass('text-base')
    })
  })
})
