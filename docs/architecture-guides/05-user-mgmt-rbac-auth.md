# Guide 05 — User Management, RBAC & Auth System
**Project:** Team Portal  
**Scope:** Internal app only (vendor/client portal auth deferred)  
**Superadmin:** admin@suprans.in — unrestricted access to everything  
**Risk level:** Medium — new tables + new UI, no existing routes touched

---

## 1. Mental Model First

```
Suprans Organisation
│
├── Superadmin (admin@suprans.in)
│   └── Sees everything. No RLS. No restrictions. Ever.
│
├── Users
│   └── Each user has a profile, belongs to one or more spaces
│       and within each space has a role
│
├── Spaces (B2B, HQ, LegalNations, GoyoTours, USDrop)
│   └── Each space has modules (top nav items)
│       Each module has actions (view, create, edit, delete)
│
└── User Groups
    └── A named set of space+module permissions
        Assign a group to a user instead of configuring permissions manually
        Example: "Faire Ops Team" = B2B access, Orders+Products+Retailers only
```

**Three ways permissions are controlled:**
1. Which spaces appear in the left dock → `user_space_roles`
2. Which top nav modules appear within a space → `user_module_permissions`
3. What actions are allowed within a module → `user_action_permissions`

All three enforce at DB level via RLS. The UI just reflects what the DB allows.

---

## 2. Role Hierarchy

```
Level 0 — Superadmin
  Identity: admin@suprans.in
  Scope: All spaces, all modules, all actions, all data
  RLS: Bypassed entirely via service role or policy exception
  Cannot be: demoted, deleted, or restricted by any other user

Level 1 — Space Admin
  Scope: Full access within their assigned spaces
  Can: Manage members within their space, configure modules
  Cannot: Access spaces they're not assigned to, manage other Space Admins

Level 2 — Space Member
  Scope: Assigned modules within assigned spaces
  Can: CRUD within their permitted modules and action set
  Cannot: Access modules not assigned, manage other users

Level 3 — Space Viewer
  Scope: Assigned modules within assigned spaces
  Can: Read only — no create, edit, or delete
  Cannot: Any write operation

Level 4 — Restricted Member
  Scope: Specific brands/stores within a space (B2B only)
  Can: CRUD within their brand assignment only
  Cannot: See other brands' data even within the same space
```

---

## 3. Database Schema

Run all of this in Supabase SQL editor in one transaction.

### 3.1 Core user management tables

