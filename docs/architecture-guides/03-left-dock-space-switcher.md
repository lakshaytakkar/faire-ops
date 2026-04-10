# Guide 03 — Left Dock Space Switcher + B2B Brand Filter
**Project:** Team Portal  
**Purpose:** Convert left dock from brand logo list to space switcher. Add pinned brand/store filter within B2B space only.  
**Risk level:** Medium — UI restructure, no backend changes required until Guide 02 is done

---

## Architecture Summary

```
Left dock     = Space switcher (Suprans HQ, B2B, LegalNations, etc.)
Top nav       = Reacts to active space (existing behavior — unchanged for B2B)
Brand filter  = Pinned overlay within B2B pages only (replaces left dock brand logos)
Right dock    = Universal — unchanged
Bottom bar    = Unchanged
```

---

## Part 1 — Left Dock Refactor

### Current state
Left dock shows brand logos (Holiday Farm, Toyarina, Buddha Ayurveda, etc.)  
Clicking a logo filters the entire app for that brand.

### Target state
Left dock shows space icons/names.  
Brand filtering moves to an inline pinned component inside B2B pages.

### Step 1: Create space context

```typescript
// client/src/contexts/SpaceContext.tsx

import { createContext, useContext, useState, useEffect } from 'react';

export type SpaceId = 'b2b' | 'hq' | 'legal' | 'goyo' | 'usdrop';

export interface Space {
  id: SpaceId;
  name: string;
  shortName: string;
  icon: string;             // lucide icon name or emoji fallback
  route: string;            // default route when space is activated
  status: 'active' | 'coming-soon';
  topNav: NavItem[];        // space-specific top nav
}

const SPACES: Space[] = [
  {
    id: 'b2b',
    name: 'B2B Ecommerce (USA)',
    shortName: 'B2B',
    icon: 'ShoppingBag',
    route: '/dashboard',
    status: 'active',
    topNav: [
      { label: 'Overview', route: '/dashboard' },
      { label: 'Orders', route: '/orders/all', badge: true },
      { label: 'Products', route: '/catalog/listings' },
      { label: 'Retailers', route: '/retailers/directory' },
      { label: 'Comms', route: '/workspace/emails/dashboard' },
      { label: 'Finance', route: '/finance/banking' },
      { label: 'Stores', route: '/workspace/stores/all' },
      { label: 'QA', route: '/workspace/qa/dashboard' },
      { label: 'Marketing', route: '/marketing/dashboard' },
    ],
  },
  {
    id: 'hq',
    name: 'Suprans HQ',
    shortName: 'HQ',
    icon: 'Building2',
    route: '/hq/overview',
    status: 'coming-soon',
    topNav: [
      { label: 'Overview', route: '/hq/overview' },
      { label: 'People', route: '/hq/people/directory' },
      { label: 'Finance', route: '/hq/finance/pnl' },
      { label: 'Sales', route: '/hq/sales/pipeline' },
      { label: 'Operations', route: '/hq/ops/daily' },
      { label: 'Projects', route: '/hq/projects' },
      { label: 'Compliance', route: '/hq/compliance/filings' },
    ],
  },
  {
    id: 'legal',
    name: 'LegalNations',
    shortName: 'Legal',
    icon: 'Scale',
    route: '/legal/clients',
    status: 'coming-soon',
    topNav: [
      { label: 'Clients', route: '/legal/clients' },
      { label: 'Cases', route: '/legal/cases' },
      { label: 'Documents', route: '/legal/documents' },
      { label: 'Payments', route: '/legal/payments' },
      { label: 'Compliance', route: '/legal/compliance' },
    ],
  },
  {
    id: 'goyo',
    name: 'GoyoTours',
    shortName: 'Goyo',
    icon: 'Plane',
    route: '/goyo/bookings',
    status: 'coming-soon',
    topNav: [
      { label: 'Bookings', route: '/goyo/bookings' },
      { label: 'Tours', route: '/goyo/tours' },
      { label: 'Guides', route: '/goyo/guides' },
      { label: 'Payments', route: '/goyo/payments' },
      { label: 'Analytics', route: '/goyo/analytics' },
    ],
  },
  {
    id: 'usdrop',
    name: 'USDrop AI',
    shortName: 'USDrop',
    icon: 'Package',
    route: '/usdrop/orders',
    status: 'coming-soon',
    topNav: [
      { label: 'Orders', route: '/usdrop/orders' },
      { label: 'Products', route: '/usdrop/products' },
      { label: 'Vendors', route: '/usdrop/vendors' },
      { label: 'Analytics', route: '/usdrop/analytics' },
    ],
  },
];

interface SpaceContextType {
  activeSpace: Space;
  setActiveSpace: (id: SpaceId) => void;
  spaces: Space[];
  userSpaces: Space[];          // filtered by user_space_roles
}

const SpaceContext = createContext<SpaceContextType | null>(null);

export function SpaceProvider({ children, userSpaceIds }: {
  children: React.ReactNode;
  userSpaceIds: SpaceId[];      // from user_space_roles table
}) {
  const userSpaces = SPACES.filter(s => userSpaceIds.includes(s.id));
  const [activeSpaceId, setActiveSpaceId] = useState<SpaceId>(
    () => (localStorage.getItem('lastSpace') as SpaceId) || userSpaces[0]?.id || 'b2b'
  );

  const setActiveSpace = (id: SpaceId) => {
    setActiveSpaceId(id);
    localStorage.setItem('lastSpace', id);
  };

  const activeSpace = SPACES.find(s => s.id === activeSpaceId) || SPACES[0];

  return (
    <SpaceContext.Provider value={{ activeSpace, setActiveSpace, spaces: SPACES, userSpaces }}>
      {children}
    </SpaceContext.Provider>
  );
}

export const useSpace = () => {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error('useSpace must be used inside SpaceProvider');
  return ctx;
};
```

