# Token Reference — Faire Wholesale Admin Portal Design System

> Canonical source: `src/app/globals.css`
> Design system mirror: `src/design-system/tokens/variables.css`

---

## Core Color Tokens

| Token | HSL Value | Role |
|---|---|---|
| `--background` | `hsl(0 0% 100%)` | Page background |
| `--foreground` | `hsl(225 47% 15%)` | Primary text color |
| `--card` | `hsl(0 0% 100%)` | Card surface |
| `--card-foreground` | `hsl(225 47% 15%)` | Card text |
| `--popover` | `hsl(0 0% 100%)` | Popover surface |
| `--popover-foreground` | `hsl(225 47% 15%)` | Popover text |
| `--primary` | `hsl(223 83% 53%)` | Brand blue, CTAs |
| `--primary-foreground` | `hsl(0 0% 100%)` | Text on primary |
| `--secondary` | `hsl(226 42% 96%)` | Secondary surfaces |
| `--secondary-foreground` | `hsl(225 47% 15%)` | Text on secondary |
| `--muted` | `hsl(226 30% 95%)` | Muted backgrounds, hover states |
| `--muted-foreground` | `hsl(224 15% 42%)` | De-emphasized text |
| `--accent` | `hsl(226 42% 98%)` | Subtle accent background |
| `--accent-foreground` | `hsl(225 47% 25%)` | Accent text |
| `--destructive` | `hsl(0 85% 45%)` | Danger / delete actions |
| `--destructive-foreground` | `hsl(0 0% 100%)` | Text on destructive |
| `--border` | `hsl(226 30% 85%)` | Default border |
| `--input` | `hsl(226 30% 85%)` | Input border |
| `--ring` | `hsl(223 83% 53%)` | Focus ring |

## Semantic Status Tokens

| Token | HSL Value | Use |
|---|---|---|
| `--success` | `hsl(142 71% 45%)` | Positive outcomes, active status |
| `--success-foreground` | `hsl(0 0% 100%)` | Text on success |
| `--warning` | `hsl(38 92% 50%)` | Caution states |
| `--warning-foreground` | `hsl(0 0% 100%)` | Text on warning |
| `--info` | `hsl(199 89% 48%)` | Informational callouts |
| `--info-foreground` | `hsl(0 0% 100%)` | Text on info |

## Sidebar Tokens

| Token | HSL Value |
|---|---|
| `--sidebar` | `hsl(225 33% 98%)` |
| `--sidebar-foreground` | `hsl(225 47% 15%)` |
| `--sidebar-primary` | `hsl(223 83% 53%)` |
| `--sidebar-primary-foreground` | `hsl(0 0% 100%)` |
| `--sidebar-accent` | `hsl(226 42% 96%)` |
| `--sidebar-accent-foreground` | `hsl(225 47% 25%)` |
| `--sidebar-border` | `hsl(226 42% 92%)` |
| `--sidebar-ring` | `hsl(223 83% 53%)` |

## Chart Palette

| Token | HSL Value | Sequence |
|---|---|---|
| `--chart-1` | `hsl(223 83% 53%)` | Primary series |
| `--chart-2` | `hsl(215 80% 48%)` | Second series |
| `--chart-3` | `hsl(230 75% 45%)` | Third series |
| `--chart-4` | `hsl(223 90% 94%)` | Background fill |
| `--chart-5` | `hsl(225 15% 40%)` | Muted series |

---

## Typography Scale

| Class | Size | Weight | Extra | Use |
|---|---|---|---|---|
| `.ds-h1` | 1.5rem (24px) | 700 | line-height: 1.2 | Page titles |
| `.ds-h2` | 0.9375rem (15px) | 600 | letter-spacing: -0.01em | Card headers |
| `.ds-h3` | 0.875rem (14px) | 600 | line-height: 1.4 | Sub-headings |
| `.ds-eyebrow` | 0.75rem (12px) | 600 | uppercase, tracking 0.05em | Category labels |
| `.ds-body` | 0.875rem (14px) | 400 | -- | Body copy |
| `.ds-micro` | 0.75rem (12px) | 500 | -- | Captions, metadata |
| `.ds-metric` | 1.5rem (24px) | 700 | tabular-nums | KPI numbers |
| `.ds-mono` | 0.75rem (12px) | 400 | monospace family | Code, IDs |

### Font Stacks

| Token | Stack |
|---|---|
| `--font-sans` | Plus Jakarta Sans, sans-serif |
| `--font-heading` | Plus Jakarta Sans, sans-serif |
| `--font-mono` | Menlo, Courier New, monospace |
| `--font-serif` | Georgia, serif |

