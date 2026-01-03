import { describe, expect, it, vi, beforeEach } from 'vitest'

import { Breadcrumbs } from './Breadcrumbs'

import { render, screen } from '@/test/test-utils'

describe('Breadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof Breadcrumbs>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof Breadcrumbs> = {
      items: [],
      lang: 'en',
    }
    return render(<Breadcrumbs {...defaultProps} {...props} />)
  }

  describe('Home link', () => {
    it('renders home icon link', () => {
      renderComponent()

      const homeLink = screen.getByRole('link')
      expect(homeLink).toBeInTheDocument()
    })

    it('home link navigates to language root', () => {
      renderComponent({ lang: 'fr' })

      const homeLink = screen.getByRole('link')
      expect(homeLink).toHaveAttribute('href', '/fr')
    })

    it('home icon has screen reader label', () => {
      renderComponent()

      expect(screen.getByText('Home')).toHaveClass('sr-only')
    })

    it('home link has hover styles', () => {
      renderComponent()

      const homeLink = screen.getByRole('link')
      expect(homeLink).toHaveClass('hover:text-foreground')
      expect(homeLink).toHaveClass('transition-colors')
    })

    it('renders home icon', () => {
      const { container } = renderComponent()

      const homeIcon = container.querySelector('.lucide-house')
      expect(homeIcon).toBeInTheDocument()
    })
  })

  describe('Breadcrumb items', () => {
    it('renders single breadcrumb item', () => {
      const items = [{ label: 'Products' }]
      renderComponent({ items })

      expect(screen.getByText('Products')).toBeInTheDocument()
    })

    it('renders multiple breadcrumb items', () => {
      const items = [
        { label: 'Products' },
        { label: 'Electronics' },
        { label: 'Laptops' },
      ]
      renderComponent({ items })

      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Laptops')).toBeInTheDocument()
    })

    it('renders item with link', () => {
      const items = [
        { label: 'Products', to: '/$lang/products', params: { lang: 'en' } },
      ]
      renderComponent({ items })

      const link = screen.getByRole('link', { name: 'Products' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/en/products')
    })

    it('renders item without link as plain text', () => {
      const items = [{ label: 'Current Page' }]
      renderComponent({ items })

      const text = screen.getByText('Current Page')
      expect(text).toBeInTheDocument()
      expect(text.tagName).toBe('SPAN')
    })

    it('final item without link is styled as current page', () => {
      const items = [{ label: 'Current Page' }]
      renderComponent({ items })

      const text = screen.getByText('Current Page')
      expect(text).toHaveClass('text-foreground')
      expect(text).toHaveClass('font-medium')
    })

    it('linked items have hover effect', () => {
      const items = [{ label: 'Products', to: '/$lang/products' }]
      renderComponent({ items })

      const link = screen.getByRole('link', { name: 'Products' })
      expect(link).toHaveClass('hover:text-foreground')
      expect(link).toHaveClass('transition-colors')
    })
  })

  describe('Separators', () => {
    it('shows chevron separator between items', () => {
      const items = [{ label: 'Products' }]
      const { container } = renderComponent({ items })

      const chevrons = container.querySelectorAll('.lucide-chevron-right')
      expect(chevrons.length).toBe(1)
    })

    it('shows correct number of separators', () => {
      const items = [
        { label: 'Products' },
        { label: 'Electronics' },
        { label: 'Laptops' },
      ]
      const { container } = renderComponent({ items })

      // Should have 3 separators: home->Products, Products->Electronics, Electronics->Laptops
      const chevrons = container.querySelectorAll('.lucide-chevron-right')
      expect(chevrons.length).toBe(3)
    })

    it('does not show separator for empty items', () => {
      const { container } = renderComponent({ items: [] })

      const chevrons = container.querySelectorAll('.lucide-chevron-right')
      expect(chevrons.length).toBe(0)
    })
  })

  describe('Accessibility', () => {
    it('has navigation landmark with aria-label', () => {
      const { container } = renderComponent()

      const nav = container.querySelector('nav')
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')
    })

    it('all clickable items are links', () => {
      const items = [
        { label: 'Products', to: '/$lang/products' },
        { label: 'Current' },
      ]
      renderComponent({ items })

      const links = screen.getAllByRole('link')
      // Home + Products = 2 links
      expect(links).toHaveLength(2)
    })

    it('current page is not a link', () => {
      const items = [
        { label: 'Products', to: '/$lang/products' },
        { label: 'Current Page' },
      ]
      renderComponent({ items })

      const currentText = screen.getByText('Current Page')
      expect(currentText.tagName).toBe('SPAN')
    })
  })

  describe('Language support', () => {
    it('supports different languages in home link', () => {
      renderComponent({ lang: 'fr' })

      const homeLink = screen.getByRole('link')
      expect(homeLink).toHaveAttribute('href', '/fr')
    })

    it('supports Indonesian language', () => {
      renderComponent({ lang: 'id' })

      const homeLink = screen.getByRole('link')
      expect(homeLink).toHaveAttribute('href', '/id')
    })

    it('passes language to breadcrumb link params', () => {
      const items = [
        { label: 'Products', to: '/$lang/products', params: { lang: 'fr' } },
      ]
      renderComponent({ items, lang: 'fr' })

      const link = screen.getByRole('link', { name: 'Products' })
      expect(link).toHaveAttribute('href', '/fr/products')
    })
  })

  describe('Styling', () => {
    it('applies default text color', () => {
      const { container } = renderComponent()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('text-muted-foreground')
    })

    it('applies custom className', () => {
      const { container } = renderComponent({ className: 'custom-class' })

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('custom-class')
    })

    it('uses flex layout', () => {
      const { container } = renderComponent()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('flex')
      expect(nav).toHaveClass('items-center')
    })

    it('applies text size', () => {
      const { container } = renderComponent()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('text-xs')
    })

    it('truncates long final item labels', () => {
      const items = [
        { label: 'Very Long Current Page Label That Should Truncate' },
      ]
      renderComponent({ items })

      const text = screen.getByText(
        'Very Long Current Page Label That Should Truncate',
      )
      expect(text).toHaveClass('truncate')
      expect(text).toHaveClass('max-w-[200px]')
    })
  })

  describe('Edge cases', () => {
    it('handles empty items array', () => {
      renderComponent({ items: [] })

      // Should only show home link
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(1)
    })

    it('handles single item', () => {
      const items = [{ label: 'Single' }]
      renderComponent({ items })

      expect(screen.getByText('Single')).toBeInTheDocument()
    })

    it('handles item without label gracefully', () => {
      const items = [{ label: '' }]
      renderComponent({ items })

      // Empty label should render but be empty
      const { container } = renderComponent({ items })
      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
    })

    it('handles mixed linked and non-linked items', () => {
      const items = [
        { label: 'Products', to: '/$lang/products' },
        { label: 'Electronics', to: '/$lang/electronics' },
        { label: 'Current' },
      ]
      renderComponent({ items })

      // Home + Products + Electronics = 3 links
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)

      // Current is a span
      const current = screen.getByText('Current')
      expect(current.tagName).toBe('SPAN')
    })

    it('handles special characters in labels', () => {
      const items = [{ label: 'Products & Services (2024)' }]
      renderComponent({ items })

      expect(screen.getByText('Products & Services (2024)')).toBeInTheDocument()
    })

    it('handles very long breadcrumb trail', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        label: `Level ${i + 1}`,
        to: '/$lang/level' + (i + 1),
      }))
      renderComponent({ items })

      expect(screen.getByText('Level 1')).toBeInTheDocument()
      expect(screen.getByText('Level 10')).toBeInTheDocument()
    })
  })

  describe('Icon sizes', () => {
    it('home icon has correct size', () => {
      const { container } = renderComponent()

      const homeIcon = container.querySelector('.lucide-house')
      expect(homeIcon).toHaveClass('h-3')
      expect(homeIcon).toHaveClass('w-3')
    })

    it('chevron icons have correct size', () => {
      const items = [{ label: 'Products' }]
      const { container } = renderComponent({ items })

      const chevron = container.querySelector('.lucide-chevron-right')
      expect(chevron).toHaveClass('h-3')
      expect(chevron).toHaveClass('w-3')
    })

    it('chevrons do not shrink', () => {
      const items = [{ label: 'Products' }]
      const { container } = renderComponent({ items })

      const chevron = container.querySelector('.lucide-chevron-right')
      expect(chevron).toHaveClass('shrink-0')
    })
  })
})
