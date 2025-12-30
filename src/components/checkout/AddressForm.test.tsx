import { describe, expect, it, vi } from 'vitest'

import { AddressForm } from './AddressForm'

import type { AddressFormData } from '../../lib/checkout-schemas'

import { act, fireEvent, render, screen, waitFor } from '@/test/test-utils'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock the AddressAutocomplete component
vi.mock('./AddressAutocomplete', () => ({
  AddressAutocomplete: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }) => (
    <input
      data-testid="address-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Address"
    />
  ),
}))

describe('AddressForm', () => {
  const mockOnSubmit = vi.fn()

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      render(<AddressForm onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/First name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Company/)).toBeInTheDocument()
      expect(screen.getByTestId('address-autocomplete')).toBeInTheDocument()
      expect(screen.getByLabelText(/Apartment/)).toBeInTheDocument()
      expect(screen.getByLabelText(/City/)).toBeInTheDocument()
      expect(screen.getByLabelText(/State/)).toBeInTheDocument()
      expect(screen.getByLabelText(/ZIP code/)).toBeInTheDocument()
      expect(screen.getByText('Country')).toBeInTheDocument()
      expect(screen.getByLabelText(/Phone/)).toBeInTheDocument()
    })

    it('should show required indicators on required fields', () => {
      render(<AddressForm onSubmit={mockOnSubmit} />)

      const requiredIndicators = screen.getAllByText('*')
      expect(requiredIndicators.length).toBeGreaterThanOrEqual(5)
    })

    it('should render country dropdown with options', () => {
      render(<AddressForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText('Select country')).toBeInTheDocument()
    })

    it('should show optional labels for non-required fields', () => {
      render(<AddressForm onSubmit={mockOnSubmit} />)

      const optionalLabels = screen.getAllByText('(optional)')
      expect(optionalLabels.length).toBeGreaterThanOrEqual(2) // Company, Apartment, Phone
    })
  })

  describe('Pre-filled Values', () => {
    it('should display pre-filled address values', () => {
      const filledAddress: Partial<AddressFormData> = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        zip: '10001',
      }

      render(
        <AddressForm defaultValues={filledAddress} onSubmit={mockOnSubmit} />,
      )

      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10001')).toBeInTheDocument()
    })

    it('should display all pre-filled fields including optional ones', () => {
      const fullAddress: Partial<AddressFormData> = {
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'Acme Inc',
        address1: '456 Oak Ave',
        address2: 'Suite 100',
        city: 'Los Angeles',
        province: 'California',
        provinceCode: 'CA',
        country: 'United States',
        countryCode: 'US',
        zip: '90001',
        phone: '+1 555-1234',
      }

      render(
        <AddressForm defaultValues={fullAddress} onSubmit={mockOnSubmit} />,
      )

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Acme Inc')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Suite 100')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Los Angeles')).toBeInTheDocument()
      expect(screen.getByDisplayValue('California')).toBeInTheDocument()
      expect(screen.getByDisplayValue('90001')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when submitting without required fields', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(<AddressForm onSubmit={mockOnSubmit} formRef={formRef} />)

      // Submit empty form
      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        // Should not call onSubmit when validation fails
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('should call onSubmit with form data when form is valid', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            countryCode: 'US',
            country: 'United States',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      // Submit using the ref
      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('should validate firstName is required', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            countryCode: 'US',
            country: 'United States',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('should validate lastName is required', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            address1: '123 Main St',
            city: 'New York',
            countryCode: 'US',
            country: 'United States',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('should validate address1 is required', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            lastName: 'Doe',
            city: 'New York',
            countryCode: 'US',
            country: 'United States',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('should validate city is required', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            countryCode: 'US',
            country: 'United States',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('should validate countryCode is required', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('should validate zip is required', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            countryCode: 'US',
            country: 'United States',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })
  })

  describe('User Interaction', () => {
    it('should update firstName when user types', async () => {
      const { user } = render(<AddressForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/First name/)
      await user.type(firstNameInput, 'John')

      expect(firstNameInput).toHaveValue('John')
    })

    it('should update lastName when user types', async () => {
      const { user } = render(<AddressForm onSubmit={mockOnSubmit} />)

      const lastNameInput = screen.getByLabelText(/Last name/)
      await user.type(lastNameInput, 'Doe')

      expect(lastNameInput).toHaveValue('Doe')
    })

    it('should update city when user types', async () => {
      const { user } = render(<AddressForm onSubmit={mockOnSubmit} />)

      const cityInput = screen.getByLabelText(/City/)
      await user.type(cityInput, 'New York')

      expect(cityInput).toHaveValue('New York')
    })

    it('should update zip when user types', async () => {
      const { user } = render(<AddressForm onSubmit={mockOnSubmit} />)

      const zipInput = screen.getByLabelText(/ZIP code/)
      await user.type(zipInput, '10001')

      expect(zipInput).toHaveValue('10001')
    })

    it('should update company (optional field) when user types', async () => {
      const { user } = render(<AddressForm onSubmit={mockOnSubmit} />)

      const companyInput = screen.getByLabelText(/Company/)
      await user.type(companyInput, 'Acme Inc')

      expect(companyInput).toHaveValue('Acme Inc')
    })

    it('should update apartment (optional field) when user types', async () => {
      const { user } = render(<AddressForm onSubmit={mockOnSubmit} />)

      const apartmentInput = screen.getByLabelText(/Apartment/)
      await user.type(apartmentInput, 'Suite 100')

      expect(apartmentInput).toHaveValue('Suite 100')
    })

    it('should update state/province when user types', async () => {
      const { user } = render(<AddressForm onSubmit={mockOnSubmit} />)

      const stateInput = screen.getByLabelText(/State/)
      await user.type(stateInput, 'California')

      expect(stateInput).toHaveValue('California')
    })
  })

  describe('Form Submission with Form Element', () => {
    it('should submit form when form element is submitted', async () => {
      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            countryCode: 'US',
            country: 'United States',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
        />,
      )

      const form = screen.getByLabelText(/First name/).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('should pass all form data to onSubmit', async () => {
      const expectedData = {
        firstName: 'John',
        lastName: 'Doe',
        company: '',
        address1: '123 Main St',
        address2: '',
        city: 'New York',
        province: '',
        provinceCode: '',
        country: 'United States',
        countryCode: 'US',
        zip: '10001',
        phone: '',
      }

      render(
        <AddressForm defaultValues={expectedData} onSubmit={mockOnSubmit} />,
      )

      const form = screen.getByLabelText(/First name/).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            countryCode: 'US',
            zip: '10001',
          }),
        )
      })
    })
  })

  describe('formRef Functionality', () => {
    it('should expose submit method via formRef', () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(<AddressForm onSubmit={mockOnSubmit} formRef={formRef} />)

      expect(formRef.current).not.toBeNull()
      expect(typeof formRef.current?.submit).toBe('function')
    })

    it('should trigger form submission when formRef.submit() is called', async () => {
      const formRef = { current: null } as React.RefObject<{
        submit: () => void
      } | null>

      render(
        <AddressForm
          defaultValues={{
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            countryCode: 'US',
            country: 'United States',
            zip: '10001',
          }}
          onSubmit={mockOnSubmit}
          formRef={formRef}
        />,
      )

      await act(async () => {
        formRef.current?.submit()
      })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Country Selection', () => {
    it('should render country select with placeholder', () => {
      render(<AddressForm onSubmit={mockOnSubmit} />)

      // Check country select is rendered with placeholder
      const countryTrigger = screen.getByRole('combobox')
      expect(countryTrigger).toBeInTheDocument()
      expect(screen.getByText('Select country')).toBeInTheDocument()
    })
  })
})
