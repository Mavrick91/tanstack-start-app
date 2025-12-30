import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageUploader, type ImageItem } from './ImageUploader'

import { render, screen } from '@/test/test-utils'

global.URL.revokeObjectURL = vi.fn()

// Mock dnd-kit to avoid complex drag simulation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let capturedOnDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | null = null

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode
    onDragEnd?: (event: {
      active: { id: string }
      over: { id: string } | null
    }) => void
  }) => {
    capturedOnDragEnd = onDragEnd || null
    return <div>{children}</div>
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr]
    const [removed] = result.splice(from, 1)
    result.splice(to, 0, removed)
    return result
  }),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
  verticalListSortingStrategy: vi.fn(),
  rectSortingStrategy: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn().mockReturnValue(null),
    },
    Translate: {
      toString: vi.fn().mockReturnValue(null),
    },
  },
}))

describe('ImageUploader', () => {
  const mockOnChange = vi.fn()

  const sampleImages: ImageItem[] = [
    {
      id: 'img-1',
      url: 'https://example.com/image1.jpg',
      altText: { en: 'First image', fr: '', id: '' },
    },
    {
      id: 'img-2',
      url: 'https://example.com/image2.jpg',
      altText: { en: 'Second image', fr: '', id: '' },
    },
  ]

  beforeEach(() => {
    capturedOnDragEnd = null
  })

  it('should render the upload button', () => {
    render(<ImageUploader images={[]} onChange={mockOnChange} />)

    expect(
      screen.getByRole('button', { name: /upload images/i }),
    ).toBeInTheDocument()
  })

  it('should render existing images', () => {
    render(<ImageUploader images={sampleImages} onChange={mockOnChange} />)

    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('should display alt text for images', () => {
    render(<ImageUploader images={sampleImages} onChange={mockOnChange} />)

    const altTextInputs = screen.getAllByPlaceholderText(/alt text/i)
    expect(altTextInputs[0]).toHaveValue('First image')
    expect(altTextInputs[1]).toHaveValue('Second image')
  })

  it('should call onChange when alt text is updated', async () => {
    const { user } = render(
      <ImageUploader images={sampleImages} onChange={mockOnChange} />,
    )

    const altTextInputs = screen.getAllByPlaceholderText(/alt text/i)
    // Type a single character to append
    await user.type(altTextInputs[0], 'X')

    // userEvent.type() triggers onChange for each keystroke
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'img-1',
          altText: expect.objectContaining({ en: 'First imageX' }),
        }),
      ]),
    )
  })

  it('should call onChange when image is removed', async () => {
    const { user } = render(
      <ImageUploader images={sampleImages} onChange={mockOnChange} />,
    )

    // Remove buttons are the only buttons with Trash2 icon
    const removeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-trash2'))
    await user.click(removeButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'img-2' }),
    ])
  })

  it('should render drag handles for each image', () => {
    render(<ImageUploader images={sampleImages} onChange={mockOnChange} />)

    // With mocked dnd-kit, we just verify the component renders with images
    const buttons = screen.getAllByRole('button')
    // Should have at least: upload button + buttons for each image
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('should show upload button when empty', () => {
    render(<ImageUploader images={[]} onChange={mockOnChange} />)
    expect(
      screen.getByRole('button', { name: /upload images/i }),
    ).toBeInTheDocument()
  })

  it('should have hidden file input', () => {
    render(<ImageUploader images={[]} onChange={mockOnChange} />)

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveClass('hidden')
    expect(fileInput).toHaveAttribute('accept', 'image/*')
    expect(fileInput).toHaveAttribute('multiple')
  })

  it('should display image preview correctly', () => {
    render(<ImageUploader images={sampleImages} onChange={mockOnChange} />)

    const imgs = screen.getAllByRole('img')
    expect(imgs[0]).toHaveAttribute('src', 'https://example.com/image1.jpg')
    expect(imgs[1]).toHaveAttribute('src', 'https://example.com/image2.jpg')
  })

  it('should preserve remaining images after removing one', async () => {
    const fiveImages: ImageItem[] = [
      { id: '1', url: 'https://example.com/1.jpg', altText: { en: 'One' } },
      { id: '2', url: 'https://example.com/2.jpg', altText: { en: 'Two' } },
      { id: '3', url: 'https://example.com/3.jpg', altText: { en: 'Three' } },
      { id: '4', url: 'https://example.com/4.jpg', altText: { en: 'Four' } },
      { id: '5', url: 'https://example.com/5.jpg', altText: { en: 'Five' } },
    ]

    const { user } = render(
      <ImageUploader images={fiveImages} onChange={mockOnChange} />,
    )

    expect(screen.getAllByRole('img')).toHaveLength(5)

    const removeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-trash2'))
    await user.click(removeButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '3' }),
      expect.objectContaining({ id: '4' }),
      expect.objectContaining({ id: '5' }),
    ])
  })

  it('should correctly pass the remaining 4 images after deletion', async () => {
    const fiveImages: ImageItem[] = [
      { id: 'a', url: 'blob:local/a', altText: { en: 'A' } },
      { id: 'b', url: 'blob:local/b', altText: { en: 'B' } },
      { id: 'c', url: 'blob:local/c', altText: { en: 'C' } },
      { id: 'd', url: 'blob:local/d', altText: { en: 'D' } },
      { id: 'e', url: 'blob:local/e', altText: { en: 'E' } },
    ]

    const { user } = render(
      <ImageUploader images={fiveImages} onChange={mockOnChange} />,
    )

    const removeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-trash2'))
    await user.click(removeButtons[2])

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'a' }),
        expect.objectContaining({ id: 'b' }),
        expect.objectContaining({ id: 'd' }),
        expect.objectContaining({ id: 'e' }),
      ]),
    )
  })

  describe('Image Reordering', () => {
    it('should call onChange with reordered array when image moved', () => {
      const threeImages: ImageItem[] = [
        {
          id: 'img-1',
          url: 'https://example.com/1.jpg',
          altText: { en: 'First' },
        },
        {
          id: 'img-2',
          url: 'https://example.com/2.jpg',
          altText: { en: 'Second' },
        },
        {
          id: 'img-3',
          url: 'https://example.com/3.jpg',
          altText: { en: 'Third' },
        },
      ]

      render(<ImageUploader images={threeImages} onChange={mockOnChange} />)

      // Simulate dragging img-1 to position of img-3
      if (capturedOnDragEnd) {
        capturedOnDragEnd({ active: { id: 'img-1' }, over: { id: 'img-3' } })
      }

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'img-2' }),
        expect.objectContaining({ id: 'img-3' }),
        expect.objectContaining({ id: 'img-1' }),
      ])
    })

    it('should not call onChange when drag ends without target', () => {
      const twoImages: ImageItem[] = [
        {
          id: 'img-1',
          url: 'https://example.com/1.jpg',
          altText: { en: 'First' },
        },
        {
          id: 'img-2',
          url: 'https://example.com/2.jpg',
          altText: { en: 'Second' },
        },
      ]

      render(<ImageUploader images={twoImages} onChange={mockOnChange} />)
      mockOnChange.mockClear()

      if (capturedOnDragEnd) {
        capturedOnDragEnd({ active: { id: 'img-1' }, over: null })
      }

      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should maintain image data integrity after reorder', () => {
      const images: ImageItem[] = [
        {
          id: 'a',
          url: 'https://example.com/a.jpg',
          altText: { en: 'Alpha', fr: 'Alpha FR', id: 'Alpha ID' },
        },
        {
          id: 'b',
          url: 'https://example.com/b.jpg',
          altText: { en: 'Beta', fr: 'Beta FR', id: 'Beta ID' },
        },
      ]

      render(<ImageUploader images={images} onChange={mockOnChange} />)

      if (capturedOnDragEnd) {
        capturedOnDragEnd({ active: { id: 'a' }, over: { id: 'b' } })
      }

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'b',
          url: 'https://example.com/b.jpg',
          altText: { en: 'Beta', fr: 'Beta FR', id: 'Beta ID' },
        }),
        expect.objectContaining({
          id: 'a',
          url: 'https://example.com/a.jpg',
          altText: { en: 'Alpha', fr: 'Alpha FR', id: 'Alpha ID' },
        }),
      ])
    })
  })
})
