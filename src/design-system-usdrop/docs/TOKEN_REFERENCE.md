# USDrop AI v3 — Token Reference

Complete design token inventory extracted from `_archive/source-repos/usdrop-v3/src/app/globals.css`.

## Color Tokens (OKLCH)

### Core Semantic

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `oklch(1.0000 0 0)` | `oklch(0.1008 0.0145 283)` | Page background |
| `--foreground` | `oklch(0.1206 0.0203 283)` | `oklch(0.9791 0 0)` | Primary text |
| `--card` | `oklch(1.0000 0 0)` | `oklch(0.1397 0.0199 284)` | Card backgrounds |
| `--card-foreground` | `oklch(0.1206 0.0203 283)` | `oklch(0.9791 0 0)` | Card text |
| `--primary` | `oklch(0.4099 0.2135 264)` | `oklch(0.5945 0.2325 286)` | Primary actions, links |
| `--primary-foreground` | `oklch(0.9791 0 0)` | `oklch(1.0000 0 0)` | Text on primary |
| `--secondary` | `oklch(0.9601 0.0093 286)` | `oklch(0.2512 0.0301 284)` | Secondary surfaces |
| `--secondary-foreground` | `oklch(0.3500 0.1498 285)` | `oklch(0.9791 0 0)` | Text on secondary |
| `--muted` | `oklch(0.9601 0.0093 286)` | `oklch(0.2007 0.0199 284)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.5503 0.0495 285)` | `oklch(0.7005 0.0202 286)` | Secondary text |
| `--accent` | `oklch(0.9601 0.0093 264)` | `oklch(0.2511 0.0394 285)` | Hover/accent |
| `--accent-foreground` | `oklch(0.4099 0.2135 264)` | `oklch(0.9791 0 0)` | Text on accent |
| `--destructive` | `oklch(0.6292 0.1901 23)` | `oklch(0.5989 0.2000 23)` | Danger |
| `--border` | `oklch(0.9209 0.0094 286)` | `oklch(0.2187 0.0214 284)` | Borders |
| `--input` | `oklch(0.9209 0.0094 286)` | `oklch(0.2187 0.0214 284)` | Input borders |
| `--ring` | `oklch(0.4099 0.2135 264)` | `oklch(0.5945 0.2325 286)` | Focus rings |

### Chart Colors

| Token | Light | Dark |
|---|---|---|
| `--chart-1` | `oklch(0.4099 0.2135 264)` | `oklch(0.6311 0.2105 287)` |
| `--chart-2` | `oklch(0.6000 0.2004 330)` | `oklch(0.6495 0.2009 330)` |
| `--chart-3` | `oklch(0.5566 0.1400 245)` | `oklch(0.6601 0.1664 245)` |
| `--chart-4` | `oklch(0.7151 0.1216 201)` | `oklch(0.7604 0.1293 201)` |
| `--chart-5` | `oklch(0.6002 0.1500 30)` | `oklch(0.7002 0.1502 30)` |

### Sidebar

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `oklch(0.9803 0.0053 286)` | `oklch(0.1191 0.0159 284)` |
| `--sidebar-foreground` | `oklch(0.2007 0.0199 284)` | `oklch(0.9791 0 0)` |
| `--sidebar-primary` | `oklch(0.4099 0.2135 264)` | `oklch(0.5945 0.2325 286)` |
| `--sidebar-accent` | `oklch(0.9394 0.0107 286)` | `oklch(0.2004 0.0298 286)` |
| `--sidebar-border` | `oklch(0.9209 0.0094 286)` | `oklch(0.2187 0.0214 284)` |

## Typography

### Font Stacks

| Token | Value |
|---|---|
| `--font-sans` | DM Sans, ui-sans-serif, sans-serif, system-ui |
| `--font-mono` | Geist Mono, Fira Code, monospace |
| `--font-cooper` | CooperLtBt, Georgia, serif |
| `--font-serif` | Georgia, serif |

### Custom Fonts

| Font | Weight | Source |
|---|---|---|
| CooperLtBt | normal | /fonts/CooperLtBt.woff2 |
| Happy Face | 600 (SemiBold) | /fonts/HappyFace-SemiBold.woff2 |

