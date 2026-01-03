import { describe, expect, it, vi } from 'vitest'

import { OrderCancellationDialog } from './OrderCancellationDialog'

import { render, screen } from '@/test/test-utils'

describe('OrderCancellationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    orderNumber: 1001,
    paymentStatus: 'paid' as const,
    total: 99.99,
    currency: 'USD',
  }

  it('should render the dialog when open', () => {
    render(<OrderCancellationDialog {...defaultProps} />)

    expect(screen.getByText(/Cancel Order #1001/)).toBeInTheDocument()
  })

  it('should show refund warning when payment status is paid', () => {
    render(<OrderCancellationDialog {...defaultProps} paymentStatus="paid" />)

    // Check for refund message (may be split across elements)
    expect(screen.getByText(/refund of/i)).toBeInTheDocument()
    expect(
      screen.getByText(/will be processed automatically/i),
    ).toBeInTheDocument()
  })

  it('should not show refund warning when payment is pending', () => {
    render(
      <OrderCancellationDialog {...defaultProps} paymentStatus="pending" />,
    )

    expect(
      screen.queryByText(/refund will be processed/i),
    ).not.toBeInTheDocument()
  })

  it('should require a reason before confirming', async () => {
    const onConfirm = vi.fn()
    const { user } = render(
      <OrderCancellationDialog {...defaultProps} onConfirm={onConfirm} />,
    )

    const confirmButton = screen.getByRole('button', {
      name: /cancel order/i,
    })

    // Button should be disabled without reason
    expect(confirmButton).toBeDisabled()

    // Enter a reason
    const reasonInput = screen.getByPlaceholderText(/reason for cancellation/i)
    await user.type(reasonInput, 'Customer requested cancellation')

    // Button should now be enabled
    expect(confirmButton).not.toBeDisabled()
  })

  it('should call onConfirm with reason when confirmed', async () => {
    const onConfirm = vi.fn()
    const { user } = render(
      <OrderCancellationDialog {...defaultProps} onConfirm={onConfirm} />,
    )

    const reasonInput = screen.getByPlaceholderText(/reason for cancellation/i)
    await user.type(reasonInput, 'Customer requested cancellation')

    const confirmButton = screen.getByRole('button', {
      name: /cancel order/i,
    })
    await user.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledWith('Customer requested cancellation')
  })

  it('should disable buttons when isLoading is true', () => {
    render(<OrderCancellationDialog {...defaultProps} isLoading={true} />)

    // Check that buttons are disabled during loading to prevent duplicate submissions
    const confirmButton = screen.getByRole('button', { name: /cancel order/i })
    const keepButton = screen.getByRole('button', { name: /keep order/i })
    expect(confirmButton).toBeDisabled()
    expect(keepButton).toBeDisabled()

    // Textarea should also be disabled during loading
    const textarea = screen.getByPlaceholderText(/reason for cancellation/i)
    expect(textarea).toBeDisabled()
  })

  it('should call onOpenChange when cancel button is clicked', async () => {
    const onOpenChange = vi.fn()
    const { user } = render(
      <OrderCancellationDialog {...defaultProps} onOpenChange={onOpenChange} />,
    )

    const cancelButton = screen.getByRole('button', { name: /keep order/i })
    await user.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should display already refunded message', () => {
    render(
      <OrderCancellationDialog {...defaultProps} paymentStatus="refunded" />,
    )

    expect(screen.getByText(/already been refunded/i)).toBeInTheDocument()
  })

  it('should handle failed payment status', () => {
    render(<OrderCancellationDialog {...defaultProps} paymentStatus="failed" />)

    expect(screen.getByText(/no refund needed/i)).toBeInTheDocument()
  })
})
