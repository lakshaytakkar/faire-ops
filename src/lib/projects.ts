import { supabase } from "@/lib/supabase"

/**
 * Projects catalogue — tracks every landing page, client portal, admin
 * portal and vendor portal across all brands, with a per-project checklist,
 * pages tree and installed plugins.
 *
 * Backed by the `projects`, `project_checklist`, `project_pages`,
 * `project_plugins` tables (see migration `create_projects_catalogue`).
 */

export type ProjectKind =
  | "landing"
  | "client-portal"
  | "admin-portal"
  | "vendor-portal"

export type ProjectVersion = "mvp" | "alpha" | "beta" | "stable"

export type ChecklistStatus =
  | "done"
  | "in-progress"
  | "pending"
  | "not-applicable"

export type PageStatus = "done" | "in-progress" | "pending"

export type PluginInstallStatus = "installed" | "configured" | "planned"

export interface ChecklistItem {
  id: string
  item_key: string
  item_label: string
  status: ChecklistStatus
  notes: string | null
  sort_order: number
  parent_key: string | null
  dimension: string | null
  applicable: boolean
  release_phase: "v1" | "v2"
}

export const DIMENSIONS: Array<{ key: string; label: string; sort_order: number }> = [
  { key: "landing-page", label: "Landing Page", sort_order: 10 },
  { key: "copywriting", label: "Copywriting", sort_order: 20 },
  { key: "images", label: "Images", sort_order: 30 },
  { key: "client-portal", label: "Client Portal", sort_order: 40 },
  { key: "admin-portal", label: "Admin Portal", sort_order: 50 },
  { key: "testing", label: "Testing", sort_order: 60 },
  { key: "data-seeding", label: "Data Seeding", sort_order: 70 },
  { key: "email-automation", label: "Email Automation", sort_order: 80 },
]

export interface ProjectPage {
  id: string
  parent_id: string | null
  name: string
  path: string | null
  status: PageStatus
  sort_order: number
  subpages?: ProjectPage[]
}

export interface ProjectPluginRow {
  id: string
  plugin_slug: string
  plugin_label: string
  status: PluginInstallStatus
}

export type ProjectStatus = "live" | "building" | "planning" | "on-hold" | "deprecated"
export type ProjectHealth = "green" | "yellow" | "red" | "unknown"

export interface Project {
  id: string
  slug: string
  brand: string
  brand_label: string
  kind: ProjectKind
  name: string
  description: string | null
  version: ProjectVersion
  url: string | null
  color: string | null
  sort_order: number
  /* ---- development metadata (added 2026-04-13) ---- */
  venture: string | null
  status: ProjectStatus
  health: ProjectHealth
  tech_stack: string[]
  owner_name: string | null
  owner_email: string | null
  last_deploy_at: string | null
  narrative: string | null
}

export interface ProjectCredentials {
  project_id: string
  github_url: string | null
  github_repo_slug: string | null
  supabase_project_id: string | null
  supabase_project_url: string | null
  supabase_anon_key: string | null
  supabase_dashboard_url: string | null
  vercel_project_slug: string | null
  vercel_dashboard_url: string | null
  production_url: string | null
  staging_url: string | null
  dev_url: string | null
  figma_url: string | null
  notes: string | null
}

export interface ProjectBrandKit {
  project_id: string
  primary_color: string | null
  accent_color: string | null
  bg_color: string | null
  text_color: string | null
  font_heading: string | null
  font_body: string | null
  tagline: string | null
  voice_guidelines: string | null
  logo_full_url: string | null
  logo_icon_url: string | null
  logo_mono_url: string | null
  logo_dark_url: string | null
  image_style_notes: string | null
}

export interface ProjectWithChildren extends Project {
  checklist: ChecklistItem[]
  pages: ProjectPage[]
  plugins: ProjectPluginRow[]
  credentials: ProjectCredentials | null
  brand_kit: ProjectBrandKit | null
}

const PROJECT_COLUMNS =
  "id, slug, brand, brand_label, kind, name, description, version, url, color, sort_order, venture, status, health, tech_stack, owner_name, owner_email, last_deploy_at, narrative"

