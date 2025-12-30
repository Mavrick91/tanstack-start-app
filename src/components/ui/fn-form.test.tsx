import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { FNForm, type FormDefinition, type FNFormRef } from './fn-form'

import { render, screen, waitFor } from '@/test/test-utils'

describe('FNForm', () => {
  describe('text input', () => {
    it('should render a text input with label', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'username', type: 'text', label: 'Username' }],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByLabelText('Username')).toHaveAttribute('type', 'text')
    })

    it('should render a text input with placeholder', () => {
      const definition: FormDefinition = {
        fields: [
          {
            name: 'username',
            type: 'text',
            label: 'Username',
            placeholder: 'Enter your username',
          },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(
        screen.getByPlaceholderText('Enter your username'),
      ).toBeInTheDocument()
    })

    it('should update value when user types', async () => {
      const definition: FormDefinition = {
        fields: [{ name: 'username', type: 'text', label: 'Username' }],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={vi.fn()} />,
      )

      const input = screen.getByLabelText('Username')
      await user.type(input, 'john_doe')

      expect(input).toHaveValue('john_doe')
    })
  })

  describe('email input', () => {
    it('should render an email input', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    })
  })

  describe('password input', () => {
    it('should render a password input', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'password', type: 'password', label: 'Password' }],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Password')).toHaveAttribute(
        'type',
        'password',
      )
    })
  })

  describe('number input', () => {
    it('should render a number input', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'age', type: 'number', label: 'Age' }],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Age')).toHaveAttribute('type', 'number')
    })
  })

  describe('textarea', () => {
    it('should render a textarea', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'bio', type: 'textarea', label: 'Bio' }],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Bio').tagName).toBe('TEXTAREA')
    })

    it('should update textarea value when user types', async () => {
      const definition: FormDefinition = {
        fields: [{ name: 'bio', type: 'textarea', label: 'Bio' }],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={vi.fn()} />,
      )

      const textarea = screen.getByLabelText('Bio')
      await user.type(textarea, 'Hello world')

      expect(textarea).toHaveValue('Hello world')
    })
  })

  describe('select', () => {
    it('should render a select with options', async () => {
      const definition: FormDefinition = {
        fields: [
          {
            name: 'country',
            type: 'select',
            label: 'Country',
            options: [
              { value: 'us', label: 'United States' },
              { value: 'ca', label: 'Canada' },
              { value: 'uk', label: 'United Kingdom' },
            ],
          },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByText('Country')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should allow selecting an option', async () => {
      const definition: FormDefinition = {
        fields: [
          {
            name: 'country',
            type: 'select',
            label: 'Country',
            placeholder: 'Select a country',
            options: [
              { value: 'us', label: 'United States' },
              { value: 'ca', label: 'Canada' },
            ],
          },
        ],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={vi.fn()} />,
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      const option = await screen.findByRole('option', {
        name: 'United States',
      })
      await user.click(option)

      expect(trigger).toHaveTextContent('United States')
    })
  })

  describe('checkbox', () => {
    it('should render a checkbox', () => {
      const definition: FormDefinition = {
        fields: [
          { name: 'agree', type: 'checkbox', label: 'I agree to the terms' },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
      expect(screen.getByText('I agree to the terms')).toBeInTheDocument()
    })

    it('should toggle checkbox when clicked', async () => {
      const definition: FormDefinition = {
        fields: [{ name: 'agree', type: 'checkbox', label: 'I agree' }],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={vi.fn()} />,
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('switch', () => {
    it('should render a switch', () => {
      const definition: FormDefinition = {
        fields: [
          {
            name: 'notifications',
            type: 'switch',
            label: 'Enable notifications',
          },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByRole('switch')).toBeInTheDocument()
      expect(screen.getByText('Enable notifications')).toBeInTheDocument()
    })

    it('should toggle switch when clicked', async () => {
      const definition: FormDefinition = {
        fields: [{ name: 'notifications', type: 'switch', label: 'Enable' }],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={vi.fn()} />,
      )

      const switchEl = screen.getByRole('switch')
      expect(switchEl).toHaveAttribute('data-state', 'unchecked')

      await user.click(switchEl)
      expect(switchEl).toHaveAttribute('data-state', 'checked')
    })
  })

  describe('multiple fields', () => {
    it('should render multiple fields', () => {
      const definition: FormDefinition = {
        fields: [
          { name: 'firstName', type: 'text', label: 'First Name' },
          { name: 'lastName', type: 'text', label: 'Last Name' },
          { name: 'email', type: 'email', label: 'Email' },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('First Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('should call onSubmit with form values when submitted', async () => {
      const mockOnSubmit = vi.fn()
      const definition: FormDefinition = {
        fields: [
          { name: 'username', type: 'text', label: 'Username' },
          { name: 'email', type: 'email', label: 'Email' },
        ],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={mockOnSubmit} />,
      )

      await user.type(screen.getByLabelText('Username'), 'john_doe')
      await user.type(screen.getByLabelText('Email'), 'john@example.com')

      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          username: 'john_doe',
          email: 'john@example.com',
        })
      })
    })

    it('should use custom submit button text', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'username', type: 'text', label: 'Username' }],
      }

      render(
        <FNForm
          formDefinition={definition}
          onSubmit={vi.fn()}
          submitButtonText="Create Account"
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Create Account' }),
      ).toBeInTheDocument()
    })
  })

  describe('default values', () => {
    it('should populate fields with default values', () => {
      const definition: FormDefinition = {
        fields: [
          { name: 'username', type: 'text', label: 'Username' },
          { name: 'email', type: 'email', label: 'Email' },
        ],
      }
      const defaultValues = {
        username: 'existing_user',
        email: 'existing@example.com',
      }

      render(
        <FNForm
          formDefinition={definition}
          onSubmit={vi.fn()}
          defaultValues={defaultValues}
        />,
      )

      expect(screen.getByLabelText('Username')).toHaveValue('existing_user')
      expect(screen.getByLabelText('Email')).toHaveValue('existing@example.com')
    })

    it('should populate checkbox with default value', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'agree', type: 'checkbox', label: 'I agree' }],
      }

      render(
        <FNForm
          formDefinition={definition}
          onSubmit={vi.fn()}
          defaultValues={{ agree: true }}
        />,
      )

      expect(screen.getByRole('checkbox')).toBeChecked()
    })
  })

  describe('validation', () => {
    it('should show required indicator for required fields', () => {
      const definition: FormDefinition = {
        fields: [
          { name: 'username', type: 'text', label: 'Username', required: true },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should show error message for invalid required field on submit', async () => {
      const mockOnSubmit = vi.fn()
      const definition: FormDefinition = {
        fields: [
          { name: 'username', type: 'text', label: 'Username', required: true },
        ],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={mockOnSubmit} />,
      )

      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate custom validation function', async () => {
      const mockOnSubmit = vi.fn()
      const definition: FormDefinition = {
        fields: [
          {
            name: 'age',
            type: 'number',
            label: 'Age',
            validate: (value) => {
              const num = Number(value)
              if (num < 18) return 'Must be at least 18'
              return undefined
            },
          },
        ],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={mockOnSubmit} />,
      )

      await user.type(screen.getByLabelText('Age'), '15')

      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Must be at least 18')).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should disable field when disabled is true', () => {
      const definition: FormDefinition = {
        fields: [
          { name: 'username', type: 'text', label: 'Username', disabled: true },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Username')).toBeDisabled()
    })
  })

  describe('grid layout with rows', () => {
    it('should render fields in a 2-column grid', () => {
      const definition: FormDefinition = {
        rows: [
          {
            columns: 2,
            fields: [
              { name: 'firstName', type: 'text', label: 'First Name' },
              { name: 'lastName', type: 'text', label: 'Last Name' },
            ],
          },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('First Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument()

      const grid = screen.getByLabelText('First Name').closest('.grid-cols-2')
      expect(grid).toBeInTheDocument()
    })

    it('should render fields in a 3-column grid', () => {
      const definition: FormDefinition = {
        rows: [
          {
            columns: 3,
            fields: [
              { name: 'city', type: 'text', label: 'City' },
              { name: 'state', type: 'text', label: 'State' },
              { name: 'zip', type: 'text', label: 'ZIP' },
            ],
          },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      const grid = screen.getByLabelText('City').closest('.grid-cols-3')
      expect(grid).toBeInTheDocument()
    })

    it('should render mixed rows and single fields', () => {
      const definition: FormDefinition = {
        rows: [
          { fields: [{ name: 'email', type: 'email', label: 'Email' }] },
          {
            columns: 2,
            fields: [
              { name: 'firstName', type: 'text', label: 'First Name' },
              { name: 'lastName', type: 'text', label: 'Last Name' },
            ],
          },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('First Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
    })
  })

  describe('form ref', () => {
    it('should allow external form submission via ref', async () => {
      const mockOnSubmit = vi.fn()
      const definition: FormDefinition = {
        fields: [{ name: 'username', type: 'text', label: 'Username' }],
      }

      function TestComponent() {
        const formRef = useRef<FNFormRef | null>(null)
        return (
          <>
            <FNForm
              formDefinition={definition}
              onSubmit={mockOnSubmit}
              formRef={formRef}
              hideSubmitButton
              defaultValues={{ username: 'test_user' }}
            />
            <button onClick={() => formRef.current?.submit()}>
              External Submit
            </button>
          </>
        )
      }

      const { user } = render(<TestComponent />)

      await user.click(screen.getByRole('button', { name: 'External Submit' }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({ username: 'test_user' })
      })
    })

    it('should allow setting field values via ref', async () => {
      const definition: FormDefinition = {
        fields: [{ name: 'username', type: 'text', label: 'Username' }],
      }

      function TestComponent() {
        const formRef = useRef<FNFormRef | null>(null)
        return (
          <>
            <FNForm
              formDefinition={definition}
              onSubmit={vi.fn()}
              formRef={formRef}
              hideSubmitButton
            />
            <button
              onClick={() =>
                formRef.current?.setFieldValue('username', 'updated_user')
              }
            >
              Set Value
            </button>
          </>
        )
      }

      const { user } = render(<TestComponent />)

      await user.click(screen.getByRole('button', { name: 'Set Value' }))

      await waitFor(() => {
        expect(screen.getByLabelText('Username')).toHaveValue('updated_user')
      })
    })
  })

  describe('hide submit button', () => {
    it('should hide submit button when hideSubmitButton is true', () => {
      const definition: FormDefinition = {
        fields: [{ name: 'username', type: 'text', label: 'Username' }],
      }

      render(
        <FNForm
          formDefinition={definition}
          onSubmit={vi.fn()}
          hideSubmitButton
        />,
      )

      expect(
        screen.queryByRole('button', { name: /submit/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe('optional field indicator', () => {
    it('should show (optional) text for optional fields', () => {
      const definition: FormDefinition = {
        fields: [
          { name: 'company', type: 'text', label: 'Company', optional: true },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByText('(optional)')).toBeInTheDocument()
    })
  })

  describe('onFieldChange callback', () => {
    it('should call onFieldChange when a field value changes', async () => {
      const mockOnFieldChange = vi.fn()
      const definition: FormDefinition = {
        fields: [{ name: 'username', type: 'text', label: 'Username' }],
      }

      const { user } = render(
        <FNForm
          formDefinition={definition}
          onSubmit={vi.fn()}
          onFieldChange={mockOnFieldChange}
        />,
      )

      await user.type(screen.getByLabelText('Username'), 'a')

      expect(mockOnFieldChange).toHaveBeenCalledWith(
        'username',
        'a',
        expect.any(Function),
      )
    })

    it('should allow setting other field values from onFieldChange', async () => {
      const definition: FormDefinition = {
        fields: [
          {
            name: 'countryCode',
            type: 'select',
            label: 'Country',
            options: [
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' },
            ],
          },
          { name: 'country', type: 'text', label: 'Country Name' },
        ],
      }

      const countryMap: Record<string, string> = {
        US: 'United States',
        CA: 'Canada',
      }

      const { user } = render(
        <FNForm
          formDefinition={definition}
          onSubmit={vi.fn()}
          onFieldChange={(name, value, setFieldValue) => {
            if (name === 'countryCode') {
              setFieldValue('country', countryMap[value as string] || '')
            }
          }}
        />,
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      const option = await screen.findByRole('option', {
        name: 'United States',
      })
      await user.click(option)

      await waitFor(() => {
        expect(screen.getByLabelText('Country Name')).toHaveValue(
          'United States',
        )
      })
    })
  })

  describe('custom field type', () => {
    it('should render custom field using render function', () => {
      const definition: FormDefinition = {
        fields: [
          {
            name: 'custom',
            type: 'custom',
            label: 'Custom Field',
            render: ({ value, onChange, id }) => (
              <input
                id={id}
                data-testid="custom-input"
                value={String(value || '')}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    })

    it('should update custom field value', async () => {
      const mockOnSubmit = vi.fn()
      const definition: FormDefinition = {
        fields: [
          {
            name: 'custom',
            type: 'custom',
            label: 'Custom Field',
            render: ({ value, onChange, id }) => (
              <input
                id={id}
                data-testid="custom-input"
                value={String(value || '')}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
          },
        ],
      }

      const { user } = render(
        <FNForm formDefinition={definition} onSubmit={mockOnSubmit} />,
      )

      await user.type(screen.getByTestId('custom-input'), 'custom value')
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({ custom: 'custom value' })
      })
    })
  })

  describe('hidden field type', () => {
    it('should not render hidden fields visually', () => {
      const definition: FormDefinition = {
        fields: [
          { name: 'visible', type: 'text', label: 'Visible' },
          { name: 'hidden', type: 'hidden', label: 'Hidden' },
        ],
      }

      render(<FNForm formDefinition={definition} onSubmit={vi.fn()} />)

      expect(screen.getByLabelText('Visible')).toBeInTheDocument()
      expect(screen.queryByLabelText('Hidden')).not.toBeInTheDocument()
    })

    it('should include hidden field values in submission', async () => {
      const mockOnSubmit = vi.fn()
      const definition: FormDefinition = {
        fields: [
          { name: 'visible', type: 'text', label: 'Visible' },
          { name: 'hidden', type: 'hidden', label: 'Hidden' },
        ],
      }

      const { user } = render(
        <FNForm
          formDefinition={definition}
          onSubmit={mockOnSubmit}
          defaultValues={{ hidden: 'secret_value' }}
        />,
      )

      await user.type(screen.getByLabelText('Visible'), 'visible_value')
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          visible: 'visible_value',
          hidden: 'secret_value',
        })
      })
    })
  })
})
