import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { MediaLibrary, type MediaItem } from './MediaLibrary'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock cloudinary helper
vi.mock('../../../lib/cloudinary', () => ({
  getOptimizedImageUrl: (url: string) => url,
}))

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestQueryWrapper'
  return Wrapper
}

const sampleMediaItems: MediaItem[] = [
  {
    id: 'media-1',
    url: 'https://res.cloudinary.com/demo/image/upload/v1/products/image1.jpg',
    filename: 'image1.jpg',
    width: 800,
    height: 600,
  },
  {
    id: 'media-2',
    url: 'https://res.cloudinary.com/demo/image/upload/v1/products/image2.jpg',
    filename: 'image2.jpg',
    width: 1200,
    height: 900,
  },
  {
    id: 'media-3',
    url: 'https://res.cloudinary.com/demo/image/upload/v1/products/image3.jpg',
    filename: 'image3.jpg',
    width: 600,
    height: 600,
  },
]

describe('MediaLibrary', () => {
  const mockOnClose = vi.fn()
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSelect.mockClear()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    it('should render the modal when open is true', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: [] }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      expect(screen.getByText('Media Library')).toBeInTheDocument()
    })

    it('should not render modal content when open is false', () => {
      render(
        <MediaLibrary
          open={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      expect(screen.queryByText('Media Library')).not.toBeInTheDocument()
    })

    it('should render Library and Upload tabs', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: [] }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      expect(screen.getByRole('tab', { name: /library/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument()
    })
  })

  describe('Library Tab', () => {
    it('should show loading state while fetching media', () => {
      // Never resolve the fetch
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      // Loading indicator should be present
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should display empty state when no media exists', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: [] }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getByText('No media yet')).toBeInTheDocument()
      })
    })

    it('should display media items when data is fetched', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        const images = screen.getAllByRole('img')
        expect(images).toHaveLength(3)
      })
    })

    it('should allow selecting a single media item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      // Click on the first image to select it
      const images = screen.getAllByRole('img')
      fireEvent.click(images[0].closest('button')!)

      // Insert button should now show selection count
      expect(screen.getByText(/insert/i)).toBeInTheDocument()
    })

    it('should allow selecting multiple media items', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          multiple={true}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      const images = screen.getAllByRole('img')
      fireEvent.click(images[0].closest('button')!)
      fireEvent.click(images[1].closest('button')!)

      // Should show 2 selected
      expect(screen.getByText(/insert.*2/i)).toBeInTheDocument()
    })

    it('should toggle selection when clicking selected item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      const images = screen.getAllByRole('img')
      const firstImageButton = images[0].closest('button')!

      // Select
      fireEvent.click(firstImageButton)
      expect(screen.getByText(/insert.*1/i)).toBeInTheDocument()

      // Deselect
      fireEvent.click(firstImageButton)

      // Insert button should be disabled with no count
      const insertButton = screen.getByRole('button', { name: /insert/i })
      expect(insertButton).toBeDisabled()
    })

    it('should call onSelect with selected items when Insert is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      const images = screen.getAllByRole('img')
      fireEvent.click(images[0].closest('button')!)
      fireEvent.click(images[2].closest('button')!)

      const insertButton = screen.getByRole('button', { name: /insert.*2/i })
      fireEvent.click(insertButton)

      expect(mockOnSelect).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'media-1' }),
        expect.objectContaining({ id: 'media-3' }),
      ])
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Upload Tab', () => {
    it('should render Upload tab trigger', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: [] }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      const uploadTab = screen.getByRole('tab', { name: /upload/i })
      expect(uploadTab).toBeInTheDocument()
      expect(uploadTab).toHaveAttribute('aria-selected', 'false')
    })

    it('should render Library tab as active by default', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: [] }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      const libraryTab = screen.getByRole('tab', { name: /library/i })
      expect(libraryTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Delete Functionality', () => {
    it('should show delete button when items are selected', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      // Initially no delete button visible
      expect(
        screen.queryByRole('button', { name: /delete/i }),
      ).not.toBeInTheDocument()

      // Select an item
      const images = screen.getAllByRole('img')
      fireEvent.click(images[0].closest('button')!)

      // Delete button should now appear
      expect(
        screen.getByRole('button', { name: /delete.*1/i }),
      ).toBeInTheDocument()
    })

    it('should call delete API when delete button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ success: true, items: sampleMediaItems }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, deleted: 1 }),
        })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      const images = screen.getAllByRole('img')
      fireEvent.click(images[0].closest('button')!)

      const deleteButton = screen.getByRole('button', { name: /delete.*1/i })
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/media',
          expect.objectContaining({
            method: 'DELETE',
            body: expect.stringContaining('media-1'),
          }),
        )
      })
    })
  })

  describe('Modal Controls', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: [] }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should disable Insert button when no items are selected', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      const insertButton = screen.getByRole('button', { name: /insert/i })
      expect(insertButton).toBeDisabled()
    })
  })

  describe('Single Selection Mode', () => {
    it('should only allow one selection when multiple is false', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, items: sampleMediaItems }),
      })

      render(
        <MediaLibrary
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          multiple={false}
        />,
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(3)
      })

      const images = screen.getAllByRole('img')

      // Select first image
      fireEvent.click(images[0].closest('button')!)
      expect(screen.getByText(/insert.*1/i)).toBeInTheDocument()

      // Select second image - should replace first selection
      fireEvent.click(images[1].closest('button')!)
      expect(screen.getByText(/insert.*1/i)).toBeInTheDocument()

      // Insert should only return the second image
      const insertButton = screen.getByRole('button', { name: /insert.*1/i })
      fireEvent.click(insertButton)

      expect(mockOnSelect).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'media-2' }),
      ])
    })
  })
})
