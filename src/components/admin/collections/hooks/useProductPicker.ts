import { useMemo, useState } from 'react'

import type { Product } from '../types'

interface UseProductPickerOptions {
  localProducts: Product[]
  allProducts: Product[]
}

export function useProductPicker({
  localProducts,
  allProducts,
}: UseProductPickerOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const existingIds = useMemo(
    () => new Set(localProducts.map((p) => p.id)),
    [localProducts],
  )

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const name = typeof p.name === 'string' ? p.name : p.name?.en || ''
      return (
        !existingIds.has(p.id) &&
        name.toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [allProducts, existingIds, search])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const resetSelection = () => {
    setSelectedIds([])
  }

  const close = () => {
    setIsOpen(false)
    setSearch('')
  }

  return {
    isOpen,
    setIsOpen,
    selectedIds,
    toggleSelect,
    resetSelection,
    search,
    setSearch,
    filteredProducts,
    close,
  }
}
