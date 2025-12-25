import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardFooter } from '../ui/card'
import { useCartStore } from '../../hooks/useCart'

import { formatCurrency } from '../../lib/format'
import type { Product } from '../../types/store'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  return (
    <Card className="group overflow-hidden border-none bg-transparent shadow-none transition-all duration-500 hover:translate-y-[-4px]">
      <CardContent className="p-0 relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary/30">
        {product.isFeatured && (
          <Badge className="absolute top-4 left-4 z-10 glass-dark text-white border-white/10 px-3 py-1">
            Featured
          </Badge>
        )}

        <Link
          to="/products/$productId"
          params={{ productId: product.slug }}
          className="block w-full h-full"
        >
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </Link>

        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full transition-transform duration-500 group-hover:translate-y-0 bg-gradient-to-t from-black/60 to-transparent">
          <Button
            className="w-full glass-dark text-white border-white/20 hover:bg-white/10"
            onClick={() => addItem(product.id)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </CardContent>

      <CardFooter className="px-0 py-4 flex flex-col items-start gap-1">
        <Link
          to="/products/$productId"
          params={{ productId: product.slug }}
          className="text-sm font-semibold tracking-tight hover:underline underline-offset-4"
        >
          {product.name}
        </Link>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-muted-foreground">
            {product.category}
          </span>
          <span className="text-sm font-medium">
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
