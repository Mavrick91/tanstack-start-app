# Admin UI Consistency Audit & Design

**Date:** 2026-01-02
**Status:** Draft
**Scope:** Visual and component inconsistencies in admin dashboard

## Executive Summary

This document catalogs UI inconsistencies across the admin dashboard (Products, Orders, Collections) and proposes shared components to unify the experience. The audit identified 12 major inconsistency categories, with 3 different implementations of status badges, tables, and stats cards being the highest priority fixes.

---

## Current State Analysis

### 1. Status Badges — 3 Different Implementations

| Aspect | ProductStatusBadge | OrderStatusBadge | CollectionStatusBadge |
|--------|-------------------|------------------|----------------------|
| **Location** | `products/components/StatusBadge.tsx` | `orders/OrderStatusBadge.tsx` | Inline in `CollectionTable.tsx` |
| **Element** | `<div>` | `<span>` | `<div>` |
| **Dot indicator** | ✅ `w-1.5 h-1.5` | ❌ None | ✅ `w-1 h-1` (smaller) |
| **Font size** | `text-[10px]` | `text-xs` | `text-[9px]` |
| **Font weight** | `font-bold` | `font-medium` | `font-bold` |
| **Padding** | `px-2.5 py-1` | `px-2 py-0.5` | `px-2.5 py-1` |
| **Dark mode** | ✅ Full support | ✅ Full support | ❌ None |
| **Color opacity (light)** | `bg-*-100` | `bg-*-100` | `bg-*-500/5` |
| **Color opacity (dark)** | `dark:bg-*-500/10` | `dark:bg-*-500/20` | N/A |

**Impact:** Users see visually different badges for the same status concept across pages.

---

### 2. Tables — 3 Different Implementations

| Aspect | ProductTable | OrdersTable | CollectionTable |
|--------|-------------|-------------|-----------------|
| **Location** | `products/components/ProductTable.tsx` | `orders/OrdersTable.tsx` | `collections/components/CollectionTable.tsx` |
| **Component** | Raw `<table>` | shadcn `<Table>` | Raw `<table>` |
| **Border radius** | `rounded-2xl` | `rounded-2xl` | `rounded-3xl` |
| **Checkbox** | Native `<input>` | shadcn `<Checkbox>` | Native `<input>` |
| **Header padding** | `px-6 py-3` | Default (TableHead) | `px-8 py-4` |
| **Row padding** | `px-6 py-4` | Default (TableCell) | `px-8 py-5` |
| **Header style** | `text-[10px] font-bold uppercase tracking-widest` | `font-semibold` (normal case) | `text-[10px] font-bold uppercase tracking-widest` |
| **Sortable** | ✅ Yes | ❌ No | ✅ Yes |
| **i18n** | ✅ Uses `t()` | ❌ Hardcoded English | ✅ Uses `t()` |

**Impact:** Inconsistent table density, header styling, and missing sorting on Orders page.

---

### 3. Stats Cards — 3 Different Implementations

| Aspect | ProductStats | CollectionStats | OrderStatsCards |
|--------|-------------|-----------------|-----------------|
| **Location** | `products/components/ProductStats.tsx` | `collections/components/CollectionStats.tsx` | `orders/OrderStatsCards.tsx` |
| **Card radius** | `rounded-2xl` | `rounded-2xl` | `rounded-xl` |
| **Card padding** | `p-5` | `p-5` | `p-4` |
| **Icon container** | `p-3 rounded-xl` | `p-3 rounded-xl` | `w-10 h-10 rounded-lg` |
| **Value font** | `text-2xl font-bold tracking-tight` | `text-2xl font-bold tracking-tight` | `text-2xl font-bold` |
| **Label font** | `text-xs font-medium` | `text-xs font-medium` | `text-xs` |
| **Hover effect** | ✅ `hover:shadow-md` | ✅ `hover:shadow-md` | ❌ None |
| **Loading skeleton** | ❌ None | ✅ Built-in | ✅ Built-in |
| **i18n** | ✅ Yes | ✅ Yes | ❌ Hardcoded English |

**Impact:** Visual density mismatch between pages; Orders stats look different.

---

### 4. Pagination — Inconsistent Implementation

