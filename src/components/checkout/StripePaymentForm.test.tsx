// Component import must come after vi.mock for proper mocking
/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { act, fireEvent, render, screen, waitFor } from '@/test/test-utils'

// Mock Stripe hooks before importing component
const mockStripe = {
  confirmPayment: vi.fn(),
}

const mockElements = {}

vi.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: () => (
    <div data-testid="payment-element">Payment Element</div>
  ),
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}))

import { StripePaymentForm } from './StripePaymentForm'

describe('StripePaymentForm Component', () => {
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()
  const returnUrl = 'https://example.com/checkout/confirmation'

  beforeEach(() => {
    mockOnSuccess.mockClear()
    mockOnError.mockClear()
    mockStripe.confirmPayment.mockClear()
  })

  describe('Rendering', () => {
    it('should render payment element', () => {
      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      expect(screen.getByTestId('payment-element')).toBeInTheDocument()
    })

    it('should render pay button', () => {
      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      expect(
        screen.getByRole('button', { name: /Pay now/i }),
      ).toBeInTheDocument()
    })

    it('should have form element', () => {
      const { container } = render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      expect(container.querySelector('form')).toBeInTheDocument()
    })
  })

  describe('Payment Submission', () => {
    it('should call stripe.confirmPayment on form submit', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      })

      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      const form = screen
        .getByRole('button', { name: /Pay now/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockStripe.confirmPayment).toHaveBeenCalledWith({
          elements: mockElements,
          confirmParams: {
            return_url: returnUrl,
          },
          redirect: 'if_required',
        })
      })
    })

    it('should call onSuccess when payment succeeds', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      })

      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      const form = screen
        .getByRole('button', { name: /Pay now/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('pi_123')
      })
    })

    it('should call onError when payment fails', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        error: { message: 'Your card was declined' },
      })

      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      const form = screen
        .getByRole('button', { name: /Pay now/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Your card was declined')
      })
    })

    it('should display error message when payment fails', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        error: { message: 'Your card was declined' },
      })

      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      const form = screen
        .getByRole('button', { name: /Pay now/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Your card was declined')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state during payment processing', async () => {
      let resolvePayment: (value: unknown) => void
      mockStripe.confirmPayment.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePayment = resolve
          }),
      )

      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      const form = screen
        .getByRole('button', { name: /Pay now/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument()
      })

      // Resolve the payment and wait for state update
      await act(async () => {
        resolvePayment!({
          paymentIntent: { id: 'pi_123', status: 'succeeded' },
        })
      })
    })

    it('should disable button during processing', async () => {
      let resolvePayment: (value: unknown) => void
      mockStripe.confirmPayment.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePayment = resolve
          }),
      )

      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      const submitButton = screen.getByRole('button', { name: /Pay now/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Resolve the payment and wait for state update
      await act(async () => {
        resolvePayment!({
          paymentIntent: { id: 'pi_123', status: 'succeeded' },
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle exception during payment', async () => {
      mockStripe.confirmPayment.mockRejectedValue(new Error('Network error'))

      render(
        <StripePaymentForm
          onSuccess={mockOnSuccess}
          onError={mockOnError}
          returnUrl={returnUrl}
        />,
      )

      const form = screen
        .getByRole('button', { name: /Pay now/i })
        .closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error')
      })
    })
  })
})
