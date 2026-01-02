# Admin UI Consistency Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate remaining inconsistencies in admin UI by unifying formatters, row actions, bulk actions, stats cards, and table styling.

**Architecture:** Extract shared utilities for date/price formatting, consolidate 3 BulkActionsBar implementations into AdminBulkActionsBar, migrate ProductStats/CollectionStats to AdminStatsGrid, and unify table visual patterns.

**Tech Stack:** React, TypeScript, i18next, TailwindCSS, Radix UI

---

## Task 1: Create Shared Date Formatter Utility

**Files:**
- Create: `src/lib/format.ts` (extend existing)

**Step 1: Read existing format utility**

```bash
cat src/lib/format.ts
```

**Step 2: Add formatDate utility to format.ts**

Add to `src/lib/format.ts`:

```typescript
export type DateFormatStyle = 'short' | 'medium' | 'long' | 'datetime'

export const formatDate = (
  date: Date | string | undefined,
  style: DateFormatStyle = 'medium',
  locale = 'en-US'
): string => {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    datetime: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
  }[style]

  return d.toLocaleDateString(locale, options)
}
```

**Step 3: Run TypeScript check**

```bash
npm run typecheck
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/format.ts
git commit -m "feat(admin): add formatDate utility for consistent date formatting"
```

---

## Task 2: Replace Inline formatDate in OrdersTable

**Files:**
- Modify: `src/components/admin/orders/OrdersTable.tsx`

**Step 1: Update imports and remove inline formatDate**

Replace the inline `formatDate` function with import:

```typescript
// Remove lines 55-64 (the inline formatDate function)
// Add to imports:
import { formatCurrency, formatDate } from '../../../lib/format'
```

**Step 2: Update formatDate usage**

Change line ~245:
```typescript
// From:
{formatDate(order.createdAt)}

// To:
{formatDate(order.createdAt, 'datetime')}
```

**Step 3: Run tests**

```bash
npm run test -- src/components/admin/orders/OrdersTable.test.tsx
```

**Step 4: Commit**

```bash
git add src/components/admin/orders/OrdersTable.tsx
git commit -m "refactor(orders): use shared formatDate utility"
```

---

## Task 3: Replace Inline formatDate in OrderHistory

**Files:**
- Modify: `src/components/admin/orders/OrderHistory.tsx`

**Step 1: Update imports and remove inline formatDate**

```typescript
// Remove the inline formatDate function
// Add to imports:
import { formatDate } from '../../../lib/format'
```

**Step 2: Update all formatDate calls to use 'datetime' style**

```typescript
{formatDate(event.createdAt, 'datetime')}
```

**Step 3: Run tests**

```bash
npm run test -- src/components/admin/orders/OrderHistory.test.tsx
```

**Step 4: Commit**

```bash
git add src/components/admin/orders/OrderHistory.tsx
git commit -m "refactor(orders): use shared formatDate in OrderHistory"
```

---

## Task 4: Replace Inline formatDate in OrderDetail

**Files:**
- Modify: `src/components/admin/orders/OrderDetail.tsx`

**Step 1: Update imports and remove inline formatDate**

```typescript
// Remove the inline formatDate function (lines 51-57)
// Add to imports:
import { formatCurrency, formatDate } from '../../../lib/format'
```

**Step 2: Update all formatDate calls to use 'long' style**

```typescript
{formatDate(order.createdAt, 'long')}
```

**Step 3: Run tests**

```bash
npm run test -- src/components/admin/orders/OrderDetail.test.tsx
```

**Step 4: Commit**

```bash
git add src/components/admin/orders/OrderDetail.tsx
git commit -m "refactor(orders): use shared formatDate in OrderDetail"
```

---

## Task 5: Replace Inline Date Formatting in CollectionTable

**Files:**
- Modify: `src/components/admin/collections/components/CollectionTable.tsx`

**Step 1: Add import**

```typescript
import { formatDate } from '../../../../lib/format'
```

**Step 2: Replace inline toLocaleDateString**

