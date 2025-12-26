import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NewProductForm } from './NewProductForm'
import { createProductFn } from '../../../server/products'

// Mock server functions
vi.mock('../../../server/products', () => ({
  createProductFn: vi.fn(),
}))

const mockProduct = {
  id: '123',
  name: { en: 'Test' },
  status: 'draft' as const,
  handle: 'test',
  description: null,
  vendor: null,
  productType: null,
  tags: [],
  metaTitle: null,
  metaDescription: null,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('New Product Form', () => {
  let queryClient: QueryClient
  const mockOnBack = vi.fn()

  beforeEach(() => {
    mockOnBack.mockReset()
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

  it('should render the create product form', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    expect(screen.getByText('Add Product')).toBeInTheDocument()
    expect(screen.getByText('Product Details')).toBeInTheDocument()
    expect(screen.getByText('Organization')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should have locale tabs for name input', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    expect(screen.getAllByRole('tab', { name: 'EN' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('tab', { name: 'FR' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('tab', { name: 'ID' }).length).toBeGreaterThan(0)
  })

  it('should update form fields correctly', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'Test Product' } })
    expect(nameInput).toHaveValue('Test Product')

    const vendorInput = screen.getByPlaceholderText('Brand name')
    fireEvent.change(vendorInput, { target: { value: 'Test Vendor' } })
    expect(vendorInput).toHaveValue('Test Vendor')

    const typeInput = screen.getByPlaceholderText('e.g., Nail Polish')
    fireEvent.change(typeInput, { target: { value: 'Polish' } })
    expect(typeInput).toHaveValue('Polish')
  })

  it('should auto-generate handle from name on blur', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'My Test Product' } })
    fireEvent.blur(nameInput)

    const handleInput = screen.getByPlaceholderText('product-url-slug')
    expect(handleInput).toHaveValue('my-test-product')
  })

  it('should not override existing handle on blur', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const handleInput = screen.getByPlaceholderText('product-url-slug')
    fireEvent.change(handleInput, { target: { value: 'custom-handle' } })

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'Some Name' } })
    fireEvent.blur(nameInput)

    expect(handleInput).toHaveValue('custom-handle')
  })

  it('should call onBack when cancel is clicked', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnBack).toHaveBeenCalled()
  })

  it('should call onBack when back button is clicked', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const backButton = screen.getByRole('button', {
      name: /back to products/i,
    })
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalled()
  })

  it('should submit form and call server function', async () => {
    vi.mocked(createProductFn).mockResolvedValue({
      success: true,
      data: mockProduct,
    })

    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'Test Product' } })
    fireEvent.blur(nameInput)

    const handleInput = screen.getByPlaceholderText('product-url-slug')
    fireEvent.change(handleInput, { target: { value: 'test-product' } })
    fireEvent.blur(handleInput)

    const submitButton = screen.getByRole('button', { name: /create product/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(createProductFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: expect.objectContaining({ en: 'Test Product' }),
          handle: 'test-product',
        }),
      })
    })
  })

  it('should call onBack after successful submission', async () => {
    vi.mocked(createProductFn).mockResolvedValue({
      success: true,
      data: mockProduct,
    })

    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'Test' } })

    const handleInput = screen.getByPlaceholderText('product-url-slug')
    fireEvent.change(handleInput, { target: { value: 'test' } })

    const submitButton = screen.getByRole('button', { name: /create product/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled()
    })
  })

  it('should show error message on failed submission', async () => {
    vi.mocked(createProductFn).mockRejectedValue(new Error('validation failed'))

    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'Test' } })

    const handleInput = screen.getByPlaceholderText('product-url-slug')
    fireEvent.change(handleInput, { target: { value: 'test' } })

    const submitButton = screen.getByRole('button', { name: /create product/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/error: validation failed/i)).toBeInTheDocument()
    })
  })

  it('should handle adding and removing media items', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const addButton = screen.getByRole('button', { name: /add image url/i })
    fireEvent.click(addButton)

    expect(screen.getByText('Image URL')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('https://example.com/image.jpg'),
    ).toBeInTheDocument()

    const urlInput = screen.getByPlaceholderText(
      'https://example.com/image.jpg',
    )
    fireEvent.change(urlInput, {
      target: { value: 'https://test.com/img.jpg' },
    })
    expect(urlInput).toHaveValue('https://test.com/img.jpg')

    const removeButton = screen.getByRole('button', { name: /remove image/i })
    fireEvent.click(removeButton)

    expect(
      screen.queryByPlaceholderText('https://test.com/img.jpg'),
    ).not.toBeInTheDocument()
  })

  it('should update pricing fields', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const priceInput = screen.getByLabelText(/^price/i)
    fireEvent.change(priceInput, { target: { value: '29.99' } })
    expect(priceInput).toHaveValue(29.99)

    const compareAtInput = screen.getByLabelText(/^compare-at price/i)
    fireEvent.change(compareAtInput, { target: { value: '39.99' } })
    expect(compareAtInput).toHaveValue(39.99)
  })

  it('should update inventory fields', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const skuInput = screen.getByLabelText(/sku/i)
    fireEvent.change(skuInput, { target: { value: 'SKU-123' } })
    expect(skuInput).toHaveValue('SKU-123')

    const barcodeInput = screen.getByLabelText(/barcode/i)
    fireEvent.change(barcodeInput, { target: { value: '12345678' } })
    expect(barcodeInput).toHaveValue('12345678')

    const qtyInput = screen.getByLabelText(/quantity available/i)
    fireEvent.change(qtyInput, { target: { value: '50' } })
    expect(qtyInput).toHaveValue(50)
  })

  it('should update shipping fields', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const weightInput = screen.getByLabelText(/weight/i)
    fireEvent.change(weightInput, { target: { value: '1.5' } })
    expect(weightInput).toHaveValue(1.5)
  })

  it('should parse tags correctly', async () => {
    vi.mocked(createProductFn).mockResolvedValue({
      success: true,
      data: mockProduct,
    })
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'Test Product' } })
    fireEvent.blur(nameInput)

    const handleInput = screen.getByPlaceholderText('product-url-slug')
    fireEvent.change(handleInput, { target: { value: 'test-product' } })
    fireEvent.blur(handleInput)

    const tagsInput = screen.getByPlaceholderText(/separate with commas/i)
    fireEvent.change(tagsInput, {
      target: { value: 'summer, red, bestseller' },
    })
    fireEvent.blur(tagsInput)

    const submitButton = screen.getByRole('button', { name: /create product/i })
    fireEvent.submit(submitButton.closest('form')!)

    await waitFor(() => {
      expect(createProductFn).toHaveBeenCalled()
      const calls = vi.mocked(createProductFn).mock.calls
      const callArgs = calls[calls.length - 1][0].data
      expect(callArgs.tags).toEqual(['summer', 'red', 'bestseller'])
    })
  })

  it('should update SEO metadata fields', () => {
    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const metaTitleInput = screen.getByPlaceholderText(
      /seo title \(defaults to product name\)/i,
    )
    fireEvent.change(metaTitleInput, { target: { value: 'SEO Title' } })
    expect(metaTitleInput).toHaveValue('SEO Title')

    const metaDescInput = screen.getByPlaceholderText(
      /seo description \(defaults to product description\)/i,
    )
    fireEvent.change(metaDescInput, {
      target: { value: 'SEO Description' },
    })
    expect(metaDescInput).toHaveValue('SEO Description')
  })
})
