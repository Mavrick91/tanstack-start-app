import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { OrderBulkActionsBar } from './OrderBulkActionsBar'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('OrderBulkActionsBar', () => {
  const defaultProps = {
    selectedCount: 5,
    selectedIds: new Set([
      'order-1',
      'order-2',
      'order-3',
      'order-4',
      'order-5',
    ]),
    onClearSelection: vi.fn(),
    onBulkAction: vi.fn(),
  }

  it('should not render when no items are selected', () => {
    render(
      <OrderBulkActionsBar
        {...defaultProps}
        selectedCount={0}
        selectedIds={new Set()}
      />,
      { wrapper: createWrapper() },
    )

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })

  it('should render when items are selected', () => {
    render(<OrderBulkActionsBar {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText('5 selected')).toBeInTheDocument()
  })

  it('should show bulk action buttons', () => {
    render(<OrderBulkActionsBar {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText('Processing')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getByText('Fulfilled')).toBeInTheDocument()
  })

  it('should call onBulkAction when Processing button is clicked', async () => {
    const user = userEvent.setup()
    const onBulkAction = vi.fn()
    render(
      <OrderBulkActionsBar {...defaultProps} onBulkAction={onBulkAction} />,
      { wrapper: createWrapper() },
    )

    await user.click(screen.getByText('Processing'))

    expect(onBulkAction).toHaveBeenCalledWith('status', 'processing')
  })

  it('should call onBulkAction when Shipped button is clicked', async () => {
    const user = userEvent.setup()
    const onBulkAction = vi.fn()
    render(
      <OrderBulkActionsBar {...defaultProps} onBulkAction={onBulkAction} />,
      { wrapper: createWrapper() },
    )

    await user.click(screen.getByText('Shipped'))

    expect(onBulkAction).toHaveBeenCalledWith('status', 'shipped')
  })

  it('should call onBulkAction when Fulfilled button is clicked', async () => {
    const user = userEvent.setup()
    const onBulkAction = vi.fn()
    render(
      <OrderBulkActionsBar {...defaultProps} onBulkAction={onBulkAction} />,
      { wrapper: createWrapper() },
    )

    await user.click(screen.getByText('Fulfilled'))

    expect(onBulkAction).toHaveBeenCalledWith('fulfillmentStatus', 'fulfilled')
  })

  it('should call onClearSelection when X button is clicked', async () => {
    const user = userEvent.setup()
    const onClearSelection = vi.fn()
    render(
      <OrderBulkActionsBar
        {...defaultProps}
        onClearSelection={onClearSelection}
      />,
      { wrapper: createWrapper() },
    )

    // Find the X button by its aria-label
    const closeButton = screen.getByRole('button', { name: 'Clear selection' })
    await user.click(closeButton)

    expect(onClearSelection).toHaveBeenCalled()
  })

  it('should disable buttons when isLoading is true', () => {
    render(<OrderBulkActionsBar {...defaultProps} isLoading={true} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText('Processing').closest('button')).toBeDisabled()
    expect(screen.getByText('Shipped').closest('button')).toBeDisabled()
    expect(screen.getByText('Fulfilled').closest('button')).toBeDisabled()
  })
})
