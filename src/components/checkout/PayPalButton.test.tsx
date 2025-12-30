// Component import must come after vi.mock for proper mocking
/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { render, screen } from '@/test/test-utils'

// Mock PayPal hooks before importing component
let mockIsPending = false
let mockIsRejected = false
let mockCreateOrder:
  | ((data: unknown, actions: unknown) => Promise<string>)
  | null = null
let mockOnApprove: ((data: { orderID: string }) => Promise<void>) | null = null

vi.mock('@paypal/react-paypal-js', () => ({
  PayPalButtons: ({
    createOrder,
    onApprove,
  }: {
    createOrder: () => Promise<string>
    onApprove: (data: { orderID: string }) => Promise<void>
  }) => {
    mockCreateOrder = createOrder
    mockOnApprove = onApprove
    return <div data-testid="paypal-buttons">PayPal Buttons</div>
  },
  usePayPalScriptReducer: () => [
    { isPending: mockIsPending, isRejected: mockIsRejected },
  ],
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { PayPalButton } from './PayPalButton'

describe('PayPalButton Component', () => {
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()
  const checkoutId = 'checkout-123'

  beforeEach(() => {
    mockOnSuccess.mockClear()
    mockOnError.mockClear()
    mockFetch.mockClear()
    mockIsPending = false
    mockIsRejected = false
    mockCreateOrder = null
    mockOnApprove = null
  })

  describe('Rendering', () => {
    it('should render PayPal buttons when loaded', () => {
      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      expect(screen.getByTestId('paypal-buttons')).toBeInTheDocument()
    })

    it('should show loading state when pending', () => {
      mockIsPending = true

      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      // Should not show PayPal buttons when pending
      expect(screen.queryByTestId('paypal-buttons')).not.toBeInTheDocument()
    })

    it('should show error message when rejected', () => {
      mockIsRejected = true

      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      expect(screen.getByText(/Failed to load PayPal/i)).toBeInTheDocument()
    })
  })

  describe('Order Creation', () => {
    it('should call API to create PayPal order', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ orderId: 'PAYPAL-ORDER-123' }),
      })

      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      // Simulate createOrder being called by PayPal SDK
      const orderId = await mockCreateOrder!(null, null)

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/checkout/${checkoutId}/payment/paypal`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
      )
      expect(orderId).toBe('PAYPAL-ORDER-123')
    })

    it('should call onError when order creation fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to create order' }),
      })

      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      // Simulate createOrder being called by PayPal SDK
      await expect(mockCreateOrder!(null, null)).rejects.toThrow()

      expect(mockOnError).toHaveBeenCalledWith('Failed to create order')
    })
  })

  describe('Order Approval', () => {
    it('should call API to capture order on approval', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      // Simulate onApprove being called by PayPal SDK
      await mockOnApprove!({ orderID: 'PAYPAL-ORDER-123' })

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/checkout/${checkoutId}/payment/paypal/capture`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId: 'PAYPAL-ORDER-123' }),
        }),
      )
    })

    it('should call onSuccess when capture succeeds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      await mockOnApprove!({ orderID: 'PAYPAL-ORDER-123' })

      expect(mockOnSuccess).toHaveBeenCalledWith('PAYPAL-ORDER-123')
    })

    it('should call onError when capture fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Capture failed' }),
      })

      render(
        <PayPalButton
          checkoutId={checkoutId}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />,
      )

      await mockOnApprove!({ orderID: 'PAYPAL-ORDER-123' })

      expect(mockOnError).toHaveBeenCalledWith('Capture failed')
    })
  })
})
