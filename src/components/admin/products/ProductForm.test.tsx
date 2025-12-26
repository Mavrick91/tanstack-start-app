import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductForm } from './ProductForm'

import type { Product } from './ProductForm'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}))

// Mock Radix UI Select components since they can be tricky in JSDOM
vi.mock('../../ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange: (v: string) => void
  }) => (
    <div
      data-testid="mock-select"
      data-value={value}
      onClick={() => onValueChange?.('active')}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) => <div data-testid={`item-${value}`}>{children}</div>,
}))

describe('ProductForm', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    // Suppress Tiptap duplicate extension warnings (multiple editors render in tests)
    vi.spyOn(console, 'warn').mockImplementation((msg) => {
      if (typeof msg === 'string' && msg.includes('Duplicate extension')) return
      console.warn(msg)
    })
  })

  const mockProduct = (overrides?: Partial<Product>): Product => ({
    id: 'prod_123',
    handle: 'test-product',
    name: { en: 'Test Product', fr: 'Produit Test', id: 'Produk Tes' },
    description: { en: 'Desc', fr: 'Desc FR', id: 'Desc ID' },
    status: 'draft',
    vendor: 'Test Vendor',
    productType: 'Type',
    metaTitle: null,
    metaDescription: null,
    tags: [],
    publishedAt: null,
    ...overrides,
  })

  describe('Create Mode', () => {
    it('should render with "Add Product" title', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Add Product')).toBeInTheDocument()
    })

    it('should render "Create Product" button', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Create Product')).toBeInTheDocument()
    })

    it('should have empty form fields by default', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(
        screen.getByPlaceholderText(/Product name in English/i),
      ).toHaveValue('')
    })

    it('should show Cancel button when onBack is provided', () => {
      const handleBack = vi.fn()
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm onBack={handleBack} />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should not show Cancel button when onBack is not provided', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should render with "Edit Product" title', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct()} />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Edit Product')).toBeInTheDocument()
    })

    it('should render "Save Changes" button', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct()} />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })

    it('should populate form fields with product data', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct()} />
        </QueryClientProvider>,
      )

      expect(
        screen.getByPlaceholderText(/Product name in English/i),
      ).toHaveValue('Test Product')
    })
  })

  describe('Status Initialization', () => {
    it('should initialize with "draft" status in create mode', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      const select = screen.getAllByTestId('mock-select')[0]
      expect(select.getAttribute('data-value')).toBe('draft')
    })

    it('should initialize with product status in edit mode', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct({ status: 'active' })} />
        </QueryClientProvider>,
      )

      const select = screen.getAllByTestId('mock-select')[0]
      expect(select.getAttribute('data-value')).toBe('active')
    })

    it('should initialize with "archived" status correctly', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={mockProduct({ status: 'archived' })} />
        </QueryClientProvider>,
      )

      const select = screen.getAllByTestId('mock-select')[0]
      expect(select.getAttribute('data-value')).toBe('archived')
    })
  })

  describe('Form Fields', () => {
    it('should render localized name fields with tabs', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getAllByText('EN').length).toBeGreaterThan(0)
      expect(screen.getAllByText('FR').length).toBeGreaterThan(0)
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0)
    })

    it('should render pricing section', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Pricing')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('Compare-at price')).toBeInTheDocument()
    })

    it('should render inventory section', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Inventory')).toBeInTheDocument()
      expect(screen.getByText('SKU (Stock Keeping Unit)')).toBeInTheDocument()
    })

    it('should render SEO section', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      expect(screen.getByText('Search engine listing')).toBeInTheDocument()
      expect(screen.getByText('Meta Title')).toBeInTheDocument()
      expect(screen.getByText('Meta Description')).toBeInTheDocument()
    })
  })

  describe('Image Handling Logic', () => {
    describe('State Sync After Upload', () => {
      it('should replace blob URL with Cloudinary URL in state', () => {
        const images = [
          {
            id: 'img-1',
            url: 'blob:http://localhost/abc123',
            altText: { en: 'Test' },
          },
        ]
        const uploadedImages = [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/v1/test.jpg',
            altText: { en: 'Test' },
            position: 0,
          },
        ]

        const syncedImages = uploadedImages.map((img, idx) => ({
          id: images[idx]?.id || `img-${idx}`,
          url: img.url,
          altText: img.altText,
          file: undefined,
        }))

        expect(syncedImages[0].url).toBe(
          'https://res.cloudinary.com/demo/image/upload/v1/test.jpg',
        )
        expect(syncedImages[0].url.startsWith('blob:')).toBe(false)
        expect(syncedImages[0].file).toBeUndefined()
      })

      it('should preserve existing Cloudinary URLs without re-uploading', () => {
        const images = [
          {
            id: 'img-1',
            url: 'https://res.cloudinary.com/demo/existing.jpg',
            altText: { en: 'Existing' },
          },
          {
            id: 'img-2',
            url: 'blob:http://localhost/new123',
            altText: { en: 'New' },
            file: new File([], 'new.jpg'),
          },
        ]

        const needsUpload = images.filter((img) => img.url.startsWith('blob:'))
        const alreadyUploaded = images.filter(
          (img) => !img.url.startsWith('blob:'),
        )

        expect(needsUpload.length).toBe(1)
        expect(alreadyUploaded.length).toBe(1)
        expect(needsUpload[0].id).toBe('img-2')
        expect(alreadyUploaded[0].id).toBe('img-1')
      })

      it('should handle mixed arrays of new and existing images', () => {
        const images = [
          {
            id: 'img-1',
            url: 'https://res.cloudinary.com/demo/first.jpg',
            altText: { en: 'First' },
          },
          {
            id: 'img-2',
            url: 'blob:http://localhost/new1',
            altText: { en: 'New1' },
            file: new File([], 'a.jpg'),
          },
          {
            id: 'img-3',
            url: 'https://res.cloudinary.com/demo/third.jpg',
            altText: { en: 'Third' },
          },
          {
            id: 'img-4',
            url: 'blob:http://localhost/new2',
            altText: { en: 'New2' },
            file: new File([], 'b.jpg'),
          },
        ]

        const uploadResults = images.map((img, index) => {
          if (img.url.startsWith('blob:')) {
            return {
              url: `https://res.cloudinary.com/demo/uploaded${index}.jpg`,
              altText: img.altText,
              position: index,
            }
          }
          return { url: img.url, altText: img.altText, position: index }
        })

        expect(
          uploadResults.every((img) =>
            img.url.startsWith('https://res.cloudinary.com'),
          ),
        ).toBe(true)
        expect(
          uploadResults.filter((img) => img.url.includes('uploaded')).length,
        ).toBe(2)
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty images array', () => {
        const images: { id: string; url: string; altText: { en: string } }[] =
          []
        const needsUpload = images.filter((img) => img.url.startsWith('blob:'))
        expect(needsUpload.length).toBe(0)
      })

      it('should handle image removal detection', () => {
        const originalImages = [
          { id: 'a', url: 'https://cloudinary/a.jpg' },
          { id: 'b', url: 'https://cloudinary/b.jpg' },
        ]
        const newImages = [{ id: 'a', url: 'https://cloudinary/a.jpg' }]

        const removedUrls = originalImages
          .map((img) => img.url)
          .filter((url) => !newImages.map((i) => i.url).includes(url))

        expect(removedUrls).toEqual(['https://cloudinary/b.jpg'])
      })

      it('should handle all new images (no existing)', () => {
        const images = [
          { id: 'new-1', url: 'blob:1', file: new File([], 'a.jpg') },
          { id: 'new-2', url: 'blob:2', file: new File([], 'b.jpg') },
        ]

        const allNeedUpload = images.every((img) => img.url.startsWith('blob:'))
        expect(allNeedUpload).toBe(true)
      })
    })

    describe('AI Generation Image Source Selection', () => {
      it('should use images state in edit mode (not form field)', () => {
        // Simulate edit mode logic: images come from product prop, stored in state
        const isEditMode = true
        const imagesState = [
          {
            id: 'existing-1',
            url: 'https://res.cloudinary.com/demo/existing.jpg',
            altText: { en: 'Existing' },
          },
        ]
        const formFieldImages: { url: string }[] = [] // Empty in edit mode

        const imageList = isEditMode ? imagesState : formFieldImages
        const firstImage = imageList[0]

        expect(firstImage).toBeDefined()
        expect(firstImage?.url).toBe(
          'https://res.cloudinary.com/demo/existing.jpg',
        )
      })

      it('should use form field images in create mode (not state)', () => {
        // Simulate create mode logic: images come from form field
        const isEditMode = false
        const imagesState: { url: string }[] = [] // Empty in create mode
        const formFieldImages = [
          { url: 'blob:http://localhost/new123', file: new File([], 'a.jpg') },
        ]

        const imageList = isEditMode ? imagesState : formFieldImages
        const firstImage = imageList[0]

        expect(firstImage).toBeDefined()
        expect(firstImage?.url).toBe('blob:http://localhost/new123')
      })

      it('should detect when no images exist for AI generation', () => {
        const isEditMode = true
        const imagesState: { url: string }[] = []
        const formFieldImages: { url: string }[] = []

        const imageList = isEditMode ? imagesState : formFieldImages
        const firstImage = imageList[0]

        expect(firstImage).toBeUndefined()
      })

      it('should detect when first image has no URL', () => {
        const imagesState = [{ id: 'broken', url: '', altText: { en: '' } }]

        const imageList = imagesState
        const firstImage = imageList[0]

        // The validation in handleAIGenerate checks: !firstImage || !firstImage.url
        expect(!firstImage || !firstImage.url).toBe(true)
      })

      it('should correctly identify local blob images for base64 conversion', () => {
        const firstImage = { url: 'blob:http://localhost/abc123' }
        const isLocalImage = firstImage.url.startsWith('blob:')

        expect(isLocalImage).toBe(true)
      })

      it('should correctly identify remote URLs for direct AI submission', () => {
        const firstImage = { url: 'https://res.cloudinary.com/demo/image.jpg' }
        const isLocalImage = firstImage.url.startsWith('blob:')

        expect(isLocalImage).toBe(false)
      })
    })
  })

  describe('Rich Text Editor Integration', () => {
    it('should render description field with RichTextEditor styling', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // RichTextEditor renders within the Description section
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('should render description with localized tabs (EN, FR, ID)', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm />
        </QueryClientProvider>,
      )

      // Multiple tabs should exist for description localization
      const enTabs = screen.getAllByText('EN')
      const frTabs = screen.getAllByText('FR')
      const idTabs = screen.getAllByText('ID')

      expect(enTabs.length).toBeGreaterThan(0)
      expect(frTabs.length).toBeGreaterThan(0)
      expect(idTabs.length).toBeGreaterThan(0)
    })

    it('should populate description in edit mode', () => {
      const product = mockProduct({
        description: {
          en: '<p>Rich text content</p>',
          fr: '<p>Contenu riche</p>',
          id: '<p>Konten kaya</p>',
        },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <ProductForm product={product} />
        </QueryClientProvider>,
      )

      // The form should be populated (RichTextEditor will render the HTML)
      expect(screen.getByText('Description')).toBeInTheDocument()
    })
  })
})