---

## Spacing Scale

| Class | Value | Tailwind Equivalent |
|---|---|---|
| `.ds-section-gap` | 1.25rem (20px) | `space-y-5` |
| `.ds-section-group-gap` | 2rem (32px) | `space-y-8` |
| `.ds-pad-standard` | 1.25rem (20px) | `p-5` |
| `.ds-pad-compact` | 1rem (16px) | `p-4` |
| `.ds-pad-tight` | 0.75rem (12px) | `p-3` |
| `.ds-gap-tight` | 0.75rem (12px) | `gap-3` |
| `.ds-gap-default` | 1rem (16px) | `gap-4` |
| `.ds-gap-loose` | 1.25rem (20px) | `gap-5` |

---

## Shadow / Elevation Scale

| Token | Value | Use |
|---|---|---|
| `--shadow-xs` | `0px 1px 2px rgba(21,30,58,0.06)` | Subtle lift |
| `--shadow-sm` | `0px 1px 3px rgba(21,30,58,0.05), 0px 1px 2px rgba(21,30,58,0.04)` | Default cards |
| `--shadow-md` | `0px 5px 10px -2px rgba(21,30,58,0.04), 0px 4px 8px -1px rgba(21,30,58,0.02)` | Elevated cards |
| `--shadow-lg` | `0px 12px 16px -4px rgba(21,30,58,0.08), 0px 4px 6px -2px rgba(21,30,58,0.03)` | Modals, dropdowns |
| `--shadow-xl` | `0px 24px 48px -12px rgba(21,30,58,0.12)` | Popovers |
| `--shadow-2xl` | `0px 24px 48px -12px rgba(21,30,58,0.18)` | Full-screen overlays |
| `--shadow-btn-primary` | `rgba(0,14,88,0.4) 0px 1px 2px, rgba(34,90,234,0.84) 0px 0px 0px 1px` | Primary button |
| `--shadow-btn-secondary` | `rgba(21,30,58,0.12) 0px 1px 2px, rgba(21,30,58,0.12) 0px 0px 0px 1px` | Secondary button |

---

## Radius Scale

| Token | Value | Computed (base = 6px) |
|---|---|---|
| `--radius` | `0.375rem` | 6px |
| `--radius-sm` | `calc(var(--radius) - 2px)` | 4px |
| `--radius-md` | `calc(var(--radius))` | 6px |
| `--radius-lg` | `calc(var(--radius) + 2px)` | 8px |
| `--radius-xl` | `calc(var(--radius) + 6px)` | 12px |
| `--radius-2xl` | `calc(var(--radius) + 10px)` | 16px |

---

## Status Badge Tone Mapping

Used by `StatusBadge` and the `.ds-badge-*` classes:

| Tone | Background | Text | Ring | Use Cases |
|---|---|---|---|---|
| `emerald` | `rgb(236 253 245)` | `rgb(21 128 61)` | `rgb(167 243 208)` | Active, Paid, Delivered, Online |
| `amber` | `rgb(255 251 235)` | `rgb(180 83 9)` | `rgb(253 230 138)` | Pending, Processing, Away |
| `red` | `rgb(254 242 242)` | `rgb(185 28 28)` | `rgb(254 202 202)` | Failed, Cancelled, Overdue, Busy |
| `blue` | `rgb(239 246 255)` | `rgb(29 78 216)` | `rgb(191 219 254)` | Info, New, In Review |
| `violet` | `rgb(245 243 255)` | `rgb(109 40 217)` | `rgb(221 214 254)` | Premium, Featured, Special |
| `slate` | `rgb(241 245 249)` | `rgb(51 65 85)` | `rgb(226 232 240)` | Draft, Inactive, Offline, Archived |

---

## Brand Store Colors

| Token | Hex | Store |
|---|---|---|
| `--color-store-buddha` | `#EF4444` | Buddha store |
| `--color-store-lunar` | `#3B82F6` | Lunar store |
| `--color-store-toy` | `#10B981` | Toy store |
| `--color-store-bloom` | `#F59E0B` | Bloom store |
| `--color-store-spark` | `#8B5CF6` | Spark store |
| `--color-store-cozy` | `#EC4899` | Cozy store |

## Presence / Status Indicator Colors

| Token | RGB | State |
|---|---|---|
| `--color-status-online` | `rgb(34 197 94)` | Online |
| `--color-status-away` | `rgb(245 158 11)` | Away |
| `--color-status-busy` | `rgb(239 68 68)` | Busy |
| `--color-status-offline` | `rgb(156 163 175)` | Offline |
