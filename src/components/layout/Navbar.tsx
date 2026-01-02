import { Link, useParams } from '@tanstack/react-router'
import { Menu, Search, ShoppingBag, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getProducts } from '../../data/storefront'
import { useAuth } from '../../hooks/useAuth'
import { useCartStore } from '../../hooks/useCart'
import { cn } from '../../lib/utils'
import { CartDrawer } from '../cart/CartDrawer'
import { Button } from '../ui/button'

import type { Product } from '../../types/store'

import { AuthModal, useAuthModal } from '@/features/auth'

export const Navbar = () => {
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const { t } = useTranslation()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [products, setProducts] = useState<Array<Product>>([])
  const items = useCartStore((state) => state.items)
  const totalItems = items.reduce((acc: number, item) => acc + item.quantity, 0)
  const { data: user } = useAuth()
  const isAuthenticated = !!user
  const { open } = useAuthModal()

  const currentLang = lang || 'en'

  useEffect(() => {
    getProducts({ data: { lang: currentLang } })
      .then(setProducts)
      .catch((err) => console.error('Failed to load products for cart:', err))
  }, [currentLang])

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/5">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            to="/$lang"
            params={{ lang: currentLang }}
            className="text-xl font-bold tracking-tighter flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xs font-black">
              FN
            </div>
            <span>FineNail Season</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link
              to="/$lang"
              params={{ lang: currentLang }}
              className="hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              {t('Home')}
            </Link>
            <Link
              to="/$lang/products"
              params={{ lang: currentLang }}
              className="hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              {t('Products')}
            </Link>
            <Link
              to="/$lang/collections"
              params={{ lang: currentLang }}
              className="hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              {t('Collections')}
            </Link>
            <Link
              to="/$lang"
              params={{ lang: currentLang }}
              className="hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              {t('Story')}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50 border border-border">
            {['en', 'fr', 'id'].map((l) => (
              <Link
                key={l}
                to="/$lang"
                params={{ lang: l }}
                className={cn(
                  'text-[10px] font-bold uppercase w-6 h-6 flex items-center justify-center rounded-full transition-all',
                  currentLang === l
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-primary/10',
                )}
              >
                {l}
              </Link>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/5"
            icon={<Search className="w-5 h-5" />}
          />

          {isAuthenticated ? (
            <Link to="/$lang/account" params={{ lang: currentLang }}>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/5"
                icon={<User className="w-5 h-5" />}
              />
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-primary/5"
              onClick={() => open('login')}
              icon={<User className="w-5 h-5" />}
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-primary/5"
            aria-label="cart"
            onClick={() => setIsCartOpen(true)}
            icon={<ShoppingBag className="w-5 h-5" />}
          >
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-primary/5"
            icon={<Menu className="w-5 h-5" />}
          />
        </div>
      </div>

      <CartDrawer
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        products={products}
      />
      <AuthModal />
    </nav>
  )
}
