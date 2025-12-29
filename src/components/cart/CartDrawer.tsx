import { useNavigate, useParams } from '@tanstack/react-router'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useCart } from '../../hooks/useCart'
import { formatCurrency } from '../../lib/format'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet'

import type { Product } from '../../types/store'

type CartDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  products?: Array<Product>
}

export function CartDrawer({
  open,
  onOpenChange,
  products = [],
}: CartDrawerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const currentLang = lang || 'en'
  const { items, totalPrice, totalItems, removeItem, updateQuantity } =
    useCart(products)

  const handleCheckout = async () => {
    onOpenChange(false)
    await navigate({ to: '/$lang/checkout', params: { lang: currentLang } })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 glass-dark text-white border-white/10">
        <SheetHeader className="p-6 border-b border-white/10">
          <SheetTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {t('Your Bag')} ({t('item', { count: totalItems })})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-muted-foreground font-medium">
                {t('Your bag is currently empty.')}
              </p>
              <Button
                variant="outline"
                className="mt-2 border-white/20 hover:bg-white/10 text-white"
                onClick={() => onOpenChange(false)}
              >
                {t('Start Shopping')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex gap-4"
                >
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-semibold text-sm">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {item.product.category}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-white/10 rounded-md overflow-hidden bg-white/5">
                        <button
                          className="p-1 hover:bg-white/10"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity - 1,
                              item.variantId,
                            )
                          }
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          className="p-1 hover:bg-white/10"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity + 1,
                              item.variantId,
                            )
                          }
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency({
                          value: item.product.price * item.quantity,
                          currency: item.product.currency,
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    className="self-start p-1 text-muted-foreground hover:text-white transition-colors"
                    onClick={() => removeItem(item.productId, item.variantId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <SheetFooter className="p-6 bg-white/5 border-t border-white/10 mt-auto flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('Subtotal')}</span>
                <span>
                  {formatCurrency({
                    value: totalPrice,
                    currency: items[0].product.currency,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('Shipping')}</span>
                <span>{t('Calculated at checkout')}</span>
              </div>
              <Separator className="bg-white/10 my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>{t('Total')}</span>
                <span>
                  {formatCurrency({
                    value: totalPrice,
                    currency: items[0].product.currency,
                  })}
                </span>
              </div>
            </div>
            <Button
              onClick={handleCheckout}
              className="w-full bg-white text-black hover:bg-white/90 font-bold py-6 text-base"
            >
              {t('Checkout')}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
