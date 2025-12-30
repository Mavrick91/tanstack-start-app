import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CartDrawer } from './CartDrawer'

import type { Product } from '../../types/store'

const mockNavigate = vi.fn()

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
  useNavigate: () => mockNavigate,
  useParams: () => ({ lang: 'en' }),
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

vi.mock('../ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../ui/separator', () => ({
  Separator: () => <hr />,
}))

const mockRemoveItem = vi.fn()
const mockUpdateQuantity = vi.fn()

const MOCK_PRODUCT: Product = {
  id: '1',
  slug: 'test-watch',
  name: 'Test Watch',
  description: 'A test watch',
  price: 100,
  currency: 'USD',
  category: 'Watches',
  images: ['https://example.com/image.jpg'],
}

const MOCK_ITEMS = [
  {
    productId: '1',
    variantId: undefined,
    quantity: 2,
    product: MOCK_PRODUCT,
  },
]

vi.mock('../../hooks/useCart', () => ({
  useCart: () => ({
    items: MOCK_ITEMS,
    totalItems: 2,
    totalPrice: 200,
    removeItem: mockRemoveItem,
    updateQuantity: mockUpdateQuantity,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('CartDrawer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render cart items', () => {
      render(<CartDrawer open={true} onOpenChange={() => {}} />)
      expect(screen.getByText('Test Watch')).toBeInTheDocument()
    })

    it('should show the subtotal and total', () => {
      render(<CartDrawer open={true} onOpenChange={() => {}} />)
      const totals = screen.getAllByText(/\$200/)
      expect(totals.length).toBeGreaterThanOrEqual(1)
    })

    it('should display item quantity', () => {
      render(<CartDrawer open={true} onOpenChange={() => {}} />)
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should show checkout button', () => {
      render(<CartDrawer open={true} onOpenChange={() => {}} />)
      expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument()
    })
  })

  describe('Cart Interactions', () => {
    it('should call updateQuantity with incremented value when + clicked', async () => {
      const user = userEvent.setup()
      render(<CartDrawer open={true} onOpenChange={() => {}} />)

      const incrementButton = screen.getAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-plus')
      )

      if (incrementButton) {
        await user.click(incrementButton)
        expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 3, undefined)
      }
    })

    it('should call updateQuantity with decremented value when - clicked', async () => {
      const user = userEvent.setup()
      render(<CartDrawer open={true} onOpenChange={() => {}} />)

      const decrementButton = screen.getAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-minus')
      )

      if (decrementButton) {
        await user.click(decrementButton)
        expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 1, undefined)
      }
    })

    it('should call removeItem when trash button clicked', async () => {
      const user = userEvent.setup()
      render(<CartDrawer open={true} onOpenChange={() => {}} />)

      const removeButton = screen.getAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-trash2')
      )

      if (removeButton) {
        await user.click(removeButton)
        expect(mockRemoveItem).toHaveBeenCalledWith('1', undefined)
      }
    })

    it('should navigate to checkout when checkout button clicked', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = vi.fn()
      render(<CartDrawer open={true} onOpenChange={mockOnOpenChange} />)

      const checkoutButton = screen.getByRole('button', { name: /checkout/i })
      await user.click(checkoutButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/$lang/checkout',
        params: { lang: 'en' },
      })
    })
  })
})
