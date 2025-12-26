import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ProductCard } from '../../components/products/ProductCard'
import { Button } from '../../components/ui/button'
import { getFeaturedProducts } from '../../data/storefront'

export const Route = createFileRoute('/$lang/')({
  loader: ({ params }) => getFeaturedProducts({ data: { lang: params.lang } }),
  head: ({ params }) => {
    const titles: Record<string, string> = {
      en: 'Home | FineNail Season',
      fr: 'Accueil | FineNail Season',
      id: 'Beranda | FineNail Season',
    }
    const descriptions: Record<string, string> = {
      en: 'Premium nail art and manicure essentials for the modern beauty enthusiast.',
      fr: 'Essentiels de nail art et manucure premium pour les passionnées de beauté.',
      id: 'Perlengkapan nail art dan manikur premium untuk pecinta kecantikan modern.',
    }
    return {
      meta: [
        { title: titles[params.lang] || titles.en },
        {
          name: 'description',
          content: descriptions[params.lang] || descriptions.en,
        },
      ],
    }
  },
  component: HomePage,
})

function HomePage() {
  const { lang } = Route.useParams()
  const { t } = useTranslation()
  const featuredProducts = Route.useLoaderData()

  return (
    <div className="flex flex-col">
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=2000"
            alt="Nail Art Hero"
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center space-y-8">
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-balance animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {t('NAILS THAT')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 italic">
                {t('INSPIRE.')}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              {t(
                'Premium nail art and manicure essentials for the modern beauty enthusiast.',
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 py-6 text-base font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700"
            >
              <Link to="/$lang/products" params={{ lang }}>
                {t('Shop the Collection')}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full px-8 py-6 text-base font-medium group"
            >
              {t('Our Story')}{' '}
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 space-y-12">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                {t('BESTSELLERS')}
              </h2>
              <p className="text-muted-foreground">
                {t('The essentials for every nail art lover.')}
              </p>
            </div>
            <Link
              to="/$lang/products"
              params={{ lang }}
              className="text-sm font-semibold hover:underline underline-offset-4"
            >
              {t('View all products')}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold tracking-tight text-balance">
                {t('Your nails are a canvas. Let them tell your story.')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t(
                  'At FineNail Season, we believe every manicure is an act of self-expression. Our salon-quality formulas are vegan, cruelty-free, and designed to last.',
                )}
              </p>
              <div className="pt-4">
                <Button variant="outline" className="rounded-full px-6">
                  {t('Learn more about our standards')}
                </Button>
              </div>
            </div>
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl skew-y-2">
              <img
                src="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1000"
                alt="Nail Art Philosophy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