Change line ~150:
```typescript
// From:
{new Date(collection.createdAt).toLocaleDateString(
  undefined,
  { month: 'short', day: 'numeric', year: 'numeric' },
)}

// To:
{formatDate(collection.createdAt, 'short')}
```

**Step 3: Run tests**

```bash
npm run test -- src/components/admin/collections/components/CollectionTable.test.tsx
```

**Step 4: Commit**

```bash
git add src/components/admin/collections/components/CollectionTable.tsx
git commit -m "refactor(collections): use shared formatDate in CollectionTable"
```

---

## Task 6: Replace Inline Date Formatting in CollectionForm

**Files:**
- Modify: `src/components/admin/collections/CollectionForm.tsx`

**Step 1: Add import**

```typescript
import { formatDate } from '../../../lib/format'
```

**Step 2: Replace inline toLocaleDateString**

Change line ~396:
```typescript
// From:
{new Date(collection.publishedAt).toLocaleDateString()}

// To:
{formatDate(collection.publishedAt, 'short')}
```

**Step 3: Run tests**

```bash
npm run test -- src/components/admin/collections/CollectionForm.test.tsx
```

**Step 4: Commit**

```bash
git add src/components/admin/collections/CollectionForm.tsx
git commit -m "refactor(collections): use shared formatDate in CollectionForm"
```

---

## Task 7: Use formatCurrency in ProductTable

**Files:**
- Modify: `src/components/admin/products/components/ProductTable.tsx`

**Step 1: Add import**

```typescript
import { formatCurrency } from '../../../../lib/format'
```

**Step 2: Update PriceDisplay component**

Replace the PriceDisplay component (lines 155-176):

```typescript
const PriceDisplay = ({
  price,
  compareAtPrice,
}: {
  price: string | null
  compareAtPrice: string | null
}) => {
  if (price === null) {
    return <span className="text-muted-foreground text-xs font-medium">—</span>
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold">
        {formatCurrency({ value: price, currency: 'USD' })}
      </span>
      {compareAtPrice && (
        <span className="text-[10px] text-muted-foreground line-through">
          {formatCurrency({ value: compareAtPrice, currency: 'USD' })}
        </span>
      )}
    </div>
  )
}
```

**Step 3: Run tests**

```bash
npm run test -- src/components/admin/products/components/ProductTable.test.tsx
```

**Step 4: Commit**

```bash
git add src/components/admin/products/components/ProductTable.tsx
git commit -m "refactor(products): use formatCurrency in ProductTable"
```

---

## Task 8: Use formatCurrency in ProductsList

**Files:**
- Modify: `src/components/admin/products/ProductsList.tsx`

**Step 1: Add import**

```typescript
import { formatCurrency } from '../../../lib/format'
```

**Step 2: Replace price formatting**

Find lines 125-131 and replace:

```typescript
// From:
product.minPrice === product.maxPrice ? (
  <span>${product.minPrice.toFixed(2)}</span>
) : (
  <span>
    ${product.minPrice.toFixed(2)} - $
    {product.maxPrice?.toFixed(2)}
  </span>
)

// To:
product.minPrice === product.maxPrice ? (
  <span>{formatCurrency({ value: product.minPrice, currency: 'USD' })}</span>
) : (
  <span>
    {formatCurrency({ value: product.minPrice, currency: 'USD' })} -{' '}
    {formatCurrency({ value: product.maxPrice, currency: 'USD' })}
  </span>
)
```

**Step 3: Run tests**

```bash
npm run test -- src/components/admin/products
```

**Step 4: Commit**

```bash
git add src/components/admin/products/ProductsList.tsx
git commit -m "refactor(products): use formatCurrency in ProductsList"
```

---

## Task 9: Add Status Label Translation to AdminStatusBadge

**Files:**
- Modify: `src/components/admin/components/AdminStatusBadge.tsx`

**Step 1: Add i18n import**

```typescript
import { useTranslation } from 'react-i18next'
```

**Step 2: Create status label map and update component**

Add before the component:

```typescript
// Human-readable status labels
const statusLabels: Record<string, string> = {
  // Product & Collection
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived',
  // Order
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  // Payment
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  // Fulfillment
  unfulfilled: 'Unfulfilled',
  partial: 'Partial',
  fulfilled: 'Fulfilled',
}
```

Update the component to use translation:

```typescript
export const AdminStatusBadge = ({
  status,
  showDot = true,
  className,
}: AdminStatusBadgeProps) => {
  const { t } = useTranslation()
  const style = statusStyles[status] || defaultStyle
  const label = statusLabels[status] || status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
        style.bg,
        className,
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      )}
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider',
          style.text,
        )}
      >
        {t(label)}
      </span>
    </span>
  )
}
```

**Step 3: Verify translations exist in en.json**

Check that status labels exist in `src/i18n/locales/en.json`. Add if missing:

```json
{
  "Active": "Active",
  "Draft": "Draft",
  "Archived": "Archived",
  "Pending": "Pending",
  "Processing": "Processing",
  "Shipped": "Shipped",
  "Delivered": "Delivered",
  "Cancelled": "Cancelled",
  "Paid": "Paid",
  "Failed": "Failed",
  "Refunded": "Refunded",
  "Unfulfilled": "Unfulfilled",
  "Partial": "Partial",
  "Fulfilled": "Fulfilled"
}
```

**Step 4: Run tests**

```bash
npm run test -- src/components/admin/components
```

**Step 5: Commit**

```bash
git add src/components/admin/components/AdminStatusBadge.tsx src/i18n/locales/en.json
git commit -m "feat(admin): add status label translations to AdminStatusBadge"
```

---

## Task 10: Unify CollectionTable Border Radius and Padding

**Files:**
- Modify: `src/components/admin/collections/components/CollectionTable.tsx`

**Step 1: Change border radius from rounded-3xl to rounded-2xl**

Find and replace:
- Line 44: `rounded-3xl` → `rounded-2xl`
- Line 175 (skeleton): `rounded-3xl` → `rounded-2xl`

**Step 2: Change padding from px-8 to px-6**

Find and replace all:
- `px-8 py-4` → `px-6 py-3` (headers)
- `px-8 py-5` → `px-6 py-4` (cells)

**Step 3: Run visual check**

```bash
npm run dev
```

Navigate to `/admin/collections` and verify table looks consistent with Products.

**Step 4: Run tests**

```bash
npm run test -- src/components/admin/collections/components/CollectionTable.test.tsx
```

**Step 5: Commit**

```bash
git add src/components/admin/collections/components/CollectionTable.tsx
git commit -m "fix(collections): unify table padding and border-radius with ProductTable"
```

---

## Task 11: Use shadcn Checkbox in ProductTable

**Files:**
- Modify: `src/components/admin/products/components/ProductTable.tsx`

**Step 1: Add Checkbox import**

```typescript
import { Checkbox } from '../../../ui/checkbox'
```

**Step 2: Replace header checkbox**

Replace the header checkbox (around line 45-53):

```typescript
// From:
<th className="w-12 px-4 py-3">
  <input
    type="checkbox"
    checked={isAllSelected}
    ref={(el) => {
      if (el) el.indeterminate = isSomeSelected && !isAllSelected
    }}
    onChange={onToggleSelectAll}
    className="w-4 h-4 rounded border-border accent-pink-500 cursor-pointer"
  />
</th>

// To:
<th className="w-12 px-4 py-3">
  <Checkbox
    checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
    onCheckedChange={onToggleSelectAll}
    aria-label={t('Select all products')}
  />
</th>
```

**Step 3: Replace row checkboxes**

Replace the row checkbox (around line 88-93):

```typescript
// From:
<td className="px-4 py-4">
  <input
    type="checkbox"
    checked={selectedIds.has(product.id)}
    onChange={() => onToggleSelect(product.id)}
    className="w-4 h-4 rounded border-border accent-pink-500 cursor-pointer"
  />
</td>

// To:
<td className="px-4 py-4">
  <Checkbox
    checked={selectedIds.has(product.id)}
    onCheckedChange={() => onToggleSelect(product.id)}
    aria-label={`Select ${product.name.en}`}
  />
</td>
```