### Type Scale

| Element | Size | Weight | Line-height | Extra |
|---|---|---|---|---|
| Page title (h1) | 1.25rem (20px) | 600 | 1.35 | tracking-tight |
| Section title (h2) | 1.125rem (18px) | 600 | 1.4 | — |
| Card title (h3) | 1rem (16px) | 600 | 1.4 | — |
| Sub-heading (h4) | 0.875rem (14px) | 600 | 1.4 | — |
| Body | 0.875rem (14px) | 400 | 1.5 | — |
| Small body | 0.75rem (12px) | 400 | 1.5 | — |
| Stat value | 1.5rem (24px) | 600 | — | — |
| Sidebar label | 11px | 600 | — | uppercase tracking-[0.08em] |
| Badge text | 0.75rem (12px) | 500 | — | — |
| Micro badge | 10px | 500 | — | — |
| Brand h1 | 2.25rem (36px) | normal | 1.2 | CooperLtBt |
| Brand h2 | 1.5rem (24px) | normal | 1.3 | CooperLtBt |

## Spacing

Base unit: `--spacing: 0.25rem` (4px)

| Pattern | Value | Usage |
|---|---|---|
| Card padding (default) | 0.5rem (8px) | Card body |
| Card padding (metric) | 1rem (16px) | Metric cards |
| Card padding (profile) | 1.25rem (20px) | Profile cards |
| Content area | 0.5rem (8px) | Shell content padding |
| Toolbar gap | 0.375rem (6px) | Data table toolbar |
| Internal gap | 0.5rem (8px) | Card slot gaps |
| Section gap | 1rem (16px) | Between page sections |

## Radius

| Token | Light | Dark |
|---|---|---|
| `--radius` | 0.75rem (12px) | 0.5rem (8px) |
| `--radius-sm` | 0.5rem (8px) | 0.25rem (4px) |
| `--radius-md` | 0.625rem (10px) | 0.375rem (6px) |
| `--radius-lg` | 0.75rem (12px) | 0.5rem (8px) |
| `--radius-xl` | 1rem (16px) | 0.75rem (12px) |

## Shadows

| Token | Light | Dark |
|---|---|---|
| `--shadow-2xs` | 0px 1px 8px -2px (5% purple) | 0px 1px 2px (9% black) |
| `--shadow-xs` | 0px 1px 8px -2px (5% purple) | 0px 1px 2px (9% black) |
| `--shadow-sm` | 1px 8px + 1px 2px (10% purple) | 1px 2px + 1px 2px (18% black) |
| `--shadow-md` | 1px 8px + 2px 4px (10% purple) | 1px 2px + 2px 4px (18% black) |
| `--shadow-lg` | 1px 8px + 4px 6px (10% purple) | 1px 2px + 4px 6px (18% black) |
| `--shadow-xl` | 1px 8px + 8px 10px (10% purple) | 1px 2px + 8px 10px (18% black) |
| `--shadow-2xl` | 1px 8px (25% purple) | 1px 2px (45% black) |
| `--metric-shadow` | 0px 1px 2px rgba(13,13,18,0.06) | — |

Shadow tint color: `hsl(288 9.8039% 10%)` (light) / `hsl(0 0% 0%)` (dark)

## Elevation Overlays

| Token | Light | Dark |
|---|---|---|
| `--elevate-1` | `rgba(0,0,0, 0.03)` | `rgba(255,255,255, 0.04)` |
| `--elevate-2` | `rgba(0,0,0, 0.08)` | `rgba(255,255,255, 0.09)` |

## Animations

| Keyframe | Duration | Usage |
|---|---|---|
| `shimmer` | 1.5s infinite | Skeleton loading |
| `gradientShine` | 4s ease infinite | Gradient text animation |
| `metallicShine` | 3s ease-in-out infinite | Metallic text effect |
| `fadeIn` | 200ms | Element entrance |
| `rainbow` | 2s linear infinite | Rainbow button border |
| `shine` | variable linear infinite | Shine border effect |
| `pulse` | — | Opacity pulse |
| `slideUp` | — | Slide from below |
