import { Link } from '@tanstack/react-router'
import { Menu, Search, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'

import { getProducts } from '../../data/products'
import { useCartStore } from '../../hooks/useCart'
import { CartDrawer } from '../cart/CartDrawer'
import { Button } from '../ui/button'

import type { Product } from '../../types/store'

export function Navbar() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [products, setProducts] = useState<Array<Product>>([])
  const items = useCartStore((state) => state.items)
  const totalItems = items.reduce((acc: number, item) => acc + item.quantity, 0)

  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/5">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-xl font-bold tracking-tighter flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              O
            </div>
            <span>OBELISK</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link
              to="/"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              Home
            </Link>
            <Link
              to="/products"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              Products
            </Link>
            <Link
              to="/"
              className="hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              Story
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-primary/5">
            <Search className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-primary/5"
            aria-label="cart"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="w-5 h-5" />
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
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <CartDrawer
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        products={products}
      />
    </nav>
  )
}
