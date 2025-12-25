import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../../components/ui/button'

type LocalizedString = { en: string; fr?: string; id?: string }

export const Route = createFileRoute('/admin/products/new')({
  component: NewProductPage,
})

function NewProductPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeLocale, setActiveLocale] = useState<'en' | 'fr' | 'id'>('en')

  const [formData, setFormData] = useState({
    name: { en: '', fr: '', id: '' } as LocalizedString,
    description: { en: '', fr: '', id: '' } as LocalizedString,
    handle: '',
    vendor: '',
    productType: '',
    status: 'draft' as 'draft' | 'active' | 'archived',
  })

  const createProduct = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      router.navigate({ to: '/admin/products' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createProduct.mutate(formData)
  }

  const generateHandle = () => {
    const handle = formData.name.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    setFormData((prev) => ({ ...prev, handle }))
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.navigate({ to: '/admin/products' })}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Button>
        <h1 className="text-2xl font-bold">Add Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name with locale tabs */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Product Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <div className="flex gap-1 mb-2">
                {(['en', 'fr', 'id'] as const).map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => setActiveLocale(locale)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activeLocale === locale
                        ? 'bg-pink-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {locale.toUpperCase()}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.name[activeLocale] || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: { ...prev.name, [activeLocale]: e.target.value },
                  }))
                }
                onBlur={() => !formData.handle && generateHandle()}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder={`Product name in ${activeLocale.toUpperCase()}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Handle (URL slug)
              </label>
              <input
                type="text"
                value={formData.handle}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, handle: e.target.value }))
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="product-url-slug"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description[activeLocale] || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: {
                      ...prev.description,
                      [activeLocale]: e.target.value,
                    },
                  }))
                }
                rows={4}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                placeholder={`Product description in ${activeLocale.toUpperCase()}`}
              />
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Organization</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Vendor</label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, vendor: e.target.value }))
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Brand name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Product Type
              </label>
              <input
                type="text"
                value={formData.productType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    productType: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="e.g., Nail Polish"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Status</h2>

          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.value as 'draft' | 'active' | 'archived',
              }))
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.navigate({ to: '/admin/products' })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createProduct.isPending}>
            {createProduct.isPending ? 'Creating...' : 'Create Product'}
          </Button>
        </div>

        {createProduct.isError && (
          <p className="text-red-500 text-sm">
            Error: {createProduct.error.message}
          </p>
        )}
      </form>
    </div>
  )
}
