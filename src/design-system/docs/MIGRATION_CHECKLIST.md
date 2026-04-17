# Migration Checklist — Adopting the Design System

> For pages or external portals that want to use the design system CSS classes
> instead of (or alongside) Tailwind utilities.

---

## Step 1: Import the library

Add a single import at the top of your CSS entry point:

```css
@import '../design-system/index.css';
```

This brings in all tokens and component classes prefixed with `ds-`.

If you only need tokens (and will keep using Tailwind for components):

```css
@import '../design-system/tokens/variables.css';
```

---

## Step 2: Replace inline patterns with ds- classes

### Mapping Table

| Inline / Tailwind Pattern | Design System Class | Notes |
|---|---|---|
| `bg-primary text-primary-foreground shadow-btn-primary rounded-md px-4 py-2 text-sm font-medium` | `.ds-btn-primary` | Primary CTA |
| `bg-secondary text-secondary-foreground shadow-btn-secondary rounded-md px-4 py-2 text-sm font-medium` | `.ds-btn-secondary` | Secondary action |
| `bg-transparent hover:bg-muted rounded-md px-4 py-2 text-sm font-medium` | `.ds-btn-ghost` | Ghost/toolbar button |
| `bg-destructive text-destructive-foreground rounded-md px-4 py-2 text-sm font-medium` | `.ds-btn-destructive` | Danger action |
| `bg-card border border-border rounded-lg shadow-sm p-5` | `.ds-card` | Standard card |
| `bg-card border border-border rounded-lg shadow-md p-5` | `.ds-card-elevated` | Elevated card |
| `bg-card border border-border rounded-lg shadow-sm p-4` | `.ds-card-compact` | Compact card |
| `w-full h-9 px-3 text-sm border border-input rounded-md` | `.ds-input` | Text input |
| `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset` | `.ds-badge` + `.ds-badge-{tone}` | Status pill |
| `text-2xl font-bold tracking-tight` | `.ds-h1` | Page title |
| `text-[0.9375rem] font-semibold tracking-tight` | `.ds-h2` | Card header |
| `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | `.ds-eyebrow` | Category label |
| `text-2xl font-bold tabular-nums` | `.ds-metric` | KPI number |
| `text-xs font-medium text-muted-foreground` | `.ds-micro` | Caption text |
| `max-w-[1440px] mx-auto w-full` | `.ds-container` | Page shell |
| `grid grid-cols-2 lg:grid-cols-4 gap-4` | `.ds-grid-metrics` | Metric cards grid |
| `grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5` | `.ds-grid-detail` | Detail page layout |

---

## Step 3: Verify no conflicts

### Conflict avoidance rules

1. **Do not redefine Tailwind utilities.** The `ds-` prefix exists specifically to avoid collisions. Never create a class named `.btn` or `.card` -- always use `.ds-btn-*` or `.ds-card`.

2. **Token variables are shared.** Both Tailwind (via `globals.css`) and the design system reference the same CSS custom properties. Do not override `--primary`, `--border`, etc. in a local scope unless intentional.

3. **Specificity.** All `ds-` classes use flat specificity (single class). They will not override Tailwind's `!important` utilities. If you need to override a `ds-` class, add a more specific selector or use Tailwind's `!` prefix.

4. **Order of imports matters.** Import the design system BEFORE Tailwind's utilities layer so Tailwind can override when needed:
   ```css
   @import '../design-system/index.css';
   @import 'tailwindcss';
   ```

---

## Step 4: Adoption per page

For each page you migrate:

- [ ] Replace inline button classes with `ds-btn-*`
- [ ] Replace card wrappers with `ds-card` / `ds-card-elevated` / `ds-card-compact`
- [ ] Replace status badges with `ds-badge ds-badge-{tone}`
- [ ] Replace input styling with `ds-input`
- [ ] Replace typography inline classes with `ds-h1` / `ds-h2` / `ds-h3` / `ds-eyebrow` / `ds-body` / `ds-micro` / `ds-metric`
- [ ] Replace layout containers with `ds-container` / `ds-page`
- [ ] Replace metric grids with `ds-grid-metrics`
- [ ] Verify hover/focus states work correctly
- [ ] Test at 1440px, 1024px, and 768px breakpoints
- [ ] Visual diff: compare before/after screenshots

---

## Step 5: Before/after visual diff checklist

For each migrated page, capture and compare:

| Check | Before | After | Match? |
|---|---|---|---|
| Page title size and weight | | | |
| Card border radius and shadow | | | |
| Button colors and hover effects | | | |
| Badge colors and pill shape | | | |
| Input focus ring color | | | |
| Table row hover background | | | |
| Navigation bar height and colors | | | |
| Metric number alignment (tabular-nums) | | | |
| Responsive grid at 1024px | | | |
| Responsive grid at 768px | | | |

---

## Notes

- The design system CSS is a **reference layer**. The portal's runtime still uses `globals.css` + Tailwind classes directly. This library exists for:
  - External portals or client-facing pages that share the visual language
  - Static HTML pages (e.g., email templates, print views)
  - Documentation and onboarding
- If a component's styling diverges from what is documented here, `globals.css` is the source of truth.
