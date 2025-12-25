import type { Product } from '../types/store'

const MOCK_PRODUCTS: Array<Product> = [
  {
    id: '1',
    name: 'Obelisk Chronograph',
    slug: 'obelisk-chronograph',
    description:
      'A masterpiece of precision and minimalist design. The Obelisk Chronograph features a brushed titanium case and a sapphire crystal face, housing a high-accuracy Swiss movement.',
    price: 450,
    currency: 'USD',
    category: 'Watches',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=1000',
    ],
    features: [
      'Grade 5 Titanium Case',
      'Anti-reflective Sapphire Crystal',
      '10 ATM Water Resistance',
      '42-hour Power Reserve',
    ],
    isFeatured: true,
    variants: [
      { id: 'v1', name: 'Brushed Silver', sku: 'OB-CHR-SLV', stock: 12 },
      { id: 'v2', name: 'Stealth Black', sku: 'OB-CHR-BLK', stock: 5 },
    ],
  },
  {
    id: '2',
    name: 'Eames Lounge Stool',
    slug: 'eames-lounge-stool',
    description:
      'A re-imagined mid-century icon. Crafted from sustainable walnut and premium top-grain leather, this stool offers unparalleled comfort and eternal style.',
    price: 890,
    currency: 'USD',
    category: 'Furniture',
    images: [
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=1000',
    ],
    features: [
      'Sustainable Walnut Veneer',
      'FSC Certified Leather',
      'Die-cast Aluminum Base',
    ],
    isFeatured: true,
  },
  {
    id: '3',
    name: 'Aether Wireless Headphones',
    slug: 'aether-wireless',
    description:
      'Immersive soundscapes met with tactile luxury. The Aether headphones feature hybrid noise cancellation and custom-tuned 40mm drivers, wrapped in soft lambskin leather.',
    price: 320,
    currency: 'USD',
    category: 'Audio',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000',
    ],
    features: [
      'Active Noise Cancellation',
      '30-hour Battery Life',
      'Lossless Audio Support',
    ],
    isFeatured: false,
  },
  {
    id: '4',
    name: 'Nomad Essential Tote',
    slug: 'nomad-tote',
    description:
      'Your daily companion for the urban trek. Made from weather-resistant ballistic nylon and Italian leather accents, designed to carry your essentials securely and with poise.',
    price: 180,
    currency: 'USD',
    category: 'Accessories',
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1000',
    ],
    features: [
      '1680D Ballistic Nylon',
      'Padded 16" Laptop Sleeve',
      'Quick-access Phone Pocket',
    ],
    isFeatured: false,
  },
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getProducts() {
  await sleep(500)
  return MOCK_PRODUCTS
}

export async function getProductBySlug(slug: string) {
  await sleep(200)
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug)
  if (!product) throw new Error('Product not found')
  return product
}

export async function getFeaturedProducts() {
  await sleep(100)
  return MOCK_PRODUCTS.filter((p) => p.isFeatured)
}