| Aspect | Products | Collections | Orders |
|--------|----------|-------------|--------|
| **Component** | `<Pagination>` shared | `<Pagination>` shared | Inline custom |
| **Button style** | Icon buttons + page numbers | Icon buttons + page numbers | Text buttons ("Previous"/"Next") |
| **Info text** | "Showing X–Y of Z" | "Showing X–Y of Z" | "Showing X to Y of Z orders" |
| **Page indicator** | Page number buttons | Page number buttons | "Page X of Y" text |
| **i18n** | ✅ Single key | ✅ Single key | ❌ Fragmented keys |

**Impact:** Different pagination UX on Orders page.

---

### 5. Row Actions — Different Patterns

| Aspect | Products | Collections | Orders |
|--------|----------|-------------|--------|
| **Uses DataListDropdown** | ✅ Yes | ✅ Yes | ❌ Custom |
| **i18n** | ✅ Yes | ✅ Yes | ❌ Hardcoded |
| **Delete confirmation** | ✅ AlertDialog | ✅ AlertDialog | ❌ None |
| **Actions** | Edit, View, Duplicate, Archive, Delete | Edit, View, Duplicate, Publish/Unpublish, Delete | View, Status changes, Cancel |

**Impact:** Orders row actions have no delete confirmation and are not translated.

---

### 6. Bulk Actions Terminology

| Products | Collections |
|----------|-------------|
| Activate | Publish |
| Archive | Unpublish |
| Delete | Delete |

**Impact:** Confusing terminology—are "Activate" and "Publish" the same concept?

---

### 7. SortableHeader — Duplicated Code

The `SortableHeader` component is implemented twice with near-identical code:
- `ProductTable.tsx` lines 154-189
- `CollectionTable.tsx` lines 217-252

Only difference: prop name `currentKey` vs `currentSort`.

---

### 8. Page Headers — Inconsistent Typography

| Aspect | Products | Collections | Orders |
|--------|----------|-------------|--------|
| **Title size** | `text-2xl` | `text-3xl` | `text-2xl` |
| **Description** | `text-sm` | `font-medium text-sm` | `text-sm` |
| **Gap** | `gap-4` | `gap-6` | `gap-4` |
| **Add button height** | `h-10` | `h-11` | N/A |

---

### 9. Search Input — Inconsistent Styling

| Aspect | Products | Collections | Orders |
|--------|----------|-------------|--------|
| **Height** | `h-10` | `h-11` | `h-10` |
| **Icon position** | `left-3.5` | `left-4` | `left-3.5` |
| **Focus ring opacity** | `pink-500/20` | `pink-500/10` | `pink-500/20` |
| **Additional styles** | — | `font-medium shadow-sm` | — |
| **Width** | `flex-1` | `flex-1` | `max-w-md` |
| **Submit behavior** | onChange | onChange | onSubmit (form) |

---

### 10. Error State Container

| Page | Border Radius |
|------|---------------|
| Products | `rounded-2xl` |
| Collections | `rounded-3xl` |

---

### 11. Filter Toggle Buttons

Duplicated in all 3 list pages with identical styling. Should be extracted to shared component.

---

### 12. i18n Gaps

Components with hardcoded English:
- `OrdersTable.tsx` — All table headers
- `OrderRowActions.tsx` — All action labels
- `OrderStatsCards.tsx` — All stat labels
- Orders pagination — Fragmented translation approach

---

## Proposed Shared Components

### Priority 1: High Impact

#### `<AdminStatusBadge>`

**Location:** `src/components/admin/components/AdminStatusBadge.tsx`

**Replaces:** ProductStatusBadge, OrderStatusBadge, CollectionTable inline StatusBadge

**Props:**
```typescript
type AdminStatusBadgeProps = {
  status: string
  variant?: 'product' | 'order' | 'payment' | 'fulfillment' | 'collection'
  showDot?: boolean // default: true
}
```

**Unified Styling:**
- Element: `<span>`
- Dot: `w-1.5 h-1.5 rounded-full`
- Font: `text-[10px] font-bold uppercase tracking-wider`
- Padding: `px-2.5 py-1`
- Border radius: `rounded-full`
- Full dark mode support

