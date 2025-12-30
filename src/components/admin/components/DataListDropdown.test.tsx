import { describe, expect, it, vi } from 'vitest'

import { DataListDropdown } from './DataListDropdown'

import { render, screen } from '@/test/test-utils'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}))

// Mock Link from @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

describe('DataListDropdown', () => {
  const defaultProps = {
    itemId: '123',
    itemName: 'Test Item',
    status: 'active' as const,
    editUrl: '/admin/edit/123',
  }

  it('renders the trigger button', () => {
    render(<DataListDropdown {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens dropdown menu on click', async () => {
    const { user } = render(<DataListDropdown {...defaultProps} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Edit Details')).toBeInTheDocument()
  })

  it('renders storefront link when provided', async () => {
    const { user } = render(
      <DataListDropdown
        {...defaultProps}
        storefrontUrl="/en/storefront/item"
      />,
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('View Storefront')).toBeInTheDocument()
    expect(screen.getByText('View Storefront').closest('a')).toHaveAttribute(
      'href',
      '/en/storefront/item',
    )
  })

  it('calls onDuplicate when clicked', async () => {
    const onDuplicate = vi.fn()
    const { user } = render(
      <DataListDropdown {...defaultProps} onDuplicate={onDuplicate} />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Duplicate'))

    expect(onDuplicate).toHaveBeenCalled()
  })

  it('calls onStatusChange with "archived" when active', async () => {
    const onStatusChange = vi.fn()
    const { user } = render(
      <DataListDropdown
        {...defaultProps}
        status="active"
        onStatusChange={onStatusChange}
      />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Archive'))

    expect(onStatusChange).toHaveBeenCalledWith('archived')
  })

  it('calls onStatusChange with "active" when archived', async () => {
    const onStatusChange = vi.fn()
    const { user } = render(
      <DataListDropdown
        {...defaultProps}
        status="archived"
        onStatusChange={onStatusChange}
      />,
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Activate'))

    expect(onStatusChange).toHaveBeenCalledWith('active')
  })

  it('opens delete dialog and confirms deletion', async () => {
    const onDelete = vi.fn()
    const { user } = render(
      <DataListDropdown {...defaultProps} onDelete={onDelete} />,
    )

    // Open dropdown
    await user.click(screen.getByRole('button'))
    // Click Delete option
    await user.click(screen.getByText('Delete'))

    // Check dialog content
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    // Using a simpler regex or partial match due to potential interpolation differences
    // or just checking for the name being present if the mock passes params.
    // Since our mock returns `str` as is, the interpolation might not happen in the mock.
    // However, the component calls t('key', {name}), so our mock returns 'key'.
    // Let's verify the key used in component:
    // t('This will permanently delete "{{name}}". This action cannot be undone.', { name: itemName })
    // With our mock, it will just return the long string.
    expect(
      screen.getByText(
        'This will permanently delete "{{name}}". This action cannot be undone.',
      ),
    ).toBeInTheDocument()

    // Confirm delete
    await user.click(screen.getByText('Confirm'))
    expect(onDelete).toHaveBeenCalled()
  })
})