### Step 2: Refactor the left dock component

```typescript
// client/src/components/layout/LeftDock.tsx

import { useSpace } from '@/contexts/SpaceContext';
import { useLocation, useRoute } from 'wouter';
import * as Icons from 'lucide-react';

export function LeftDock() {
  const { userSpaces, activeSpace, setActiveSpace } = useSpace();
  const [, navigate] = useLocation();

  const handleSpaceClick = (space: Space) => {
    if (space.status === 'coming-soon') return;
    setActiveSpace(space.id);
    navigate(space.route);
  };

  return (
    <aside className="left-dock">
      {userSpaces.map(space => {
        const Icon = Icons[space.icon as keyof typeof Icons] as React.ComponentType<any>;
        const isActive = activeSpace.id === space.id;
        const isDisabled = space.status === 'coming-soon';

        return (
          <button
            key={space.id}
            onClick={() => handleSpaceClick(space)}
            disabled={isDisabled}
            className={`
              dock-item
              ${isActive ? 'dock-item--active' : ''}
              ${isDisabled ? 'dock-item--disabled' : ''}
            `}
            title={space.name}
          >
            <Icon size={20} />
            <span className="dock-item__label">{space.shortName}</span>
            {isDisabled && (
              <span className="dock-item__soon-dot" aria-label="Coming soon" />
            )}
          </button>
        );
      })}
    </aside>
  );
}
```

### Step 3: Make top nav reactive to active space

```typescript
// client/src/components/layout/TopNav.tsx

import { useSpace } from '@/contexts/SpaceContext';

export function TopNav() {
  const { activeSpace } = useSpace();

  return (
    <nav className="top-nav">
      {activeSpace.topNav.map(item => (
        <TopNavItem key={item.route} item={item} />
      ))}
    </nav>
  );
}
```

---

## Part 2 — B2B Brand/Store Filter (Pinned Overlay)

This replaces the brand logos in the left dock. It lives inside B2B pages only and is invisible in all other spaces.

### Design decision: Sticky top-left pill button

The brand filter appears as a persistent pill in the top-left of the content area, below the sub-nav. Clicking it opens a dropdown with all accessible brands + stores.

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard   Analytics   Reports          (sub-nav)      │
├─────────────────────────────────────────────────────────┤
│  [All Brands ▾]                                          │  ← pinned pill
│                                                          │
│  Page content filtered by active brand below...          │
└─────────────────────────────────────────────────────────┘
```

### Step 1: Create brand context (B2B only)

```typescript
// client/src/contexts/BrandContext.tsx

import { createContext, useContext, useState } from 'react';

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  storeType: 'faire' | 'direct' | 'both';
}

interface BrandContextType {
  activeBrand: Brand | null;       // null = "All Brands"
  setActiveBrand: (brand: Brand | null) => void;
  brands: Brand[];                 // from user_brand_access + b2b.brands
}

const BrandContext = createContext<BrandContextType | null>(null);

