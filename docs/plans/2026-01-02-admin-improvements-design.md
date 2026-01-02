# Admin Dashboard Improvements - Design Document

**Date:** 2026-01-02
**Status:** Draft
**Author:** Claude (via audit session)

---

## Executive Summary

This document outlines improvements to the FineNail admin dashboard based on a comprehensive UI/UX audit. The improvements are organized into three priority tiers and cover functionality gaps, UX enhancements, and polish items.

**Scope:** All admin pages including Dashboard, Products, Orders, Collections, and shared components.

**Goals:**
- Improve admin workflow efficiency
- Ensure data consistency through better input controls
- Create visual consistency across all admin pages
- Prevent data loss through proper user warnings
- Enhance accessibility and discoverability

---

## Table of Contents

1. [High Priority - Functionality Gaps](#1-high-priority---functionality-gaps)
   - 1.1 [Complete Order Status Filters](#11-complete-order-status-filters)
   - 1.2 [Unsaved Changes Warning](#12-unsaved-changes-warning)
   - 1.3 [Vendor Field Autocomplete](#13-vendor-field-autocomplete)
   - 1.4 [Product Type Field Autocomplete](#14-product-type-field-autocomplete)
   - 1.5 [Tags Input with Suggestions](#15-tags-input-with-suggestions)
2. [Medium Priority - UX Improvements](#2-medium-priority---ux-improvements)
   - 2.1 [Breadcrumb Navigation](#21-breadcrumb-navigation)
   - 2.2 [Language Tab Completion Indicators](#22-language-tab-completion-indicators)
   - 2.3 [Variants Table Search/Filter](#23-variants-table-searchfilter)
   - 2.4 [Orders Filter Visual Separation](#24-orders-filter-visual-separation)
   - 2.5 [Table Row Hover States](#25-table-row-hover-states)
   - 2.6 [Collections Stats Cards](#26-collections-stats-cards)
3. [Low Priority - Polish & Consistency](#3-low-priority---polish--consistency)
   - 3.1 [Standardize Action Button Verbs](#31-standardize-action-button-verbs)
   - 3.2 [Standardize Page Subtitles](#32-standardize-page-subtitles)
   - 3.3 [Collapsible Sidebar](#33-collapsible-sidebar)
   - 3.4 [Status Badge Contrast](#34-status-badge-contrast)
   - 3.5 [Loading Skeletons](#35-loading-skeletons)
   - 3.6 [AI Generate Button Placement](#36-ai-generate-button-placement)
4. [Implementation Phases](#4-implementation-phases)
5. [Technical Considerations](#5-technical-considerations)
6. [Success Metrics](#6-success-metrics)

---

## 1. High Priority - Functionality Gaps

These items address missing functionality that impacts the admin's ability to effectively manage the store.

### 1.1 Complete Order Status Filters

**Problem:**
The Orders page filter only shows `All | Pending | Processing | Shipped` but the schema supports additional statuses: `delivered` and `cancelled`. Similarly, Payment Status filter shows `All | Pending | Paid` but is missing `failed` and `refunded`.

**Current State:**
```
Order Status:    [All] [Pending] [Processing] [Shipped]
Payment Status:  [All] [Pending] [Paid]
Fulfillment:     [All] [Unfulfilled] [Fulfilled]
```

**Proposed State:**
```
Order Status:    [All] [Pending] [Processing] [Shipped] [Delivered] [Cancelled]
Payment Status:  [All] [Pending] [Paid] [Failed] [Refunded]
Fulfillment:     [All] [Unfulfilled] [Partial] [Fulfilled]
```

**Files to Modify:**
- `src/routes/admin/_authed/orders/index.tsx` - Add filter options
- `src/components/admin/orders/OrdersTable.tsx` - Ensure status rendering handles all states

**Implementation:**

```typescript
// Orders filter configuration
const orderStatusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const paymentStatusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

const fulfillmentStatusOptions = [
  { value: 'all', label: 'All' },
  { value: 'unfulfilled', label: 'Unfulfilled' },
  { value: 'partial', label: 'Partial' },
  { value: 'fulfilled', label: 'Fulfilled' },
]
```

**Effort:** Small (1-2 hours)

---

### 1.2 Unsaved Changes Warning

**Problem:**
When editing a product or collection, navigating away without saving loses all changes with no warning. This can cause significant frustration and data loss.

**Proposed Solution:**
Implement a `useUnsavedChanges` hook that:
1. Tracks form dirty state
2. Intercepts navigation attempts (both router and browser back/close)
3. Shows a confirmation dialog

**Files to Create/Modify:**
- `src/hooks/useUnsavedChanges.ts` - New hook
- `src/components/ui/unsaved-changes-dialog.tsx` - Confirmation dialog
- `src/components/admin/products/ProductForm.tsx` - Integrate hook
- `src/components/admin/collections/CollectionForm.tsx` - Integrate hook

**Implementation:**

```typescript
// src/hooks/useUnsavedChanges.ts
import { useEffect, useCallback, useState } from 'react'
import { useRouter } from '@tanstack/react-router'

interface UseUnsavedChangesOptions {
  isDirty: boolean
  message?: string
}

export function useUnsavedChanges({
  isDirty,
  message = 'You have unsaved changes. Are you sure you want to leave?'
}: UseUnsavedChangesOptions) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  // Handle browser back/refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, message])

  // Handle router navigation
  useEffect(() => {
    if (!isDirty) return

    const unsubscribe = router.subscribe('onBeforeNavigate', ({ to, from }) => {
      if (isDirty && to.pathname !== from.pathname) {
        setShowDialog(true)
        setPendingNavigation(() => () => router.navigate({ to: to.pathname }))
        return false // Prevent navigation
      }
      return true
    })

    return unsubscribe
  }, [isDirty, router])

  const confirmNavigation = useCallback(() => {
    setShowDialog(false)
    pendingNavigation?.()
    setPendingNavigation(null)
  }, [pendingNavigation])

  const cancelNavigation = useCallback(() => {
    setShowDialog(false)
    setPendingNavigation(null)
  }, [])

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
  }
}
```

```typescript
// src/components/ui/unsaved-changes-dialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost if you leave this page.
            Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Leave Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Usage in ProductForm:**

```typescript
// In ProductForm.tsx
const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChanges({
  isDirty: form.formState.isDirty,
})

return (
  <>
    {/* ... form content ... */}
    <UnsavedChangesDialog
      open={showDialog}
      onConfirm={confirmNavigation}
      onCancel={cancelNavigation}
    />
  </>
)
```

**Effort:** Medium (3-4 hours)

---

### 1.3 Vendor Field Autocomplete

**Problem:**
The Vendor field is a plain text input. This leads to inconsistent data entry:
- "FineNail" vs "Finenail" vs "Fine Nail"
- No way to see what vendors already exist in the system

**Proposed Solution:**
Create a combobox component that:
1. Fetches existing vendors from the database
2. Allows selection from existing values
3. Allows creating new vendors by typing

**Files to Create/Modify:**
- `src/server/products.ts` - Add `getDistinctVendors` function
- `src/components/admin/products/VendorCombobox.tsx` - New component
- `src/components/admin/products/ProductForm.tsx` - Replace input with combobox

**Database Query:**

```typescript
// src/server/products.ts
export const getDistinctVendorsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const db = getDb()
    const result = await db
      .selectDistinct({ vendor: products.vendor })
      .from(products)
      .where(isNotNull(products.vendor))
      .orderBy(products.vendor)

    return result.map(r => r.vendor).filter(Boolean) as string[]
  })
```

**Component Implementation:**

```typescript
// src/components/admin/products/VendorCombobox.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getDistinctVendorsFn } from '@/server/products'

interface VendorComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function VendorCombobox({
  value,
  onChange,
  placeholder = 'Select or enter vendor...'
}: VendorComboboxProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => getDistinctVendorsFn(),
  })

  const filteredVendors = vendors.filter(vendor =>
    vendor.toLowerCase().includes(inputValue.toLowerCase())
  )

  const showCreateOption =
    inputValue &&
    !vendors.some(v => v.toLowerCase() === inputValue.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search vendors..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue ? (
                <button
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(inputValue)
                    setOpen(false)
                  }}
                >
                  Create "{inputValue}"
                </button>
              ) : (
                'No vendors found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {showCreateOption && (
                <CommandItem
                  value={`create-${inputValue}`}
                  onSelect={() => {
                    onChange(inputValue)
                    setOpen(false)
                  }}
                >
                  Create "{inputValue}"
                </CommandItem>
              )}
              {filteredVendors.map((vendor) => (
                <CommandItem
                  key={vendor}
                  value={vendor}
                  onSelect={() => {
                    onChange(vendor)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === vendor ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {vendor}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**Effort:** Medium (2-3 hours)

---

### 1.4 Product Type Field Autocomplete

**Problem:**
Same issue as Vendor - plain text input leads to inconsistent product type categorization.

**Proposed Solution:**
Same pattern as Vendor combobox but for product types.

**Files to Create/Modify:**
- `src/server/products.ts` - Add `getDistinctProductTypes` function
- `src/components/admin/products/ProductTypeCombobox.tsx` - New component
- `src/components/admin/products/ProductForm.tsx` - Replace input with combobox

**Implementation:**
Nearly identical to VendorCombobox. Consider creating a generic `AutocompleteCombobox` component that both can use:

```typescript
// src/components/ui/autocomplete-combobox.tsx
interface AutocompleteComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  emptyMessage?: string
  createLabel?: (value: string) => string
}

export function AutocompleteCombobox({
  value,
  onChange,
  options,
  placeholder = 'Select or enter...',
  emptyMessage = 'No options found.',
  createLabel = (v) => `Create "${v}"`,
}: AutocompleteComboboxProps) {
  // ... implementation similar to VendorCombobox
}
```

Then use it:

```typescript
// VendorCombobox
<AutocompleteCombobox
  value={value}
  onChange={onChange}
  options={vendors}
  placeholder="Select or enter vendor..."
/>

// ProductTypeCombobox
<AutocompleteCombobox
  value={value}
  onChange={onChange}
  options={productTypes}
  placeholder="Select or enter product type..."
/>
```

**Effort:** Small (1-2 hours if reusing component from 1.3)

---

### 1.5 Tags Input with Suggestions

**Problem:**
The Tags input allows free-form entry but doesn't suggest existing tags. This leads to:
- Duplicate tags with slight variations ("press-on nails" vs "press-on-nails")
- Difficulty discovering what tags are available
- Inconsistent categorization

**Current Behavior:**
Plain comma-separated text input.

**Proposed Solution:**
Create a multi-select tag input that:
1. Shows existing tags as suggestions
2. Allows selecting multiple tags
3. Allows creating new tags inline
4. Displays selected tags as removable chips

**Files to Create/Modify:**
- `src/server/products.ts` - Add `getDistinctTags` function
- `src/components/ui/tag-input.tsx` - New component
- `src/components/admin/products/ProductForm.tsx` - Replace input with tag component

**Database Query:**

```typescript
// src/server/products.ts
export const getDistinctTagsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const db = getDb()
    const result = await db
      .select({ tags: products.tags })
      .from(products)
      .where(isNotNull(products.tags))

    // Flatten and dedupe all tags
    const allTags = result
      .flatMap(r => r.tags?.split(',').map(t => t.trim()) || [])
      .filter(Boolean)

    return [...new Set(allTags)].sort()
  })
```

**Component Implementation:**

```typescript
// src/components/ui/tag-input.tsx
import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover'

interface TagInputProps {
  value: string[] // Array of selected tags
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

export function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Add tags...',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const availableSuggestions = suggestions.filter(
    tag => !value.includes(tag) &&
           tag.toLowerCase().includes(inputValue.toLowerCase())
  )

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (normalizedTag && !value.includes(normalizedTag)) {
      onChange([...value, normalizedTag])
    }
    setInputValue('')
    inputRef.current?.focus()
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with suggestions */}
      <Popover open={open && (availableSuggestions.length > 0 || inputValue)}>
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {inputValue && !suggestions.includes(inputValue.toLowerCase()) && (
                <CommandItem onSelect={() => addTag(inputValue)}>
                  Create "{inputValue}"
                </CommandItem>
              )}
              {availableSuggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {availableSuggestions.slice(0, 10).map(tag => (
                    <CommandItem key={tag} onSelect={() => addTag(tag)}>
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {availableSuggestions.length === 0 && !inputValue && (
                <CommandEmpty>Start typing to add tags</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

**ProductForm Integration:**

```typescript
// Convert from comma-separated string to array for the component
const tagsArray = watch('tags')?.split(',').map(t => t.trim()).filter(Boolean) || []

<TagInput
  value={tagsArray}
  onChange={(tags) => setValue('tags', tags.join(', '))}
  suggestions={existingTags}
  placeholder="Add product tags..."
/>
```

**Effort:** Medium (3-4 hours)

---

## 2. Medium Priority - UX Improvements

These items improve the admin experience but don't block core functionality.

### 2.1 Breadcrumb Navigation

**Problem:**
When deep in the admin (e.g., editing a product), users only have a back arrow for navigation. There's no visual indication of where they are in the hierarchy.

**Current State:**
```
← Whimsical Icons Press-On Nail Set [EDITING]
```

**Proposed State:**
```
Products / Whimsical Icons Press-On Nail Set [EDITING]
```

**Files to Create/Modify:**
- `src/components/admin/Breadcrumbs.tsx` - New component
- `src/routes/admin/_authed/products/$productId.tsx` - Add breadcrumbs
- `src/routes/admin/_authed/collections/$collectionId.tsx` - Add breadcrumbs
- `src/routes/admin/_authed/orders/$orderId.tsx` - Add breadcrumbs

**Component Implementation:**

```typescript
// src/components/admin/Breadcrumbs.tsx
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {item.href ? (
            <Link
              to={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
```

**Usage:**

```typescript
// In product edit page
<Breadcrumbs
  items={[
    { label: 'Products', href: '/admin/products' },
    { label: product.name.en || 'Untitled Product' },
  ]}
/>

// In order detail page
<Breadcrumbs
  items={[
    { label: 'Orders', href: '/admin/orders' },
    { label: `Order #${order.orderNumber}` },
  ]}
/>
```

**Effort:** Small (1-2 hours)

---

### 2.2 Language Tab Completion Indicators

**Problem:**
The localized fields have EN/FR/ID tabs, but there's no way to know which languages have content without clicking each tab. This makes it easy to miss translations.

**Current State:**
```
[EN] [FR] [ID]    <- All tabs look identical
```

**Proposed State:**
```
[EN ●] [FR ○] [ID ○]    <- Filled dot for tabs with content
```

**Files to Modify:**
- `src/components/admin/products/LocalizedFieldTabs.tsx` - Add indicators

**Implementation:**

```typescript
// src/components/admin/products/LocalizedFieldTabs.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface LocalizedFieldTabsProps {
  values: {
    en?: string
    fr?: string
    id?: string
  }
  children: (lang: 'en' | 'fr' | 'id') => React.ReactNode
  className?: string
}

export function LocalizedFieldTabs({
  values,
  children,
  className
}: LocalizedFieldTabsProps) {
  const hasContent = (lang: 'en' | 'fr' | 'id') => {
    const value = values[lang]
    return value && value.trim().length > 0
  }

  return (
    <Tabs defaultValue="en" className={className}>
      <TabsList>
        {(['en', 'fr', 'id'] as const).map((lang) => (
          <TabsTrigger key={lang} value={lang} className="gap-1.5">
            {lang.toUpperCase()}
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                hasContent(lang)
                  ? 'bg-green-500'
                  : 'bg-muted-foreground/30'
              )}
              title={hasContent(lang) ? 'Has content' : 'Empty'}
            />
          </TabsTrigger>
        ))}
      </TabsList>
      {(['en', 'fr', 'id'] as const).map((lang) => (
        <TabsContent key={lang} value={lang}>
          {children(lang)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
```

**Alternative Design - Badge Count:**

Instead of dots, show character count:

```typescript
<TabsTrigger key={lang} value={lang}>
  {lang.toUpperCase()}
  {values[lang] && (
    <Badge variant="secondary" className="ml-1 text-xs">
      {values[lang].length}
    </Badge>
  )}
</TabsTrigger>
```

**Effort:** Small (1-2 hours)

---

### 2.3 Variants Table Search/Filter

**Problem:**
Products can have many variants (e.g., 5 shapes × 4 lengths = 20 variants). Finding and editing a specific variant requires scrolling through the entire list.

**Current State:**
Simple table with all variants listed.

**Proposed Solution:**
1. Add a search input above the variants table
2. Filter by variant name (e.g., "Coffin" or "Long")
3. Show result count

**Files to Modify:**
- `src/components/admin/products/ProductVariantsTable.tsx` - Add search

**Implementation:**

```typescript
// src/components/admin/products/ProductVariantsTable.tsx
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ProductVariantsTableProps {
  variants: ProductVariant[]
  onVariantChange: (id: string, updates: Partial<ProductVariant>) => void
}

export function ProductVariantsTable({
  variants,
  onVariantChange
}: ProductVariantsTableProps) {
  const [search, setSearch] = useState('')

  const filteredVariants = useMemo(() => {
    if (!search) return variants
    const searchLower = search.toLowerCase()
    return variants.filter(variant =>
      variant.name.toLowerCase().includes(searchLower)
    )
  }, [variants, search])

  return (
    <div className="space-y-4">
      {/* Search bar - only show if more than 10 variants */}
      {variants.length > 10 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter variants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {search && (
            <span className="text-sm text-muted-foreground">
              Showing {filteredVariants.length} of {variants.length} variants
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr>
            <th>Variant</th>
            <th>Price</th>
            <th>Available</th>
            <th>SKU</th>
          </tr>
        </thead>
        <tbody>
          {filteredVariants.map(variant => (
            <tr key={variant.id}>
              {/* ... existing row content ... */}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state for filtered results */}
      {search && filteredVariants.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No variants match "{search}"
        </div>
      )}
    </div>
  )
}
```

**Effort:** Small (1-2 hours)

---

### 2.4 Orders Filter Visual Separation

**Problem:**
The three filter groups (Order Status, Payment Status, Fulfillment Status) all use the same visual style and blend together. It's hard to distinguish which filter group you're looking at.

**Current State:**
```
[All][Pending][Processing][Shipped] [All][Pending][Paid] [All][Unfulfilled][Fulfilled]
```

**Proposed Solution:**
Add labels and visual separation between filter groups.

**Design Option A - Labeled Groups:**
```
Order Status: [All][Pending][Processing][Shipped][Delivered][Cancelled]

Payment:      [All][Pending][Paid][Failed][Refunded]

Fulfillment:  [All][Unfulfilled][Partial][Fulfilled]
```

**Design Option B - Grouped with Dividers:**
```
[All][Pending][Processing][Shipped][Delivered][Cancelled] │ [All][Pending][Paid][Failed][Refunded] │ [All][Unfulfilled][Partial][Fulfilled]
```

**Recommended: Option A** - Labels make the purpose of each filter group immediately clear.

**Files to Modify:**
- `src/routes/admin/_authed/orders/index.tsx` - Update filter layout

**Implementation:**

```typescript
// Orders page filter section
<div className="space-y-3">
  {/* Order Status */}
  <div className="flex items-center gap-3">
    <span className="text-sm font-medium text-muted-foreground w-24">
      Order Status
    </span>
    <div className="flex gap-1">
      {orderStatusOptions.map(option => (
        <FilterButton
          key={option.value}
          active={filters.status === option.value}
          onClick={() => setFilter('status', option.value)}
        >
          {option.label}
        </FilterButton>
      ))}
    </div>
  </div>

  {/* Payment Status */}
  <div className="flex items-center gap-3">
    <span className="text-sm font-medium text-muted-foreground w-24">
      Payment
    </span>
    <div className="flex gap-1">
      {paymentStatusOptions.map(option => (
        <FilterButton
          key={option.value}
          active={filters.paymentStatus === option.value}
          onClick={() => setFilter('paymentStatus', option.value)}
        >
          {option.label}
        </FilterButton>
      ))}
    </div>
  </div>

  {/* Fulfillment Status */}
  <div className="flex items-center gap-3">
    <span className="text-sm font-medium text-muted-foreground w-24">
      Fulfillment
    </span>
    <div className="flex gap-1">
      {fulfillmentStatusOptions.map(option => (
        <FilterButton
          key={option.value}
          active={filters.fulfillmentStatus === option.value}
          onClick={() => setFilter('fulfillmentStatus', option.value)}
        >
          {option.label}
        </FilterButton>
      ))}
    </div>
  </div>
</div>
```

**Effort:** Small (1-2 hours)

---

### 2.5 Table Row Hover States

**Problem:**
Table rows in Products, Orders, and Collections are clickable but don't indicate this visually. There's no cursor change or background highlight on hover.

**Files to Modify:**
- `src/components/admin/products/ProductTable.tsx`
- `src/components/admin/orders/OrdersTable.tsx`
- `src/components/admin/collections/CollectionTable.tsx`

**Implementation:**

Add hover styles to table rows:

```typescript
// In table row component
<tr
  onClick={() => navigate({ to: `/admin/products/${product.id}` })}
  className={cn(
    'cursor-pointer',
    'hover:bg-muted/50 transition-colors',
    'group' // For child element styling
  )}
>
  {/* ... cells ... */}
</tr>
```

**Additional Enhancement - Row Actions Visibility:**

Show action buttons (edit, delete) only on hover:

```typescript
<td className="text-right">
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    <DropdownMenu>
      {/* ... actions ... */}
    </DropdownMenu>
  </div>
</td>
```

**Effort:** Small (1 hour)

---

### 2.6 Collections Stats Cards

**Problem:**
The Products page has stats cards (Total Products, Active, Drafts, Low Stock) but the Collections page doesn't. This creates visual inconsistency.

**Current Collections Page:**
```
Collections
Curate and organize your products for the storefront
[Search...] [All] [Active] [Draft]
[Table...]
```

**Proposed Collections Page:**
```
Collections
Curate and organize your products for the storefront

[4 Total] [2 Active] [2 Drafts] [15 Products in Collections]

[Search...] [All] [Active] [Draft]
[Table...]
```

**Files to Create/Modify:**
- `src/components/admin/collections/CollectionStats.tsx` - New component
- `src/routes/admin/_authed/collections/index.tsx` - Add stats cards
- `src/server/collections.ts` - Add stats query

**Implementation:**

```typescript
// src/server/collections.ts
export const getCollectionStatsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const db = getDb()

    const [total, active, draft, productsInCollections] = await Promise.all([
      db.select({ count: count() }).from(collections),
      db.select({ count: count() }).from(collections).where(eq(collections.status, 'active')),
      db.select({ count: count() }).from(collections).where(eq(collections.status, 'draft')),
      db.select({ count: count() }).from(collectionProducts),
    ])

    return {
      total: total[0].count,
      active: active[0].count,
      draft: draft[0].count,
      productsInCollections: productsInCollections[0].count,
    }
  })
```

```typescript
// src/components/admin/collections/CollectionStats.tsx
import { Package, CheckCircle, FileEdit, Layers } from 'lucide-react'

interface CollectionStatsProps {
  stats: {
    total: number
    active: number
    draft: number
    productsInCollections: number
  }
}

export function CollectionStats({ stats }: CollectionStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        icon={<Layers className="h-5 w-5 text-pink-500" />}
        value={stats.total}
        label="Total Collections"
      />
      <StatCard
        icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        value={stats.active}
        label="Active"
      />
      <StatCard
        icon={<FileEdit className="h-5 w-5 text-orange-500" />}
        value={stats.draft}
        label="Drafts"
      />
      <StatCard
        icon={<Package className="h-5 w-5 text-blue-500" />}
        value={stats.productsInCollections}
        label="Products Assigned"
      />
    </div>
  )
}

function StatCard({
  icon,
  value,
  label
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  )
}
```

**Effort:** Small (1-2 hours)

---

## 3. Low Priority - Polish & Consistency

These items improve overall polish but have minimal impact on functionality.

### 3.1 Standardize Action Button Verbs

**Problem:**
Inconsistent button labels: "Add Product" vs "Create Collection"

**Proposed Standard:**
Use "Add [Item]" consistently across all pages.

**Changes:**
| Current | Proposed |
|---------|----------|
| + Add Product | + Add Product (no change) |
| + Create Collection | + Add Collection |

**Files to Modify:**
- `src/routes/admin/_authed/collections/index.tsx` - Change button text

**Effort:** Trivial (5 minutes)

---

### 3.2 Standardize Page Subtitles

**Problem:**
Page subtitles vary in length and tone:
- Dashboard: (none)
- Products: "Manage your products and inventory"
- Orders: "Manage and track customer orders"
- Collections: "Curate and organize your products for the storefront"

**Proposed Standard:**
Short, consistent format: "Manage your [items]"

| Page | Current | Proposed |
|------|---------|----------|
| Dashboard | (none) | "Overview of your store" |
| Products | "Manage your products and inventory" | "Manage your products" |
| Orders | "Manage and track customer orders" | "Manage your orders" |
| Collections | "Curate and organize your products for the storefront" | "Manage your collections" |

**Alternative:**
Remove subtitles entirely - the page titles are self-explanatory.

**Files to Modify:**
- `src/routes/admin/_authed/index.tsx`
- `src/routes/admin/_authed/products/index.tsx`
- `src/routes/admin/_authed/orders/index.tsx`
- `src/routes/admin/_authed/collections/index.tsx`

**Effort:** Trivial (15 minutes)

---

### 3.3 Collapsible Sidebar

**Problem:**
The sidebar is always expanded, taking up ~260px. On smaller screens or when working with wide tables (variants), this can feel cramped.

**Proposed Solution:**
Add a collapse toggle that:
1. Reduces sidebar to icon-only mode (~60px)
2. Persists preference in localStorage
3. Shows tooltips on icons when collapsed

**Files to Create/Modify:**
- `src/components/admin/Sidebar.tsx` - Add collapse functionality
- `src/hooks/useSidebarState.ts` - Persist state

**Implementation:**

```typescript
// src/hooks/useSidebarState.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  collapsed: boolean
  toggle: () => void
}

export const useSidebarState = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    { name: 'admin-sidebar' }
  )
)
```

```typescript
// src/components/admin/Sidebar.tsx
import { useSidebarState } from '@/hooks/useSidebarState'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function Sidebar() {
  const { collapsed, toggle } = useSidebarState()

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-background transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && <Logo />}
        <button onClick={toggle} className="p-1 hover:bg-muted rounded">
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        {navItems.map(item => (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md',
                  collapsed && 'justify-center'
                )}
              >
                <item.icon className="h-5 w-5" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                {item.label}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </nav>
    </aside>
  )
}
```

**Effort:** Medium (2-3 hours)

---

### 3.4 Status Badge Contrast

**Problem:**
Status badges (ACTIVE, DRAFT, ARCHIVED) use light backgrounds that may be hard to read for some users.

**Current:**
- ACTIVE: Light green background, green text
- DRAFT: Light orange background, orange text
- ARCHIVED: Light gray background, gray text

**Proposed Enhancement:**
Increase contrast by using darker backgrounds or adding borders:

```typescript
// src/components/admin/products/StatusBadge.tsx
const statusStyles = {
  active: 'bg-green-100 text-green-800 border border-green-200',
  draft: 'bg-orange-100 text-orange-800 border border-orange-200',
  archived: 'bg-gray-100 text-gray-800 border border-gray-200',
}
```

**Alternative - Filled Badges:**

```typescript
const statusStyles = {
  active: 'bg-green-600 text-white',
  draft: 'bg-orange-500 text-white',
  archived: 'bg-gray-500 text-white',
}
```

**Files to Modify:**
- `src/components/admin/products/StatusBadge.tsx`
- `src/components/admin/orders/OrderStatusBadge.tsx`

**Effort:** Trivial (15 minutes)

---

### 3.5 Loading Skeletons

**Problem:**
Pages load instantly locally, but on slower connections there's no loading indication. Users may think the page is broken.

**Proposed Solution:**
Add skeleton loading states for:
1. Data tables (product/order/collection lists)
2. Form pages (product/collection edit)
3. Dashboard stats

**Files to Create:**
- `src/components/ui/skeleton-table.tsx`
- `src/components/ui/skeleton-form.tsx`
- `src/components/ui/skeleton-stats.tsx`

**Implementation:**

```typescript
// src/components/ui/skeleton-table.tsx
import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonTableProps {
  rows?: number
  columns?: number
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4',
                colIndex === 0 ? 'w-8' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
```

```typescript
// Usage in route loader
export const Route = createFileRoute('/admin/_authed/products/')({
  pendingComponent: () => (
    <div className="space-y-6 p-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <SkeletonTable rows={8} columns={5} />
    </div>
  ),
  // ... rest of route config
})
```

**Effort:** Medium (2-3 hours)

---

### 3.6 AI Generate Button Placement

**Problem:**
The "Generate Details with AI" button is positioned below the Media section, far from the Description field it generates content for. This feels disconnected.

**Current Layout:**
```
Product Details
  Name [EN][FR][ID]
  Description [EN][FR][ID]
    [Rich text editor]

Media
  [Image gallery]
  [Upload]
  [Generate Details with AI]  <- Here, below images
```

**Proposed Layout:**
```
Product Details
  Name [EN][FR][ID]
  Description [EN][FR][ID]
    [Rich text editor]
    [Generate Details with AI]  <- Moved here, below description

Media
  [Image gallery]
  [Upload]
```

**Alternative - Inline with Description Label:**
```
Description [EN][FR][ID]                    [✨ Generate with AI]
[Rich text editor]
```

**Files to Modify:**
- `src/components/admin/products/ProductForm.tsx` - Move button

**Effort:** Trivial (15 minutes)

---

## 4. Implementation Phases

### Phase 1: Critical Fixes (Week 1)
Focus on functionality gaps that impact daily admin work.

| Task | Effort | Files |
|------|--------|-------|
| 1.1 Complete Order Status Filters | 1-2h | 2 files |
| 1.2 Unsaved Changes Warning | 3-4h | 4 files |
| 2.5 Table Row Hover States | 1h | 3 files |

**Total: ~6-7 hours**

### Phase 2: Data Consistency (Week 2)
Improve data quality through better input controls.

| Task | Effort | Files |
|------|--------|-------|
| 1.3 Vendor Field Autocomplete | 2-3h | 3 files |
| 1.4 Product Type Autocomplete | 1-2h | 2 files (reuses 1.3) |
| 1.5 Tags Input with Suggestions | 3-4h | 3 files |

**Total: ~6-9 hours**

### Phase 3: Navigation & Orientation (Week 3)
Help admins understand where they are and navigate efficiently.

| Task | Effort | Files |
|------|--------|-------|
| 2.1 Breadcrumb Navigation | 1-2h | 4 files |
| 2.2 Language Tab Completion Indicators | 1-2h | 1 file |
| 2.4 Orders Filter Visual Separation | 1-2h | 1 file |

**Total: ~3-6 hours**

### Phase 4: Visual Consistency (Week 4)
Standardize appearance across admin pages.

| Task | Effort | Files |
|------|--------|-------|
| 2.3 Variants Table Search/Filter | 1-2h | 1 file |
| 2.6 Collections Stats Cards | 1-2h | 3 files |
| 3.4 Status Badge Contrast | 15m | 2 files |
| 3.1 Standardize Action Button Verbs | 5m | 1 file |
| 3.2 Standardize Page Subtitles | 15m | 4 files |
| 3.6 AI Generate Button Placement | 15m | 1 file |

**Total: ~3-5 hours**

### Phase 5: Advanced Polish (Future)
Nice-to-have improvements.

| Task | Effort | Files |
|------|--------|-------|
| 3.3 Collapsible Sidebar | 2-3h | 2 files |
| 3.5 Loading Skeletons | 2-3h | 5+ files |

**Total: ~4-6 hours**

---

## 5. Technical Considerations

### State Management
- Unsaved changes tracking uses form library's `isDirty` state
- Sidebar collapse state persisted via Zustand + localStorage
- Filter states already use URL params (no changes needed)

### Performance
- Autocomplete queries should be cached (React Query handles this)
- Skeleton components are lightweight
- No new API calls on critical render path

### Accessibility
- All new interactive elements need proper ARIA labels
- Keyboard navigation must work for comboboxes
- Color contrast ratios should meet WCAG AA (4.5:1 for text)

### Testing
- Unsaved changes warning needs E2E tests
- Autocomplete components need unit tests for filtering logic
- Skeleton components are presentational (no tests needed)

### Browser Support
- `beforeunload` event works in all modern browsers
- Combobox patterns use Radix UI (full browser support)
- No experimental APIs used

---

## 6. Success Metrics

### Quantitative
- **Data consistency:** Reduction in duplicate vendors/tags (measure via DB query)
- **Form completion:** Increase in products with FR/ID translations
- **Error prevention:** Reduction in support tickets about lost changes

### Qualitative
- Admin users can navigate without confusion
- Form inputs feel predictable and helpful
- Visual consistency builds trust in the platform

### Technical
- No increase in bundle size > 10KB
- No new runtime errors in production
- Lighthouse accessibility score maintains 90+

---

## Appendix: Component Inventory

### New Components to Create
1. `src/hooks/useUnsavedChanges.ts`
2. `src/components/ui/unsaved-changes-dialog.tsx`
3. `src/components/ui/autocomplete-combobox.tsx`
4. `src/components/ui/tag-input.tsx`
5. `src/components/admin/Breadcrumbs.tsx`
6. `src/components/admin/collections/CollectionStats.tsx`
7. `src/components/ui/skeleton-table.tsx`
8. `src/hooks/useSidebarState.ts`

### Existing Components to Modify
1. `src/components/admin/products/ProductForm.tsx`
2. `src/components/admin/products/ProductVariantsTable.tsx`
3. `src/components/admin/products/LocalizedFieldTabs.tsx`
4. `src/components/admin/products/ProductTable.tsx`
5. `src/components/admin/products/StatusBadge.tsx`
6. `src/components/admin/orders/OrdersTable.tsx`
7. `src/components/admin/orders/OrderStatusBadge.tsx`
8. `src/components/admin/collections/CollectionForm.tsx`
9. `src/components/admin/collections/CollectionTable.tsx`
10. `src/components/admin/Sidebar.tsx`

### Routes to Modify
1. `src/routes/admin/_authed/products/index.tsx`
2. `src/routes/admin/_authed/products/$productId.tsx`
3. `src/routes/admin/_authed/products/new.tsx`
4. `src/routes/admin/_authed/orders/index.tsx`
5. `src/routes/admin/_authed/orders/$orderId.tsx`
6. `src/routes/admin/_authed/collections/index.tsx`
7. `src/routes/admin/_authed/collections/$collectionId.tsx`
8. `src/routes/admin/_authed/collections/new.tsx`
9. `src/routes/admin/_authed/index.tsx`

### Server Functions to Add
1. `getDistinctVendorsFn` in `src/server/products.ts`
2. `getDistinctProductTypesFn` in `src/server/products.ts`
3. `getDistinctTagsFn` in `src/server/products.ts`
4. `getCollectionStatsFn` in `src/server/collections.ts`
