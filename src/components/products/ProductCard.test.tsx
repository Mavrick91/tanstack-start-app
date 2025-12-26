import { render, screen } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ProductCard } from './ProductCard'

import type { Product } from '../../types/store'

const MOCK_PRODUCT: Product = {
  id: '1',
  name: 'Test Watch',
  slug: 'test-watch',
  description: 'A test watch.',
  price: 250,
  currency: 'USD',
  category: 'Watches',
  images: ['https://example.com/image.jpg'],
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to: string | object
    className?: string
  }) => (
    <a href={typeof to === 'string' ? to : '#'} className={className}>
      {children}
    </a>
  ),
  useParams: () => ({ lang: 'en' }),
}))

const addItemMock = vi.fn()
vi.mock('../../hooks/useCart', () => ({
  useCartStore: (
    fn: (state: { addItem: (productId: string) => void }) => void,
  ) => fn({ addItem: addItemMock }),
}))

describe('ProductCard Component', () => {
  it('should render product information', () => {
    render(<ProductCard product={MOCK_PRODUCT} />)
    expect(screen.getByText('Test Watch')).toBeInTheDocument()
    expect(screen.getByText(/\$250/)).toBeInTheDocument()
  })

  it('should show "Add to Cart" button', () => {
    render(<ProductCard product={MOCK_PRODUCT} />)
    expect(
      screen.getByRole('button', { name: /add to cart/i }),
    ).toBeInTheDocument()
  })
})
