import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CollectionTable, CollectionTableSkeleton } from './CollectionTable'

import type { CollectionListItem } from '../types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    params,
  }: {
    to: string
    children: React.ReactNode
    params?: Record<string, string>
  }) => (
    <a href={to.replace('$collectionId', params?.collectionId || '')}>
      {children}
    </a>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}))

vi.mock('../../../../server/collections', () => ({
  deleteCollectionFn: vi.fn(),
  duplicateCollectionFn: vi.fn(),
  updateCollectionFn: vi.fn(),
}))

vi.mock('./CollectionListActions', () => ({
  CollectionListActions: () => (
    <button data-testid="collection-actions">Actions</button>
  ),
}))

vi.mock('../../../collections/CollectionThumbnail', () => ({
  CollectionThumbnail: ({ images }: { images: string[] }) => (
    <div data-testid="collection-thumbnail">{images.length} images</div>
  ),
}))

const mockCollections: CollectionListItem[] = [
  {
    id: 'coll-1',
    handle: 'summer-collection',
    name: { en: 'Summer Collection', fr: 'Collection Été' },

    sortOrder: '1',
    publishedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    productCount: 15,
    previewImages: ['img1.jpg', 'img2.jpg'],
  },
  {
    id: 'coll-2',
    handle: 'winter-collection',
    name: { en: 'Winter Collection' },

    sortOrder: '2',
    publishedAt: null, // draft
    createdAt: new Date('2024-02-01'),
    productCount: 8,
    previewImages: [],
  },
  {
    id: 'coll-3',
    handle: 'spring-collection',
    name: { en: 'Spring Collection' },

    sortOrder: '3',
    publishedAt: new Date('2024-03-01'),
    createdAt: new Date('2024-03-01'),
    productCount: 0,
    previewImages: ['img3.jpg'],
  },
]

describe('CollectionTable', () => {
  let queryClient: QueryClient
  const mockOnToggleSelect = vi.fn()
  const mockOnToggleSelectAll = vi.fn()
  const mockOnSort = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof CollectionTable>> = {},
  ) => {
    const defaultProps = {
      collections: mockCollections,
      selectedIds: new Set<string>(),
      onToggleSelect: mockOnToggleSelect,
      onToggleSelectAll: mockOnToggleSelectAll,
      isAllSelected: false,
      isSomeSelected: false,
      sortKey: 'name' as const,
      sortOrder: 'asc' as const,
      onSort: mockOnSort,
    }
    return render(
      <QueryClientProvider client={queryClient}>
        <CollectionTable {...defaultProps} {...props} />
      </QueryClientProvider>,
    )
  }

  describe('Rendering', () => {
    it('renders all collections', () => {
      renderComponent()
      expect(screen.getByText('Summer Collection')).toBeInTheDocument()
      expect(screen.getByText('Winter Collection')).toBeInTheDocument()
      expect(screen.getByText('Spring Collection')).toBeInTheDocument()
    })

    it('renders table headers', () => {
      renderComponent()
      expect(screen.getByText('Collection')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Handle')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Created')).toBeInTheDocument()
    })

    it('renders CollectionThumbnail for all collections', () => {
      renderComponent()
      const thumbnails = screen.getAllByTestId('collection-thumbnail')
      expect(thumbnails).toHaveLength(3)
    })

    it('renders collection handles', () => {
      renderComponent()
      expect(screen.getByText('/summer-collection')).toBeInTheDocument()
      expect(screen.getByText('/winter-collection')).toBeInTheDocument()
      expect(screen.getByText('/spring-collection')).toBeInTheDocument()
    })

    it('renders French name when available', () => {
      renderComponent()
      expect(screen.getByText('Collection Été')).toBeInTheDocument()
    })
  })

  describe('Status badges', () => {
    it('renders Active status for published collections', () => {
      renderComponent()
      const activeBadges = screen.getAllByText('Active')
      expect(activeBadges).toHaveLength(2) // coll-1 and coll-3 are published
    })

    it('renders Draft status for unpublished collections', () => {
      renderComponent()
      expect(screen.getByText('Draft')).toBeInTheDocument() // coll-2 is draft
    })
  })

  describe('Product count', () => {
    it('displays product counts', () => {
      renderComponent()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('renders checkbox for each collection', () => {
      renderComponent()
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(4) // 1 header + 3 collections
    })

    it('calls onToggleSelect when clicking collection checkbox', async () => {
      const user = userEvent.setup()
      renderComponent()

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // First collection checkbox

      expect(mockOnToggleSelect).toHaveBeenCalledWith('coll-1')
    })

    it('calls onToggleSelectAll when clicking header checkbox', async () => {
      const user = userEvent.setup()
      renderComponent()

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0]) // Header checkbox

      expect(mockOnToggleSelectAll).toHaveBeenCalled()
    })

    it('checks selected collections', () => {
      renderComponent({ selectedIds: new Set(['coll-1', 'coll-3']) })
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
      expect(checkboxes[1].checked).toBe(true) // coll-1
      expect(checkboxes[2].checked).toBe(false) // coll-2
      expect(checkboxes[3].checked).toBe(true) // coll-3
    })

    it('checks header checkbox when all selected', () => {
      renderComponent({ isAllSelected: true })
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
      expect(checkboxes[0].checked).toBe(true)
    })

    it('highlights selected rows', () => {
      const { container } = renderComponent({
        selectedIds: new Set(['coll-1']),
      })
      const rows = container.querySelectorAll('tbody tr')
      expect(rows[0]).toHaveClass('bg-pink-500/5')
      expect(rows[1]).not.toHaveClass('bg-pink-500/5')
    })
  })

  describe('Sorting', () => {
    it('renders sortable headers', () => {
      renderComponent()
      const sortButtons = screen.getAllByRole('button')
      expect(sortButtons.length).toBeGreaterThanOrEqual(3) // Collection, Products, Created
    })

    it('calls onSort when clicking Collection header', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByText('Collection'))

      expect(mockOnSort).toHaveBeenCalledWith('name')
    })

    it('calls onSort when clicking Products header', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByText('Products'))

      expect(mockOnSort).toHaveBeenCalledWith('productCount')
    })

    it('calls onSort when clicking Created header', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByText('Created'))

      expect(mockOnSort).toHaveBeenCalledWith('createdAt')
    })
  })

  describe('Links', () => {
    it('links to collection edit page', () => {
      renderComponent()
      const link = screen.getByRole('link', { name: /Summer Collection/i })
      expect(link).toHaveAttribute('href', '/admin/collections/coll-1')
    })
  })
})

describe('CollectionTableSkeleton', () => {
  it('renders skeleton rows', () => {
    const { container } = render(<CollectionTableSkeleton />)
    const skeletonRows = container.querySelectorAll('tbody tr')
    expect(skeletonRows).toHaveLength(5)
  })

  it('has animate-pulse class', () => {
    const { container } = render(<CollectionTableSkeleton />)
    const animatedRows = container.querySelectorAll('.animate-pulse')
    expect(animatedRows.length).toBeGreaterThan(0)
  })

  it('renders header columns', () => {
    render(<CollectionTableSkeleton />)
    expect(screen.getByText('Collection')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Handle')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
  })
})
