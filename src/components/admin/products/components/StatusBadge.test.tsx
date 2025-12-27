import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  describe('Active status', () => {
    it('renders active status text', () => {
      render(<StatusBadge status="active" />)
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('applies emerald styling for active status', () => {
      const { container } = render(<StatusBadge status="active" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-emerald-500/5')
    })

    it('has emerald dot for active status', () => {
      const { container } = render(<StatusBadge status="active" />)
      const dot = container.querySelector('.bg-emerald-500')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('Draft status', () => {
    it('renders draft status text', () => {
      render(<StatusBadge status="draft" />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('applies amber styling for draft status', () => {
      const { container } = render(<StatusBadge status="draft" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-amber-500/5')
    })

    it('has amber dot for draft status', () => {
      const { container } = render(<StatusBadge status="draft" />)
      const dot = container.querySelector('.bg-amber-500')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('Archived status', () => {
    it('renders archived status text', () => {
      render(<StatusBadge status="archived" />)
      expect(screen.getByText('archived')).toBeInTheDocument()
    })

    it('applies muted styling for archived status', () => {
      const { container } = render(<StatusBadge status="archived" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-muted/50')
    })

    it('has muted-foreground dot for archived status', () => {
      const { container } = render(<StatusBadge status="archived" />)
      const dot = container.querySelector('.bg-muted-foreground')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('Common styles', () => {
    it('has uppercase text', () => {
      const { container } = render(<StatusBadge status="active" />)
      const textSpan = container.querySelector('span')
      expect(textSpan).toHaveClass('uppercase')
    })

    it('has pill/badge shape', () => {
      const { container } = render(<StatusBadge status="active" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('inline-flex')
    })

    it('has border', () => {
      const { container } = render(<StatusBadge status="active" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('border')
    })
  })
})
