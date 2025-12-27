import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductGallery } from './ProductGallery'

vi.mock('@fancyapps/ui', () => ({
  Fancybox: {
    bind: vi.fn(),
    destroy: vi.fn(),
  },
}))

describe('ProductGallery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Empty state', () => {
    it('renders nothing when images is empty', () => {
      const { container } = render(
        <ProductGallery images={[]} productName="Test Product" />,
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when images is undefined', () => {
      const { container } = render(
        <ProductGallery
          images={undefined as unknown as string[]}
          productName="Test Product"
        />,
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Single image', () => {
    it('renders main image', () => {
      render(
        <ProductGallery
          images={['https://example.com/img1.jpg']}
          productName="Test Product"
        />,
      )
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', 'https://example.com/img1.jpg')
      expect(img).toHaveAttribute('alt', 'Test Product')
    })

    it('renders main image with fancybox link', () => {
      const { container } = render(
        <ProductGallery
          images={['https://example.com/img1.jpg']}
          productName="Test Product"
        />,
      )
      const link = container.querySelector('a[data-fancybox="gallery"]')
      expect(link).toHaveAttribute('href', 'https://example.com/img1.jpg')
    })

    it('does not render thumbnail grid for single image', () => {
      const { container } = render(
        <ProductGallery
          images={['https://example.com/img1.jpg']}
          productName="Test Product"
        />,
      )
      const thumbnailGrid = container.querySelector('.grid-cols-4')
      expect(thumbnailGrid).toBeNull()
    })
  })

  describe('Multiple images', () => {
    const testImages = [
      'https://example.com/img1.jpg',
      'https://example.com/img2.jpg',
      'https://example.com/img3.jpg',
    ]

    it('renders main image as first image', () => {
      render(<ProductGallery images={testImages} productName="Test Product" />)
      const images = screen.getAllByRole('img')
      expect(images[0]).toHaveAttribute('src', 'https://example.com/img1.jpg')
    })

    it('renders thumbnail grid for additional images', () => {
      const { container } = render(
        <ProductGallery images={testImages} productName="Test Product" />,
      )
      const thumbnailGrid = container.querySelector('.grid-cols-4')
      expect(thumbnailGrid).toBeInTheDocument()
    })

    it('renders thumbnails for images 2+', () => {
      const { container } = render(
        <ProductGallery images={testImages} productName="Test Product" />,
      )
      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(3)
    })

    it('all thumbnails have fancybox attributes', () => {
      const { container } = render(
        <ProductGallery images={testImages} productName="Test Product" />,
      )
      const fancyboxLinks = container.querySelectorAll(
        'a[data-fancybox="gallery"]',
      )
      expect(fancyboxLinks).toHaveLength(3)
    })
  })

  describe('Styling', () => {
    it('applies aspect ratio to main image container', () => {
      const { container } = render(
        <ProductGallery
          images={['https://example.com/img1.jpg']}
          productName="Test Product"
        />,
      )
      const mainLink = container.querySelector('a')
      expect(mainLink).toHaveClass('aspect-[4/5]')
    })

    it('thumbnails have square aspect ratio', () => {
      const { container } = render(
        <ProductGallery
          images={[
            'https://example.com/img1.jpg',
            'https://example.com/img2.jpg',
          ]}
          productName="Test Product"
        />,
      )
      const thumbnailLink = container.querySelector('.grid-cols-4 a')
      expect(thumbnailLink).toHaveClass('aspect-square')
    })

    it('images have object-cover', () => {
      render(
        <ProductGallery
          images={['https://example.com/img1.jpg']}
          productName="Test Product"
        />,
      )
      const img = screen.getByRole('img')
      expect(img).toHaveClass('object-cover')
    })
  })
})
