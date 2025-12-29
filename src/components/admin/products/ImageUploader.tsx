import {
  closestCenter,
  DragOverlay,
  DndContext,
  type DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Upload, Star } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '../../ui/button'
import { Input } from '../../ui/input'

type LocalizedString = { en: string; fr?: string; id?: string }

export type ImageItem = {
  id: string
  url: string
  file?: File
  altText: LocalizedString
  _aiGenerated?: boolean
  _base64?: string
  _mimeType?: string
}

type SortableImageProps = {
  image: ImageItem
  index: number
  onRemove: (id: string) => void
  onAltTextChange: (id: string, altText: string) => void
}

function SortableImage({
  image,
  index,
  onRemove,
  onAltTextChange,
}: SortableImageProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: image.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging
      ? undefined
      : 'transform 150ms cubic-bezier(0.25, 1, 0.5, 1)',
    zIndex: isDragging ? 50 : undefined,
  }

  const isFeatured = index === 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-2xl border border-border/50 overflow-hidden bg-muted/30 ${
        isFeatured ? 'col-span-2 row-span-2' : 'aspect-square'
      } ${isDragging ? 'opacity-0' : ''}`}
    >
      <img
        src={image.url}
        alt={image.altText.en || 'Product image'}
        className="w-full h-full object-cover select-none"
      />

      {/* Drag Overlay / Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all cursor-grab active:cursor-grabbing flex items-center justify-center"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/20">
          <GripVertical className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Badges */}
      {isFeatured && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg">
          <Star className="w-3 h-3 fill-current" />
          {t('Featured')}
        </div>
      )}

      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8 rounded-lg shadow-lg backdrop-blur-md bg-destructive/90"
          onClick={() => onRemove(image.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Alt Text Overlay (Bottom) */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent translate-y-[100%] group-hover:translate-y-0 transition-transform duration-200">
        <Input
          className="h-8 bg-white/10 backdrop-blur-md border-white/20 rounded-lg text-white placeholder:text-white/60 text-xs focus:ring-white/30"
          value={image.altText.en}
          onChange={(e) => onAltTextChange(image.id, e.target.value)}
          placeholder={t('Alt Text')}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

type ImageUploaderProps = {
  images: ImageItem[]
  onChange: (images: ImageItem[]) => void
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // More responsive activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id)
      const newIndex = images.findIndex((img) => img.id === over.id)
      onChange(arrayMove(images, oldIndex, newIndex))
    }

    setActiveId(null)
  }

  const handleFileSelection = useCallback(
    (files: FileList) => {
      const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
      const ALLOWED_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
      ]

      const newImages: ImageItem[] = []

      for (const file of Array.from(files)) {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(
            t('Only image files are allowed') + ' (JPEG, PNG, GIF, WebP, HEIC)',
          )
          continue
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: File too large. Maximum size is 20MB.`)
          continue
        }

        // Create local preview URL
        const localUrl = URL.createObjectURL(file)

        newImages.push({
          id: crypto.randomUUID(),
          url: localUrl,
          file,
          altText: { en: '', fr: '', id: '' },
        })
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages])
        toast.success(
          t('{{count}} image(s) uploaded', { count: newImages.length }),
        )
      }
    },
    [images, onChange, t],
  )

  const handleRemove = (id: string) => {
    const imageToRemove = images.find((img) => img.id === id)
    if (imageToRemove?.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url)
    }
    onChange(images.filter((img) => img.id !== id))
  }

  const handleAltTextChange = (id: string, altText: string) => {
    onChange(
      images.map((img) =>
        img.id === id
          ? { ...img, altText: { ...img.altText, en: altText } }
          : img,
      ),
    )
  }

  // Track blob URLs for cleanup on unmount only
  const blobUrlsRef = useRef<Set<string>>(new Set())

  // Register new blob URLs
  useEffect(() => {
    images.forEach((img) => {
      if (img.url.startsWith('blob:')) {
        blobUrlsRef.current.add(img.url)
      }
    })
  }, [images])

  // Cleanup ALL blob URLs only on unmount
  useEffect(() => {
    const urlsToCleanup = blobUrlsRef.current
    return () => {
      urlsToCleanup.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return (
    <div className="space-y-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext
          items={images.map((img) => img.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-max">
            {images.map((image, index) => (
              <SortableImage
                key={image.id}
                image={image}
                index={index}
                onRemove={handleRemove}
                onAltTextChange={handleAltTextChange}
              />
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-2xl hover:border-pink-500/50 hover:bg-pink-500/5 transition-all gap-2 text-muted-foreground hover:text-pink-600 ${
                images.length === 0 ? 'col-span-full h-40' : 'aspect-square'
              }`}
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t('Upload Images')}
              </span>
            </button>
          </div>
        </SortableContext>

        <DragOverlay adjustScale={false}>
          {activeId
            ? (() => {
                const activeIndex = images.findIndex(
                  (img) => img.id === activeId,
                )
                const activeImage = images[activeIndex]
                const isFeatured = activeIndex === 0

                return (
                  <div
                    className={`relative rounded-2xl border-2 border-pink-500 overflow-hidden shadow-2xl scale-105 ${
                      isFeatured
                        ? 'w-[calc(200%+16px)] h-[calc(200%+16px)]'
                        : 'w-full h-full aspect-square'
                    }`}
                  >
                    <img
                      src={activeImage?.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-pink-500/10 backdrop-blur-[2px]" />
                  </div>
                )
              })()
            : null}
        </DragOverlay>
      </DndContext>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
      />

      {images.length > 0 && (
        <p className="text-[10px] text-muted-foreground font-medium text-center italic">
          {t('Drag and drop to reorder. The first image is the main one.')}
        </p>
      )}
    </div>
  )
}
