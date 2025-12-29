import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ImageIcon, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../../../lib/utils'
import { Button } from '../../../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../ui/card'

import type { Product } from '../types'

interface PackageIconProps {
  className?: string
}

function PackageIcon({ className }: PackageIconProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
      <path d="M12 22V12" />
      <path d="M3 7l9 5 9-5" />
    </svg>
  )
}

function SortableProductItem({
  product,
  onRemove,
}: {
  product: Product
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-4 p-4 border border-border/50 rounded-2xl bg-background/50 hover:bg-background hover:border-pink-200 transition-all duration-300',
        isDragging &&
          'shadow-2xl border-pink-400 bg-background scale-[1.02] opacity-90',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-md"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground/40 group-hover:text-pink-500 transition-colors" />
      </div>

      <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border/50 shrink-0">
        {product.image ? (
          <img
            src={product.image}
            className="h-full w-full object-cover"
            alt=""
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">
          {typeof product.name === 'string' ? product.name : product.name?.en}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          /{product.handle}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(product.id)}
        className="h-10 w-10 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface ProductsCardProps {
  products: Product[]
  onReorder: (products: Product[]) => void
  onRemove: (productId: string) => void
  onAddClick: () => void
}

export function ProductsCard({
  products,
  onReorder,
  onRemove,
  onAddClick,
}: ProductsCardProps) {
  const { t } = useTranslation()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((i) => i.id === active.id)
      const newIndex = products.findIndex((i) => i.id === over.id)

      // Guard against invalid indices
      if (oldIndex === -1 || newIndex === -1) return

      const newArray = arrayMove(products, oldIndex, newIndex)
      onReorder(newArray)
    }
  }

  return (
    <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <PackageIcon className="h-5 w-5 text-rose-500" />
            {t('Products')}
          </CardTitle>
          <CardDescription>
            {t('Manage items in this collection (Drag to reorder)')}
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onAddClick}
          className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold px-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('Add Products')}
        </Button>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
            <PackageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium mb-4">
              {t('No products in this collection yet')}
            </p>
            <Button
              variant="outline"
              type="button"
              onClick={onAddClick}
              className="rounded-xl border-pink-200 text-pink-600 hover:bg-pink-50"
            >
              {t('Start adding products')}
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={products.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {products.map((product) => (
                  <SortableProductItem
                    key={product.id}
                    product={product}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