```sql
BEGIN;

-- ─────────────────────────────────────────
-- User profiles (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  job_title     TEXT,
  department    TEXT,
  employee_id   TEXT UNIQUE,
  user_type     TEXT NOT NULL DEFAULT 'internal'
                  CHECK (user_type IN ('internal', 'vendor', 'client')),
  is_superadmin BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_seen_at  TIMESTAMPTZ,
  last_space_id TEXT,
  invited_by    UUID REFERENCES auth.users(id),
  invited_at    TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Superadmin row — insert after auth user created
-- This is the only row where is_superadmin = true
-- UPDATE public.user_profiles SET is_superadmin = true WHERE email = 'admin@suprans.in';

-- ─────────────────────────────────────────
-- User groups (permission templates)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,          -- "Faire Ops Team", "Finance Team"
  description TEXT,
  color       TEXT DEFAULT '#6B7280',        -- for UI badge
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default groups
INSERT INTO public.user_groups (name, description, color) VALUES
  ('Faire Ops', 'B2B ecommerce operations team', '#7F77DD'),
  ('Finance', 'Finance and treasury team', '#EF9F27'),
  ('Marketing', 'Marketing and campaigns team', '#D85A30'),
  ('Tech', 'Engineering and development team', '#1D9E75'),
  ('HR', 'People operations team', '#D4537E'),
  ('Leadership', 'Space admins and team leads', '#378ADD'),
  ('QA & Support', 'Quality assurance and customer support', '#888780')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────
-- User ↔ group memberships
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_group_members (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  added_by    UUID REFERENCES auth.users(id),
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- ─────────────────────────────────────────
-- Space access
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_space_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id   TEXT NOT NULL,                  -- 'b2b', 'hq', 'legal', 'goyo', 'usdrop'
  role       TEXT NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin', 'member', 'viewer', 'restricted')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, space_id)
);

-- ─────────────────────────────────────────
-- Module access (within a space)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id   TEXT NOT NULL,
  module     TEXT NOT NULL,                  -- 'orders', 'products', 'retailers', etc.
  can_view   BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, space_id, module)
);

-- ─────────────────────────────────────────
-- Brand access (B2B space only)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_brand_access (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id   UUID NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, brand_id)
);

-- ─────────────────────────────────────────
-- Group → space + module permission templates
-- (when a group is assigned to a user, these permissions copy to user_module_permissions)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_space_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  space_id   TEXT NOT NULL,
  module     TEXT NOT NULL,
  can_view   BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit   BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  UNIQUE (group_id, space_id, module)
);

-- Seed Faire Ops group permissions
INSERT INTO public.group_space_permissions (group_id, space_id, module, can_view, can_create, can_edit, can_delete)
SELECT
  g.id, 'b2b', module, true,
  CASE WHEN module IN ('orders', 'products', 'retailers') THEN true ELSE false END,
  CASE WHEN module IN ('orders', 'products', 'retailers') THEN true ELSE false END,
  false
FROM public.user_groups g,
  UNNEST(ARRAY['orders','products','retailers','comms','analytics']) AS module
WHERE g.name = 'Faire Ops'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- Invitations
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  invited_by   UUID NOT NULL REFERENCES auth.users(id),
  space_ids    TEXT[] NOT NULL DEFAULT '{}',
  group_id     UUID REFERENCES public.user_groups(id),
  role         TEXT NOT NULL DEFAULT 'member',
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted     BOOLEAN DEFAULT false,
  expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Audit log (every permission change recorded)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id),
  target_id   UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,   -- 'invite', 'role_change', 'space_grant', 'space_revoke', 'deactivate'
  space_id    TEXT,
  module      TEXT,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
```

### 3.2 Auto-sync trigger (new auth user → profile)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, user_type, is_superadmin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'internal'),
    (NEW.email = 'admin@suprans.in')   -- auto-superadmin for this email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.3 Updated_at trigger

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## 4. RLS Policies

### 4.1 Superadmin bypass policy (applies to every table)

```sql
-- Helper function — used in every policy
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Helper: check if user has access to a space
CREATE OR REPLACE FUNCTION public.has_space_access(p_space_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_space_roles
    WHERE user_id = auth.uid() AND space_id = p_space_id
  ) OR public.is_superadmin();
$$;

-- Helper: get user's role in a space
CREATE OR REPLACE FUNCTION public.space_role(p_space_id TEXT)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT role FROM public.user_space_roles
  WHERE user_id = auth.uid() AND space_id = p_space_id
  LIMIT 1;
$$;
```

### 4.2 Policies on user management tables

```sql
-- user_profiles: users see their own, admins see all in their spaces, superadmin sees all
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON public.user_profiles
  FOR ALL USING (public.is_superadmin());

CREATE POLICY "own_profile" ON public.user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "space_admin_view_members" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_space_roles usr_self
      JOIN public.user_space_roles usr_target
        ON usr_self.space_id = usr_target.space_id
      WHERE usr_self.user_id = auth.uid()
        AND usr_self.role = 'admin'
        AND usr_target.user_id = user_profiles.id
    )
  );

-- user_space_roles: only superadmin and space admins can manage
ALTER TABLE public.user_space_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON public.user_space_roles
  FOR ALL USING (public.is_superadmin());

CREATE POLICY "own_space_roles" ON public.user_space_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "space_admin_manage" ON public.user_space_roles
  FOR ALL USING (
    public.space_role(space_id) = 'admin'
  );

-- user_module_permissions
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON public.user_module_permissions
  FOR ALL USING (public.is_superadmin());

CREATE POLICY "own_module_perms" ON public.user_module_permissions
  FOR SELECT USING (user_id = auth.uid());

-- user_groups: everyone can view, only superadmin and space admins can edit
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_view" ON public.user_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "superadmin_manage" ON public.user_groups
  FOR ALL USING (public.is_superadmin());

-- invitations: superadmin and space admins can create
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON public.user_invitations
  FOR ALL USING (public.is_superadmin());

CREATE POLICY "space_admin_create" ON public.user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_space_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- permission_audit_log: read only, superadmin only for sensitive entries
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON public.permission_audit_log
  FOR ALL USING (public.is_superadmin());

CREATE POLICY "space_admin_view_own_space" ON public.permission_audit_log
  FOR SELECT USING (
    public.space_role(space_id) = 'admin'
  );
```

