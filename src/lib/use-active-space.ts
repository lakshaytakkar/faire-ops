"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { getActiveSpaceSlug } from "@/components/layout/space-dock"

/**
 * Resolves the active space slug from path and search params.
 *
 * Rules:
 *   1. Path prefix wins — if pathname starts with a known space prefix
 *      (e.g. /ets/*, /hq/*, /legal/*), use that slug. This includes the
 *      B2B-legacy root paths (/overview, /orders, /catalog, /workspace, etc.)
 *      which all resolve to `b2b-ecommerce`.
 *   2. When the path is genuinely unscoped (shouldn't happen since B2B
 *      owns the root), fall back to the `?space=` search param.
 *   3. When `?space=` is present AND the pathname is a universal-module
 *      route shared with B2B (/workspace, /operations, /automations,
 *      /analytics), the search param overrides — the user is logically
 *      inside the venture carried by the param even though the URL lives
 *      under a B2B-owned path.
 *
 * This is what lets the right dock do `/workspace/chat?space=ets` and
 * still have the left dock + top nav treat the user as "inside ETS".
 */

/**
 * Path prefixes that belong to B2B-legacy root routes.
 * When one of these is active AND a `?space=` param is present, the param
 * takes precedence (so the user can "carry" a non-B2B space identity
 * through the shared module pages).
 */
const B2B_SHARED_MODULE_PREFIXES = [
  "/workspace",
  "/operations",
  "/automations",
  "/analytics",
  "/dashboard",
  "/overview",
  "/orders",
  "/catalog",
  "/retailers",
  "/marketing",
  "/finance",
  "/reports",
]

function pathIsSharedModule(pathname: string): boolean {
  return B2B_SHARED_MODULE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  )
}

export type ActiveSpace = {
  slug: string
  /** Where the slug came from — useful for diagnostics + UI cues */
  sourcedFrom: "path" | "param" | "default"
}

/** Server + client-safe resolution (accepts raw pathname + search params). */
export function resolveActiveSpace(
  pathname: string,
  searchParams?: URLSearchParams | { get: (k: string) => string | null } | null,
): ActiveSpace {
  const param = searchParams?.get("space") ?? null
  // If we're on a shared module page AND the URL carries a space param,
  // the param is authoritative.
  if (param && pathIsSharedModule(pathname)) {
    return { slug: param, sourcedFrom: "param" }
  }
  // Otherwise let the path decide via the existing prefix map.
  const pathSlug = getActiveSpaceSlug(pathname)
  if (pathSlug !== "b2b-ecommerce") {
    return { slug: pathSlug, sourcedFrom: "path" }
  }
  // We're on a B2B-default path with no param. Honor any explicit param
  // even off a shared module prefix (edge case: someone pasting a link).
  if (param) return { slug: param, sourcedFrom: "param" }
  return { slug: "b2b-ecommerce", sourcedFrom: "default" }
}

/** Client-side hook for React components. */
export function useActiveSpace(): ActiveSpace {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return resolveActiveSpace(pathname, searchParams)
}
