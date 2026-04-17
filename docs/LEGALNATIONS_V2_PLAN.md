# Legalnations v2 — Animation Intelligence + Regeneration Plan

**Date:** 2026-04-17
**Owner:** Lakshay (admin@suprans.in)
**Executor:** Claude Opus 4.7 (1M context), orchestrating subagents
**Status:** Phase 0 complete; awaiting go/no-go on decision points before Phase 1

---

## Objectives (from user)

1. Build reusable **Animation Intelligence Arsenal** around [motion.dev](https://motion.dev) so future landing-page work picks presets instead of re-researching timings.
2. Install [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) for design judgment.
3. Regenerate legalnations landing as **v2** — fresh Next.js 16 App Router project at `websites/legalnations-landing-v2/`, new Vercel project.
4. Separate, reviewable **image asset plan** → generate via Gemini (`gemini-2.5-flash-image`).
5. Deploy to Vercel prod (foreground — bg deploys stall on Windows).
6. **QA loop: ship only when composite score ≥ 90 / 100.**

Aggressive subagent parallelism. Knowledge pack is infrastructure — reused across every future site.

---

## Phase 0 — Documentation Discovery (COMPLETE)

Three discovery subagents ran in parallel. Findings condensed here; full transcripts in orchestrator context. Re-read before each phase.

### 0.A — motion.dev factual baseline

**Install**
```bash
cd C:/antigravity/faire/websites/legalnations-landing-v2
npm install motion
```
Peer deps: `react >= 18.2` (React 19.2 Canary in Next 16 is fine). No upper bound.

**Import patterns (use both in Next 16 App Router)**
```tsx
// Option A — client leaf that also uses hooks:
"use client"
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValue, useAnimate, useReducedMotion, AnimatePresence, LazyMotion, domAnimation, MotionConfig, stagger } from "motion/react"

// Option B — RSC-friendly islands (preferred for static components):
import * as motion from "motion/react-client"   // no "use client" needed
```

**Bundle sizes (authoritative — [/docs/react-reduce-bundle-size](https://motion.dev/docs/react-reduce-bundle-size))**

| Usage | Size |
|---|---|
| Full `motion.*` | 34 kb |
| `m.*` + `<LazyMotion features={domAnimation}>` | 4.6 + 15 = 19.6 kb |
| `m.*` + `<LazyMotion features={domMax}>` | 4.6 + 25 = 29.6 kb (+drag/pan/layout) |
| `useAnimate` (mini, WAAPI) | 2.3 kb |
| `useReducedMotion` alone | ~1 kb |

Decision for v2: ship `<LazyMotion strict features={domMax}>` at the root of each client tree to get the full feature set in <30 kb. `strict` throws if a stray `motion.*` slips in.

**Framer-motion compat** — zero breaking changes in Motion 12. Find/replace `from "framer-motion"` → `from "motion/react"` works. Migration guide: <https://motion.dev/docs/react-upgrade-guide>.

**Primitives inventory (what the knowledge pack indexes)**

| API | Role | Import |
|---|---|---|
| `animate(target, keyframes, options?)` | Imperative (sequences, event-driven) | `motion` or `motion/mini` |
| `<motion.*>` | Declarative component | `motion/react` / `motion/react-client` |
| `useAnimate()` | Scoped imperative inside component | `motion/react` |
| `useInView(ref, opts)` | Boolean when visible | `motion/react` |
| `useScroll({target, container, offset, axis})` | Scroll MotionValues | `motion/react` |
| `useTransform(mv, input, output, opts?)` | Map/compose MotionValues | `motion/react` |
| `useMotionValue(initial)` | Low-level value holder | `motion/react` |
| `useMotionValueEvent(mv, event, cb)` | Listen to value events | `motion/react` |
| `useSpring(source, opts)` | Smooth a MotionValue via spring | `motion/react` |
| `useReducedMotion()` | A11y boolean | `motion/react` |
| `AnimatePresence` | Exit animations on unmount | `motion/react` |
| `LazyMotion + domAnimation/domMax` | Bundle splitting | `motion/react` |
| `MotionConfig reducedMotion="user"` | App-wide a11y opt-in | `motion/react` |
| `stagger(duration, opts)` | Dynamic child offsets | `motion/react` |
| SVG path: `pathLength`, `pathSpacing`, `pathOffset` | Draw-on-scroll | attrs on `motion.path` |

**Performance traps (flagged by docs)**
- Independent transforms (`x, y, scale, rotate`) use **CSS variables** → not GPU-composited today. For scroll-pinned hero zooms on mid/low-end mobile, animate the full `transform` string instead.
- Motion does **not** auto-set `will-change`. Hint manually only for a small set of repeatedly-animated, always-visible elements. Too many `will-change` slots bloat GPU memory.
- Layout-property animations (width, height, padding) are discouraged — use `layout` prop + transforms.

**View Transitions API** — no Motion bindings today ([blog](https://motion.dev/blog/reacts-experimental-view-transition-api)). For full-page nav, use `<AnimatePresence mode="wait">` keyed on `usePathname()`. Don't mix.

**Spring defaults** — use explicit values, the docs' default claim for `stiffness` is ambiguous (table says `1`, framer-motion history says `100`). Presets will encode exact numbers.

### 0.B — taste-skill factual baseline

- Format: portable `SKILL.md` files (Agent Skills convention). Not a plugin, not an MCP, not an npm package.
- Repo has 8 skills under `skills/*/SKILL.md`. Most relevant for v2:
  - `taste-skill` — main generator (21 KB)
  - `redesign-skill` — audits + fixes existing designs (directly relevant — v1 → v2)
  - `soft-skill` — premium Fraunces/Cabinet Grotesk editorial aesthetic
  - `output-skill` — anti-lazy-output discipline
- Install = manual file copy (safer than `npx skills add`):
  ```
  skills/taste-skill/SKILL.md       →  .claude/skills/taste/SKILL.md
  skills/redesign-skill/SKILL.md    →  .claude/skills/redesign-taste/SKILL.md
  skills/soft-skill/SKILL.md        →  .claude/skills/soft-taste/SKILL.md
  skills/output-skill/SKILL.md      →  .claude/skills/output-discipline/SKILL.md
  ```
  Target root: `C:\antigravity\faire\.claude\skills\` (workspace root — per CLAUDE.md §Where the agents live).
- Three dials the main skill exposes (tune per project at file top):
  - `DESIGN_VARIANCE` default 8 — we'll lower to **6** for legal-services (professional, not experimental)
  - `MOTION_INTENSITY` default 6 — we'll hold at **6** (motion-forward but not cinematic-chaotic)
  - `VISUAL_DENSITY` default 4 — we'll hold at **4** (landing, not cockpit)
- Hard rules the skill enforces (orchestrator must respect):
  - Inter is **banned** — must use Geist, Outfit, Cabinet Grotesk, or Satoshi. Current v1 uses Inter everywhere → v2 swaps.
  - "Lila ban" — AI-generic purple/blue palettes forbidden. v1's emerald + gold is on-taste; keep.
  - No `#000000` — use Off-Black/Zinc-950.
  - No centered heroes when `LAYOUT_VARIANCE > 4` — force split-screen/asymmetric.
  - No 3-equal-cards feature row — zig-zag or asymmetric only.
  - No Unsplash — use `https://picsum.photos/seed/{random}/800/600` placeholders until Gemini replaces them.
  - No "Acme/Nexus/John Doe/Sarah Chan" filler. Use real-looking names (or omit).
  - No emojis in product UI.

### 0.C — Local inventory

| Fact | Value |
|---|---|
| v1 location | `websites/legalnations-landing/` (Vite + React 19 + Wouter — **not** Next.js) |
| v1 deploy status | Not currently deployed to Vercel (per README); `.vercel/` linked to `prj_aDdJSueA0eGE5Jp5PeybZWSyyTpC` but stale |
| Team Vercel org | `team_fzPLsOO0cNxTR588asns66aL` |
| v1 palette | `hsl(160 45% 22%)` emerald primary, `hsl(42 80% 55%)` gold accent, footer `#0F2A1F` |
| v1 font | Inter (stale; **will change in v2** per taste-skill) |
| Gemini lib | `team-portal/src/lib/gemini.ts` → `generateImage(prompt)` returns `{base64, mimeType} \| null` |
| Gemini model for images | `gemini-2.5-flash-image` |
| Env var | `NEXT_PUBLIC_GEMINI_API_KEY` (fallback `GEMINI_API_KEY`) |
| `shared/brand-tokens/` today | China-platforms-only. No legalnations tokens yet. |
| QA agent with 0–100 score | **Does not exist.** Need to author. |

**Verbatim v1 copy to preserve in v2** (from `websites/legalnations-landing/artifacts/legal-nations/src/pages/Home.tsx`):
- H1: "Register Your Company Anywhere. Manage Everything from One Dashboard."
- Sub: "Your US LLC. Filed & Ready in 24 Hours. From anywhere in the world."
- CTAs: "Book Free Consultation" / "See Pricing"
- Eyebrow: "2,500+ Founders Worldwide"
- Stats: `2,500+ Companies` · `10+ Countries` · `24hr Formation` · `$149 Starting`
- Pricing anchors: USA $149 · UK $299 · Singapore $499 · UAE $1,299 · HK $599 · India ₹4,999 · Canada $399 · AU $699
- Tagline: "The world's most affordable all-in-one company registration & compliance platform."
- 8 FAQ questions captured verbatim (see v1 Home.tsx L1226–1272)
- 4 office addresses (Gurugram + GK-II Delhi + Sheridan WY + Dover DE)
- Legal entity names: "Startup Squad Pvt. Ltd." (India), "Neom LLC" (USA)
- WhatsApp: **consolidate to a single number in v2** (v1 has two — 93065 00349 floating + 82182 29118 support strip)

### 0.D — Agent roster (what's actually there)

Useful for v2 (from `team-portal/.claude/agents/`):
- `landing-page-builder.md` — 11-item checklist orchestrator
- `gemini-asset-generator.md` — image gen pipeline
- `brand-visual-curator.md` — imagery strategy
- `deploy-agent.md` — `vercel --prod --yes --archive=tgz` + alias + ledger
- `filetree-hygiene.md` — archive-first cleanup
- `real-data-auditor.md` — no-fake-data enforcement
- `design-system-enforcer.md` — audits tokens/primitives (report-only)
- `work-logger.md` — logs to `claude_work_log`

**Hard mismatch** — `suprans-reviewer` + `layout-implementer` + `microinteraction-director` + `suprans-copywriter` are all **hard-locked to React 18 + Wouter + CSS-only-motion + Suprans brand voice**. They will hard-block a Next 16 + motion.dev + Legalnations build. We will NOT invoke them. We will author a **new reviewer** (Phase 2) for this project.

---

## Decision Points (user go/no-go before Phase 1)

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Retire v1 (Vite) or run v2 parallel? | **Parallel** — keep v1 folder intact under `websites/legalnations-landing/`, build v2 as new Vercel project, alias `legalnations.com` (or the desired prod domain) to v2 only after QA ≥ 90. Archive v1 to `_archive/YYYY-MM-DD/legalnations-landing/` in a later pass. | Zero-risk rollback; per memory `_archive/` pattern. |
| D2 | Production domain for v2 | Stay on `legalnations-landing-v2.vercel.app` during QA, then ask user for final apex (e.g. `legalnations.com` / `legalnations.co`) before aliasing. | User owns the domain choice. |
| D3 | Font stack for v2 | **Cabinet Grotesk (display) + Geist (body) + Geist Mono (numerics)** — taste-skill approved, Cabinet has authoritative serif-adjacent feel for legal. Alt: Fraunces (already in shared/brand-tokens). | Inter is banned by taste-skill. Cabinet + Geist = legal-authoritative without being stuffy. |
| D4 | Brand tokens: shared or inline? | **Create `shared/brand-tokens/legalnations.css`** + vendor-in-place to v2. Extends the shared pattern. | Future legalnations properties (client portal, admin) can reuse. |
| D5 | QA reviewer — fork or new? | **Author a new `landing-qa-scorer.md`** agent at `team-portal/.claude/agents/landing-qa-scorer.md`. Scores 0–100 across 7 dimensions (rubric in Phase 2). Does not replace `suprans-reviewer` (Suprans-scoped). | No existing agent produces a numeric score. |
| D6 | WhatsApp number for v2 | Recommend **+91 93065 00349** (the one used on the floating button in v1). Request user confirm. | Single source of truth. |
| D7 | Build gate threshold | **90/100** as user specified. Sub-dim floor: no single dimension can score below 80 even if total ≥ 90 (prevents "lopsided" pass). | User specified 90. Floor prevents gaming. |

**Default if user says "go":** proceed with all recommendations above.

---

## Phase 1 — Animation Intelligence Arsenal

**Goal** — a reusable, copy-paste knowledge pack under `shared/animation-intelligence/` that eliminates re-research for future landing pages.

### 1.1 Directory skeleton

```
shared/animation-intelligence/
├── README.md                 — entry point + how to use
├── PRIMITIVES.md             — every motion.dev export with signature + verbatim snippet
├── RECIPES.md                — hero reveal, scroll parallax, stagger list, magnetic button, text reveal, marquee, accordion, shared-layout, page-transition, SVG draw, tilt, drawer, scrollytelling pinned
├── DECISION_TREE.md          — "section type + brand tone → recipe X + preset Y"
├── BRAND_PRESETS.ts          — named durations/easings/springs exported as tokens
├── NEXT_APP_ROUTER.md        — "use client" boundary rules, RSC imports, page transitions, LazyMotion placement
└── QA_CHECKLIST.md           — "did the animation pass": reduced-motion fallback, perf GPU check, mobile regression
```

### 1.2 `BRAND_PRESETS.ts` (exact tokens to ship)

```ts
// shared/animation-intelligence/BRAND_PRESETS.ts
// Picked per topic 5 of motion.dev docs + landing-page conventions.
// Six named tiers across three axes: duration, easing, spring.

import type { Transition } from "motion/react"

/** Snappy — hover, tap, button scale, quick reveals ≤ 200ms */
export const SNAPPY: Transition = { duration: 0.15, ease: "easeOut" }
export const SNAPPY_SPRING: Transition = { type: "spring", stiffness: 400, damping: 20 }

/** Elegant — in-view section reveals, fade-slide, card entrances 400–700ms */
export const ELEGANT: Transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] } // easeOutQuint
export const ELEGANT_SPRING: Transition = { type: "spring", visualDuration: 0.6, bounce: 0.18 }

/** Authoritative — hero moments, large text reveals, scroll-pinned scenes 1.0–1.5s */
export const AUTHORITATIVE: Transition = { duration: 1.0, ease: [0.16, 1, 0.3, 1] } // easeOutExpo
export const AUTHORITATIVE_SPRING: Transition = { type: "spring", visualDuration: 0.9, bounce: 0.08 }

/** Playful — drag snap-back, drawer overshoot (use sparingly on legal brand) */
export const PLAYFUL_SPRING: Transition = { type: "spring", stiffness: 300, damping: 14 }

/** Scroll-linked smoothing — wrap useScroll output in useSpring with this */
export const SCROLL_SMOOTH = { stiffness: 100, damping: 30, restDelta: 0.001 }

/** Stagger offsets (pass to staggerChildren or stagger()) */
export const STAGGER = {
  letters: 0.04,  // char-by-char text reveal
  words: 0.08,    // word-by-word
  lines: 0.15,    // line-by-line (preferred for legal authority)
  items: 0.1,     // feature cards, list rows
  sections: 0.2,  // large block sequencing
}

/** Verify with useReducedMotion — halve durations and drop y/x translations */
export const REDUCED_FALLBACK: Transition = { duration: 0.2, ease: "linear" }
```

### 1.3 Recipes to ship in `RECIPES.md` (copy-paste JSX — 13 entries)

1. **Hero reveal** — variants + `staggerChildren: STAGGER.lines`
2. **Text reveal (line)** — split by `\n`, wrap each in `<motion.span>` with `overflow: hidden`
3. **Scroll parallax image** — `useScroll({ target, offset: ["start end","end start"] })` + `useTransform(y, [0,1], ["-10%","10%"])`
4. **Sticky scrollytelling** — outer `h-[300vh]`, inner `sticky top-0 h-screen`, `useTransform(scrollYProgress, [0,0.5,1], …)`
5. **Stagger feature grid** — parent variant + child variant + `STAGGER.items`
6. **Magnetic button** — `useMotionValue(x,y)` + `onMouseMove` → `useSpring(, SNAPPY_SPRING)` → `style={{x,y}}`
7. **Marquee** — `animate([el], { x: ["0%","-50%"] }, { ease: "linear", duration: 20, repeat: Infinity })`
8. **Accordion** — `layout` + `<AnimatePresence>` + `initial={{height:0}} animate={{height:"auto"}}`
9. **Shared layout (pricing tier hover)** — `layoutId="pricing-highlight"` across cards
10. **Page transition** — `<AnimatePresence mode="wait">` keyed on `usePathname()`, ELEGANT transition
11. **SVG path draw-on-scroll** — `useScroll` → `motion.path style={{pathLength: scrollYProgress}}`
12. **Tilt on hover** — `useMotionValue(mx,my)` → `useTransform` to `rotateX/rotateY`, perspective parent
13. **Drawer spring** — `drag="y" dragConstraints={{top:0, bottom:0}} dragSnapToOrigin` + PLAYFUL_SPRING

Each recipe has: **When to use** / **Primitives** / **Full JSX** / **A11y fallback**.

### 1.4 `DECISION_TREE.md` (pick the right recipe)

```
Is the element above the fold?
├─ Yes → Hero reveal (AUTHORITATIVE + STAGGER.lines) or text reveal
└─ No
   ├─ Is it a grid/list?
   │  ├─ Yes → Stagger feature grid (ELEGANT + STAGGER.items, whileInView once)
   │  └─ No
   ├─ Is it interactive?
   │  ├─ Button / CTA → Magnetic button OR whileHover+whileTap (SNAPPY_SPRING)
   │  ├─ Card hover → Tilt (SNAPPY) or layoutId glow
   │  └─ Drag handle → Drawer spring (PLAYFUL_SPRING)
   └─ Is it scroll-story?
      ├─ Image moves as you scroll → Scroll parallax image
      ├─ Long explainer with phases → Sticky scrollytelling
      └─ Numbers/stats count up → useInView + useTransform(motionValue, [0,1], [0, final])
```

Plus a brand-tone matrix:

| Brand tone | Default preset | Stagger | Bounce |
|---|---|---|---|
| Legal / fiduciary (legalnations) | AUTHORITATIVE | lines | 0.08 (low) |
| SaaS / productivity | ELEGANT | items | 0.18 (med) |
| Consumer / playful | PLAYFUL_SPRING | words | 0.3 (high) |
| Luxury / editorial | AUTHORITATIVE_SPRING | lines | 0.1 (low) |

### 1.5 `NEXT_APP_ROUTER.md` — concrete rules

- Default to `motion/react-client` (RSC-safe) for leaf decorative components.
- Elevate to `"use client"` + `motion/react` only when hooks are needed.
- Wrap the root client boundary with `<LazyMotion strict features={domMax}>` and use `m.div` instead of `motion.div` inside — cuts bundle to <30 kb.
- Place a single `<MotionConfig reducedMotion="user">` high in the tree.
- Page transitions: only in `app/layout.tsx` or a client template.tsx — key on `usePathname()`.
- Async request APIs (Next 16): if a page uses `await searchParams`, the motion boundary stays below it as a client island.

### Phase 1 verification checklist

- [ ] `shared/animation-intelligence/` has all 7 files listed above
- [ ] `BRAND_PRESETS.ts` type-checks as `Transition` (import it in a scratch Next project)
- [ ] Every recipe's import paths match motion.dev docs verbatim
- [ ] `README.md` entry links correctly to all six companions
- [ ] No recipe uses invented APIs (grep for known-bad: `useViewportScroll` [renamed v7], `exitBeforeEnter` [removed v10], `playbackRate` [renamed v11], `currentTime` [renamed v11])

### Phase 1 anti-patterns to forbid in RECIPES.md

- ❌ `import { motion } from "framer-motion"` — use `motion/react`
- ❌ `useViewportScroll()` — use `useScroll()`
- ❌ `<AnimatePresence exitBeforeEnter>` — use `mode="wait"`
- ❌ CSS variable transforms on hero mobile — use `transform` string form
- ❌ Auto-`will-change` on every motion element — hint sparingly
- ❌ Independent `x, y, scale` props for scroll-pinned hero on mid/low-end devices
- ❌ Mixing native View Transitions + Motion layout on the same element

---

## Phase 2 — Taste-skill install + QA scorer authoring

### 2.1 Install taste-skill (manual file copy)

Source: `https://github.com/Leonxlnx/taste-skill`

```
.claude/skills/taste/SKILL.md                    ← skills/taste-skill/SKILL.md
.claude/skills/redesign-taste/SKILL.md           ← skills/redesign-skill/SKILL.md
.claude/skills/soft-taste/SKILL.md               ← skills/soft-skill/SKILL.md
.claude/skills/output-discipline/SKILL.md        ← skills/output-skill/SKILL.md
```

Workspace root: `C:\antigravity\faire\.claude\skills\`. After placement, edit top of each to set the project-specific dials (legalnations: `DESIGN_VARIANCE=6, MOTION_INTENSITY=6, VISUAL_DENSITY=4`).

### 2.2 Author `landing-qa-scorer` agent

Path: `team-portal/.claude/agents/landing-qa-scorer.md`

**Scoring rubric — 100 points across 7 dimensions, each 0–<max>, with sub-dim floor of 80%:**

| # | Dimension | Max | Scoring method |
|---|---|---|---|
| 1 | **Design taste** (taste-skill pre-flight) | 20 | Read every section; count violations of taste-skill rules (Inter ban, no-emoji, no-black, centered-hero rule, 3-card grid ban, Jane Doe effect). −2 per violation, floor 0. |
| 2 | **Animation quality** (motion.dev best practices) | 20 | Smoothness (FPS under CPU throttle), reduced-motion fallback presence, no jank on scroll, no layout thrash, respects `prefers-reduced-motion`. |
| 3 | **Responsive** (mobile 390×844, tablet 768×1024, desktop 1440) | 15 | Visual pass each breakpoint; −3 per overflow/broken-layout bug. |
| 4 | **Performance** (Lighthouse mobile) | 15 | `(LCP_score + CLS_score + INP_score) / 3 × 15`. Using Lighthouse normalized scores. |
| 5 | **Accessibility** (axe + manual) | 10 | Pass/fail per WCAG-AA: color contrast, alt text, keyboard nav, focus states, reduced motion. −1 per issue. |
| 6 | **Copy quality** | 10 | Banned-phrase scan (inherit `shared/brand-tokens/banned-words.json` + legal-specific: no "industry-leading", "trusted by millions", etc.). Readability: FK grade ≤ 10. |
| 7 | **Brand coherence** | 10 | Palette matches tokens, footer promises match header (founders-focused, pricing transparency), entity names + addresses accurate. |

**Sub-dim floor:** no single dimension < 80% of its max.

**Output format:**
```
## QA Run — 2026-04-17 19:30 — Legalnations v2

### Scores
| Dim | Score | Max | % |
| 1. Design taste | 18 | 20 | 90% |
| 2. Animation | 17 | 20 | 85% |
| 3. Responsive | 14 | 15 | 93% |
| 4. Performance | 12 | 15 | 80% |
| 5. Accessibility | 9 | 10 | 90% |
| 6. Copy | 9 | 10 | 90% |
| 7. Brand | 10 | 10 | 100% |
| **TOTAL** | **89** | **100** | **89%** |

### Verdict: BLOCK (below 90 threshold; dim 2 also below 80% floor)

### Blocking issues (minimum fix set)
1. app/page.tsx:127 — hero reveal uses Independent x-transform on mobile; swap to transform string (perf regression on Moto G4 throttle).
2. components/features.tsx — no `useReducedMotion` fallback; stagger plays even with user setting.

### Passed dims not needing attention: 1, 3, 5, 6, 7
```

Threshold: **GO only when total ≥ 90 AND every dim ≥ 80% of max.**

### 2.3 Author `landing-qa-runner` helper agent (optional — can be inline)

Runs Playwright + Lighthouse + axe against the preview URL, feeds raw metrics to `landing-qa-scorer` which produces the rubric.

### Phase 2 verification

- [ ] 4 SKILL.md files copied to `.claude/skills/<name>/SKILL.md`
- [ ] Each has `DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY` set per project
- [ ] `landing-qa-scorer.md` exists with full rubric and output template
- [ ] Running the scorer on v1 produces a baseline score (expected: ~50–60; v1 uses Inter, single CSS keyframe, no prefers-reduced-motion, unused Playfair import)

---

## Phase 3 — Next.js 16 scaffold + brand tokens

### 3.1 Scaffold

```bash
cd C:/antigravity/faire/websites
npx create-next-app@latest legalnations-landing-v2 --yes
```

Produces: Next 16.2.x + TS + ESLint + Tailwind v4 + App Router + Turbopack + `@/*` alias + `AGENTS.md`.

Immediate post-scaffold tweaks:
- Add `"lint": "eslint"` to package.json scripts (since `next lint` is removed in Next 16)
- `npm install motion`
- `npm install -D @types/node` if missing
- Create `proxy.ts` if edge logic needed later (not in v2 initial scope)
- Verify Tailwind v4 (`node_modules/tailwindcss/package.json` >= 4)

### 3.2 Brand tokens

Create `shared/brand-tokens/legalnations.css`:

```css
/* Legalnations — emerald + gold, fiduciary-authoritative */
@layer base {
  :root[data-brand="legalnations"] {
    /* Neutrals (Off-Black, not #000) */
    --ink: #0F1411;                  /* text */
    --ink-muted: #4A5450;
    --ink-subtle: #7A847E;
    --cream: #FAFBF9;                /* page bg */
    --surface: #FFFFFF;              /* card bg */
    --border: #E4E8E2;
    --border-strong: #CED3CC;

    /* Brand accents (from v1 CSS truth, not replit.md) */
    --emerald: #1F5C44;              /* hsl(160 45% 22%) → hex */
    --emerald-light: #4A9677;
    --emerald-deep: #0F3B2B;
    --emerald-soft: #E8F1ED;
    --gold: #E2A73B;                 /* hsl(42 80% 55%) → hex */
    --gold-deep: #B6821A;

    /* Status (inherit from shared) */
    --success-fg: #166534; --success-bg: #DCFCE7;
    --warning-fg: #92400E; --warning-bg: #FEF3C7;
    --danger-fg:  #991B1B; --danger-bg:  #FEF2F2;
    --info-fg:    #1D4ED8; --info-bg:    #EFF6FF;

    /* Radii — tighter than shared (legal = precise) */
    --radius-card: 10px;
    --radius-hero: 14px;
    --radius-button: 6px;
    --radius-input: 7px;
    --radius-pill: 18px;

    /* Shadows — restrained */
    --shadow-sm: 0 1px 2px rgba(15, 20, 17, 0.04);
    --shadow-md: 0 4px 12px rgba(15, 20, 17, 0.06);
    --shadow-lg: 0 12px 32px rgba(15, 20, 17, 0.08);
    --shadow-hero: 0 30px 60px rgba(31, 92, 68, 0.12);

    /* Accent alias (so components reference --accent) */
    --accent: var(--emerald);
    --accent-soft: var(--emerald-soft);
    --accent-deep: var(--emerald-deep);
  }
}
```

Font loading via `next/font`:
```ts
// app/layout.tsx
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import localFont from "next/font/local"
const cabinet = localFont({ src: "./fonts/CabinetGrotesk-Variable.woff2", variable: "--font-display" })
```

Cabinet Grotesk is not on Google Fonts — download Variable woff2 from Indian Type Foundry and place in `app/fonts/`.

### 3.3 Wire `shared/animation-intelligence/BRAND_PRESETS.ts` into v2

Vendor-in-place per `shared/README.md`:
```
cp shared/animation-intelligence/BRAND_PRESETS.ts websites/legalnations-landing-v2/src/lib/motion-presets.ts
```
(Plus `PRIMITIVES.md`/`RECIPES.md`/etc. not needed in the app bundle — they're orchestrator knowledge, live in `shared/`.)

### 3.4 Root providers

```tsx
// app/providers.tsx
"use client"
import { LazyMotion, domMax, MotionConfig } from "motion/react"
import * as m from "motion/react-m"
export { m }
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion strict features={domMax}>
        {children}
      </LazyMotion>
    </MotionConfig>
  )
}
```

### Phase 3 verification

- [ ] `websites/legalnations-landing-v2/package.json` has `next@16.x`, `motion`, `geist`
- [ ] `src/lib/motion-presets.ts` type-checks
- [ ] `shared/brand-tokens/legalnations.css` exists and is imported in `app/globals.css`
- [ ] `data-brand="legalnations"` is set on `<html>` in `app/layout.tsx`
- [ ] `npm run dev` opens a blank scaffolded page without error
- [ ] `npm run build` succeeds (Turbopack default)

---

## Phase 4 — Image asset plan + Gemini generation (reviewable standalone)

### 4.1 Author `ASSETS.md` (SEPARATE STEP — review before generation)

Path: `websites/legalnations-landing-v2/ASSETS.md`

For each of the following, document: **slug** (filename), **purpose**, **dimensions**, **placement** (section), **style brief** (prompt seed), **alt text**.

Proposed inventory (orchestrator will author; user reviews before Phase 4.2):

1. `hero-founders-globe.jpg` — 2400×1600 — hero background — editorial photo: diverse founders working, muted emerald/cream tones, morning light, subtle paper map overlay hinting global jurisdictions
2. `logo-legalnations.svg` — 400×80 — logo — wordmark; emerald + gold
3. `og-default.jpg` — 1200×630 — social share — "Register Your Company Anywhere" headline on emerald gradient with gold accent
4. `favicon.svg` + `apple-touch-icon.png` (180×180) — mark — geometric LN monogram
5. `icon-formation.svg` — 64×64 — "Company Formation" feature — abstract linework of a certificate with emerald ink
6. `icon-compliance.svg` — 64×64 — "Compliance Autopilot" — clock + shield, monochrome
7. `icon-tax.svg` — 64×64 — "Tax & Bookkeeping" — ledger linework
8. `icon-address.svg` — 64×64 — "Virtual Address" — envelope + pin
9. `flag-us.svg`, `flag-uk.svg`, `flag-sg.svg`, `flag-ae.svg`, `flag-hk.svg`, `flag-in.svg`, `flag-ca.svg`, `flag-au.svg` — 40×28 — country grid — flat flags, desaturated 10%
10. `illustration-how-it-works-1.png` — 800×600 — step 1: "Choose jurisdiction" — isometric desk + passport + laptop
11. `illustration-how-it-works-2.png` — 800×600 — step 2: "Submit details" — form UI floating over map
12. `illustration-how-it-works-3.png` — 800×600 — step 3: "Receive company" — certificate + dashboard
13. `testimonial-avatar-1/2/3.jpg` — 120×120 — 3 testimonials — placeholder real-feeling portraits (ask user for actual founder headshots; Gemini generated only if unavailable)
14. `vs-map-us.svg` — 600×400 — Delaware/Wyoming comparison — US map with two states highlighted
15. `office-gurugram.jpg`, `office-delhi.jpg`, `office-wyoming.jpg`, `office-dover.jpg` — 800×600 — footer office cards — architectural/streetscape photos (Gemini; annotated "illustrative")
16. `pattern-texture.png` — 1600×400 — CTA banner bg — subtle emerald paper grain
17. `trust-badge-*.svg` — various — review platforms (Trustpilot/Google/Clutch if featured)

Total: ~30 assets. Each gets a prompt (pre-written in `ASSETS.md`).

### 4.2 Gemini generation pipeline (after `ASSETS.md` review)

Build `websites/legalnations-landing-v2/scripts/generate-assets.mjs`:

```js
import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "node:fs/promises"
import path from "node:path"
import assets from "./assets-manifest.js"  // derived from ASSETS.md

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-image",
  generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
})

for (const a of assets) {
  const result = await model.generateContent(a.prompt)
  const part = result.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!part) { console.warn("No image for", a.slug); continue }
  const buf = Buffer.from(part.inlineData.data, "base64")
  await fs.writeFile(path.join("public", a.slug), buf)
  console.log("✓", a.slug)
}
```

Run: `node scripts/generate-assets.mjs`

For SVG icons: Gemini generates a reference PNG, then hand-trace to SVG OR use `gemini-2.5-flash` in text mode asking for inline SVG markup (Gemini can emit SVG strings).

For photos where Gemini realism is insufficient: fallback to licensed stock (note in `ASSETS.md` which assets were stock vs Gemini vs user-provided).

### Phase 4 verification

- [ ] `ASSETS.md` reviewed by user (go/no-go before generation)
- [ ] `public/` has every slug in the manifest
- [ ] Dimensions match spec (use `sharp` to verify)
- [ ] OG image passes Facebook/Twitter debugger preview
- [ ] Alt text column in `ASSETS.md` wired to `<Image alt>` in code

### Phase 4 anti-patterns

- ❌ Fabricated testimonial names ("Sarah Chan" / "John Doe") — must be real or omitted
- ❌ Unsplash without license — use `picsum.photos` placeholders until Gemini replaces
- ❌ Office photos that aren't actually the office — label as "illustrative" or ask user

---

## Phase 5 — Full page build (copy + components + animation)

### 5.1 Page structure (match v1 section order, upgrade craft)

```
app/
├── layout.tsx                  — root, fonts, data-brand="legalnations", providers
├── page.tsx                    — home (server component)
├── providers.tsx               — LazyMotion + MotionConfig (client)
├── globals.css                 — Tailwind v4 + brand-tokens import
├── fonts/CabinetGrotesk-Variable.woff2
└── _components/
    ├── announcement-bar.tsx
    ├── nav.tsx
    ├── hero.tsx                — AUTHORITATIVE + STAGGER.lines text reveal
    ├── trust-logos.tsx         — marquee (infinite ticker)
    ├── how-it-works.tsx        — 3-step with SVG connector drawn-on-scroll
    ├── countries.tsx           — stagger grid + hover tilt
    ├── usa-comparison.tsx      — Delaware vs Wyoming split layout (NOT 3-card)
    ├── pricing.tsx             — country switcher + sticky feature list + layoutId highlight
    ├── platform-features.tsx   — zig-zag (NOT centered 3-up)
    ├── comparison-table.tsx    — competitor vs us
    ├── stats.tsx               — count-up on whileInView
    ├── testimonials.tsx
    ├── faq.tsx                 — accordion with layout + AnimatePresence
    ├── support-strip.tsx       — emerald band with WhatsApp CTA
    ├── cta-banner.tsx          — hero-reveal-style large CTA
    └── footer.tsx              — 4-col with offices