function normalizeChecklistItem(row: Record<string, unknown>): ChecklistItem {
  return {
    id: String(row.id ?? ""),
    item_key: String(row.item_key ?? ""),
    item_label: String(row.item_label ?? ""),
    status: String(row.status ?? "pending") as ChecklistStatus,
    notes: (row.notes as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    parent_key: (row.parent_key as string | null) ?? null,
    dimension: (row.dimension as string | null) ?? null,
    applicable: row.applicable === undefined ? true : Boolean(row.applicable),
    release_phase: (String(row.release_phase ?? "v1") as "v1" | "v2"),
  }
}

function normalizeCredentials(row: Record<string, unknown>): ProjectCredentials {
  const s = (k: string): string | null => (row[k] as string | null) ?? null
  return {
    project_id: String(row.project_id ?? ""),
    github_url: s("github_url"),
    github_repo_slug: s("github_repo_slug"),
    supabase_project_id: s("supabase_project_id"),
    supabase_project_url: s("supabase_project_url"),
    supabase_anon_key: s("supabase_anon_key"),
    supabase_dashboard_url: s("supabase_dashboard_url"),
    vercel_project_slug: s("vercel_project_slug"),
    vercel_dashboard_url: s("vercel_dashboard_url"),
    production_url: s("production_url"),
    staging_url: s("staging_url"),
    dev_url: s("dev_url"),
    figma_url: s("figma_url"),
    notes: s("notes"),
  }
}

function normalizeBrandKit(row: Record<string, unknown>): ProjectBrandKit {
  const s = (k: string): string | null => (row[k] as string | null) ?? null
  return {
    project_id: String(row.project_id ?? ""),
    primary_color: s("primary_color"),
    accent_color: s("accent_color"),
    bg_color: s("bg_color"),
    text_color: s("text_color"),
    font_heading: s("font_heading"),
    font_body: s("font_body"),
    tagline: s("tagline"),
    voice_guidelines: s("voice_guidelines"),
    logo_full_url: s("logo_full_url"),
    logo_icon_url: s("logo_icon_url"),
    logo_mono_url: s("logo_mono_url"),
    logo_dark_url: s("logo_dark_url"),
    image_style_notes: s("image_style_notes"),
  }
}

function normalizeProject(row: Record<string, unknown>): Project {
  const raw = row.tech_stack
  const tech_stack: string[] = Array.isArray(raw)
    ? (raw as unknown[]).map((x) => String(x))
    : []
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    brand: String(row.brand ?? ""),
    brand_label: String(row.brand_label ?? ""),
    kind: String(row.kind ?? "admin-portal") as ProjectKind,
    name: String(row.name ?? ""),
    description: (row.description as string | null) ?? null,
    version: String(row.version ?? "mvp") as ProjectVersion,
    url: (row.url as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    venture: (row.venture as string | null) ?? null,
    status: (String(row.status ?? "building") as ProjectStatus),
    health: (String(row.health ?? "unknown") as ProjectHealth),
    tech_stack,
    owner_name: (row.owner_name as string | null) ?? null,
    owner_email: (row.owner_email as string | null) ?? null,
    last_deploy_at: (row.last_deploy_at as string | null) ?? null,
    narrative: (row.narrative as string | null) ?? null,
  }
}

export async function listProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .order("sort_order", { ascending: true })
    if (error) {
      console.error("listProjects error:", error)
      return []
    }
    return (data ?? []).map((row) =>
      normalizeProject(row as Record<string, unknown>)
    )
  } catch (err) {
    console.error("listProjects exception:", err)
    return []
  }
}

/**
 * Fetch the checklist for an array of project ids in a single round-trip.
 * Returned map: projectId -> ChecklistItem[] (sorted by sort_order).
 */
export async function listChecklistFor(
  projectIds: string[]
): Promise<Map<string, ChecklistItem[]>> {
  const out = new Map<string, ChecklistItem[]>()
  if (projectIds.length === 0) return out
  try {
    const { data, error } = await supabase
      .from("project_checklist")
      .select("id, project_id, item_key, item_label, status, notes, sort_order, parent_key, dimension, applicable, release_phase")
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true })
    if (error) {
      console.error("listChecklistFor error:", error)
      return out
    }
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const projectId = String(row.project_id ?? "")
      const item = normalizeChecklistItem(row)
      const arr = out.get(projectId) ?? []
      arr.push(item)
      out.set(projectId, arr)
    }
  } catch (err) {
    console.error("listChecklistFor exception:", err)
  }
  return out
}

/**
 * Fetch the full child records (checklist, pages, plugins) for every project
 * in one batched set of queries. Used by the homepage so the inline project
 * detail view can render instantly on click without a second round-trip.
 */