---

## 5. Auth Setup (Supabase)

### 5.1 Supabase Auth config

In Supabase dashboard → Authentication → Settings:

```
Site URL:              https://app.suprans.in
Redirect URLs:         https://app.suprans.in/auth/callback
                       http://localhost:5173/auth/callback   (dev)

Email:                 Enable email provider
Magic Links:           Enable
Email confirmations:   Disable (internal team, you control invites)
JWT expiry:            86400 (24 hours)
Refresh token:         Enable, 30 days
```

### 5.2 Auth flow — invitation only

Internal users are NEVER self-registered. Every user is invited by superadmin or a space admin. The flow:

```
1. Admin creates invitation in /settings/access/invite
   → Stores row in public.user_invitations
   → Calls Supabase Auth admin.inviteUserByEmail(email, { redirectTo, data })
   → Supabase sends email with magic link

2. User clicks link → lands on /auth/accept-invite?token=xxx
   → App reads token, finds invitation row
   → User sets password (optional) or just clicks through
   → Supabase creates auth.users row
   → Trigger fires → creates user_profiles row (is_superadmin based on email)
   → App reads invitation.space_ids + invitation.group_id
   → Copies group permissions to user_module_permissions
   → Inserts user_space_roles rows
   → Marks invitation.accepted = true
   → Redirects to /dashboard

3. Subsequent logins: email + password or magic link
```

### 5.3 Auth helper (shared)

```typescript
// packages/utils/src/auth.ts

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Used server-side only (Express) — bypasses RLS
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`
      *,
      user_space_roles (space_id, role),
      user_group_members (
        group_id,
        user_groups (id, name, color)
      )
    `)
    .eq('id', user.id)
    .single();

  return { ...user, profile };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Verify internal user
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, is_active, is_superadmin')
    .eq('id', data.user.id)
    .single();

  if (!profile) throw new Error('User profile not found.');
  if (profile.user_type !== 'internal') {
    await supabase.auth.signOut();
    throw new Error('This login is for internal team only.');
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('Your account has been deactivated. Contact admin@suprans.in.');
  }

  return { user: data.user, profile };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function sendMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
  });
}
```

### 5.4 Auth context (React)

```typescript
// client/src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser } from '@team-portal/utils/auth';

interface AuthUser {
  id: string;
  email: string;
  profile: {
    full_name: string;
    display_name: string;
    avatar_url: string;
    is_superadmin: boolean;
    is_active: boolean;
    user_space_roles: { space_id: string; role: string }[];
    user_group_members: { group_id: string; user_groups: { name: string; color: string } }[];
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isSuperadmin: boolean;
  hasSpaceAccess: (spaceId: string) => boolean;
  spaceRole: (spaceId: string) => 'admin' | 'member' | 'viewer' | 'restricted' | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u as AuthUser);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const u = await getCurrentUser();
        setUser(u as AuthUser);
      }
      if (event === 'SIGNED_OUT') setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isSuperadmin = user?.profile?.is_superadmin ?? false;

  const hasSpaceAccess = (spaceId: string) => {
    if (isSuperadmin) return true;
    return user?.profile?.user_space_roles?.some(r => r.space_id === spaceId) ?? false;
  };

  const spaceRole = (spaceId: string) => {
    if (isSuperadmin) return 'admin';
    return (user?.profile?.user_space_roles?.find(r => r.space_id === spaceId)?.role ?? null) as any;
  };

  return (
    <AuthContext.Provider value={{
      user, loading, isSuperadmin, hasSpaceAccess, spaceRole,
      signOut: () => supabase.auth.signOut().then(() => setUser(null))
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
```

---

## 6. Permission Hooks