```

### 5.2 Animation assignment per section (applying the DECISION_TREE)

| Section | Preset | Recipe |
|---|---|---|
| Hero H1 | AUTHORITATIVE | Line-stagger text reveal (STAGGER.lines) |
| Hero subhead | ELEGANT | Fade-up 200ms after H1 |
| Hero CTAs | SNAPPY_SPRING | Magnetic hover + whileTap scale 0.96 |
| Hero dashboard mockup | ELEGANT_SPRING | Tilt on hover; parallax on scroll |
| Trust logos | — | Infinite marquee, 40s duration, linear |
| How-it-works connector | AUTHORITATIVE | SVG path draw-on-scroll |
| How-it-works cards | ELEGANT | Stagger whileInView once (STAGGER.items) |
| Countries grid | ELEGANT | Stagger + hover tilt |
| USA comparison | ELEGANT | Split layout with layoutId glow on hover |
| Pricing cards | ELEGANT | whileInView + layoutId on "popular" tier |
| Country switcher | SNAPPY_SPRING | AnimatePresence cross-fade + x-slide |
| Platform features zig-zag | ELEGANT | Alternating slide-in (left/right) |
| Comparison table | ELEGANT | Stagger rows whileInView |
| Stats count-up | AUTHORITATIVE | useInView + useTransform(mv, [0,1], [0, final]) |
| Testimonials | ELEGANT | Card stack layoutId |
| FAQ | SNAPPY | Accordion layout + AnimatePresence |
| Support strip | ELEGANT | Fade-up |
| CTA banner | AUTHORITATIVE | Large text reveal with STAGGER.lines |
| Footer | — | Static (honor reduced motion default) |
| Scroll progress bar (top) | — | useScroll + scaleX |
| Page transition | ELEGANT | AnimatePresence mode="wait" on pathname |

### 5.3 Copy

Use `suprans-copywriter` agent? **No** — it's Suprans-brand-scoped. Write copy directly, enforcing:
- Banned phrases from `shared/brand-tokens/banned-words.json` + legal-additions: `industry-leading`, `trusted partner`, `world-class`, `best-in-class`
- Verbatim from v1 where it tests well (hero H1, stats, tagline, FAQ, office addresses, entity names, pricing anchors — see Phase 0.C capture)
- 70% operator (specific: "24 hours", "$149", "10+ countries") / 20% portfolio (jurisdictions list) / 10% personal (single-line "Built by founders who've registered in 50+ countries")
- CTAs: "Book Free Consultation" / "See Pricing" (kept from v1)
- FK grade ≤ 10

### 5.4 Build order inside Phase 5

1. Hero + Nav + Announcement (get above-the-fold right first)
2. Stats + Trust logos (immediate credibility)
3. How-it-works + Countries (what it does)
4. Pricing + USA comparison (the money section)
5. Platform features + Comparison table (why us)
6. Testimonials + FAQ (objections)
7. Support strip + CTA + Footer (close)
8. Scroll progress bar + page transitions (polish)
9. A11y pass: reduced motion, alt text, focus states, tab order
10. Mobile pass: each section at 390×844

### Phase 5 verification

- [ ] Every section matches the animation assignment table
- [ ] `npm run build` produces no warnings
- [ ] Lighthouse mobile (on preview URL): LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] `useReducedMotion()` gates every non-opacity animation
- [ ] `grep -r "framer-motion"` returns nothing
- [ ] `grep -r "useViewportScroll"` returns nothing
- [ ] `grep -r "Inter" app/` returns nothing except any explicit "Inter is banned" comment
- [ ] No `#000000` in any stylesheet (`grep -R "#000\b"`)

