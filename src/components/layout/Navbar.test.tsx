import { render, screen, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Navbar } from './Navbar'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to: string
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useParams: () => ({ lang: 'en' }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('../../hooks/useCart', () => ({
  useCartStore: (fn: (state: { items: Array<unknown> }) => unknown) =>
    fn({ items: [] }),
}))

vi.mock('../../data/products', () => ({
  getProducts: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../cart/CartDrawer', () => ({
  CartDrawer: () => <div data-testid="cart-drawer" />,
}))

describe('Navbar Component', () => {
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
  })

  it('should show the cart trigger', async () => {
    await act(async () => {
      render(<Navbar />)
    })
    expect(screen.getByRole('button', { name: /cart/i })).toBeInTheDocument()
  })
})
