import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GoogleButton } from './GoogleButton'

import { fireEvent, render, screen } from '@/test/test-utils'

describe('GoogleButton', () => {
  // Mock window.location
  const mockLocation = {
    href: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset location href
    mockLocation.href = ''
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })
  })

  describe('Rendering', () => {
    it('should render button with Google branding', () => {
      render(<GoogleButton />)

      expect(
        screen.getByRole('button', { name: /continue with google/i }),
      ).toBeInTheDocument()
    })

    it('should have outline variant styling', () => {
      render(<GoogleButton />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('w-full')
    })

    it('should render Google logo SVG', () => {
      const { container } = render(<GoogleButton />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('h-5 w-5')
    })
  })

  describe('OAuth Flow', () => {
    it('should redirect to Google OAuth endpoint on click', () => {
      render(<GoogleButton />)

      fireEvent.click(screen.getByRole('button'))

      expect(window.location.href).toBe('/api/auth/google')
    })

    it('should include returnUrl in redirect when provided', () => {
      render(<GoogleButton returnUrl="/checkout/payment" />)

      fireEvent.click(screen.getByRole('button'))

      expect(window.location.href).toBe(
        '/api/auth/google?returnUrl=%2Fcheckout%2Fpayment',
      )
    })

    it('should properly encode returnUrl with special characters', () => {
      render(<GoogleButton returnUrl="/product?id=123&variant=456" />)

      fireEvent.click(screen.getByRole('button'))

      expect(window.location.href).toContain('returnUrl=')
      expect(window.location.href).toContain('%2Fproduct')
      expect(window.location.href).toContain('%3Fid')
    })

    it('should work without returnUrl parameter', () => {
      render(<GoogleButton />)

      fireEvent.click(screen.getByRole('button'))

      expect(window.location.href).not.toContain('?')
      expect(window.location.href).toBe('/api/auth/google')
    })
  })

  describe('Button Props', () => {
    it('should have button type to prevent form submission', () => {
      render(<GoogleButton />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should be clickable and not disabled', () => {
      render(<GoogleButton />)

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })
})