---

## Phase 6 — Deploy

```bash
cd C:/antigravity/faire/websites/legalnations-landing-v2
vercel link                    # interactive: scope = team_fzPLsOO0cNxTR588asns66aL,
                               # link to existing = N, name = legalnations-landing-v2
vercel env pull .env.local     # after setting NEXT_PUBLIC_GEMINI_API_KEY in dashboard
vercel --prod --yes --archive=tgz
# Returns deployment URL — capture it for QA runner
```

Per memory `feedback_vercel_bg_deploy_stalls.md` — **foreground only**. Never `run_in_background` for vercel deploy.

Alias (deferred until QA ≥ 90):
```bash
vercel alias <deploy-url> legalnations.com   # or whichever apex the user chooses
```

Ledger: deploy-agent writes to `public.deployment_events` + updates `public.projects.last_deploy_at`. Let the agent handle; don't hand-roll SQL.

### Phase 6 verification

- [ ] `.vercel/project.json` exists post-link with shape `{projectId, orgId, projectName}`
- [ ] `NEXT_PUBLIC_GEMINI_API_KEY` set in Vercel env (Production + Preview)
- [ ] First prod deploy URL returns 200 and renders
- [ ] `/sitemap.xml`, `/robots.txt`, `/favicon.ico` present
- [ ] Domain alias **NOT** set yet (wait for QA)

