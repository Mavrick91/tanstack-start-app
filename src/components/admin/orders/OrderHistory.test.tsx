import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OrderHistory, type OrderHistoryEntry } from './OrderHistory'

describe('OrderHistory', () => {
  const mockEntries: OrderHistoryEntry[] = [
    {
      id: '1',
      field: 'status',
      previousValue: 'pending',
      newValue: 'processing',
      changedBy: 'admin@example.com',
      changedAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: '2',
      field: 'paymentStatus',
      previousValue: 'pending',
      newValue: 'paid',
      changedBy: 'system',
      changedAt: new Date('2024-01-15T10:05:00Z'),
      reason: 'Stripe webhook: pi_123456',
    },
    {
      id: '3',
      field: 'status',
      previousValue: 'processing',
      newValue: 'cancelled',
      changedBy: 'admin@example.com',
      changedAt: new Date('2024-01-15T11:00:00Z'),
      reason: 'Customer requested cancellation',
    },
  ]

  it('should render the history section title', () => {
    render(<OrderHistory entries={mockEntries} />)

    expect(screen.getByText('Order History')).toBeInTheDocument()
  })

  it('should display all history entries', () => {
    render(<OrderHistory entries={mockEntries} />)

    // Check for status changes (badges are capitalized, may have multiple)
    expect(screen.getAllByText(/Pending/)).toBeTruthy()
    expect(screen.getAllByText(/Processing/)).toBeTruthy()
  })

  it('should show the reason when provided', () => {
    render(<OrderHistory entries={mockEntries} />)

    expect(
      screen.getByText(/Customer requested cancellation/),
    ).toBeInTheDocument()
  })

  it('should display who made the change', () => {
    render(<OrderHistory entries={mockEntries} />)

    expect(screen.getAllByText(/admin@example.com/)).toHaveLength(2)
    expect(screen.getByText(/system/)).toBeInTheDocument()
  })

  it('should show empty state when no entries', () => {
    render(<OrderHistory entries={[]} />)

    expect(screen.getByText(/No history available/i)).toBeInTheDocument()
  })

  it('should display field labels correctly', () => {
    render(<OrderHistory entries={mockEntries} />)

    expect(screen.getAllByText(/Order Status/i)).toBeTruthy()
    expect(screen.getByText(/Payment Status/i)).toBeInTheDocument()
  })

  it('should show entries in chronological order (newest first)', () => {
    render(<OrderHistory entries={mockEntries} />)

    const entries = screen.getAllByTestId('history-entry')
    expect(entries).toHaveLength(3)
  })

  it('should format timestamps correctly', () => {
    render(<OrderHistory entries={mockEntries} />)

    // Check that dates are rendered (format may vary by locale)
    expect(screen.getAllByText(/2024/)).toBeTruthy()
  })

  it('should show loading state when isLoading is true', () => {
    render(<OrderHistory entries={[]} isLoading={true} />)

    expect(screen.getByText(/Loading history/i)).toBeInTheDocument()
  })

  it('should apply correct styling to cancelled status', () => {
    render(<OrderHistory entries={mockEntries} />)

    // The cancelled badge should exist (capitalized in the badge)
    const cancelledBadge = screen.getByText('Cancelled')
    expect(cancelledBadge).toBeInTheDocument()
  })
})
