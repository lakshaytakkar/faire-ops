# Design System Comparison: Faire Wholesale vs USDrop AI

Side-by-side reference for switching between the two UI kits.

## Architecture

| Dimension | Faire Wholesale | USDrop AI v3 |
|---|---|---|
| Layout shell | Dock-based (left + right + top nav bars) | Sidebar-based (shadcn sidebar + topbar inset) |
| Sidebar width | w-12 collapsed / w-44 expanded | 18.08rem (289px) / 3rem collapsed |
| Content padding | px-3 py-3 md:px-5 md:py-4 lg:px-6 | p-2 (8px) with bg-gray-50/50 |
| Container | max-w-[1440px] mx-auto | Full-width (no max-width) |
| Component lib | Custom shared primitives | shadcn/ui + CVA variants |
| State management | Server components + props | React Query + TanStack Table |
| Routing | Next.js App Router | Wouter (client) + Express SSR |

## Color System

| Token | Faire (HSL) | USDrop (OKLCH) |
|---|---|---|
| primary | `hsl(223 83% 53%)` (blue) | `oklch(0.4099 0.2135 264)` (violet-blue) |
| background | `hsl(0 0% 100%)` (white) | `oklch(1.0000 0 0)` (white) |
| foreground | `hsl(225 47% 15%)` (dark navy) | `oklch(0.1206 0.0203 283)` (dark purple-gray) |
| muted | `hsl(226 30% 95%)` | `oklch(0.9601 0.0093 286)` |
| muted-foreground | `hsl(224 15% 42%)` | `oklch(0.5503 0.0495 285)` |
| border | `hsl(226 30% 85%)` | `oklch(0.9209 0.0094 286)` |
| destructive | `hsl(0 85% 45%)` | `oklch(0.6292 0.1901 23)` |
| Shadow tint | `rgba(21,30,58)` (navy) | `hsl(288 9.8% 10%)` (purple) |

## Typography

| Element | Faire | USDrop |
|---|---|---|
| Primary font | Plus Jakarta Sans | DM Sans |
| Heading font | Plus Jakarta Sans | DM Sans (brand: CooperLtBt) |
| Mono font | Menlo, Courier New | Geist Mono, Fira Code |
| Display font | N/A | Happy Face SemiBold |
| Page title | text-2xl (1.5rem) font-bold | text-xl (1.25rem) font-semibold tracking-tight |
| Card title | text-[0.9375rem] font-semibold tracking-tight | font-semibold leading-none |
| Body | text-sm (0.875rem) | text-sm (0.875rem) |
| Micro | text-xs (0.75rem) | text-[11px] (0.6875rem) |
| Sidebar label | text-xs font-medium | text-[11px] font-semibold uppercase tracking-[0.08em] |

## Spacing & Radius

| Token | Faire | USDrop |
|---|---|---|
| Base radius | 0.375rem (6px) | 0.75rem (12px) light / 0.5rem dark |
| Card radius | rounded-lg (8px) | rounded-xl (12px) |
| Card padding | p-5 (20px) | p-2 (8px) |
| Section gap | space-y-5 (20px) | gap-4 (16px) |
| Toolbar gap | N/A | gap-1.5 (6px) |
| Metric grid | grid-cols-2 lg:grid-cols-4 | grid-cols-1 sm:grid-cols-3 |

## Component Patterns

### Buttons
| | Faire | USDrop |
|---|---|---|
| Height (default) | h-9 (36px) | h-9 (36px) |
| Variants | primary, secondary, ghost, destructive | default, destructive, outline, secondary, ghost, link |
| Focus ring | ring-2 ring-primary/30 | ring-[3px] ring-ring/50 |
| Shadow | shadow-btn-primary (custom) | shadow-xs (standard) |

### Cards
| | Faire | USDrop |
|---|---|---|
| Structure | DetailCard with title + actions header | Card with header/title/description/action/content/footer slots |
| Padding | p-5 standard | p-2 default |
| Border | border-border/80 | border (var(--border)) |
| Shadow | shadow-sm | shadow-sm |
| Metric card | MetricCard (icon + value + label + trend) | Custom (icon box + value + subtitle) |
| Metric shadow | Standard shadow-sm | Custom 0px 1px 2px rgba(13,13,18,0.06) |

### Status Badges
| | Faire | USDrop |
|---|---|---|
| Shape | rounded-full, ring-1 ring-inset | rounded-full, border |
| Tones | emerald/amber/red/blue/violet/slate (Tailwind colors) | OKLCH-based success/warning/info/error |
| Mapping | toneForStatus() auto-mapper | Manual variant selection |

### Navigation
| | Faire | USDrop |
|---|---|---|
| Primary nav | Top bar (bg-dock, full-width cells) | Sidebar (18.08rem, collapsible to 3rem) |
| Active state | bg-dock-active text-dock-active-foreground | bg-sidebar-primary text-white |
| Secondary nav | SubNav (horizontal tabs) | Tabs (shadcn, shadow on active) |
| Workspace | Right dock (vertical icon list) | N/A (tools in sidebar) |

## Interactions

| | Faire | USDrop |
|---|---|---|
| Hover effect | hover:shadow-md, hover:bg-muted/60 | hover-elevate overlay (rgba tint) |
| Transitions | transition-colors, transition-shadow | transition-all |
| Loading | animate-pulse skeleton | Shimmer overlay animation |
| Gradient text | N/A | .dropshipping-gradient-text (animated 300% background) |
| Motion lib | CSS only (no Framer Motion) | Framer Motion (14 motion components) |

## Dark Mode

| | Faire | USDrop |
|---|---|---|
| Trigger | .dark class | .dark class |
| Background | hsl(225 25% 10%) | oklch(0.1008 0.0145 283) |
| Card bg | hsl(225 25% 8%) | oklch(0.1397 0.0199 284) |
| Radius change | Same | 0.75rem → 0.5rem |
| Shadow shift | rgba(0,0,0) base | hsl(0 0% 0%) base |
| Elevation | N/A | elevate-1 shifts to rgba(255,255,255, 0.04) |