```typescript
// client/src/hooks/usePermissions.ts

import { useAuth } from '@/contexts/AuthContext';

export function usePermissions(spaceId: string, module: string) {
  const { user, isSuperadmin } = useAuth();

  if (isSuperadmin) {
    return { canView: true, canCreate: true, canEdit: true, canDelete: true };
  }

  const perm = user?.profile?.user_module_permissions?.find(
    p => p.space_id === spaceId && p.module === module
  );

  if (!perm) return { canView: false, canCreate: false, canEdit: false, canDelete: false };

  return {
    canView: perm.can_view,
    canCreate: perm.can_create,
    canEdit: perm.can_edit,
    canDelete: perm.can_delete,
  };
}

// Usage in a component:
// const { canCreate, canEdit, canDelete } = usePermissions('b2b', 'orders');
// {canCreate && <Button>New Order</Button>}
// {canEdit && <EditButton />}
// {canDelete && <DeleteButton />}
```

### Route guard component

```typescript
// client/src/components/auth/SpaceGuard.tsx

import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';

export function SpaceGuard({
  spaceId,
  children,
  fallback = '/dashboard'
}: {
  spaceId: string;
  children: React.ReactNode;
  fallback?: string;
}) {
  const { hasSpaceAccess, loading } = useAuth();

  if (loading) return <PageSkeleton />;
  if (!hasSpaceAccess(spaceId)) return <Redirect to={fallback} />;

  return <>{children}</>;
}

// Wrap any space-specific route:
// <SpaceGuard spaceId="hq">
//   <HQOverviewPage />
// </SpaceGuard>
```

---

## 7. User Management UI

All user management lives under:
```
/settings/access/
├── users              ← all users list
├── users/invite       ← invite new user
├── users/[id]         ← user detail + permission editor
├── groups             ← user groups list
├── groups/[id]        ← group detail + permission template editor
└── audit              ← permission change log
```

Accessible from right dock → Settings → Access tab.  
**Only visible to:** superadmin + space admins (hidden from members and viewers).

---

### 7.1 Users list page — `/settings/access/users`

**Layout:** Full-width data table

**Columns:**
| Column | Content |
|---|---|
| User | Avatar + full name + email |
| Groups | Colored group badges (max 3 shown, +N for more) |
| Spaces | Space pills showing which spaces they're in |
| Role | Highest role across all spaces |
| Status | Active / Inactive green/red dot |
| Last seen | Relative time ("2 hours ago") |
| Actions | Edit · Deactivate |

**Top bar:**
- Search by name or email
- Filter by: Group, Space, Role, Status
- Button: "Invite user" → opens invite modal

**Component structure:**
```typescript
// client/src/pages/settings/access/users.tsx

export function UsersPage() {
  const { isSuperadmin, spaceRole } = useAuth();
  const canManage = isSuperadmin || Object.values(userSpaceRoles).includes('admin');

  return (
    <SettingsLayout>
      <PageHeader
        title="Users"
        action={canManage && <InviteButton />}
      />
      <UsersFilter />
      <UsersTable />
    </SettingsLayout>
  );
}
```

---

### 7.2 Invite user — modal or slide-over

**Fields:**
```
Email address *
Full name
Job title
Department

Assign to groups:
  [ ] Faire Ops    [ ] Finance    [ ] Marketing
  [ ] Tech         [ ] HR         [ ] Leadership

Space access + role:
  B2B Ecommerce   [No access ▾]  → admin | member | viewer | restricted
  Suprans HQ      [No access ▾]
  LegalNations    [No access ▾]
  GoyoTours       [No access ▾]
  USDrop AI       [No access ▾]

[If B2B + restricted selected, show:]
Brand access:
  [ ] Holiday Farm   [ ] Toyarina   [ ] Buddha Ayurveda
  [ ] Gullee Gadgets [ ] Super Santa [ ] Buddha Yoga

Send invitation →
```

