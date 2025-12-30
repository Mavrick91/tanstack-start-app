import { describe, expect, it } from 'vitest'

import { OrderStatsCards } from './OrderStatsCards'

import { render, screen } from '@/test/test-utils'

describe('OrderStatsCards', () => {
  const defaultStats = {
    pending: 5,
    unpaid: 3,
    unfulfilled: 12,
    todayRevenue: 2450.0,
    currency: 'USD',
  }

  it('should render all stat cards', () => {
    render(<OrderStatsCards stats={defaultStats} />)

    expect(screen.getByText('Pending Orders')).toBeInTheDocument()
    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument()
    expect(screen.getByText('Unfulfilled')).toBeInTheDocument()
    expect(screen.getByText("Today's Revenue")).toBeInTheDocument()
  })

  it('should display correct counts', () => {
    render(<OrderStatsCards stats={defaultStats} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('should format revenue correctly', () => {
    render(<OrderStatsCards stats={defaultStats} />)

    expect(screen.getByText('$2,450.00')).toBeInTheDocument()
  })

  it('should show loading state when isLoading is true', () => {
    render(<OrderStatsCards stats={defaultStats} isLoading={true} />)

    // Should show dash instead of values when loading
    expect(screen.getAllByText('—')).toHaveLength(4)
  })

  it('should display zero values correctly', () => {
    render(
      <OrderStatsCards
        stats={{
          pending: 0,
          unpaid: 0,
          unfulfilled: 0,
          todayRevenue: 0,
          currency: 'USD',
        }}
      />,
    )

    expect(screen.getAllByText('0')).toHaveLength(3)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('should highlight cards with non-zero attention items', () => {
    render(<OrderStatsCards stats={defaultStats} />)

    // Cards with values > 0 should have attention styling (find card by looking for border class)
    const pendingLabel = screen.getByText('Pending Orders')
    const pendingCard = pendingLabel.parentElement?.parentElement
    expect(pendingCard).toHaveClass('border-yellow-500/30')
  })

  it('should not highlight cards with zero values', () => {
    render(
      <OrderStatsCards
        stats={{
          pending: 0,
          unpaid: 0,
          unfulfilled: 0,
          todayRevenue: 0,
          currency: 'USD',
        }}
      />,
    )

    // Cards with 0 values should have default styling
    const pendingLabel = screen.getByText('Pending Orders')
    const pendingCard = pendingLabel.parentElement?.parentElement
    expect(pendingCard).toHaveClass('border-border/50')
  })
})
