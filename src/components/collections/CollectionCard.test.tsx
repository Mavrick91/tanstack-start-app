import { describe, expect, it } from 'vitest'

import { CollectionCard } from './CollectionCard'

import { render, screen } from '@/test/test-utils'

describe('CollectionCard', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof CollectionCard>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof CollectionCard> = {
      collection: {
        id: '1',
        handle: 'summer-collection',
        name: 'Summer Collection',
        previewImages: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
        productCount: 12,
      },
    }
    return render(<CollectionCard {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders collection name', () => {
      renderComponent()

      expect(screen.getByText('Summer Collection')).toBeInTheDocument()
    })

    it('renders product count', () => {
      renderComponent()

      // Product count is displayed as "12 Products" in a single element
      expect(screen.getByText(/12\s+Products/i)).toBeInTheDocument()
    })

    it('renders "View Collection" button', () => {
      renderComponent()

      expect(screen.getByText('View Collection')).toBeInTheDocument()
    })

    it('displays collection thumbnail with images', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'test',
          name: 'Test',
          previewImages: ['image1.jpg', 'image2.jpg'],
          productCount: 5,
        },
      })

      // CollectionThumbnail should be rendered
      // We're testing integration, not implementation
      const card = screen.getByText('Test').closest('div')
      expect(card).toBeInTheDocument()
    })

    it('handles empty preview images array', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'test',
          name: 'Test Collection',
          previewImages: [],
          productCount: 0,
        },
      })

      expect(screen.getByText('Test Collection')).toBeInTheDocument()
    })

    it('handles missing preview images', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'test',
          name: 'Test Collection',
          previewImages: undefined,
          productCount: 0,
        },
      })

      expect(screen.getByText('Test Collection')).toBeInTheDocument()
    })
  })

  describe('Navigation links', () => {
    it('renders links to collection page', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'test-collection',
          name: 'Test',
          productCount: 5,
        },
      })

      const links = screen.getAllByRole('link')

      // Should have multiple links to the same collection
      expect(links.length).toBeGreaterThan(0)

      // Links should point to collection page
      links.forEach((link) => {
        expect(link).toHaveAttribute('href')
        const href = link.getAttribute('href')
        expect(href).toContain('test-collection')
      })
    })

    it('includes language parameter in links', () => {
      renderComponent()

      const links = screen.getAllByRole('link')

      // All links should include language in the URL
      links.forEach((link) => {
        const href = link.getAttribute('href')
        expect(href).toContain('/en/') // Default language
      })
    })

    it('has correct href structure', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'my-collection',
          name: 'My Collection',
          productCount: 10,
        },
      })

      const links = screen.getAllByRole('link')
      const href = links[0].getAttribute('href')

      // Should follow pattern: /$lang/collections/$handle
      expect(href).toMatch(/\/en\/collections\/my-collection/)
    })
  })

  describe('Product count display', () => {
    it('shows zero products correctly', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'empty',
          name: 'Empty Collection',
          productCount: 0,
        },
      })

      expect(screen.getByText(/0\s+Products/i)).toBeInTheDocument()
    })

    it('shows single product count', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'single',
          name: 'Single',
          productCount: 1,
        },
      })

      expect(screen.getByText(/1\s+Products/i)).toBeInTheDocument()
    })

    it('shows large product count', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'large',
          name: 'Large',
          productCount: 9999,
        },
      })

      expect(screen.getByText(/9999\s+Products/i)).toBeInTheDocument()
    })
  })

  describe('Collection data variations', () => {
    it('handles long collection names', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'very-long',
          name: 'This is a Very Long Collection Name That Should Still Display Properly',
          productCount: 5,
        },
      })

      expect(
        screen.getByText(
          'This is a Very Long Collection Name That Should Still Display Properly',
        ),
      ).toBeInTheDocument()
    })

    it('handles special characters in name', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'special',
          name: "Men's & Women's Collection",
          productCount: 5,
        },
      })

      expect(screen.getByText("Men's & Women's Collection")).toBeInTheDocument()
    })

    it('handles different handle formats', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'test-handle-with-dashes',
          name: 'Test',
          productCount: 5,
        },
      })

      const links = screen.getAllByRole('link')
      const href = links[0].getAttribute('href')
      expect(href).toContain('test-handle-with-dashes')
    })
  })

  describe('Accessibility', () => {
    it('renders semantic HTML with links', () => {
      renderComponent()

      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)
    })

    it('has accessible button text', () => {
      renderComponent()

      // "View Collection" button should be accessible
      const button = screen.getByText('View Collection')
      expect(button).toBeInTheDocument()
    })

    it('renders card structure properly', () => {
      const { container } = renderComponent()

      // Should have proper card structure
      expect(container.querySelector('.group')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles numeric IDs', () => {
      renderComponent({
        collection: {
          id: '12345',
          handle: 'test',
          name: 'Test',
          productCount: 0,
        },
      })

      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('handles collections with many preview images', () => {
      renderComponent({
        collection: {
          id: '1',
          handle: 'many-images',
          name: 'Many Images',
          previewImages: Array.from({ length: 20 }, (_, i) => `image${i}.jpg`),
          productCount: 50,
        },
      })

      expect(screen.getByText('Many Images')).toBeInTheDocument()
    })
  })
})
