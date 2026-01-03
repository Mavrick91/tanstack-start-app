import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AddressAutocomplete } from './AddressAutocomplete'

import { render, screen, userEvent } from '@/test/test-utils'

// Mock environment variable
vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-api-key')

describe('AddressAutocomplete', () => {
  const mockOnChange = vi.fn()
  const mockOnAddressSelect = vi.fn()

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onAddressSelect: mockOnAddressSelect,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear Google Maps from window
    delete (window as { google?: unknown }).google
    // Reset any script tags
    document
      .querySelectorAll('script[src*="maps.googleapis.com"]')
      .forEach((el) => el.remove())
  })

  describe('Fallback Mode (Without Google Maps)', () => {
    it('should render basic input when Google Maps is not loaded', () => {
      render(<AddressAutocomplete {...defaultProps} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should handle input changes in fallback mode', async () => {
      const user = userEvent.setup()
      render(<AddressAutocomplete {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '123 Main St')

      expect(mockOnChange).toHaveBeenCalled()
    })

    it('should render placeholder text', () => {
      render(
        <AddressAutocomplete {...defaultProps} placeholder="Enter address" />,
      )

      expect(screen.getByPlaceholderText('Enter address')).toBeInTheDocument()
    })

    it('should use default placeholder when not provided', () => {
      render(<AddressAutocomplete {...defaultProps} />)

      expect(
        screen.getByPlaceholderText(/start typing an address/i),
      ).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(<AddressAutocomplete {...defaultProps} disabled={true} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should apply custom className', () => {
      render(<AddressAutocomplete {...defaultProps} className="custom-class" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-class')
    })

    it('should display current value', () => {
      render(<AddressAutocomplete {...defaultProps} value="123 Test Street" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('123 Test Street')
    })

    it('should call onChange with typed value', async () => {
      const user = userEvent.setup()
      render(<AddressAutocomplete {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')

      // onChange is called for each keystroke
      expect(mockOnChange).toHaveBeenCalled()
      // Verify onChange was called multiple times (once per character)
      expect(mockOnChange.mock.calls.length).toBe(4)
    })

    it('should not show suggestions dropdown in fallback mode', async () => {
      const user = userEvent.setup()
      render(<AddressAutocomplete {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '123 Main St')

      // No suggestions should appear
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Props and Attributes', () => {
    it('should render with all supported props', () => {
      render(
        <AddressAutocomplete
          value="Test Value"
          onChange={mockOnChange}
          onAddressSelect={mockOnAddressSelect}
          placeholder="Custom placeholder"
          className="test-class"
          disabled={false}
        />,
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('Test Value')
      expect(input).toHaveClass('test-class')
      expect(input).toHaveAttribute('placeholder', 'Custom placeholder')
      expect(input).not.toBeDisabled()
    })

    it('should handle being enabled and disabled', () => {
      const { rerender } = render(
        <AddressAutocomplete {...defaultProps} disabled={true} />,
      )

      let input = screen.getByRole('textbox')
      expect(input).toBeDisabled()

      rerender(<AddressAutocomplete {...defaultProps} disabled={false} />)

      input = screen.getByRole('textbox')
      expect(input).not.toBeDisabled()
    })

    it('should update value when prop changes', () => {
      const { rerender } = render(
        <AddressAutocomplete {...defaultProps} value="First value" />,
      )

      let input = screen.getByRole('textbox')
      expect(input).toHaveValue('First value')

      rerender(<AddressAutocomplete {...defaultProps} value="Second value" />)

      input = screen.getByRole('textbox')
      expect(input).toHaveValue('Second value')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible textbox role', () => {
      render(<AddressAutocomplete {...defaultProps} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should have proper placeholder for screen readers', () => {
      render(
        <AddressAutocomplete
          {...defaultProps}
          placeholder="Enter your address"
        />,
      )

      const input = screen.getByPlaceholderText('Enter your address')
      expect(input).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should allow user to type freely', async () => {
      const user = userEvent.setup()
      render(<AddressAutocomplete {...defaultProps} />)

      const input = screen.getByRole('textbox')

      await user.type(input, 'H')
      expect(mockOnChange).toHaveBeenCalled()

      await user.type(input, 'ello')
      expect(mockOnChange.mock.calls.length).toBeGreaterThan(1)
    })

    it('should handle clearing input', async () => {
      const user = userEvent.setup()
      render(<AddressAutocomplete {...defaultProps} value="Initial value" />)

      const input = screen.getByRole('textbox')
      await user.clear(input)

      expect(mockOnChange).toHaveBeenCalledWith('')
    })
  })
})
