# Guide 01 — Homepage Repurpose
**Project:** Team Portal  
**Purpose:** Convert the existing homepage (space selector) into a full Dev Hub / App Launcher  
**Risk level:** Low — purely additive, no existing routes touched

---

## What Changes

The current homepage shows one space card: "B2B Ecommerce Management (USA)".  
After this guide it becomes the **Team Portal launcher** — listing all internal spaces plus external apps.

The homepage is NOT removed. It is improved.

---

## New Homepage Purpose

```
Team Portal — Home
├── Internal Spaces (left dock mirrors these)
│   ├── B2B Ecommerce (USA)       → /portal/b2b
│   ├── Suprans HQ                → /portal/hq
│   ├── LegalNations Admin        → /portal/legal
│   ├── GoyoTours Admin           → /portal/goyo
│   └── USDrop AI Admin           → /portal/usdrop
│
└── External Apps (separate deployments)
    ├── legalnations.com          → external link
    ├── client.legalnations.com   → external link
    ├── vendor.usdropai.com       → external link
    └── goyotours.com             → external link
```

---

## File Changes

### 1. Rename / update the homepage component

**File:** `client/src/pages/home.tsx` (or wherever your current home lives)

Replace the single space card with two sections:

```tsx
// client/src/pages/home.tsx

const INTERNAL_SPACES = [
  {
    id: 'b2b',
    name: 'B2B Ecommerce (USA)',
    description: 'Wholesale operations powered by Faire',
    route: '/dashboard',          // existing route — unchanged
    status: 'active',
  },
  {
    id: 'hq',
    name: 'Suprans HQ',
    description: 'CEO command center — people, finance, strategy',
    route: '/hq/overview',        // new route — build later
    status: 'coming-soon',
  },
  {
    id: 'legal',
    name: 'LegalNations Admin',
    description: 'LLC formation and compliance operations',
    route: '/legal/clients',
    status: 'coming-soon',
  },
  {
    id: 'goyo',
    name: 'GoyoTours Admin',
    description: 'Travel bookings and tour management',
    route: '/goyo/bookings',
    status: 'coming-soon',
  },
  {
    id: 'usdrop',
    name: 'USDrop AI Admin',
    description: 'Dropshipping operations and vendor management',
    route: '/usdrop/orders',
    status: 'coming-soon',
  },
];

const EXTERNAL_APPS = [
  {
    name: 'legalnations.com',
    description: 'Public landing page',
    url: 'https://legalnations.com',
    status: 'planned',
  },
  {
    name: 'client.legalnations.com',
    description: 'Client portal',
    url: 'https://client.legalnations.com',
    status: 'planned',
  },
  {
    name: 'vendor.usdropai.com',
    description: 'Vendor fulfillment portal',
    url: 'https://vendor.usdropai.com',
    status: 'planned',
  },
  {
    name: 'goyotours.com',
    description: 'Public landing page',
    url: 'https://goyotours.com',
    status: 'planned',
  },
];
```

### 2. Status badge logic

Each card gets a status badge:
- `active` → green "Open →" button, fully clickable
- `coming-soon` → muted "Coming soon" badge, card not clickable
- `planned` → gray "Planned" badge for external apps

```tsx
function SpaceCard({ space }) {
  const isActive = space.status === 'active';
  return (
    <div className={`card ${!isActive ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <h3>{space.name}</h3>
      <p>{space.description}</p>
      {isActive ? (
        <a href={space.route}>Open →</a>
      ) : (
        <span className="badge">Coming soon</span>
      )}
    </div>
  );
}
```

### 3. Route protection

The home route (`/`) stays as-is. No redirect changes needed.  
Users who bookmark `/dashboard` still land directly in B2B — no disruption.

---

## What Does NOT Change

- `/dashboard` route — untouched
- All B2B routes — untouched  
- The background animation / branding of homepage — keep or restyle, your call
- Auth flow — untouched

---

## Verification Checklist

- [ ] `/` loads the new launcher page
- [ ] B2B card opens `/dashboard` correctly
- [ ] All other cards show "Coming soon" and are non-clickable
- [ ] External apps section renders with correct URLs
- [ ] No console errors
- [ ] Mobile layout renders correctly
- [ ] Existing bookmarks to `/dashboard` still work
