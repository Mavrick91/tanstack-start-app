import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NewProductForm } from './NewProductForm'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('New Product Form', () => {
  let queryClient: QueryClient
  const mockOnBack = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
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

  it('should submit form and call API', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          product: { id: '123', name: { en: 'Test' } },
        }),
    })

    renderWithProviders(<NewProductForm onBack={mockOnBack} />)

    const nameInput = screen.getByPlaceholderText('Product name in English')
    fireEvent.change(nameInput, { target: { value: 'Test Product' } })

    const handleInput = screen.getByPlaceholderText('product-url-slug')
    fireEvent.change(handleInput, { target: { value: 'test-product' } })

    const submitButton = screen.getByRole('button', { name: /create product/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: expect.any(String),
      })
    })
  })

  it('should call onBack after successful submission', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          product: { id: '123', name: { en: 'Test' } },
        }),
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
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Validation failed',
        }),
    })

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
})
