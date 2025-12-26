import { Link, useParams } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useCartStore } from '../../hooks/useCart'
import { formatCurrency } from '../../lib/format'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter } from '../ui/card'

import type { Product } from '../../types/store'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const { t } = useTranslation()
  const currentLang = lang || 'en'
  const addItem = useCartStore((state) => state.addItem)

  return (
    <Card className="group overflow-hidden border-none bg-transparent shadow-none transition-all duration-300 hover:translate-y-[-2px]">
      <CardContent className="p-0 relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary/30">
        {product.isFeatured && (
          <Badge className="absolute top-2 left-2 z-10 glass-dark text-white border-white/10 px-2 py-0.5 text-[10px]">
            {t('Featured')}
          </Badge>
        )}

        <Link
          to="/$lang/products/$productId"
          params={{ lang: currentLang, productId: product.slug }}
          className="block w-full h-full"
        >
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </Link>

        <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full transition-transform duration-300 group-hover:translate-y-0 bg-gradient-to-t from-black/60 to-transparent">
          <Button
            size="sm"
            className="w-full h-8 glass-dark text-white border-white/20 hover:bg-white/10 text-xs"
            onClick={() => addItem(product.id)}
          >
            <Plus className="w-3 h-3 mr-1" />
            {t('Add to Cart')}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="px-0 py-2 flex flex-col items-start gap-0.5">
        <Link
          to="/$lang/products/$productId"
          params={{ lang: currentLang, productId: product.slug }}
          className="text-xs font-semibold tracking-tight hover:underline underline-offset-4"
        >
          {product.name}
        </Link>
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] text-muted-foreground">
            {product.category}
          </span>
          <span className="text-xs font-medium">
            {formatCurrency({
              value: product.price,
              currency: product.currency,
            })}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
