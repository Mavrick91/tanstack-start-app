import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NoResults } from '@/routes/admin/_authed/products/index'
import { fireEvent, render, screen } from '@/test/test-utils'

describe('NoResults component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    )
  }

  it('should call onClear when clicking Clear Filters button', () => {
    const onClear = vi.fn()
    renderWithProviders(<NoResults onClear={onClear} />)

    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    fireEvent.click(clearButton)

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('should have accessible button with aria-label', () => {
    const onClear = vi.fn()
    renderWithProviders(<NoResults onClear={onClear} />)

    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    expect(clearButton).toBeInTheDocument()
    expect(clearButton).toHaveAttribute('aria-label')
  })

  it('should display the correct message', () => {
    const onClear = vi.fn()
    renderWithProviders(<NoResults onClear={onClear} />)

    expect(
      screen.getByText('No products match your filters.'),
    ).toBeInTheDocument()
  })

  it('should display "Clear Filters" button text', () => {
    const onClear = vi.fn()
    renderWithProviders(<NoResults onClear={onClear} />)

    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })
})
