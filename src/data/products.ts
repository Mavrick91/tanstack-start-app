import type { Product } from '../types/store'

const MOCK_PRODUCTS: Array<Product> = [
  {
    id: '1',
    name: 'Aurora Gel Polish Collection',
    slug: 'aurora-gel-polish',
    description:
      'A stunning collection of 12 salon-quality gel polishes in iridescent shades. Long-lasting, chip-resistant formula that cures under LED or UV light for a flawless, glossy finish.',
    price: 68,
    currency: 'USD',
    category: 'Gel Polish',
    images: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1000',
    ],
    features: [
      '12 Curated Shades',
      '21-Day Wear',
      'LED/UV Curable',
      'Soak-Off Formula',
    ],
    isFeatured: true,
    variants: [
      {
        id: 'v1',
        title: 'Full Set',
        sku: 'FN-AUR-12',
        price: 68,
        available: true,
        selectedOptions: [],
      },
      {
        id: 'v2',
        title: 'Mini Set (6)',
        sku: 'FN-AUR-06',
        price: 38,
        available: true,
        selectedOptions: [],
      },
    ],
  },
  {
    id: '2',
    name: 'Luxe Nail Art Brush Set',
    slug: 'luxe-nail-art-brushes',
    description:
      'Precision-crafted brushes for the discerning nail artist. Includes fine liners, ombre brushes, and detailing tools made from premium synthetic fibers.',
    price: 45,
    currency: 'USD',
    category: 'Tools',
    images: [
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=1000',
    ],
    features: [
      '15 Professional Brushes',
      'Ergonomic Handles',
      'Premium Synthetic Fibers',
    ],
    isFeatured: true,
  },
  {
    id: '3',
    name: 'French Tip Press-On Nails',
    slug: 'french-tip-press-ons',
    description:
      'Effortless elegance in minutes. These salon-quality press-on nails feature a classic French tip design with a natural-looking finish. Includes application tools and nail glue.',
    price: 22,
    currency: 'USD',
    category: 'Press-Ons',
    images: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1000',
    ],
    features: ['24 Nails in Multiple Sizes', '2-Week Wear', 'Reusable Design'],
    isFeatured: false,
  },
  {
    id: '4',
    name: 'Professional Cuticle Care Kit',
    slug: 'cuticle-care-kit',
    description:
      'Everything you need for healthy, beautiful cuticles. This kit includes a nourishing cuticle oil, pusher, nipper, and exfoliating serum for a complete at-home manicure experience.',
    price: 35,
    currency: 'USD',
    category: 'Nail Care',
    images: [
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&q=80&w=1000',
    ],
    features: [
      'Organic Cuticle Oil',
      'Stainless Steel Tools',
      'Travel-Friendly Case',
    ],
    isFeatured: false,
  },
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const getProducts = async () => {
  await sleep(500)
  return MOCK_PRODUCTS
}

export const getProductBySlug = async (slug: string) => {
  await sleep(200)
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug)
  if (!product) throw new Error('Product not found')
  return product
}

export const getFeaturedProducts = async () => {
  await sleep(100)
  return MOCK_PRODUCTS.filter((p) => p.isFeatured)
}
