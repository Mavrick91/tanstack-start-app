import { createFileRoute } from '@tanstack/react-router'
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BackButton } from '../../../components/ui/back-button'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Separator } from '../../../components/ui/separator'
import { getProductBySlug } from '../../../data/storefront'
import { useCartStore } from '../../../hooks/useCart'
import { formatCurrency } from '../../../lib/format'

export const Route = createFileRoute('/$lang/products/$productId')({
  loader: ({ params }) =>
    getProductBySlug({ data: { slug: params.productId, lang: params.lang } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.name} | FineNail Season`
          : 'Product | FineNail Season',
      },
    ],
  }),
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { lang } = Route.useParams()
  const { t } = useTranslation()
  const product = Route.useLoaderData()
  const addItem = useCartStore((state) => state.addItem)
  const [quantity, setQuantity] = useState(1)

  if (!product) return null

  return (
    <div className="container mx-auto px-4 py-16">
      <BackButton
        to="/$lang/products"
        params={{ lang }}
        label={t('Back to all products')}
        className="mb-12"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-4">
          <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-secondary/30">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden bg-secondary/30"
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 text-primary uppercase tracking-widest text-[10px]"
              >
                {product.category}
              </Badge>
              {product.isFeatured && (
                <Badge className="rounded-full glass-dark text-white border-white/10 uppercase tracking-widest text-[10px]">
                  {t('Featured')}
                </Badge>
              )}
            </div>
            <h1 className="text-5xl font-bold tracking-tight">
              {product.name}
            </h1>
            <p className="text-2xl font-medium">
              {formatCurrency({
                value: product.price,
                currency: product.currency,
              })}
            </p>
          </div>

          <p className="text-muted-foreground text-lg leading-relaxed">
            {product.description}
          </p>

          <div className="space-y-6">
            {product.features && (
              <ul className="space-y-2">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-lg overflow-hidden h-12">
                  <button
                    className="px-4 hover:bg-secondary transition-colors"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    className="px-4 hover:bg-secondary transition-colors"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  size="lg"
                  className="flex-1 h-12 bg-primary text-primary-foreground font-bold text-base"
                  onClick={() => {
                    for (let i = 0; i < quantity; i++) {
                      addItem(product.id)
                    }
                  }}
                >
                  {t('Add to Bag')}
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-8 py-4">
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                {t('Shipping')}
              </h5>
              <p className="text-sm">
                {t('Free worldwide delivery on orders over $50.')}
              </p>
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                {t('Returns')}
              </h5>
              <p className="text-sm">{t('30-day effortless return policy.')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
