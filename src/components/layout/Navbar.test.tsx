import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { Navbar } from './Navbar'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: ReactNode
    to: string
    params?: { lang: string }
    className?: string
  }) => {
    const href = params ? to.replace('$lang', params.lang) : to
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
  useParams: () => ({ lang: 'en' }),
}))

let mockCartItems: Array<{ quantity: number }> = []

vi.mock('../../hooks/useCart', () => ({
  useCartStore: (
    fn: (state: { items: Array<{ quantity: number }> }) => unknown,
  ) => fn({ items: mockCartItems }),
}))

vi.mock('../../data/storefront', () => ({
  getProducts: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../cart/CartDrawer', () => ({
  CartDrawer: ({
    open,
    onOpenChange,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => {
    return open ? (
      <div data-testid="cart-drawer">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCartItems = []
  })

  describe('Rendering', () => {
    it('should render the logo and site name', async () => {
      await act(async () => {
        render(<Navbar />)
      })
      expect(screen.getByText(/FineNail Season/i)).toBeInTheDocument()
    })

    it('should render navigation links', async () => {
      await act(async () => {
        render(<Navbar />)
      })
      expect(screen.getByText(/Products/i)).toBeInTheDocument()
      expect(screen.getByText(/Collections/i)).toBeInTheDocument()
    })

    it('should show the cart trigger', async () => {
      await act(async () => {
        render(<Navbar />)
      })
      expect(screen.getByRole('button', { name: /cart/i })).toBeInTheDocument()
    })
  })

  describe('Cart Drawer Interaction', () => {
    it('should open cart drawer when cart button clicked', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<Navbar />)
      })

      const cartButton = screen.getByRole('button', { name: /cart/i })
      await user.click(cartButton)

      expect(screen.getByTestId('cart-drawer')).toBeInTheDocument()
    })

    it('should show item count badge when cart has items', async () => {
      mockCartItems = [{ quantity: 2 }, { quantity: 3 }]

      await act(async () => {
        render(<Navbar />)
      })

      // Total should be 5 (2 + 3)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should not show badge when cart is empty', async () => {
      mockCartItems = []

      await act(async () => {
        render(<Navbar />)
      })

      // Badge should not exist
      const badge = screen.queryByText(/^\d+$/)
      expect(badge).not.toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should have correct href for Products link', async () => {
      await act(async () => {
        render(<Navbar />)
      })

      const productsLink = screen.getByText(/Products/i).closest('a')
      expect(productsLink).toHaveAttribute('href', '/en/products')
    })

    it('should have correct href for Collections link', async () => {
      await act(async () => {
        render(<Navbar />)
      })

      const collectionsLink = screen.getByText(/Collections/i).closest('a')
      expect(collectionsLink).toHaveAttribute('href', '/en/collections')
    })

    it('should include language prefix in home link', async () => {
      await act(async () => {
        render(<Navbar />)
      })

      const homeLink = screen.getByText(/Home/i).closest('a')
      expect(homeLink).toHaveAttribute('href', '/en')
    })
  })

  describe('Language Selector', () => {
    it('should render all language options', async () => {
      await act(async () => {
        render(<Navbar />)
      })

      expect(screen.getByText('en')).toBeInTheDocument()
      expect(screen.getByText('fr')).toBeInTheDocument()
      expect(screen.getByText('id')).toBeInTheDocument()
    })
  })
})
