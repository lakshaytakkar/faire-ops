# USDrop AI — Layout Patterns

Structural page patterns extracted from the USDrop v3 admin portal.

## App Shell

The USDrop app uses a sidebar-based shell (unlike Faire's dock-based shell):

```
┌──────────────────────────────────────────────────┐
│ Sidebar (18.08rem)  │  Main Content               │
│                     │  ┌─────────────────────────┐ │
│ [Logo]              │  │ Topbar (h-12)           │ │
│                     │  ├─────────────────────────┤ │
│ ── Main ──          │  │                         │ │
│ Dashboard  *active* │  │  Content (p-2,          │ │
│ Products            │  │  bg-gray-50/50)         │ │
│ Orders              │  │                         │ │
│ Customers           │  │  ┌───────────────────┐  │ │
│                     │  │  │ Page Header       │  │ │
│ ── Tools ──         │  │  ├───────────────────┤  │ │
│ AI Studio           │  │  │ Metric Grid (3c)  │  │ │
│ Research            │  │  ├───────────────────┤  │ │
│                     │  │  │ Tabs              │  │ │
│ ── Account ──       │  │  ├───────────────────┤  │ │
│ Settings            │  │  │ Data Table        │  │ │
│ Help                │  │  └───────────────────┘  │ │
│                     │  │                         │ │
│ [Footer]            │  └─────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**CSS classes:** `ds-usdrop-shell` > `ds-usdrop-shell-sidebar` + `ds-usdrop-shell-main` > `ds-usdrop-topbar` + `ds-usdrop-shell-content`

## Admin Page Skeleton

Every admin page follows this structure:

1. **Page Header** — title (text-xl font-semibold) + subtitle (text-sm text-muted-foreground)
2. **Metric Grid** — 3 columns on sm+, each a `ds-usdrop-metric-card`
3. **Tabs** — filter tabs with optional badge counts
4. **Data Section** — toolbar (search + filters) + table + pagination

```
ds-usdrop-page-header
  ds-usdrop-page-title     "Categories"
  ds-usdrop-page-subtitle  "Organize products..."

ds-usdrop-metric-grid (sm:grid-cols-3)
  ds-usdrop-metric-card × 3
    .metric-header > .metric-label + .metric-icon
    .metric-value
    .metric-subtitle

ds-usdrop-tabs
  ds-usdrop-tab × N

ds-usdrop-data-section
  ds-usdrop-table-toolbar
    .search-section > ds-usdrop-input
    ds-usdrop-btn (filters/export)
  ds-usdrop-table
    thead > th (text-xs font-medium text-muted bg-muted)
    tbody > tr (hover:bg-muted)
  ds-usdrop-table-pagination
```

## Metric Card Variants

### Standard Metric (Admin Dashboard)
- Icon box: 9×9px rounded-lg border, icon 18×18px in primary color
- Value: text-2xl font-semibold
- Shadow: `0px 1px 2px rgba(13,13,18,0.06)` (NOT the standard shadow scale)

### Profile Summary (Home Page)
- Gradient background: `linear-gradient(to right, primary, secondary-foreground)`
- Avatar circle: 56px, `bg-white/20`, bold initials
- White text throughout

## Sidebar Specifics

| Property | Value |
|---|---|
| Width (expanded) | 18.08rem (289px) |
| Width (collapsed) | 3rem (48px) |
| Width (mobile) | 18rem |
| Toggle shortcut | Ctrl/Cmd + B |
| Group label | 11px font-semibold uppercase tracking-[0.08em] |
| Item height | auto (padding 6px 8px) |
| Item icon | 16×16px (h-4 w-4) |
| Item text | 14px font-medium |
| Active state | bg-primary text-white |
| Locked state | opacity-60 |

## Key Differences from Faire

1. **No max-width container** — content stretches full width
2. **Tighter padding** — p-2 (8px) vs Faire's p-5 (20px)
3. **Metric grid is 3-col** — not 4-col like Faire
4. **Sidebar nav** — not top nav bar
5. **Tabs in content** — not in a SubNav component
6. **Data table toolbar** — built-in search + filters + actions