---

#### `<AdminStatsCard>`

**Location:** `src/components/admin/components/AdminStatsCard.tsx`

**Replaces:** ProductStats, CollectionStats, OrderStatsCards

**Props:**
```typescript
type AdminStatsCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  color: 'pink' | 'emerald' | 'amber' | 'rose' | 'violet' | 'blue' | 'yellow' | 'green'
  isLoading?: boolean
  hasAttention?: boolean // Highlights card when value > 0
}

type AdminStatsGridProps = {
  stats: AdminStatsCardProps[]
  isLoading?: boolean
}
```

**Unified Styling:**
- Card: `rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md`
- Icon container: `p-3 rounded-xl`
- Value: `text-2xl font-bold tracking-tight`
- Label: `text-xs font-medium text-muted-foreground`
- Built-in loading skeleton

---

#### `<SortableHeader>`

**Location:** `src/components/admin/components/SortableHeader.tsx`

**Replaces:** Duplicated implementations in ProductTable and CollectionTable

**Props:**
```typescript
type SortableHeaderProps<T extends string> = {
  label: string
  sortKey: T
  currentSortKey: T
  sortOrder: 'asc' | 'desc'
  onSort: (key: T) => void
}
```

---

#### `<StatusFilterTabs>`

**Location:** `src/components/admin/components/StatusFilterTabs.tsx`

**Replaces:** Inline filter implementations in all 3 list pages

**Props:**
```typescript
type StatusFilterTabsProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}
```

---

### Priority 2: Medium Impact

#### `<AdminSearchInput>`

**Location:** `src/components/admin/components/AdminSearchInput.tsx`

**Props:**
```typescript
type AdminSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  submitOnChange?: boolean // default: true
  onSubmit?: () => void
}
```

**Unified Styling:**
- Height: `h-10`
- Icon position: `left-3.5`
- Padding: `pl-10 pr-10`
- Focus: `focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50`
- Border radius: `rounded-xl`

---

#### `<AdminPageHeader>`

**Location:** `src/components/admin/components/AdminPageHeader.tsx`

**Props:**
```typescript
type AdminPageHeaderProps = {
  title: string
  description?: string
  action?: {
    label: string
    href: string
    icon?: LucideIcon
  }
}
```

**Unified Styling:**
- Title: `text-2xl font-bold tracking-tight`
- Description: `text-muted-foreground text-sm`
- Button: `h-10 px-5 rounded-xl`

---

#### `<AdminPagination>`

**Location:** `src/components/admin/components/AdminPagination.tsx`

**Move existing:** `products/components/Pagination.tsx` → shared location

**Ensure:**
- Consistent page number buttons
- Single i18n key pattern
- Used by all list pages

---

#### `<AdminBulkActionsBar>`

**Location:** `src/components/admin/components/AdminBulkActionsBar.tsx`

**Replaces:** Products and Collections BulkActionsBar

**Props:**
```typescript
type BulkAction = {
  key: string
  label: string
  icon: LucideIcon
  variant?: 'default' | 'destructive'
}

type AdminBulkActionsBarProps = {
  selectedCount: number
  actions: BulkAction[]
  onAction: (actionKey: string) => void
  onClear: () => void
  isPending?: boolean
}
```

**Decision needed:** Standardize terminology
- Option A: Use "Activate/Archive" everywhere
- Option B: Use "Publish/Unpublish" everywhere
- **Recommendation:** "Activate/Archive" (more generic, applies to products and collections)

---

### Priority 3: Consolidation

#### `<AdminDataTable>`

**Location:** `src/components/admin/components/AdminDataTable.tsx`

**Decision needed:** Use shadcn `<Table>` or raw `<table>`?

**Recommendation:** Use shadcn `<Table>` for:
- Accessibility built-in
- Consistent styling via Tailwind config
- Semantic HTML

**Unified Styling:**
- Container: `rounded-2xl border border-border/50 shadow-sm`
- Use shadcn `<Checkbox>` for selection
- Header: `text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70`
- Row padding: `px-6 py-4`
- Selected row: `bg-pink-500/5`
- Hover: `hover:bg-muted/50`

---