---

## Phase 7 — QA loop (target ≥ 90)

### 7.1 Run the scorer

Invoke `landing-qa-scorer` agent with:
- Preview URL from Phase 6
- Access to Playwright for responsive screenshots
- Access to Lighthouse (`npx lighthouse --preset=mobile`)
- Access to `@axe-core/cli` for a11y

### 7.2 Iterate

While total < 90 OR any dim < 80%:
1. Scorer outputs "Blocking issues" list
2. Spawn fix subagents in parallel (one per dimension that failed)
3. Re-deploy (Phase 6)
4. Re-run scorer
5. Log each run's scores to `websites/legalnations-landing-v2/docs/qa-log.md`

Max 5 iterations before escalating to user with the gap analysis.

### 7.3 Handoff to user

Only when scorer returns **GO**:
1. Append final scorecard to `qa-log.md`
2. Append entry to memory (new `project_legalnations_v2.md`) with deploy URL + final score + any deferred items
3. Present user with:
   - Deploy URL
   - Final scorecard (1 table)
   - Asset-generation summary (how many Gemini vs stock vs user-provided)
   - Suggested domain alias command (not run yet — user decision)
   - Next steps (v1 archive, domain alias, analytics wiring)

### Phase 7 anti-patterns

- ❌ Gaming the score (e.g. removing animations to pass the animation-quality dim) — scorer accounts for "no animation" as a craft miss
- ❌ Shipping below 90 with a "we'll fix it later" — threshold is hard
- ❌ Skipping reduced-motion fallback to hit perf score