**Step 4: Run tests**

```bash
npm run test -- src/components/admin/products/components/ProductTable.test.tsx
```

**Step 5: Commit**

```bash
git add src/components/admin/products/components/ProductTable.tsx
git commit -m "refactor(products): use shadcn Checkbox for accessibility"
```

---

## Task 12: Use shadcn Checkbox in CollectionTable

**Files:**
- Modify: `src/components/admin/collections/components/CollectionTable.tsx`

**Step 1: Add Checkbox import**

```typescript
import { Checkbox } from '../../../ui/checkbox'
```

**Step 2: Replace header checkbox**

```typescript
<th className="w-12 px-6 py-3">
  <Checkbox
    checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
    onCheckedChange={onToggleSelectAll}
    aria-label={t('Select all collections')}
  />
</th>
```

**Step 3: Replace row checkboxes**

```typescript
<td className="px-6 py-4">
  <Checkbox
    checked={selectedIds.has(collection.id)}
    onCheckedChange={() => onToggleSelect(collection.id)}
    aria-label={`Select ${collection.name.en}`}
  />
</td>
```

**Step 4: Run tests**

```bash
npm run test -- src/components/admin/collections/components/CollectionTable.test.tsx
```

**Step 5: Commit**

```bash
git add src/components/admin/collections/components/CollectionTable.tsx
git commit -m "refactor(collections): use shadcn Checkbox for accessibility"
```

---

## Task 13: Migrate ProductStats to AdminStatsGrid

**Files:**
- Modify: `src/components/admin/products/components/ProductStats.tsx`
- Modify: `src/routes/admin/_authed/products/index.tsx`

**Step 1: Rewrite ProductStats to use AdminStatsGrid**

Replace entire `ProductStats.tsx`:

```typescript
import { Package, Check, FileEdit, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AdminStatsGrid, type AdminStatsCardProps } from '../../components/AdminStatsCard'

export type ProductStatsData = {
  totalProducts: number
  activeProducts: number
  draftProducts: number
  archivedProducts: number
}

type ProductStatsProps = {
  stats: ProductStatsData
  isLoading?: boolean
}

export const ProductStats = ({ stats, isLoading = false }: ProductStatsProps) => {
  const { t } = useTranslation()

  const statsCards: AdminStatsCardProps[] = [
    {
      label: t('Total Products'),
      value: stats.totalProducts,
      icon: Package,
      color: 'pink',
    },
    {
      label: t('Active'),
      value: stats.activeProducts,
      icon: Check,
      color: 'emerald',
    },
    {
      label: t('Draft'),
      value: stats.draftProducts,
      icon: FileEdit,
      color: 'amber',
      hasAttention: stats.draftProducts > 0,
    },
    {
      label: t('Archived'),
      value: stats.archivedProducts,
      icon: Archive,
      color: 'violet',
    },
  ]

  return <AdminStatsGrid stats={statsCards} isLoading={isLoading} columns={4} />
}
```

**Step 2: Run tests**

```bash
npm run test -- src/components/admin/products/components/ProductStats.test.tsx
```

**Step 3: Commit**

```bash
git add src/components/admin/products/components/ProductStats.tsx
git commit -m "refactor(products): migrate ProductStats to AdminStatsGrid"
```

---

## Task 14: Migrate CollectionStats to AdminStatsGrid

**Files:**
- Modify: `src/components/admin/collections/components/CollectionStats.tsx`

**Step 1: Rewrite CollectionStats to use AdminStatsGrid**

Replace entire `CollectionStats.tsx`:

```typescript
import { FolderOpen, Check, FileEdit, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AdminStatsGrid, type AdminStatsCardProps } from '../../components/AdminStatsCard'

export type CollectionStatsData = {
  total: number
  active: number
  draft: number
  totalProducts: number
}

type CollectionStatsProps = {
  stats: CollectionStatsData
  isLoading?: boolean
}

export const CollectionStats = ({ stats, isLoading = false }: CollectionStatsProps) => {
  const { t } = useTranslation()

  const statsCards: AdminStatsCardProps[] = [
    {
      label: t('Total Collections'),
      value: stats.total,
      icon: FolderOpen,
      color: 'pink',
    },
    {
      label: t('Published'),
      value: stats.active,
      icon: Check,
      color: 'emerald',
    },
    {
      label: t('Draft'),
      value: stats.draft,
      icon: FileEdit,
      color: 'amber',
      hasAttention: stats.draft > 0,
    },
    {
      label: t('Products'),
      value: stats.totalProducts,
      icon: Package,
      color: 'violet',
    },
  ]

  return <AdminStatsGrid stats={statsCards} isLoading={isLoading} columns={4} />
}
```

**Step 2: Run tests**

```bash
npm run test -- src/components/admin/collections
```

**Step 3: Commit**

```bash
git add src/components/admin/collections/components/CollectionStats.tsx
git commit -m "refactor(collections): migrate CollectionStats to AdminStatsGrid"
```

---

## Task 15: Migrate ProductListActions to AdminRowActions

**Files:**
- Modify: `src/components/admin/products/components/ProductListActions.tsx`

**Step 1: Rewrite to use AdminRowActions**

Replace entire file:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  deleteProductFn,
  duplicateProductFn,
  updateProductStatusFn,
} from '../../../../server/products'
import { AdminRowActions } from '../../components/AdminRowActions'

interface ProductListActionsProps {
  productId: string
  productName: string
  handle: string
  status: 'draft' | 'active' | 'archived'
}