**Server action:**
```typescript
// server/routes/settings/invite.ts

router.post('/settings/access/invite', requireRole('admin'), async (req, res) => {
  const { email, full_name, space_roles, group_id, brand_ids } = req.body;

  // 1. Create invitation record
  const { data: invitation } = await supabaseAdmin
    .from('user_invitations')
    .insert({
      email,
      invited_by: req.user.id,
      space_ids: space_roles.map(s => s.space_id),
      group_id,
      role: space_roles[0]?.role ?? 'member',
    })
    .select()
    .single();

  // 2. Send Supabase invite email
  await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.APP_URL}/auth/accept-invite?token=${invitation.token}`,
    data: { full_name, user_type: 'internal' }
  });

  // 3. Audit log
  await supabaseAdmin.from('permission_audit_log').insert({
    actor_id: req.user.id,
    action: 'invite',
    new_value: { email, space_roles, group_id }
  });

  res.json({ success: true });
});
```

---

### 7.3 User detail page — `/settings/access/users/[id]`

This is the most important screen. Single page showing everything about one user's access.

**Layout: Three-column card grid**

```
┌─────────────────────────────────────────────────────────────────┐
│  ● Naveen Kumar                                    [Deactivate] │
│  naveen@suprans.in  ·  Ops Manager  ·  Last seen 2h ago         │
├─────────────────┬───────────────────────────┬───────────────────┤
│  Groups         │  Space Access             │  Brand Access     │
│  ─────────────  │  ─────────────────────    │  ───────────────  │
│  [Faire Ops] ×  │  B2B    [Member    ▾] ×   │  (B2B only)       │
│  [Add group +]  │  HQ     [No access ▾]     │  [x] Holiday Farm │
│                 │  Legal  [No access ▾]     │  [x] Toyarina     │
│                 │  Goyo   [No access ▾]     │  [ ] Buddha Ayu.. │
│                 │  USDrop [Viewer    ▾]  ×  │  [ ] Gullee       │
│                 │                           │  [Save brands]    │
├─────────────────┴───────────────────────────┴───────────────────┤
│  Module permissions — B2B Ecommerce                             │
│  ─────────────────────────────────────────────────────────────  │
│  Module         View   Create   Edit   Delete                   │
│  Orders          [x]    [x]     [x]    [ ]                      │
│  Products        [x]    [x]     [x]    [ ]                      │
│  Retailers       [x]    [x]     [x]    [ ]                      │
│  Comms           [x]    [ ]     [ ]    [ ]                      │
│  Finance         [x]    [ ]     [ ]    [ ]                      │
│  Stores          [x]    [ ]     [ ]    [ ]                      │
│  QA              [x]    [ ]     [ ]    [ ]                      │
│  Marketing       [x]    [ ]     [ ]    [ ]                      │
│                                              [Save permissions] │
├─────────────────────────────────────────────────────────────────┤
│  Permission history                                             │
│  ─────────────────────────────────────────────────────────────  │
│  Admin@suprans.in granted B2B Member access  ·  3 days ago      │
│  Admin@suprans.in added to Faire Ops group   ·  3 days ago      │
└─────────────────────────────────────────────────────────────────┘
```

**Component:**
```typescript
// client/src/pages/settings/access/user-detail.tsx

