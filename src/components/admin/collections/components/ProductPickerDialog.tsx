import { Check, ImageIcon, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { Input } from '../../../ui/input'

import type { Product } from '../types'

interface ProductPickerDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  search: string
  onSearchChange: (value: string) => void
  onAdd: () => void
  onCancel: () => void
  isAdding: boolean
}

export function ProductPickerDialog({
  isOpen,
  onOpenChange,
  products,
  selectedIds,
  onToggleSelect,
  search,
  onSearchChange,
  onAdd,
  onCancel,
  isAdding,
}: ProductPickerDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl rounded-3xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-black">
            {t('Add Products')}
          </DialogTitle>
          <DialogDescription>
            {t('Select products to include in this collection')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 mb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-pink-500" />
            <Input
              placeholder={t('Search products...')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 rounded-2xl bg-background/50 border-border/50 focus:ring-pink-500/10 focus:border-pink-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 space-y-3 pb-8">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Search className="h-10 w-10 mb-2" />
              <p className="font-bold tracking-tight">
                {t('No results found')}
              </p>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                onClick={() => onToggleSelect(product.id)}
                className={`
                  group flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all duration-300
                  ${
                    selectedIds.includes(product.id)
                      ? 'bg-pink-500/10 border-pink-500 shadow-sm'
                      : 'bg-background/20 border-border/50 hover:bg-background/50'
                  }
                `}
              >
                <div
                  className={`
                  h-5 w-5 rounded-md border flex items-center justify-center transition-all duration-300
                  ${selectedIds.includes(product.id) ? 'bg-pink-500 border-pink-500 text-white' : 'border-border group-hover:border-pink-400'}
                `}
                >
                  {selectedIds.includes(product.id) && (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  )}
                </div>

                <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted border border-border/50 shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      className="h-full w-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted/50">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm tracking-tight truncate">
                    {typeof product.name === 'string'
                      ? product.name
                      : product.name?.en}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    /{product.handle}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="p-8 pt-4 border-t border-border/50 bg-muted/20">
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            className="rounded-xl px-6"
          >
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            disabled={selectedIds.length === 0 || isAdding}
            onClick={onAdd}
            className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black px-8 shadow-lg shadow-pink-500/20"
          >
            {isAdding ? t('Adding...') : t('Add Selected')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
