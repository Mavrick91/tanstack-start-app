import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductListActions } from './ProductListActions'
import {
  deleteProductFn,
  duplicateProductFn,
  updateProductStatusFn,
} from '../../../../server/products'

import { render, screen } from '@/test/test-utils'

vi.mock('../../../../server/products', () => ({
  deleteProductFn: vi.fn(),
  duplicateProductFn: vi.fn(),
  updateProductStatusFn: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}))

describe('ProductListActions', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.resetAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ProductListActions>> = {},
  ) => {
    const defaultProps = {
      productId: 'prod-123',
      productName: 'Test Product',
      handle: 'test-product',
      status: 'active' as const,
    }
    return render(
      <QueryClientProvider client={queryClient}>
        <ProductListActions {...defaultProps} {...props} />
      </QueryClientProvider>,
    )
  }

  it('calls deleteProductFn on delete confirmation', async () => {
    vi.mocked(deleteProductFn).mockResolvedValue({ success: true })

    const { user } = renderComponent()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByText('Confirm'))

    expect(deleteProductFn).toHaveBeenCalledWith({
      data: { productId: 'prod-123' },
    })
  })

  it('calls duplicateProductFn on duplicate click', async () => {
    vi.mocked(duplicateProductFn).mockResolvedValue({
      success: true,
      data: { id: 'prod-new' },
    } as Awaited<ReturnType<typeof duplicateProductFn>>)

    const { user } = renderComponent()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Duplicate'))

    expect(duplicateProductFn).toHaveBeenCalledWith({
      data: { productId: 'prod-123' },
    })
  })

  it('calls updateProductStatusFn with archived when archiving', async () => {
    vi.mocked(updateProductStatusFn).mockResolvedValue({ success: true })

    const { user } = renderComponent({ status: 'active' })

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Archive'))

    expect(updateProductStatusFn).toHaveBeenCalledWith({
      data: { productId: 'prod-123', status: 'archived' },
    })
  })

  it('calls updateProductStatusFn with active when activating', async () => {
    vi.mocked(updateProductStatusFn).mockResolvedValue({ success: true })

    const { user } = renderComponent({ status: 'archived' })

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Activate'))

    expect(updateProductStatusFn).toHaveBeenCalledWith({
      data: { productId: 'prod-123', status: 'active' },
    })
  })
})
