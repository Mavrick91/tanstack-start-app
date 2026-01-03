import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Navbar } from './Navbar'

import { mockNavigate } from '@/test/setup'
import { render, screen, waitFor } from '@/test/test-utils'

let mockCartItems: Array<{ quantity: number }> = []
let mockAuthUser: { email: string; role?: string } | null = null
const mockOpenAuthModal = vi.fn()
const mockLogoutMutate = vi.fn()

vi.mock('../../hooks/useCart', () => ({
  useCartStore: (
    fn: (state: { items: Array<{ quantity: number }> }) => unknown,
  ) => fn({ items: mockCartItems }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ data: mockAuthUser }),
  useAuthLogout: () => ({
    mutate: mockLogoutMutate,
  }),
}))

vi.mock('../../features/auth', () => ({
  AuthModal: () => <div data-testid="auth-modal">Auth Modal</div>,
  useAuthModal: () => ({
    open: mockOpenAuthModal,
  }),
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

describe('Navbar Component', () => {
  beforeEach(() => {
    mockCartItems = []
    mockAuthUser = null
    mockOpenAuthModal.mockClear()
    mockNavigate.mockClear()
    mockLogoutMutate.mockClear()
  })

  describe('Rendering', () => {
    it('should render the logo and site name', () => {
      render(<Navbar />)
      expect(screen.getByText(/FineNail Season/i)).toBeInTheDocument()
    })

    it('should render navigation links', () => {
      render(<Navbar />)
      expect(screen.getByText(/Products/i)).toBeInTheDocument()
      expect(screen.getByText(/Collections/i)).toBeInTheDocument()
    })

    it('should show the cart trigger', () => {
      render(<Navbar />)
      expect(screen.getByRole('button', { name: /cart/i })).toBeInTheDocument()
    })
  })

  describe('Cart Drawer Interaction', () => {
    it('should open cart drawer when cart button clicked', async () => {
      const { user } = render(<Navbar />)

      const cartButton = screen.getByRole('button', { name: /cart/i })
      await user.click(cartButton)

      expect(screen.getByTestId('cart-drawer')).toBeInTheDocument()
    })

    it('should show item count badge when cart has items', () => {
      mockCartItems = [{ quantity: 2 }, { quantity: 3 }]

      render(<Navbar />)

      // Total should be 5 (2 + 3)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should not show badge when cart is empty', () => {
      mockCartItems = []

      render(<Navbar />)

      // Badge should not exist
      const badge = screen.queryByText(/^\d+$/)
      expect(badge).not.toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should have correct href for Products link', () => {
      render(<Navbar />)

      const productsLink = screen.getByText(/Products/i).closest('a')
      expect(productsLink).toHaveAttribute('href', '/en/products')
    })

    it('should have correct href for Collections link', () => {
      render(<Navbar />)

      const collectionsLink = screen.getByText(/Collections/i).closest('a')
      expect(collectionsLink).toHaveAttribute('href', '/en/collections')
    })

    it('should include language prefix in home link', () => {
      render(<Navbar />)

      const homeLink = screen.getByText(/Home/i).closest('a')
      expect(homeLink).toHaveAttribute('href', '/en')
    })
  })

  describe('Language Selector', () => {
    it('should render all language options', () => {
      render(<Navbar />)

      expect(screen.getByText('en')).toBeInTheDocument()
      expect(screen.getByText('fr')).toBeInTheDocument()
      expect(screen.getByText('id')).toBeInTheDocument()
    })
  })

  describe('Account Icon - Not Logged In', () => {
    beforeEach(() => {
      mockAuthUser = null
    })

    it('should show login dialog when clicking account icon', async () => {
      const { user } = render(<Navbar />)

      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      expect(mockOpenAuthModal).toHaveBeenCalledWith('login')
    })

    it('should not show dropdown menu when not authenticated', () => {
      render(<Navbar />)

      // Dropdown menu items should not be visible
      expect(screen.queryByText('Account Details')).not.toBeInTheDocument()
      expect(screen.queryByText('My Orders')).not.toBeInTheDocument()
      expect(screen.queryByText('Log out')).not.toBeInTheDocument()
    })
  })

  describe('Account Dropdown - Logged In', () => {
    beforeEach(() => {
      mockAuthUser = { email: 'test@example.com' }
    })

    it('should show dropdown menu when clicking account icon', async () => {
      const { user } = render(<Navbar />)

      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      // Dropdown menu should appear with user email
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('should display user email in dropdown header', async () => {
      const { user } = render(<Navbar />)

      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
        expect(screen.getByText('My Account')).toBeInTheDocument()
      })
    })

    it('should show Account Details menu item', async () => {
      const { user } = render(<Navbar />)

      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      await waitFor(() => {
        expect(screen.getByText('Account Details')).toBeInTheDocument()
      })
    })

    it('should show My Orders menu item', async () => {
      const { user } = render(<Navbar />)

      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      await waitFor(() => {
        expect(screen.getByText('My Orders')).toBeInTheDocument()
      })
    })

    it('should show Log out menu item', async () => {
      const { user } = render(<Navbar />)

      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      await waitFor(() => {
        expect(screen.getByText('Log out')).toBeInTheDocument()
      })
    })

    it('should navigate to account page when clicking Account Details', async () => {
      const { user } = render(<Navbar />)

      // Open dropdown
      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      // Click Account Details
      await waitFor(() => {
        expect(screen.getByText('Account Details')).toBeInTheDocument()
      })

      const accountDetailsItem = screen.getByText('Account Details')
      await user.click(accountDetailsItem)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/$lang/account',
        params: { lang: 'en' },
      })
    })

    it('should navigate to orders page when clicking My Orders', async () => {
      const { user } = render(<Navbar />)

      // Open dropdown
      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      // Click My Orders
      await waitFor(() => {
        expect(screen.getByText('My Orders')).toBeInTheDocument()
      })

      const myOrdersItem = screen.getByText('My Orders')
      await user.click(myOrdersItem)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/$lang/account/orders',
        params: { lang: 'en' },
      })
    })

    it('should call logout and redirect when clicking Log out', async () => {
      const { user } = render(<Navbar />)

      // Open dropdown
      const accountButton = screen.getByRole('button', { name: 'account' })
      await user.click(accountButton)

      // Click Log out
      await waitFor(() => {
        expect(screen.getByText('Log out')).toBeInTheDocument()
      })

      const logoutItem = screen.getByText('Log out')
      await user.click(logoutItem)

      // Should call logout mutation
      expect(mockLogoutMutate).toHaveBeenCalled()

      // Simulate successful logout callback
      const onSuccessCallback = mockLogoutMutate.mock.calls[0][1]?.onSuccess
      if (onSuccessCallback) {
        onSuccessCallback()
      }

      // Should navigate to home
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/$lang',
        params: { lang: 'en' },
      })
    })
  })

  describe('Admin Panel menu item', () => {
    describe('when user is an admin', () => {
      beforeEach(() => {
        mockAuthUser = { email: 'admin@example.com', role: 'admin' }
      })

      it('should show Admin Panel menu item in dropdown', async () => {
        const { user } = render(<Navbar />)

        // Open dropdown
        const accountButton = screen.getByRole('button', { name: 'account' })
        await user.click(accountButton)

        // Admin Panel should be visible
        await waitFor(() => {
          expect(screen.getByText('Admin Panel')).toBeInTheDocument()
        })
      })

      it('should display Admin Panel after My Orders and before logout', async () => {
        const { user } = render(<Navbar />)

        // Open dropdown
        const accountButton = screen.getByRole('button', { name: 'account' })
        await user.click(accountButton)

        await waitFor(() => {
          expect(screen.getByText('Admin Panel')).toBeInTheDocument()
        })

        // Get all menu items in order
        const myOrdersItem = screen.getByText('My Orders')

        // Check order: My Orders should come before Admin Panel, which should come before Log out
        const dropdown = myOrdersItem.closest('[role="menu"]')
        if (dropdown) {
          const menuItems = Array.from(
            dropdown.querySelectorAll('[role="menuitem"]'),
          )
          const myOrdersIndex = menuItems.findIndex((item) =>
            item.textContent?.includes('My Orders'),
          )
          const adminPanelIndex = menuItems.findIndex((item) =>
            item.textContent?.includes('Admin Panel'),
          )
          const logoutIndex = menuItems.findIndex((item) =>
            item.textContent?.includes('Log out'),
          )

          expect(myOrdersIndex).toBeLessThan(adminPanelIndex)
          expect(adminPanelIndex).toBeLessThan(logoutIndex)
        }
      })

      it('should have a separator before Admin Panel', async () => {
        const { user } = render(<Navbar />)

        // Open dropdown
        const accountButton = screen.getByRole('button', { name: 'account' })
        await user.click(accountButton)

        await waitFor(() => {
          expect(screen.getByText('Admin Panel')).toBeInTheDocument()
        })

        // Check that there's a separator before Admin Panel
        const adminPanelItem = screen
          .getByText('Admin Panel')
          .closest('[role="menuitem"]')
        const previousSibling = adminPanelItem?.previousElementSibling

        expect(previousSibling).toHaveAttribute('role', 'separator')
      })

      it('should navigate to /admin when clicking Admin Panel', async () => {
        const { user } = render(<Navbar />)

        // Open dropdown
        const accountButton = screen.getByRole('button', { name: 'account' })
        await user.click(accountButton)

        // Click Admin Panel
        await waitFor(() => {
          expect(screen.getByText('Admin Panel')).toBeInTheDocument()
        })

        const adminPanelItem = screen.getByText('Admin Panel')
        await user.click(adminPanelItem)

        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/admin',
        })
      })
    })

    describe('when user is a customer (not admin)', () => {
      beforeEach(() => {
        mockAuthUser = { email: 'customer@example.com', role: 'customer' }
      })

      it('should NOT show Admin Panel menu item in dropdown', async () => {
        const { user } = render(<Navbar />)

        // Open dropdown
        const accountButton = screen.getByRole('button', { name: 'account' })
        await user.click(accountButton)

        // Wait for dropdown to be visible
        await waitFor(() => {
          expect(screen.getByText('My Orders')).toBeInTheDocument()
        })

        // Admin Panel should NOT be visible
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
      })
    })

    describe('when user is not logged in', () => {
      beforeEach(() => {
        mockAuthUser = null
      })

      it('should NOT show Admin Panel menu item', async () => {
        const { user } = render(<Navbar />)

        // Click account button (should trigger login modal, not show dropdown)
        const accountButton = screen.getByRole('button', { name: 'account' })
        await user.click(accountButton)

        // Admin Panel should NOT be visible anywhere
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
      })
    })

    describe('when user has no role field', () => {
      beforeEach(() => {
        mockAuthUser = { email: 'user@example.com' }
      })

      it('should NOT show Admin Panel menu item', async () => {
        const { user } = render(<Navbar />)

        // Open dropdown
        const accountButton = screen.getByRole('button', { name: 'account' })
        await user.click(accountButton)

        // Wait for dropdown to be visible
        await waitFor(() => {
          expect(screen.getByText('My Orders')).toBeInTheDocument()
        })

        // Admin Panel should NOT be visible
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
      })
    })
  })
})