export async function listAllProjectChildren(
  projectIds: string[]
): Promise<{
  checklistByProject: Map<string, ChecklistItem[]>
  pagesByProject: Map<string, ProjectPage[]>
  pluginsByProject: Map<string, ProjectPluginRow[]>
  credentialsByProject: Map<string, ProjectCredentials>
  brandKitByProject: Map<string, ProjectBrandKit>
}> {
  const out = {
    checklistByProject: new Map<string, ChecklistItem[]>(),
    pagesByProject: new Map<string, ProjectPage[]>(),
    pluginsByProject: new Map<string, ProjectPluginRow[]>(),
    credentialsByProject: new Map<string, ProjectCredentials>(),
    brandKitByProject: new Map<string, ProjectBrandKit>(),
  }
  if (projectIds.length === 0) return out

  try {
    const [checklistRes, pagesRes, pluginsRes, credsRes, brandRes] = await Promise.all([
      supabase
        .from("project_checklist")
        .select(
          "id, project_id, item_key, item_label, status, notes, sort_order, parent_key, dimension, applicable, release_phase"
        )
        .in("project_id", projectIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_pages")
        .select("id, project_id, parent_id, name, path, status, sort_order")
        .in("project_id", projectIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_plugins")
        .select("id, project_id, plugin_slug, plugin_label, status")
        .in("project_id", projectIds)
        .order("plugin_label", { ascending: true }),
      supabase
        .from("project_credentials")
        .select("*")
        .in("project_id", projectIds),
      supabase
        .from("project_brand_kit")
        .select("*")
        .in("project_id", projectIds),
    ])

    for (const row of (checklistRes.data ?? []) as Array<
      Record<string, unknown>
    >) {
      const projectId = String(row.project_id ?? "")
      const item = normalizeChecklistItem(row)
      const arr = out.checklistByProject.get(projectId) ?? []
      arr.push(item)
      out.checklistByProject.set(projectId, arr)
    }

    // Build flat pages per project, then nest by parent_id.
    const flatByProject = new Map<string, ProjectPage[]>()
    for (const row of (pagesRes.data ?? []) as Array<
      Record<string, unknown>
    >) {
      const projectId = String(row.project_id ?? "")
      const page: ProjectPage = {
        id: String(row.id ?? ""),
        parent_id: (row.parent_id as string | null) ?? null,
        name: String(row.name ?? ""),
        path: (row.path as string | null) ?? null,
        status: String(row.status ?? "pending") as PageStatus,
        sort_order: Number(row.sort_order ?? 0),
        subpages: [],
      }
      const arr = flatByProject.get(projectId) ?? []
      arr.push(page)
      flatByProject.set(projectId, arr)
    }
    for (const [projectId, flat] of flatByProject.entries()) {
      const index = new Map(flat.map((p) => [p.id, p]))
      const roots: ProjectPage[] = []
      for (const p of flat) {
        if (p.parent_id && index.has(p.parent_id)) {
          index.get(p.parent_id)!.subpages!.push(p)
        } else {
          roots.push(p)
        }
      }
      out.pagesByProject.set(projectId, roots)
    }

    for (const row of (pluginsRes.data ?? []) as Array<
      Record<string, unknown>
    >) {
      const projectId = String(row.project_id ?? "")
      const plugin: ProjectPluginRow = {
        id: String(row.id ?? ""),
        plugin_slug: String(row.plugin_slug ?? ""),
        plugin_label: String(row.plugin_label ?? ""),
        status: String(row.status ?? "installed") as PluginInstallStatus,
      }
      const arr = out.pluginsByProject.get(projectId) ?? []
      arr.push(plugin)
      out.pluginsByProject.set(projectId, arr)
    }

    for (const row of (credsRes.data ?? []) as Array<Record<string, unknown>>) {
      const projectId = String(row.project_id ?? "")
      out.credentialsByProject.set(projectId, normalizeCredentials(row))
    }

    for (const row of (brandRes.data ?? []) as Array<Record<string, unknown>>) {
      const projectId = String(row.project_id ?? "")
      out.brandKitByProject.set(projectId, normalizeBrandKit(row))
    }
  } catch (err) {
    console.error("listAllProjectChildren exception:", err)
  }

  return out
}

export async function getProjectBySlug(
  slug: string
): Promise<ProjectWithChildren | null> {
  try {
    const { data: projectRow, error: projectErr } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("slug", slug)
      .maybeSingle()
    if (projectErr || !projectRow) {
      if (projectErr) console.error("getProjectBySlug error:", projectErr)
      return null
    }
    const project = normalizeProject(projectRow as Record<string, unknown>)

    const [checklistRes, pagesRes, pluginsRes, credsRes, brandRes] = await Promise.all([
      supabase
        .from("project_checklist")
        .select("id, item_key, item_label, status, notes, sort_order, parent_key, dimension, applicable, release_phase")
        .eq("project_id", project.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_pages")
        .select("id, parent_id, name, path, status, sort_order")
        .eq("project_id", project.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_plugins")
        .select("id, plugin_slug, plugin_label, status")
        .eq("project_id", project.id)
        .order("plugin_label", { ascending: true }),
      supabase
        .from("project_credentials")
        .select("*")
        .eq("project_id", project.id)
        .maybeSingle(),
      supabase
        .from("project_brand_kit")
        .select("*")
        .eq("project_id", project.id)
        .maybeSingle(),
    ])

    const checklist: ChecklistItem[] = (
      (checklistRes.data ?? []) as Array<Record<string, unknown>>
    ).map((row) => normalizeChecklistItem(row))

    // Build the flat page list, then nest subpages under parents.
    const flatPages: ProjectPage[] = (
      (pagesRes.data ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      id: String(row.id ?? ""),
      parent_id: (row.parent_id as string | null) ?? null,
      name: String(row.name ?? ""),
      path: (row.path as string | null) ?? null,
      status: String(row.status ?? "pending") as PageStatus,
      sort_order: Number(row.sort_order ?? 0),
      subpages: [],
    }))
    const pageIndex = new Map(flatPages.map((p) => [p.id, p]))
    const rootPages: ProjectPage[] = []
    for (const page of flatPages) {
      if (page.parent_id && pageIndex.has(page.parent_id)) {
        pageIndex.get(page.parent_id)!.subpages!.push(page)
      } else {
        rootPages.push(page)
      }
    }

    const plugins: ProjectPluginRow[] = (
      (pluginsRes.data ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      id: String(row.id ?? ""),
      plugin_slug: String(row.plugin_slug ?? ""),
      plugin_label: String(row.plugin_label ?? ""),
      status: String(row.status ?? "installed") as PluginInstallStatus,
    }))

    const credentials = credsRes.data
      ? normalizeCredentials(credsRes.data as Record<string, unknown>)
      : null
    const brand_kit = brandRes.data
      ? normalizeBrandKit(brandRes.data as Record<string, unknown>)
      : null

    return {
      ...project,
      checklist,
      pages: rootPages,
      plugins,
      credentials,
      brand_kit,
    }
  } catch (err) {
    console.error("getProjectBySlug exception:", err)
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Derived metrics                                                    */
/* ------------------------------------------------------------------ */

export interface ChecklistSummary {
  total: number
  done: number
  inProgress: number
  pending: number
  notApplicable: number
  /** 0..100 — done count / applicable total */
  percentComplete: number
}

export function summarizeChecklist(
  items: ChecklistItem[]
): ChecklistSummary {
  const summary: ChecklistSummary = {
    total: items.length,
    done: 0,
    inProgress: 0,
    pending: 0,
    notApplicable: 0,
    percentComplete: 0,
  }
  for (const i of items) {
    if (i.status === "done") summary.done++
    else if (i.status === "in-progress") summary.inProgress++
    else if (i.status === "not-applicable") summary.notApplicable++
    else summary.pending++
  }
  const applicable = summary.total - summary.notApplicable
  summary.percentComplete =
    applicable === 0 ? 0 : Math.round((summary.done / applicable) * 100)
  return summary
}

/* ------------------------------------------------------------------ */
/*  Display helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Per-dimension completion rollup. For each of the 8 canonical dimensions
 * returns the % complete among applicable children, `null` if no applicable
 * children (= N/A cell in the matrix).
 */
export type DimensionSummary = {
  key: string
  label: string
  percent: number | null  // null = N/A
  done: number
  total: number
}

export function summarizeByDimension(items: ChecklistItem[]): DimensionSummary[] {
  return DIMENSIONS.map((d) => {
    const children = items.filter((i) => i.dimension === d.key && i.parent_key !== null)
    const applicable = children.filter((c) => c.applicable)
    if (applicable.length === 0) {
      return { key: d.key, label: d.label, percent: null, done: 0, total: 0 }
    }
    const done = applicable.filter((c) => c.status === "done").length
    return {
      key: d.key,
      label: d.label,
      percent: Math.round((done / applicable.length) * 100),
      done,
      total: applicable.length,
    }
  })
}

/** Cycle a checklist item's status: pending → in-progress → done → pending */
export function cycleChecklistStatus(current: ChecklistStatus): ChecklistStatus {
  if (current === "not-applicable") return current
  if (current === "pending") return "in-progress"
  if (current === "in-progress") return "done"
  return "pending"
}

export async function updateChecklistItemStatus(
  id: string,
  status: ChecklistStatus
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("project_checklist")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) {
      console.error("updateChecklistItemStatus error:", error)
      return false
    }
    return true
  } catch (err) {
    console.error("updateChecklistItemStatus exception:", err)
    return false
  }
}

export function kindLabel(kind: ProjectKind): string {
  switch (kind) {
    case "landing":
      return "Landing"
    case "client-portal":
      return "Client Portal"
    case "admin-portal":
      return "Admin Portal"
    case "vendor-portal":
      return "Vendor Portal"
  }
}

export function versionLabel(version: ProjectVersion): string {
  return version.toUpperCase()
}

export function versionColor(version: ProjectVersion): string {
  switch (version) {
    case "mvp":
      return "text-amber-700 bg-amber-50 ring-amber-200"
    case "alpha":
      return "text-orange-700 bg-orange-50 ring-orange-200"
    case "beta":
      return "text-blue-700 bg-blue-50 ring-blue-200"
    case "stable":
      return "text-emerald-700 bg-emerald-50 ring-emerald-200"
  }
}