export const ProductListActions = ({
  productId,
  productName,
  handle,
  status,
}: ProductListActionsProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteProductFn({ data: { productId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Product deleted'))
    },
    onError: () => {
      toast.error(t('Failed to delete product'))
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateProductFn({ data: { productId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Product duplicated'))
    },
    onError: () => {
      toast.error(t('Failed to duplicate product'))
    },
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: 'draft' | 'active' | 'archived') =>
      updateProductStatusFn({ data: { productId, status: newStatus } }),
    onSuccess: (_, newStatus) => {
      handleSuccess()
      toast.success(
        newStatus === 'archived'
          ? t('Product archived')
          : t('Product activated'),
      )
    },
    onError: () => {
      toast.error(t('Failed to update product status'))
    },
  })

  return (
    <AdminRowActions
      editUrl={`/admin/products/${productId}`}
      storefrontUrl={`/en/products/${handle}`}
      onDuplicate={() => duplicateMutation.mutate()}
      isDuplicatePending={duplicateMutation.isPending}
      status={status}
      onStatusChange={(newStatus) => statusMutation.mutate(newStatus)}
      isStatusPending={statusMutation.isPending}
      itemName={productName}
      onDelete={() => deleteMutation.mutate()}
      deleteConfirmTitle={t('Delete Product')}
      deleteConfirmDescription={t(
        'This will permanently delete "{{name}}". This action cannot be undone.',
        { name: productName },
      )}
      isLoading={deleteMutation.isPending}
    />
  )
}
```

**Step 2: Run tests**

```bash
npm run test -- src/components/admin/products/components/ProductListActions.test.tsx
```

**Step 3: Commit**

```bash
git add src/components/admin/products/components/ProductListActions.tsx
git commit -m "refactor(products): migrate ProductListActions to AdminRowActions"
```

---

## Task 16: Migrate CollectionListActions to AdminRowActions

**Files:**
- Modify: `src/components/admin/collections/components/CollectionListActions.tsx`

**Step 1: Rewrite to use AdminRowActions**

Replace entire file:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  deleteCollectionFn,
  duplicateCollectionFn,
  publishCollectionFn,
  unpublishCollectionFn,
} from '../../../../server/collections'
import { AdminRowActions } from '../../components/AdminRowActions'

interface CollectionListActionsProps {
  collectionId: string
  handle: string
  name: string
  status: 'active' | 'draft' | 'archived'
}

export const CollectionListActions = ({
  collectionId,
  handle,
  name,
  status,
}: CollectionListActionsProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection deleted'))
    },
    onError: () => {
      toast.error(t('Failed to delete collection'))
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection duplicated'))
    },
    onError: () => {
      toast.error(t('Failed to duplicate collection'))
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => publishCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection published'))
    },
    onError: () => {
      toast.error(t('Failed to publish collection'))
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection unpublished'))
    },
    onError: () => {
      toast.error(t('Failed to unpublish collection'))
    },
  })

  const handleStatusChange = (newStatus: 'active' | 'draft' | 'archived') => {
    if (newStatus === 'active') {
      publishMutation.mutate()
    } else {
      unpublishMutation.mutate()
    }
  }

  return (
    <AdminRowActions
      editUrl={`/admin/collections/${collectionId}`}
      storefrontUrl={`/en/collections/${handle}`}
      onDuplicate={() => duplicateMutation.mutate()}
      isDuplicatePending={duplicateMutation.isPending}
      status={status}
      onStatusChange={handleStatusChange}
      isStatusPending={publishMutation.isPending || unpublishMutation.isPending}
      itemName={name}
      onDelete={() => deleteMutation.mutate()}
      deleteConfirmTitle={t('Delete Collection')}
      deleteConfirmDescription={t(
        'This will permanently delete "{{name}}". This action cannot be undone.',
        { name },
      )}
      isLoading={deleteMutation.isPending}
    />
  )
}
```

**Step 2: Run tests**

```bash
npm run test -- src/components/admin/collections
```

**Step 3: Commit**

```bash
git add src/components/admin/collections/components/CollectionListActions.tsx
git commit -m "refactor(collections): migrate CollectionListActions to AdminRowActions"
```

---

## Task 17: Delete DataListDropdown (No Longer Used)

**Files:**
- Delete: `src/components/admin/components/DataListDropdown.tsx`
- Delete: `src/components/admin/components/DataListDropdown.test.tsx` (if exists)

**Step 1: Verify no imports remain**

```bash
grep -r "DataListDropdown" src/
```

Expected: No results (or only the file itself)

**Step 2: Delete the file**

```bash
rm src/components/admin/components/DataListDropdown.tsx
rm -f src/components/admin/components/DataListDropdown.test.tsx
```

**Step 3: Run full test suite**

```bash
npm run test
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(admin): remove deprecated DataListDropdown component"
```

---

## Task 18: Create AdminEmptyState Component

**Files:**
- Create: `src/components/admin/components/AdminEmptyState.tsx`

**Step 1: Create the component**

```typescript
import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../ui/button'

export type AdminEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export const AdminEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: AdminEmptyStateProps) => {
  const { t } = useTranslation()

  return (
    <div className="text-center py-20 bg-card border border-border/50 rounded-2xl shadow-sm">
      <div className="w-14 h-14 bg-pink-500/5 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-pink-500/40" />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-muted-foreground text-xs mb-5 max-w-xs mx-auto">
        {description}
      </p>
      {action && (
        <Link to={action.href}>
          <Button variant="outline" className="rounded-xl h-9 px-5 font-semibold">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/components/AdminEmptyState.tsx
git commit -m "feat(admin): add AdminEmptyState shared component"
```

---

## Task 19: Create AdminNoResults Component

**Files:**
- Create: `src/components/admin/components/AdminNoResults.tsx`

**Step 1: Create the component**

```typescript
import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../ui/button'

export type AdminNoResultsProps = {
  onClear: () => void
}

export const AdminNoResults = ({ onClear }: AdminNoResultsProps) => {
  const { t } = useTranslation()

  return (
    <div className="text-center py-16 bg-card border border-border/50 rounded-2xl shadow-sm">
      <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center mx-auto mb-3">
        <SearchX className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold mb-1">{t('No results found')}</p>
      <p className="text-muted-foreground text-xs mb-4">
        {t('Try adjusting your search or filters.')}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className="rounded-xl font-semibold"
      >
        {t('Clear filters')}
      </Button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/components/AdminNoResults.tsx
git commit -m "feat(admin): add AdminNoResults shared component"
```

---

## Task 20: Use AdminEmptyState and AdminNoResults in Products Page

**Files:**
- Modify: `src/routes/admin/_authed/products/index.tsx`

**Step 1: Add imports**

```typescript
import { AdminEmptyState } from '../../../../components/admin/components/AdminEmptyState'
import { AdminNoResults } from '../../../../components/admin/components/AdminNoResults'
```

**Step 2: Replace inline EmptyState usage**

Replace the JSX:
```typescript
// From:
{isEmptyCatalog ? (
  <EmptyState />
) : isNoFilterResults ? (
  <NoResults onClear={handleClearFilters} />
) : ...}

// To:
{isEmptyCatalog ? (
  <AdminEmptyState
    icon={Package}
    title={t('No products yet')}
    description={t('Start building your catalog by adding your first product.')}
    action={{
      label: t('Add Product'),
      href: '/admin/products/new',
    }}
  />
) : isNoFilterResults ? (
  <AdminNoResults onClear={handleClearFilters} />
) : ...}
```

**Step 3: Remove the inline EmptyState and NoResults components at the bottom of the file**

Delete the `EmptyState` and `NoResults` function components.

**Step 4: Run tests**

```bash
npm run test -- src/routes/admin/_authed/products
```

**Step 5: Commit**

```bash
git add src/routes/admin/_authed/products/index.tsx
git commit -m "refactor(products): use AdminEmptyState and AdminNoResults"
```

---

## Task 21: Use AdminEmptyState and AdminNoResults in Collections Page

**Files:**
- Modify: `src/routes/admin/_authed/collections/index.tsx`

**Step 1: Add imports**

```typescript
import { AdminEmptyState } from '../../../../components/admin/components/AdminEmptyState'
import { AdminNoResults } from '../../../../components/admin/components/AdminNoResults'
```

**Step 2: Replace inline EmptyState and NoResults**

Follow same pattern as Task 20 with Collections-specific content.

**Step 3: Remove inline component definitions**

**Step 4: Run tests**

```bash
npm run test -- src/routes/admin/_authed/collections
```

**Step 5: Commit**

```bash
git add src/routes/admin/_authed/collections/index.tsx
git commit -m "refactor(collections): use AdminEmptyState and AdminNoResults"
```

---

## Task 22: Run Full Test Suite and Fix Any Issues

**Step 1: Run all tests**

```bash
npm run test
```

**Step 2: Fix any failing tests**

Address each failing test one by one.

**Step 3: Run type check**

```bash
npm run typecheck
```

**Step 4: Run linter**

```bash
npm run lint
```

**Step 5: Fix any lint errors**

```bash
npm run check
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: fix tests and lint after admin UI consistency phase 2"
```

---

## Task 23: Final Visual Verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Verify each admin page**

- [ ] `/admin/products` - Check stats, table, pagination, empty state
- [ ] `/admin/collections` - Check stats, table, pagination, empty state
- [ ] `/admin/orders` - Check stats, table, pagination, row actions
- [ ] Create/edit product - Verify row actions work
- [ ] Create/edit collection - Verify row actions work

**Step 3: Verify dark mode**

Toggle dark mode and verify all components display correctly.

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: visual polish after admin UI consistency phase 2"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1-6 | Create and use shared `formatDate` | 6 files |
| 7-8 | Use `formatCurrency` in Products | 2 files |
| 9 | Add status label translations | 2 files |
| 10 | Unify CollectionTable styling | 1 file |
| 11-12 | Use shadcn Checkbox in tables | 2 files |
| 13-14 | Migrate stats to AdminStatsGrid | 2 files |
| 15-16 | Migrate row actions to AdminRowActions | 2 files |
| 17 | Delete deprecated DataListDropdown | 1-2 files |
| 18-21 | Create and use AdminEmptyState/AdminNoResults | 4 files |
| 22-23 | Testing and verification | 0 files |

**Total: ~20 files modified, 4 new components, 1-2 deleted**