export function UserDetailPage({ userId }: { userId: string }) {
  const { isSuperadmin, spaceRole } = useAuth();
  const { data: user } = useUserWithPermissions(userId);

  // Space admins can only edit users in their own spaces
  const canEdit = isSuperadmin ||
    user?.space_roles?.some(r => spaceRole(r.space_id) === 'admin');

  return (
    <SettingsLayout>
      <UserHeader user={user} canDeactivate={isSuperadmin} />

      <div className="three-col-grid">
        <GroupsCard userId={userId} groups={user?.groups} editable={canEdit} />
        <SpaceAccessCard userId={userId} roles={user?.space_roles} editable={canEdit} />
        <BrandAccessCard userId={userId} brands={user?.brand_access} editable={canEdit} />
      </div>

      <ModulePermissionsCard
        userId={userId}
        spaceId={activeSpaceTab}
        permissions={user?.module_permissions}
        editable={canEdit}
      />

      <PermissionHistory userId={userId} />
    </SettingsLayout>
  );
}
```

---

### 7.4 Groups page — `/settings/access/groups`

**Layout:** Card grid (one card per group)

Each card shows:
- Group name + color badge
- Member count
- Which spaces/modules this group grants
- "Edit group" link

**Group detail — `/settings/access/groups/[id]`**

```
┌──────────────────────────────────────────────────┐
│  Faire Ops                                  [Edit]│
│  B2B ecommerce operations team                    │
├───────────────────┬──────────────────────────────┤
│  Members (4)      │  Permission template          │
│  ───────────────  │  ────────────────────────     │
│  Naveen Kumar     │  Space: B2B Ecommerce         │
│  Priya Sharma     │                               │
│  Ravi Singh       │  Module    V  C  E  D         │
│  Anil Mehta       │  Orders    x  x  x  -         │
│  [Add member +]   │  Products  x  x  x  -         │
│                   │  Retailers x  x  x  -         │
│                   │  Comms     x  -  -  -         │
│                   │  Finance   x  -  -  -         │
│                   │  [Edit template]              │
└───────────────────┴──────────────────────────────┘
```

---

### 7.5 Audit log — `/settings/access/audit`

Superadmin-only view. Table format:

| Time | Actor | Action | Target | Details |
|---|---|---|---|---|
| 2h ago | admin@suprans.in | Invited | naveen@suprans.in | B2B Member + Faire Ops group |
| 1d ago | admin@suprans.in | Role changed | priya@suprans.in | B2B Member → B2B Admin |
| 3d ago | admin@suprans.in | Space revoked | ravi@suprans.in | HQ access removed |

---

## 8. Left Dock Integration

The left dock reads directly from the user's space roles and only renders what they have access to:

```typescript
// client/src/components/layout/LeftDock.tsx (updated)

import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';

export function LeftDock() {
  const { hasSpaceAccess, isSuperadmin } = useAuth();
  const { spaces, activeSpace, setActiveSpace } = useSpace();

  const visibleSpaces = isSuperadmin
    ? spaces                                          // superadmin sees all
    : spaces.filter(s => hasSpaceAccess(s.id));       // others see only assigned

  return (
    <aside className="left-dock">
      {visibleSpaces.map(space => (
        <DockItem
          key={space.id}
          space={space}
          isActive={activeSpace.id === space.id}
          onClick={() => setActiveSpace(space.id)}
        />
      ))}
    </aside>
  );
}
```

---

## 9. Superadmin Special Handling

`admin@suprans.in` is the only account where `is_superadmin = true`. Three protections:

**Protection 1 — Cannot be deactivated by anyone (including itself)**
```typescript
// In deactivate user handler
if (targetUser.email === 'admin@suprans.in') {
  throw new Error('Superadmin account cannot be deactivated.');
}
```

**Protection 2 — UI hides deactivate button for superadmin**
```typescript
const showDeactivate = canDeactivate && user.email !== 'admin@suprans.in';
```

**Protection 3 — DB trigger prevents is_superadmin = false for this email**
```sql
CREATE OR REPLACE FUNCTION public.protect_superadmin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.email = 'admin@suprans.in' AND NEW.is_superadmin = false THEN
    RAISE EXCEPTION 'Cannot remove superadmin status from admin@suprans.in';
  END IF;
  IF OLD.email = 'admin@suprans.in' AND NEW.is_active = false THEN
    RAISE EXCEPTION 'Cannot deactivate the superadmin account';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_superadmin_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_superadmin();
```

---

## 10. Settings Navigation Structure

```
Right dock → Settings icon → /settings