#### `<AdminRowActions>`

Extend `DataListDropdown` to support Orders-style status changes.

**Additional Props:**
```typescript
type AdminRowActionsProps = {
  // Existing DataListDropdown props...
  statusActions?: {
    label: string
    icon: LucideIcon
    onClick: () => void
  }[]
}
```

---

## Implementation Checklist

### Phase 1: Foundation (High Impact)
- [ ] Create `AdminStatusBadge` component
- [ ] Create `AdminStatsCard` and `AdminStatsGrid` components
- [ ] Extract `SortableHeader` to shared location
- [ ] Create `StatusFilterTabs` component
- [ ] Add missing i18n keys to Orders components

### Phase 2: Inputs & Navigation (Medium Impact)
- [ ] Create `AdminSearchInput` component
- [ ] Create `AdminPageHeader` component
- [ ] Move `Pagination` to shared location
- [ ] Unify `BulkActionsBar` components
- [ ] Standardize terminology (Activate/Archive)

### Phase 3: Tables & Actions (Consolidation)
- [ ] Decide on table implementation (shadcn vs raw)
- [ ] Create or refactor to `AdminDataTable`
- [ ] Extend `DataListDropdown` for Orders
- [ ] Add sorting to OrdersTable
- [ ] Add delete confirmation to Orders row actions

### Phase 4: Cleanup
- [ ] Remove deprecated badge components
- [ ] Remove deprecated stats components
- [ ] Remove inline StatusBadge from CollectionTable
- [ ] Remove duplicated SortableHeader implementations
- [ ] Update all imports

---

## File Structure After Refactor

```
src/components/admin/
├── components/                    # Shared admin components
│   ├── AdminStatusBadge.tsx      # Unified status badge
│   ├── AdminStatsCard.tsx        # Unified stats card
│   ├── AdminDataTable.tsx        # Unified table (optional)
│   ├── AdminSearchInput.tsx      # Unified search input
│   ├── AdminPageHeader.tsx       # Unified page header
│   ├── AdminPagination.tsx       # Moved from products/
│   ├── AdminBulkActionsBar.tsx   # Unified bulk actions
│   ├── AdminRowActions.tsx       # Extended DataListDropdown
│   ├── SortableHeader.tsx        # Extracted from tables
│   ├── StatusFilterTabs.tsx      # Extracted from list pages
│   └── DataListDropdown.tsx      # Existing (keep)
├── products/
│   ├── ProductForm.tsx
│   ├── ProductsList.tsx
│   ├── ImageUploader.tsx
│   └── components/
│       ├── ProductTable.tsx      # Uses shared components
│       ├── ProductListActions.tsx
│       ├── ProductVariantsTable.tsx
│       ├── ProductOptions.tsx
│       └── LocalizedFieldTabs.tsx
├── orders/
│   ├── OrdersTable.tsx           # Uses shared components
│   ├── OrderRowActions.tsx       # Uses AdminRowActions
│   ├── OrderDetail.tsx
│   ├── OrderHistory.tsx
│   ├── OrderCancellationDialog.tsx
│   └── OrderBulkActionsBar.tsx   # Uses AdminBulkActionsBar
├── collections/
│   ├── CollectionForm.tsx
│   └── components/
│       ├── CollectionTable.tsx   # Uses shared components
│       ├── CollectionListActions.tsx
│       ├── ProductPickerDialog.tsx
│       └── ProductsCard.tsx
└── media/
    └── MediaLibrary.tsx
```

---

## Summary

| Category | Issues Found | Priority |
|----------|-------------|----------|
| Status Badges | 3 implementations | High |
| Tables | 3 implementations | High |
| Stats Cards | 3 implementations | Medium |
| Pagination | 2 implementations | Medium |
| Row Actions | 2 patterns | Medium |
| Page Headers | 3 variations | Low |
| Search Inputs | 3 variations | Low |
| Filter Toggles | 3 duplications | Low |
| i18n Gaps | ~4 components | Medium |
| Dark Mode Gaps | 1 component | Medium |
| Terminology | Activate vs Publish | Low |

**Estimated effort:** 2-3 days for Phase 1-2, additional 1-2 days for Phase 3-4.