export function BrandProvider({ children, brands }: {
  children: React.ReactNode;
  brands: Brand[];
}) {
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);

  return (
    <BrandContext.Provider value={{ activeBrand, setActiveBrand, brands }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used inside BrandProvider');
  return ctx;
};
```

### Step 2: Brand filter pill component

```typescript
// client/src/components/b2b/BrandFilter.tsx

import { useBrand } from '@/contexts/BrandContext';
import { useSpace } from '@/contexts/SpaceContext';
import { ChevronDown } from 'lucide-react';

export function BrandFilter() {
  const { activeSpace } = useSpace();
  const { activeBrand, setActiveBrand, brands } = useBrand();
  const [open, setOpen] = useState(false);

  // Only render inside B2B space
  if (activeSpace.id !== 'b2b') return null;

  return (
    <div className="brand-filter">
      <button
        className="brand-filter__pill"
        onClick={() => setOpen(!open)}
      >
        {activeBrand ? (
          <>
            {activeBrand.logoUrl && (
              <img src={activeBrand.logoUrl} alt="" className="brand-filter__logo" />
            )}
            <span>{activeBrand.name}</span>
          </>
        ) : (
          <span>All Brands</span>
        )}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="brand-filter__dropdown">
          <button
            className={`brand-filter__option ${!activeBrand ? 'active' : ''}`}
            onClick={() => { setActiveBrand(null); setOpen(false); }}
          >
            All Brands
            <span className="brand-filter__count">{brands.length} stores</span>
          </button>

          {brands.map(brand => (
            <button
              key={brand.id}
              className={`brand-filter__option ${activeBrand?.id === brand.id ? 'active' : ''}`}
              onClick={() => { setActiveBrand(brand); setOpen(false); }}
            >
              {brand.logoUrl && (
                <img src={brand.logoUrl} alt="" className="brand-filter__logo" />
              )}
              <span>{brand.name}</span>
              <span className="brand-filter__type">{brand.storeType}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 3: Wire brand filter to all B2B data queries

Every B2B query that returns brand-specific data needs to respect the active brand:

```typescript
// client/src/hooks/useOrders.ts

import { useBrand } from '@/contexts/BrandContext';

export function useOrders(params = {}) {
  const { activeBrand } = useBrand();

  return useQuery({
    queryKey: ['orders', activeBrand?.id, params],
    queryFn: () => api.get('/orders', {
      params: {
        ...params,
        brandId: activeBrand?.id ?? undefined,  // undefined = all brands
      }
    }),
  });
}
```

The API route adds the filter:

```typescript
// server/routes/orders.ts

router.get('/orders', async (req, res) => {
  const { brandId, ...otherParams } = req.query;

  const query = db
    .select()
    .from(b2bSchema.orders)
    .where(
      brandId
        ? eq(b2bSchema.orders.brandId, brandId as string)
        : undefined     // no filter = all brands
    );

  // ... rest of query
});
```

### Step 4: Position the BrandFilter in layout

```typescript
// client/src/components/layout/PageLayout.tsx

import { BrandFilter } from '@/components/b2b/BrandFilter';
import { useSpace } from '@/contexts/SpaceContext';

export function PageLayout({ children, subNav }) {
  const { activeSpace } = useSpace();

  return (
    <div className="page-layout">
      {subNav && <SubNav items={subNav} />}

      {activeSpace.id === 'b2b' && (
        <div className="page-layout__filters">
          <BrandFilter />
        </div>
      )}

      <main className="page-layout__content">
        {children}
      </main>
    </div>
  );
}
```

---

## CSS — Key Styles

```css
/* Left dock item */
.dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: var(--border-radius-md);
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background 0.15s, color 0.15s;
  width: 100%;
}

.dock-item:hover:not(:disabled) {
  background: var(--color-background-secondary);
  color: var(--color-text-primary);
}

.dock-item--active {
  background: var(--color-background-info);
  color: var(--color-text-info);
}

.dock-item--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dock-item__label {
  font-size: 11px;
  font-weight: 500;
}

.dock-item__soon-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-warning);
}

/* Brand filter */
.brand-filter {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.brand-filter__pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: 20px;
  background: var(--color-background-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--color-text-primary);
}

.brand-filter__dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-lg);
  padding: 6px;
  z-index: 100;
}

.brand-filter__option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: var(--border-radius-md);
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-primary);
  text-align: left;
}

.brand-filter__option:hover,
.brand-filter__option.active {
  background: var(--color-background-secondary);
}

.brand-filter__logo {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
}

.brand-filter__count,
.brand-filter__type {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-tertiary);
}
```

---

## Migration Safety — Existing Brand Logos

The brand logos currently in the left dock are images/avatars. They do not disappear — they move:
- Left dock: now shows space icons (no brand logos)
- Brand filter pill dropdown: shows brand logos alongside brand names
- Dashboard brand cards: still show logos as they do now

No logo assets need to be deleted or moved. Only their rendering location changes.

---

## Verification Checklist

- [ ] Left dock shows 5 spaces (B2B active, others show coming-soon dot)
- [ ] Clicking B2B in left dock navigates to `/dashboard`
- [ ] Clicking a coming-soon space does nothing (no navigate, no error)
- [ ] Top nav shows B2B modules when B2B is active
- [ ] Brand filter pill visible on all B2B pages below sub-nav
- [ ] Brand filter pill NOT visible on non-B2B pages
- [ ] "All Brands" selected by default — shows aggregated data
- [ ] Selecting a brand filters Orders, Products, Retailers correctly
- [ ] Selecting a brand persists across page navigation within B2B
- [ ] Switching spaces clears brand filter context
- [ ] Right dock unchanged and functional
- [ ] Bottom bar unchanged
- [ ] No console errors on any B2B page
- [ ] Brand logos still visible in filter dropdown
