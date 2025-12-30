import { describe, expect, it } from 'vitest'

import { CollectionThumbnail } from './CollectionThumbnail'

import { render } from '@/test/test-utils'

describe('CollectionThumbnail', () => {
  describe('Empty state', () => {
    it('renders placeholder icon when no images', () => {
      const { container } = render(<CollectionThumbnail images={[]} />)
      const placeholder = container.querySelector('svg')
      expect(placeholder).toBeInTheDocument()
    })

    it('renders placeholder when all images are null or undefined', () => {
      const { container } = render(
        <CollectionThumbnail images={[null, undefined, null]} />,
      )
      const placeholder = container.querySelector('svg')
      expect(placeholder).toBeInTheDocument()
    })

    it('applies muted background for empty state', () => {
      const { container } = render(<CollectionThumbnail images={[]} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('bg-muted/50')
    })
  })

  describe('With images', () => {
    it('renders single image', () => {
      const { container } = render(
        <CollectionThumbnail images={['https://example.com/img1.jpg']} />,
      )
      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(1)
    })

    it('renders two images', () => {
      const { container } = render(
        <CollectionThumbnail
          images={[
            'https://example.com/img1.jpg',
            'https://example.com/img2.jpg',
          ]}
        />,
      )
      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
    })

    it('renders up to four images', () => {
      const { container } = render(
        <CollectionThumbnail
          images={[
            'https://example.com/img1.jpg',
            'https://example.com/img2.jpg',
            'https://example.com/img3.jpg',
            'https://example.com/img4.jpg',
          ]}
        />,
      )
      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(4)
    })

    it('limits to 4 images even when more provided', () => {
      const { container } = render(
        <CollectionThumbnail
          images={[
            'https://example.com/img1.jpg',
            'https://example.com/img2.jpg',
            'https://example.com/img3.jpg',
            'https://example.com/img4.jpg',
            'https://example.com/img5.jpg',
            'https://example.com/img6.jpg',
          ]}
        />,
      )
      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(4)
    })

    it('fills empty slots with placeholder icons', () => {
      const { container } = render(
        <CollectionThumbnail images={['https://example.com/img1.jpg']} />,
      )
      const images = container.querySelectorAll('img')
      const placeholderIcons = container.querySelectorAll('.bg-muted\\/30')
      expect(images).toHaveLength(1)
      expect(placeholderIcons).toHaveLength(3)
    })

    it('filters out null and undefined values', () => {
      const { container } = render(
        <CollectionThumbnail
          images={[
            'https://example.com/img1.jpg',
            null,
            'https://example.com/img2.jpg',
            undefined,
          ]}
        />,
      )
      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
    })

    it('renders grid layout for images', () => {
      const { container } = render(
        <CollectionThumbnail images={['https://example.com/img1.jpg']} />,
      )
      const grid = container.firstChild as HTMLElement
      expect(grid).toHaveClass('grid')
      expect(grid).toHaveClass('grid-cols-2')
      expect(grid).toHaveClass('grid-rows-2')
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <CollectionThumbnail images={[]} className="custom-class" />,
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })
  })
})
