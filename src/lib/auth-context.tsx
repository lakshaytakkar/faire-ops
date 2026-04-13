"use client"

/**
 * Auth + RBAC context for TeamSync AI (Suprans HQ + venture spaces).
 *
 * This is the React layer of Guide 05 Phase A.
 *
 * Resolution order for the "current user":
 *   1. If Supabase Auth has a real session (auth.users row), look up the
 *      matching public.users row by `auth_user_id` first, then by `email`
 *      as a fallback.
 *   2. If no Auth session, fall back to the SUPERADMIN_FALLBACK_EMAIL
 *      defined below. This keeps the existing app working today while
 *      real auth is wired in later — superadmin Lakshay is the de-facto
 *      developer principal.
 *
 * Once Supabase Auth is fully wired in (Guide 05 Section 5), the fallback
 * branch will become a no-op because `auth.getUser()` will always return
 * a real user.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { supabase } from "@/lib/supabase"

// Develop-time superadmin fallback. SAFE because the app otherwise has
// no auth at all today — anyone with the URL can access everything.
// Remove this constant once real Supabase Auth signups are mandatory.
const SUPERADMIN_FALLBACK_EMAIL = "lakshay@suprans.in"

export interface SpaceRole {
  space_slug: string
  role: "admin" | "member" | "viewer" | "restricted"
}

export interface ModulePermission {
  space_slug: string
  module: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface UserGroupMembership {
  group_id: string
  name: string
  color: string
}

export interface CurrentUser {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
  is_superadmin: boolean
  is_active: boolean
  user_type: string
  space_roles: SpaceRole[]
  module_permissions: ModulePermission[]
  groups: UserGroupMembership[]
}

interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean
  isSuperadmin: boolean
  hasSpaceAccess: (spaceSlug: string) => boolean
  spaceRole: (spaceSlug: string) => SpaceRole["role"] | null
  hasModulePermission: (
    spaceSlug: string,
    module: string,
    action?: "view" | "create" | "edit" | "delete"
  ) => boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isSuperadmin: false,
  hasSpaceAccess: () => false,
  spaceRole: () => null,
  hasModulePermission: () => false,
  refresh: async () => {},
})

async function loadUserByEmail(email: string): Promise<CurrentUser | null> {
  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, email, full_name, display_name, avatar_url, job_title, department, is_superadmin, is_active, user_type"
    )
    .eq("email", email)
    .maybeSingle()

  if (!profile) return null

  // Pull related rows in parallel
  const [rolesRes, permsRes, groupsRes] = await Promise.all([
    supabase
      .from("user_space_roles")
      .select("space_slug, role")
      .eq("user_id", profile.id),
    supabase
      .from("user_module_permissions")
      .select("space_slug, module, can_view, can_create, can_edit, can_delete")
      .eq("user_id", profile.id),
    supabase
      .from("user_group_members")
      .select("group_id, user_groups(id, name, color)")
      .eq("user_id", profile.id),
  ])

  type GroupJoinRow = {
    group_id: string
    user_groups: { id: string; name: string; color: string } | null
  }

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    job_title: profile.job_title,
    department: profile.department,
    is_superadmin: !!profile.is_superadmin,
    is_active: profile.is_active !== false,
    user_type: profile.user_type ?? "internal",
    space_roles: (rolesRes.data ?? []) as SpaceRole[],
    module_permissions: (permsRes.data ?? []) as ModulePermission[],
    groups: ((groupsRes.data ?? []) as unknown as GroupJoinRow[])
      .filter((g) => g.user_groups)
      .map((g) => ({
        group_id: g.group_id,
        name: g.user_groups!.name,
        color: g.user_groups!.color,
      })),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)

    // Try Supabase Auth first
    const { data: sessionData } = await supabase.auth.getUser()
    const authUser = sessionData?.user ?? null

    let resolved: CurrentUser | null = null

    if (authUser?.email) {
      resolved = await loadUserByEmail(authUser.email)
    }

    // Fallback to the development superadmin if no auth session
    if (!resolved) {
      resolved = await loadUserByEmail(SUPERADMIN_FALLBACK_EMAIL)
    }

    setUser(resolved)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    // Re-fetch on auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })
    return () => sub.subscription.unsubscribe()
  }, [refresh])

  const isSuperadmin = !!user?.is_superadmin

  const hasSpaceAccess = useCallback(
    (spaceSlug: string) => {
      if (isSuperadmin) return true
      return !!user?.space_roles.some((r) => r.space_slug === spaceSlug)
    },
    [isSuperadmin, user]
  )

  const spaceRole = useCallback(
    (spaceSlug: string): SpaceRole["role"] | null => {
      if (isSuperadmin) return "admin"
      return user?.space_roles.find((r) => r.space_slug === spaceSlug)?.role ?? null
    },
    [isSuperadmin, user]
  )

  const hasModulePermission = useCallback(
    (spaceSlug: string, module: string, action: "view" | "create" | "edit" | "delete" = "view") => {
      if (isSuperadmin) return true
      const perm = user?.module_permissions.find(
        (p) => p.space_slug === spaceSlug && p.module === module
      )
      if (!perm) return false
      switch (action) {
        case "view":   return perm.can_view
        case "create": return perm.can_create
        case "edit":   return perm.can_edit
        case "delete": return perm.can_delete
      }
    },
    [isSuperadmin, user]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isSuperadmin,
      hasSpaceAccess,
      spaceRole,
      hasModulePermission,
      refresh,
    }),
    [user, loading, isSuperadmin, hasSpaceAccess, spaceRole, hasModulePermission, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

/**
 * Convenience hook returning permission booleans for a specific space + module.
 *
 * Usage:
 *   const { canCreate, canEdit, canDelete } = usePermissions("b2b-ecommerce", "orders")
 *   {canCreate && <Button>New Order</Button>}
 */
export function usePermissions(spaceSlug: string, module: string) {
  const { user, isSuperadmin } = useAuth()

  if (isSuperadmin) {
    return { canView: true, canCreate: true, canEdit: true, canDelete: true }
  }

  const perm = user?.module_permissions.find(
    (p) => p.space_slug === spaceSlug && p.module === module
  )

  if (!perm) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false }
  }

  return {
    canView: perm.can_view,
    canCreate: perm.can_create,
    canEdit: perm.can_edit,
    canDelete: perm.can_delete,
  }
}