/settings
├── /settings/profile          ← own profile, name, avatar, password
├── /settings/preferences      ← theme, notifications, default space
├── /settings/access           ← user management (admin/superadmin only)
│   ├── /settings/access/users
│   ├── /settings/access/users/invite
│   ├── /settings/access/users/[id]
│   ├── /settings/access/groups
│   ├── /settings/access/groups/[id]
│   └── /settings/access/audit
├── /settings/spaces           ← configure spaces, enable/disable modules
├── /settings/integrations     ← Faire, Gemini, Resend, Twilio, Wise, 17Track
├── /settings/billing          ← (future)
└── /settings/developer        ← API keys, webhooks (superadmin only)
```

The Settings page renders its nav dynamically based on role:
```typescript
const settingsNav = [
  { label: 'Profile', route: '/settings/profile', access: 'all' },
  { label: 'Preferences', route: '/settings/preferences', access: 'all' },
  { label: 'Access', route: '/settings/access', access: 'admin' },
  { label: 'Spaces', route: '/settings/spaces', access: 'admin' },
  { label: 'Integrations', route: '/settings/integrations', access: 'admin' },
  { label: 'Developer', route: '/settings/developer', access: 'superadmin' },
].filter(item => {
  if (item.access === 'all') return true;
  if (item.access === 'admin') return isSuperadmin || isAnySpaceAdmin;
  if (item.access === 'superadmin') return isSuperadmin;
  return false;
});
```

---

## 11. Build Order

```
Step 1 — DB (1 hr)
  Run all SQL from Section 3
  Verify tables exist
  Set admin@suprans.in as superadmin
  Test is_superadmin() function returns true for your account

Step 2 — Auth helpers (1 hr)
  Create packages/utils/src/auth.ts
  Create client/src/contexts/AuthContext.tsx
  Wrap app root with AuthProvider
  Verify useAuth() returns correct profile data

Step 3 — Route guards (30 min)
  Create SpaceGuard component
  Wrap existing B2B routes with SpaceGuard spaceId="b2b"
  Verify you can still access everything (superadmin)

Step 4 — Left dock integration (30 min)
  Update LeftDock to read from hasSpaceAccess
  Verify superadmin sees all 5 spaces
  Add a test member user with only b2b access and verify they see only B2B

Step 5 — Settings layout (1 hr)
  Create /settings route and SettingsLayout component
  Add settings icon to right dock pointing to /settings/profile
  Render profile page (basic form — name, avatar, password change)

Step 6 — Users list page (2 hrs)
  /settings/access/users
  Table with columns from Section 7.1
  Search and filter working
  Invite button visible to admins only

Step 7 — Invite flow (2 hrs)
  Invite modal with all fields from Section 7.2
  Server route that calls supabaseAdmin.auth.admin.inviteUserByEmail
  Accept invite page at /auth/accept-invite
  Permission copy from group template

Step 8 — User detail page (3 hrs)
  /settings/access/users/[id]
  Three-column layout from Section 7.3
  Space role editor (dropdown per space)
  Module permission checkboxes (per space tab)
  Save handlers with audit log entries

Step 9 — Groups (2 hrs)
  /settings/access/groups
  Group cards + group detail with template editor

Step 10 — Audit log (1 hr)
  /settings/access/audit
  Superadmin only
  Table with filters
```

**Total: ~14–16 hours of focused build time across 3–4 sessions**

---

## 12. Safety Checklist

```
Database
  [ ] All tables from Section 3 exist
  [ ] is_superadmin() function returns true for admin@suprans.in
  [ ] is_superadmin() returns false for all other users
  [ ] protect_superadmin trigger prevents deactivation of admin@suprans.in
  [ ] RLS enabled on all user management tables
  [ ] Test: non-superadmin cannot read another user's profile via direct Supabase query

Auth
  [ ] admin@suprans.in can sign in
  [ ] Wrong user_type blocked at signIn
  [ ] Deactivated user blocked at signIn
  [ ] New user created via invite gets correct profile row
  [ ] is_superadmin auto-set true for admin@suprans.in on trigger

UI — Superadmin
  [ ] Superadmin sees all 5 spaces in left dock
  [ ] Superadmin sees Access section in settings
  [ ] Superadmin can invite users
  [ ] Deactivate button hidden for admin@suprans.in user card
  [ ] Developer settings tab visible to superadmin only

UI — Space admin
  [ ] Space admin sees only their assigned spaces
  [ ] Space admin sees Access section (limited to their spaces)
  [ ] Space admin can invite to their spaces only
  [ ] Space admin cannot change role of another space admin

UI — Member
  [ ] Member sees only assigned spaces
  [ ] Member does NOT see Access in settings (only Profile + Preferences)
  [ ] Member cannot navigate to /settings/access directly (redirect to /settings/profile)
  [ ] Member sees only assigned modules in top nav
  [ ] canCreate, canEdit, canDelete correctly hide/show UI elements
```