---

## Global verification — no invented APIs

Before any deploy, grep-sweep for known-bad motion patterns:

```bash
rg "framer-motion" websites/legalnations-landing-v2/
rg "useViewportScroll" websites/legalnations-landing-v2/
rg "exitBeforeEnter" websites/legalnations-landing-v2/
rg "playbackRate|currentTime" websites/legalnations-landing-v2/src/  # motion props renamed in v11
rg "type:\s*\"glide\"" websites/legalnations-landing-v2/              # removed in v11
rg "initial=\{false\}" websites/legalnations-landing-v2/ | wc -l      # expected only on hero first-mount
```

Any hit = fix before deploy.

---

## Rollback

```bash
# If v2 regresses user's work:
cd C:/antigravity/faire/websites
mv legalnations-landing-v2 ../_archive/$(date +%F)/
# v1 untouched at websites/legalnations-landing/ — still deployable as before

# If the motion.dev arsenal breaks another project that vendored it:
# (shouldn't — shared/ is read-only, apps vendor copies)
# Revert the local vendored copy in that app.

# Full monorepo rollback (last resort):
cd C:/antigravity
tar -xzf _faire_snapshot_2026-04-17.tgz
```

---

## Memory updates on ship

Add to `C:/Users/pc/.claude-backup/projects/C--antigravity-faire/memory/MEMORY.md`:
- `[Animation Intelligence Arsenal shipped 2026-04-17](project_animation_intelligence.md) — shared/animation-intelligence/ is the preset library; every future landing uses BRAND_PRESETS.ts tokens; motion.dev is the standard (not framer-motion)`
- `[Legalnations v2 landing shipped 2026-04-17](project_legalnations_v2.md) — Next 16 App Router at websites/legalnations-landing-v2/, new Vercel project, QA score X, replaces Vite v1 (archived)`
- `[Taste-skill installed workspace-wide](project_taste_skill_installed.md) — 4 skills at .claude/skills/, dials tuned per project; landing-qa-scorer agent for 0–100 scoring`

