# Guide 04 — External Apps Listing + Monorepo Structure
**Project:** Team Portal  
**Purpose:** Add external apps section to homepage, set up monorepo for future landing pages and portals  
**Risk level:** Low — additive only, no existing code modified

---

## Part 1 — External Apps on Homepage

The homepage now has two sections:
1. Internal Spaces (left dock mirrors these)
2. External Apps (separate deployments, linked from here)

### External apps config

```typescript
// client/src/config/external-apps.ts

export interface ExternalApp {
  id: string;
  name: string;
  domain: string;
  url: string;
  description: string;
  category: 'website' | 'client-portal' | 'vendor-portal';
  relatedSpaceId: string;          // which internal space manages this
  status: 'live' | 'building' | 'planned';
}

export const EXTERNAL_APPS: ExternalApp[] = [
  // Websites
  {
    id: 'legalnations-web',
    name: 'LegalNations',
    domain: 'legalnations.com',
    url: 'https://legalnations.com',
    description: 'LLC formation landing page',
    category: 'website',
    relatedSpaceId: 'legal',
    status: 'planned',
  },
  {
    id: 'goyotours-web',
    name: 'GoyoTours',
    domain: 'goyotours.com',
    url: 'https://goyotours.com',
    description: 'Travel booking landing page',
    category: 'website',
    relatedSpaceId: 'goyo',
    status: 'planned',
  },
  {
    id: 'usdropai-web',
    name: 'USDrop AI',
    domain: 'usdropai.com',
    url: 'https://usdropai.com',
    description: 'Dropshipping SaaS landing page',
    category: 'website',
    relatedSpaceId: 'usdrop',
    status: 'planned',
  },
  {
    id: 'suprans-web',
    name: 'Suprans',
    domain: 'suprans.in',
    url: 'https://suprans.in',
    description: 'Main company website',
    category: 'website',
    relatedSpaceId: 'hq',
    status: 'planned',
  },

  // Client portals
  {
    id: 'legalnations-portal',
    name: 'LegalNations Client Portal',
    domain: 'client.legalnations.com',
    url: 'https://client.legalnations.com',
    description: 'LLC clients — case status and documents',
    category: 'client-portal',
    relatedSpaceId: 'legal',
    status: 'planned',
  },

  // Vendor portals
  {
    id: 'usdrop-vendor',
    name: 'USDrop Vendor Portal',
    domain: 'vendor.usdropai.com',
    url: 'https://vendor.usdropai.com',
    description: 'Fulfillment vendors — order queue and tracking',
    category: 'vendor-portal',
    relatedSpaceId: 'usdrop',
    status: 'planned',
  },
  {
    id: 'b2b-vendor',
    name: 'B2B Vendor Portal',
    domain: 'vendor.eazytosell.com',
    url: 'https://vendor.eazytosell.com',
    description: 'B2B vendors — POs and invoices',
    category: 'vendor-portal',
    relatedSpaceId: 'b2b',
    status: 'planned',
  },
];
```

### Homepage component update

```typescript
// client/src/pages/home.tsx (additions only)

import { EXTERNAL_APPS } from '@/config/external-apps';

// Group by category for display
const websites = EXTERNAL_APPS.filter(a => a.category === 'website');
const portals = EXTERNAL_APPS.filter(a => a.category !== 'website');

function ExternalAppCard({ app }: { app: ExternalApp }) {
  return (
    <div className="app-card app-card--external">
      <div className="app-card__header">
        <span className="app-card__domain">{app.domain}</span>
        <StatusBadge status={app.status} />
      </div>
      <p className="app-card__desc">{app.description}</p>
      <div className="app-card__footer">
        <span className="app-card__category">{app.category}</span>
        {app.status === 'live' ? (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="app-card__link"
          >
            Visit ↗
          </a>
        ) : (
          <span className="app-card__status">
            {app.status === 'building' ? 'In development' : 'Planned'}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## Part 2 — Monorepo Structure

### Why monorepo

- Shared design system — change a component once, every app updates
- Shared Supabase client and schema types — no drift between apps
- Shared auth helpers — one implementation, used everywhere
- Dev speed — new app scaffolded in minutes, not days
- One repo, one CI pipeline, independent deployments per app

### Tool: pnpm workspaces + Turborepo

```
pnpm        — package manager with native workspace support
turborepo   — build orchestration, caching, parallel builds
```

### Monorepo structure

```
team-portal/                        ← your current repo root (renamed)
│
├── turbo.json                       ← build pipeline config
├── pnpm-workspace.yaml              ← workspace declaration
├── package.json                     ← root scripts
│
├── packages/                        ← shared code
│   ├── ui/                          ← shared component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   └── index.ts         ← barrel export
│   │   │   ├── layouts/
│   │   │   │   ├── PageLayout.tsx
│   │   │   │   └── AuthLayout.tsx
│   │   │   └── styles/
│   │   │       └── globals.css      ← shared Tailwind config
│   │   └── package.json
│   │
│   ├── db/                          ← shared database layer
│   │   ├── src/
│   │   │   ├── client.ts            ← Supabase client factory
│   │   │   ├── schemas/
│   │   │   │   ├── public.ts        ← public schema Drizzle tables
│   │   │   │   ├── b2b.ts           ← b2b schema tables
│   │   │   │   ├── hq.ts
│   │   │   │   └── index.ts
│   │   │   └── types/
│   │   │       └── index.ts         ← shared TS types
│   │   └── package.json
│   │
│   └── utils/                       ← shared utilities
│       ├── src/
│       │   ├── auth.ts              ← auth helpers
│       │   ├── format.ts            ← currency, date, number formatters
│       │   └── api.ts               ← fetch wrapper
│       └── package.json
│
└── apps/                            ← deployable applications
    │
    ├── portal/                      ← YOUR CURRENT APP (move here)
    │   ├── client/                  ← React frontend
    │   ├── server/                  ← Express backend
    │   └── package.json
    │   → deploys to: app.suprans.in (or teamsync.suprans.in)
    │
    ├── legalnations-web/            ← static Vite site
    │   ├── src/
    │   │   ├── pages/
    │   │   │   ├── index.tsx        ← homepage
    │   │   │   ├── pricing.tsx
    │   │   │   └── contact.tsx
    │   │   └── main.tsx
    │   └── package.json
    │   → deploys to: legalnations.com
    │
    ├── legalnations-portal/         ← client-facing portal
    │   ├── src/
    │   └── package.json
    │   → deploys to: client.legalnations.com
    │
    ├── goyotours-web/
    │   → deploys to: goyotours.com
    │
    ├── usdropai-web/
    │   → deploys to: usdropai.com
    │
    └── vendor-portal/
        → deploys to: vendor.usdropai.com
