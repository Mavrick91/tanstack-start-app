import { createFileRoute } from '@tanstack/react-router'
import { Minus, Plus } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { ProductGallery } from '../../../components/products/ProductGallery'
import { VariantSelector } from '../../../components/products/VariantSelector'
import { BackButton } from '../../../components/ui/back-button'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { RichTextContent } from '../../../components/ui/rich-text-content'
import { Separator } from '../../../components/ui/separator'
import { getProductBySlug } from '../../../data/storefront'
import { useCartStore } from '../../../hooks/useCart'
import { formatCurrency } from '../../../lib/format'

import type { ProductVariant } from '../../../types/store'

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
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  )

  const handleVariantChange = useCallback((variant: ProductVariant | null) => {
    setSelectedVariant(variant)
  }, [])

  if (!product) return null

  // Use selected variant price if available, otherwise product base price
  const displayPrice = selectedVariant?.price ?? product.price
  const hasVariants = product.options && product.options.length > 0
  const canAddToCart = !hasVariants || (selectedVariant?.available ?? false)

  return (
    <div className="container mx-auto px-6 md:px-12 py-24">
      <BackButton
        to="/$lang/products"
        params={{ lang }}
        label={t('Back to all products')}
        className="mb-12"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <ProductGallery images={product.images} productName={product.name} />

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
                value: displayPrice,
                currency: product.currency,
              })}
            </p>
          </div>

          <RichTextContent
            html={product.description}
            className="text-muted-foreground text-lg"
          />

          {/* Variant Selection */}
          {hasVariants && product.options && product.variants && (
            <VariantSelector
              options={product.options}
              variants={product.variants}
              onVariantChange={handleVariantChange}
            />
          )}

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
                  disabled={!canAddToCart}
                  onClick={() => {
                    for (let i = 0; i < quantity; i++) {
                      addItem(product.id, selectedVariant?.id)
                    }
                  }}
                >
                  {canAddToCart ? t('Add to Bag') : t('Select options')}
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
