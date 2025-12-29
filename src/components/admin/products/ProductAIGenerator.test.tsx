import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AIProductGenerator } from './ProductAIGenerator'

// Mock Fancybox
vi.mock('@fancyapps/ui', () => ({
  Fancybox: {
    bind: vi.fn(),
    destroy: vi.fn(),
  },
}))

vi.mock('@fancyapps/ui/dist/fancybox/fancybox.css', () => ({}))

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (options && options.count !== undefined) {
        return key.replace('{{count}}', String(options.count))
      }
      return key
    },
  }),
}))

const mockGenerateBatchCompositeImagesFn = vi.fn()
const mockRegenerateImageFn = vi.fn()

vi.mock('../../../server/ai', () => ({
  generateBatchCompositeImagesFn: (args: unknown) =>
    mockGenerateBatchCompositeImagesFn(args),
  regenerateImageFn: (args: unknown) => mockRegenerateImageFn(args),
}))

vi.mock('../../../lib/cloudinary', () => ({
  getOptimizedImageUrl: (url: string) => url,
}))

vi.mock('../media/MediaLibrary', () => ({
  MediaLibrary: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="media-library">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock global fetch for urlToBase64
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
})

// Mock FileReader
class MockFileReader {
  result: string | null = null
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null

  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,dGVzdA=='
      if (this.onload) {
        this.onload({
          target: { result: this.result },
        } as ProgressEvent<FileReader>)
      }
    }, 0)
  }
}
global.FileReader = MockFileReader as unknown as typeof FileReader

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('AIProductGenerator', () => {
  const mockVariants = [
    {
      id: 'var-1',
      title: 'Almond XS',
      price: '$10',
      available: true,
      selectedOptions: [],
    },
    {
      id: 'var-2',
      title: 'Coffin M',
      price: '$20',
      available: true,
      selectedOptions: [],
    },
    {
      id: 'var-3',
      title: 'Stiletto XL',
      price: '$30',
      available: true,
      selectedOptions: [],
    },
  ]

  const mockProductImages = [
    {
      id: 'img-1',
      url: 'https://example.com/prod1.jpg',
      altText: { en: 'Product 1' },
    },
  ]

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    variants: mockVariants,
    productImages: mockProductImages,
    onKeepImages: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders correctly with all sections', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('AI Studio')).toBeInTheDocument()
      expect(screen.getByText('Backgrounds')).toBeInTheDocument()
      expect(screen.getByText('Product Image')).toBeInTheDocument()
      expect(screen.getByText('Variants')).toBeInTheDocument()
    })

    it('shows product image when one is available', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('Product image')).toBeInTheDocument()
    })

    it('displays all variants', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('Almond XS')).toBeInTheDocument()
      expect(screen.getByText('Coffin M')).toBeInTheDocument()
      expect(screen.getByText('Stiletto XL')).toBeInTheDocument()
    })

    it('shows paste prompt when no product images', () => {
      renderWithClient(
        <AIProductGenerator {...defaultProps} productImages={[]} />,
      )
      expect(screen.getByText('Paste image from clipboard')).toBeInTheDocument()
      expect(screen.getByText('Press Ctrl+V or Cmd+V')).toBeInTheDocument()
    })

    it('renders aspect ratio selector', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('Aspect Ratio')).toBeInTheDocument()
      expect(screen.getByText('4:5')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} open={false} />)
      expect(screen.queryByText('AI Studio')).not.toBeInTheDocument()
    })
  })

  describe('Variant Selection', () => {
    it('renders variant items', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('Almond XS')).toBeInTheDocument()
      expect(screen.getByText('Coffin M')).toBeInTheDocument()
      expect(screen.getByText('Stiletto XL')).toBeInTheDocument()
    })

    it('has Select All button for variants', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(
        screen.getByRole('button', { name: /Select All/i }),
      ).toBeInTheDocument()
    })
  })

  describe('Generate Button', () => {
    it('disables generate button without selections', () => {
      renderWithClient(
        <AIProductGenerator {...defaultProps} productImages={[]} />,
      )
      const generateBtn = screen.getByText('Generate 0 Images')
      expect(generateBtn.closest('button')).toBeDisabled()
    })

    it('shows correct count when variants selected', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      fireEvent.click(screen.getByText('Almond XS'))
      // No backgrounds selected yet, so still 0
      expect(screen.getByText('Generate 0 Images')).toBeInTheDocument()
    })
  })

  describe('Background Selection', () => {
    it('shows empty state for backgrounds initially', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('Select environment images')).toBeInTheDocument()
    })

    it('has Add button for backgrounds', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('Add')).toBeInTheDocument()
    })
  })

  describe('Aspect Ratio', () => {
    it('renders all aspect ratio options', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      expect(screen.getByText('4:5')).toBeInTheDocument()
      expect(screen.getByText('1:1')).toBeInTheDocument()
      expect(screen.getByText('3:4')).toBeInTheDocument()
    })

    it('allows clicking aspect ratio buttons', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      const ratio1x1 = screen.getByText('1:1')
      fireEvent.click(ratio1x1)
      // Just verify it's clickable without error
      expect(ratio1x1).toBeInTheDocument()
    })
  })

  describe('Dialog Behavior', () => {
    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn()
      renderWithClient(
        <AIProductGenerator {...defaultProps} onClose={onClose} />,
      )
      // Find the X button (close button) by its icon class
      const closeButtons = screen.getAllByRole('button')
      const xButton = closeButtons.find((btn) => btn.querySelector('.lucide-x'))
      expect(xButton).toBeDefined()
      if (xButton) fireEvent.click(xButton)
      expect(onClose).toHaveBeenCalled()
    })

    it('does not show Done button when no images are kept', () => {
      renderWithClient(<AIProductGenerator {...defaultProps} />)
      // Done button only shows when keptCount > 0
      expect(screen.queryByText(/Done/)).not.toBeInTheDocument()
    })
  })
})

describe('Variant Titles', () => {
  it('displays variant titles correctly', () => {
    const variants = [
      {
        id: '1',
        title: 'Almond XS',
        price: '$10',
        available: true,
        selectedOptions: [],
      },
      {
        id: '2',
        title: 'Coffin XXL',
        price: '$20',
        available: true,
        selectedOptions: [],
      },
      {
        id: '3',
        title: 'Squoval M',
        price: '$15',
        available: true,
        selectedOptions: [],
      },
    ]

    renderWithClient(
      <AIProductGenerator
        open={true}
        onClose={vi.fn()}
        variants={variants}
        productImages={[
          {
            id: '1',
            url: 'https://example.com/img.jpg',
            altText: { en: 'Test' },
          },
        ]}
        onKeepImages={vi.fn()}
      />,
    )

    expect(screen.getByText('Almond XS')).toBeInTheDocument()
    expect(screen.getByText('Coffin XXL')).toBeInTheDocument()
    expect(screen.getByText('Squoval M')).toBeInTheDocument()
  })
})
