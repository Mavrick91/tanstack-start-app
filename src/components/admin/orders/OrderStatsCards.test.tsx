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
    const { container } = render(
      <OrderStatsCards stats={defaultStats} isLoading={true} />,
    )

    // Should show skeleton placeholders when loading
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons).toHaveLength(4)

    // Values should not be visible during loading
    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.queryByText('$2,450.00')).not.toBeInTheDocument()
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
})