```

### Setup commands

```bash
# Step 1 — Add pnpm workspace config to root
cat > pnpm-workspace.yaml << EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Step 2 — Add turbo
pnpm add turbo --save-dev -w

# Step 3 — Create turbo.json
cat > turbo.json << EOF
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
EOF

# Step 4 — Move current app into apps/portal/
mkdir -p apps/portal
# Move all current files into apps/portal/
# (do this manually in your file manager to avoid git history issues)

# Step 5 — Create packages
mkdir -p packages/ui/src/components
mkdir -p packages/db/src/schemas
mkdir -p packages/utils/src

# Step 6 — Run all apps in dev
pnpm turbo dev
```

### Shared package.json for packages/ui

```json
{
  "name": "@team-portal/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### How apps import shared packages

```typescript
// In apps/legalnations-web/src/pages/index.tsx
import { Button, Card } from '@team-portal/ui';
import { formatCurrency } from '@team-portal/utils';
import { supabase } from '@team-portal/db';
```

### In each app's package.json

```json
{
  "name": "legalnations-web",
  "dependencies": {
    "@team-portal/ui": "workspace:*",
    "@team-portal/utils": "workspace:*",
    "@team-portal/db": "workspace:*"
  }
}
```

---

## Part 3 — Separate Domain Deployments

### Vercel setup (per app)

Each app in `/apps/*` becomes a separate Vercel project pointing at the same GitHub repo:

```
GitHub repo: team-portal (one repo)
│
├── Vercel Project 1: "team-portal-app"
│   Root directory: apps/portal
│   Domain: app.suprans.in
│
├── Vercel Project 2: "legalnations-web"
│   Root directory: apps/legalnations-web
│   Domain: legalnations.com
│
├── Vercel Project 3: "legalnations-portal"
│   Root directory: apps/legalnations-portal
│   Domain: client.legalnations.com
│
└── Vercel Project N: ...
```

In Vercel dashboard: New Project → Import same GitHub repo → Set "Root Directory" to the specific app folder → Add custom domain. Done.

### DNS setup per domain

For each domain (on GoDaddy or your registrar):
```
legalnations.com        CNAME → cname.vercel-dns.com
client.legalnations.com CNAME → cname.vercel-dns.com
vendor.usdropai.com     CNAME → cname.vercel-dns.com
```

Vercel handles SSL automatically per domain.

---

## Part 4 — Supabase Auth Per App

Single Supabase project, separate login pages per app. The `user_type` column controls access.

```typescript
// packages/utils/src/auth.ts — shared auth helpers

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Each app uses the SAME keys — single Supabase project
// RLS handles the separation

export async function signInAsInternal(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Verify user is internal type
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', data.user.id)
    .single();

  if (user?.user_type !== 'internal') {
    await supabase.auth.signOut();
    throw new Error('Access denied. Use the correct portal for your account type.');
  }

  return data;
}

export async function signInAsClient(email: string) {
  // Magic link for clients — no password
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'https://client.legalnations.com/auth/callback',
      data: { user_type: 'client' }
    }
  });
}

export async function signInAsVendor(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', data.user.id)
    .single();

  if (user?.user_type !== 'vendor') {
    await supabase.auth.signOut();
    throw new Error('Access denied.');
  }

  return data;
}
```

---

## Migration Sequence for Current Repo

Do this in one sitting, takes ~1 hour:

```
1. git checkout -b monorepo-setup
2. Add pnpm-workspace.yaml to root
3. Add turbo.json to root
4. Create apps/ and packages/ directories
5. git mv client apps/portal/client
6. git mv server apps/portal/server
7. git mv package.json apps/portal/package.json (copy, adjust root package.json)
8. Create packages/ui, packages/db, packages/utils with empty index.ts
9. pnpm install (from root)
10. pnpm turbo dev (verify apps/portal still runs)
11. git commit "chore: monorepo setup"
12. git checkout main && git merge monorepo-setup
```

Current app functionality is 100% preserved — it just lives at `apps/portal/` instead of root.

---

## Verification Checklist

- [ ] `pnpm turbo dev` runs `apps/portal` correctly
- [ ] All existing routes work identically after move to `apps/portal`
- [ ] Homepage shows both Internal Spaces and External Apps sections
- [ ] External app cards show correct domain, description, status
- [ ] Live external apps open in new tab
- [ ] Planned/building apps show status text (not a broken link)
- [ ] `packages/ui`, `packages/db`, `packages/utils` exist with empty index files
- [ ] pnpm workspace resolution works (`pnpm ls` shows all packages)
- [ ] Vercel deploy still works (update root directory setting if needed)
- [ ] No TypeScript errors introduced
