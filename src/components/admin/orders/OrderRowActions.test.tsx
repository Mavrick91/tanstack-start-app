import { describe, expect, it, vi } from 'vitest'

import { OrderRowActions } from './OrderRowActions'

import { render, screen } from '@/test/test-utils'

describe('OrderRowActions', () => {
  const defaultProps = {
    orderId: 'order-123',
    orderNumber: 1001,
    currentStatus: 'pending' as const,
    currentFulfillmentStatus: 'unfulfilled' as const,
    onStatusChange: vi.fn(),
  }

  it('should render the action menu trigger button', () => {
    render(<OrderRowActions {...defaultProps} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should show dropdown menu when clicked', async () => {
    const { user } = render(<OrderRowActions {...defaultProps} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
  })

  it('should show View Details option', async () => {
    const { user } = render(<OrderRowActions {...defaultProps} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('should show status change options', async () => {
    const { user } = render(<OrderRowActions {...defaultProps} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Mark as Processing')).toBeInTheDocument()
    expect(screen.getByText('Mark as Shipped')).toBeInTheDocument()
  })

  it('should call onStatusChange when status option is clicked', async () => {
    const onStatusChange = vi.fn()
    const { user } = render(
      <OrderRowActions {...defaultProps} onStatusChange={onStatusChange} />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Mark as Processing'))

    expect(onStatusChange).toHaveBeenCalledWith('order-123', {
      status: 'processing',
    })
  })

  it('should show fulfillment options', async () => {
    const { user } = render(<OrderRowActions {...defaultProps} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Mark Fulfilled')).toBeInTheDocument()
  })

  it('should call onStatusChange for fulfillment change', async () => {
    const onStatusChange = vi.fn()
    const { user } = render(
      <OrderRowActions {...defaultProps} onStatusChange={onStatusChange} />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Mark Fulfilled'))

    expect(onStatusChange).toHaveBeenCalledWith('order-123', {
      fulfillmentStatus: 'fulfilled',
    })
  })

  it('should not show current status as an option', async () => {
    const { user } = render(
      <OrderRowActions {...defaultProps} currentStatus="processing" />,
    )

    await user.click(screen.getByRole('button'))

    // Should not show "Mark as Processing" since it's already processing
    expect(screen.queryByText('Mark as Processing')).not.toBeInTheDocument()
  })

  it('should show Cancel Order option', async () => {
    const { user } = render(<OrderRowActions {...defaultProps} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Cancel Order')).toBeInTheDocument()
  })

  it('should disable actions when isLoading is true', async () => {
    const { user } = render(
      <OrderRowActions {...defaultProps} isLoading={true} />,
    )

    await user.click(screen.getByRole('button'))

    const processingOption = screen.getByText('Mark as Processing')
    expect(processingOption.closest('[data-disabled]')).toBeTruthy()
  })
})
