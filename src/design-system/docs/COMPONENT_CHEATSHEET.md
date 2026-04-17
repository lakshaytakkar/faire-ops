# Component Cheatsheet — Faire Wholesale Admin Portal

> Quick reference for all shared components, their import paths, key props, and usage guidance.
> Components live in `src/components/shared/` unless noted otherwise.

---

## StatusBadge

**Import:** `@/components/shared/StatusBadge`

| Prop | Type | Required | Description |
|---|---|---|---|
| `status` | `string` | Yes | Display text (e.g., "Active", "Pending") |
| `tone` | `'emerald' \| 'amber' \| 'red' \| 'blue' \| 'violet' \| 'slate'` | Yes | Color tone mapping |

**When to use:** Any status indicator -- order status, payment status, user presence, fulfillment state.

**Design system class equivalent:** `.ds-badge` + `.ds-badge-{tone}`

**Tone guide:**
- `emerald` -- Active, Paid, Delivered, Online, Complete
- `amber` -- Pending, Processing, Away, Awaiting
- `red` -- Failed, Cancelled, Overdue, Busy, Rejected
- `blue` -- Info, New, In Review, Submitted
- `violet` -- Premium, Featured, Special, VIP
- `slate` -- Draft, Inactive, Offline, Archived, Paused

---

## MetricCard

**Import:** `@/components/shared/MetricCard`

| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | Yes | Metric label (eyebrow text) |
| `value` | `string \| number` | Yes | Display value |
| `icon` | `LucideIcon` | No | Optional icon |
| `trend` | `{ value: number; direction: 'up' \| 'down' }` | No | Trend indicator |

**When to use:** KPI displays in dashboard headers, detail page summaries.

**Layout:** Place inside a `.ds-grid-metrics` (2-col mobile, 4-col desktop).

---

## DataTable

**Import:** `@/components/shared/DataTable`

| Prop | Type | Required | Description |
|---|---|---|---|
| `columns` | `ColumnDef[]` | Yes | TanStack Table column definitions |
| `data` | `T[]` | Yes | Row data array |
| `searchKey` | `string` | No | Column key for search filter |
| `pageSize` | `number` | No | Rows per page (default: 20) |

**When to use:** Any tabular data display -- orders, products, users, transactions.

**Design system class equivalent:** `.ds-table`

---

## PageHeader

**Import:** `@/components/shared/PageHeader`

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Page title |
| `description` | `string` | No | Subtitle / description |
| `actions` | `ReactNode` | No | Right-aligned action buttons |
| `breadcrumbs` | `{ label: string; href?: string }[]` | No | Breadcrumb trail |

**When to use:** Top of every page. Provides consistent title + action bar.

---

## Card / CardHeader / CardContent

**Import:** `@/components/ui/card`

| Component | Key Props | Description |
|---|---|---|
| `Card` | `className` | Wrapper with border, radius, shadow |
| `CardHeader` | `className` | Header area with padding |
| `CardTitle` | `className` | Title text styling |
| `CardDescription` | `className` | Subtitle text styling |
| `CardContent` | `className` | Body content area |

**When to use:** Content grouping. Prefer over raw divs for any boxed content section.

**Design system class equivalent:** `.ds-card`, `.ds-card-elevated`, `.ds-card-compact`

---

## Button

**Import:** `@/components/ui/button`

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'default' \| 'secondary' \| 'ghost' \| 'destructive' \| 'outline' \| 'link'` | `'default'` | Visual style |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Size preset |
| `asChild` | `boolean` | `false` | Render as child element (e.g., Link) |

**When to use:** All clickable actions. Never use raw `<button>` elements.

**Design system class equivalents:**
- `variant="default"` -> `.ds-btn-primary`
- `variant="secondary"` -> `.ds-btn-secondary`
- `variant="ghost"` -> `.ds-btn-ghost`
- `variant="destructive"` -> `.ds-btn-destructive`

---

## Input

**Import:** `@/components/ui/input`

| Prop | Type | Description |
|---|---|---|
| `type` | `string` | Input type (text, email, number, etc.) |
| `placeholder` | `string` | Placeholder text |

**When to use:** All text inputs. Wraps native `<input>` with design system styling.

**Design system class equivalent:** `.ds-input`

---

## Select / SelectTrigger / SelectContent / SelectItem

**Import:** `@/components/ui/select`

**When to use:** Dropdown selection. Prefer over native `<select>` for visual consistency.

---

## Dialog / DialogTrigger / DialogContent

**Import:** `@/components/ui/dialog`

**When to use:** Modal confirmations, forms, detail views. Uses `--shadow-xl` elevation.

---

## Tabs / TabsList / TabsTrigger / TabsContent

**Import:** `@/components/ui/tabs`

**When to use:** In-page navigation between related content sections.

---

## Navigation Components

### TopNav (App Bar)

**Import:** `@/components/shared/TopNav`

- Black bar, 48px height
- Logo + space navigation + user menu
- Design system class: `.ds-nav-bar`

### SubNav (Section Tabs)

**Import:** `@/components/shared/SubNav`

| Prop | Type | Description |
|---|---|---|
| `items` | `{ label: string; href: string; active?: boolean }[]` | Navigation items |

- Design system class: `.ds-sub-nav`

---

## Sidebar

**Import:** `@/components/shared/AppSidebar`

- Collapsible dock layout
- Uses `--sidebar-*` tokens
- Contains space-scoped navigation links

---

## Layout Shells

### DashboardShell

**Import:** `@/components/shared/DashboardShell`

- `max-w-[1440px]` container
- Flex column with `gap-5`
- Design system class: `.ds-page`

---

## Icon Usage

**Library:** `lucide-react`

Import individual icons:
```tsx
import { Package, DollarSign, Users, TrendingUp } from 'lucide-react';
```

Standard size in the portal: `size={16}` for inline, `size={20}` for card icons.

---

## Patterns Summary

| Pattern | Component(s) | Layout Class |
|---|---|---|
| Dashboard page | `PageHeader` + `MetricCard` grid + `DataTable` | `.ds-page` + `.ds-grid-metrics` |
| Detail page | `PageHeader` + info cards + activity feed | `.ds-page` + `.ds-grid-detail` |
| List page | `PageHeader` + filters + `DataTable` | `.ds-page` |
| Settings page | `PageHeader` + `Tabs` + form sections | `.ds-page` |
| Modal form | `Dialog` + form inputs + action buttons | -- |