---

## Execution order (what happens when user says GO)

1. **Phase 1** (parallel subagents):
   - Agent A: author `shared/animation-intelligence/` (all 7 files)
   - Agent B: fetch taste-skill files + place at `.claude/skills/`
2. **Phase 2**: author `landing-qa-scorer.md` agent
3. **Phase 3**: scaffold Next.js 16 + brand tokens + providers (single session)
4. **Phase 4a**: author `ASSETS.md` — **pause for user review**
5. **Phase 4b**: generate with Gemini (after user approves)
6. **Phase 5** (parallel subagents, 3 groups):
   - Group 1: Hero + Nav + Announcement + Trust logos
   - Group 2: How-it-works + Countries + USA + Pricing
   - Group 3: Platform features + Comparison + Stats + Testimonials + FAQ + CTA + Footer
7. **Phase 6**: deploy (foreground)
8. **Phase 7**: QA loop until ≥ 90
9. Handoff + memory updates

**Total estimated scope:** ~40–60 tool calls, 5–8 subagents. Rate-limit sensitive — Phase 5 is where most parallelism happens.

---

## Appendix A — Source attribution

All motion.dev facts sourced from the 35 URLs listed in the Phase 0.A research transcript — principal pages: `/docs/react`, `/docs/animate`, `/docs/scroll`, `/docs/react-motion-component`, `/docs/react-use-scroll`, `/docs/react-reduce-bundle-size`, `/docs/react-upgrade-guide`, `/docs/performance`, `/docs/easing-functions`, `/docs/stagger`, `/docs/react-lazy-motion`, `/docs/react-use-reduced-motion`, `/blog/reacts-experimental-view-transition-api`.

All taste-skill facts from `raw.githubusercontent.com/Leonxlnx/taste-skill/main/skills/taste-skill/SKILL.md` and the repo's `README.md`.

All v1 copy from `websites/legalnations-landing/artifacts/legal-nations/src/pages/Home.tsx` (verbatim quotes with line numbers in Phase 0.C).

All agent facts from `team-portal/.claude/agents/*.md` (20 files).

All Next.js 16 facts from `nextjs.org/docs/app/getting-started/installation` + `/guides/upgrading/version-16` (fetched at v16.2.4, lastUpdated 2026-04-15).
