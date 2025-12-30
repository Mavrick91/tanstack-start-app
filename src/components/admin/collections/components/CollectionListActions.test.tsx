import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CollectionListActions } from './CollectionListActions'

import {
  deleteCollectionFn,
  duplicateCollectionFn,
  publishCollectionFn,
  unpublishCollectionFn,
} from '@/server/collections'
import { render, screen } from '@/test/test-utils'

vi.mock('@/server/collections', () => ({
  deleteCollectionFn: vi.fn(),
  duplicateCollectionFn: vi.fn(),
  publishCollectionFn: vi.fn(),
  unpublishCollectionFn: vi.fn(),
}))

describe('CollectionListActions', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.resetAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof CollectionListActions>> = {},
  ) => {
    const defaultProps = {
      collectionId: 'col-123',
      name: 'Test Collection',
      handle: 'test-collection',
      status: 'active' as const,
    }
    return render(
      <QueryClientProvider client={queryClient}>
        <CollectionListActions {...defaultProps} {...props} />
      </QueryClientProvider>,
    )
  }

  it('calls deleteCollectionFn on delete confirmation', async () => {
    vi.mocked(deleteCollectionFn).mockResolvedValue({ success: true })

    const { user } = renderComponent()

    // Open menu
    await user.click(screen.getByRole('button'))
    // Click delete
    await user.click(screen.getByText('Delete'))
    // Confirm
    await user.click(screen.getByText('Confirm'))

    expect(deleteCollectionFn).toHaveBeenCalledWith({
      data: { id: 'col-123' },
    })
  })

  it('calls duplicateCollectionFn on duplicate click', async () => {
    vi.mocked(duplicateCollectionFn).mockResolvedValue({
      success: true,
      data: { id: 'col-new' },
    } as Awaited<ReturnType<typeof duplicateCollectionFn>>)

    const { user } = renderComponent()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Duplicate'))

    expect(duplicateCollectionFn).toHaveBeenCalledWith({
      data: { id: 'col-123' },
    })
  })

  it('calls unpublishCollectionFn when archiving (status is active)', async () => {
    vi.mocked(unpublishCollectionFn).mockResolvedValue({
      success: true,
      data: { id: 'col-123', publishedAt: null },
    } as Awaited<ReturnType<typeof unpublishCollectionFn>>)

    const { user } = renderComponent({ status: 'active' })

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Archive'))

    expect(unpublishCollectionFn).toHaveBeenCalledWith({
      data: { id: 'col-123' },
    })
  })

  it('calls publishCollectionFn when activating (status is archived)', async () => {
    vi.mocked(publishCollectionFn).mockResolvedValue({
      success: true,
      data: { id: 'col-123', publishedAt: new Date() },
    } as Awaited<ReturnType<typeof publishCollectionFn>>)

    const { user } = renderComponent({ status: 'archived' })

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Activate'))

    expect(publishCollectionFn).toHaveBeenCalledWith({
      data: { id: 'col-123' },
    })
  })
})
