import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactNode } from 'react'
import { CartDrawer } from './CartDrawer'
import type { Product } from '../../types/store'

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
}))

vi.mock('../ui/sheet', () => ({
  Sheet: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const MOCK_ITEMS = [
  {
    productId: '1',
    quantity: 2,
    product: {
      id: '1',
      name: 'Test Watch',
      price: 100,
      currency: 'USD',
      category: 'Watches',
      images: ['https://example.com/image.jpg'],
    } as Product,
  },
]

vi.mock('../../hooks/useCart', () => ({
  useCart: () => ({
    items: MOCK_ITEMS,
    totalItems: 2,
    totalPrice: 200,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
  }),
}))

describe('CartDrawer Component', () => {
  it('should render cart items', () => {
    render(<CartDrawer open={true} onOpenChange={() => {}} />)
    expect(screen.getByText('Test Watch')).toBeInTheDocument()
  })

  it('should show the subtotal and total', () => {
    render(<CartDrawer open={true} onOpenChange={() => {}} />)
    const totals = screen.getAllByText(/\$200/)
    expect(totals.length).toBeGreaterThanOrEqual(1)
  })
})
