import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ProductCard } from '../../components/products/ProductCard'
import { Button } from '../../components/ui/button'
import { getFeaturedProducts } from '../../data/products'

export const Route = createFileRoute('/$lang/')({
  loader: () => getFeaturedProducts(),
  head: ({ params }) => {
    // Note: We can't easily use t() here since it's outside the component tree
    // But we can use the lang to decide the title or just wait for i18n to be ready in the client
    // For TanStack Start, head() runs on both server and client.
    const titles: Record<string, string> = {
      en: 'Home | Obelisk',
      fr: 'Accueil | Obelisk',
      id: 'Beranda | Obelisk',
    }
    const descriptions: Record<string, string> = {
      en: 'Curated objects for the modern minimalist.',
      fr: 'Objets curatés pour le minimaliste moderne.',
      id: 'Objek pilihan untuk minimalis modern.',
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
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center space-y-8">
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-balance animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {t('ESSENTIALLY')}{' '}
              <span className="text-muted-foreground/40 italic">
                {t('OBVIOUS.')}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              {t(
                'Curated objects for the modern minimalist. Designed with precision, built for eternity.',
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 py-6 text-base font-bold bg-primary text-primary-foreground"
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
                {t('FEATURED PIECES')}
              </h2>
              <p className="text-muted-foreground">
                {t('The foundation of every modern collection.')}
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
                {t('Built on the belief that less is more, but and better.')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t(
                  "We don't just sell objects; we curate a lifestyle of intentionality. Every piece in our collection is rigorously tested for form, function, and longevity.",
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
                src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=1000"
                alt="Philosophy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
