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
}

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
}

export interface ProjectWithChildren extends Project {
  checklist: ChecklistItem[]
  pages: ProjectPage[]
  plugins: ProjectPluginRow[]
}

const PROJECT_COLUMNS =
  "id, slug, brand, brand_label, kind, name, description, version, url, color, sort_order"

function normalizeProject(row: Record<string, unknown>): Project {
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
      .select("id, project_id, item_key, item_label, status, notes, sort_order")
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true })
    if (error) {
      console.error("listChecklistFor error:", error)
      return out
    }
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const projectId = String(row.project_id ?? "")
      const item: ChecklistItem = {
        id: String(row.id ?? ""),
        item_key: String(row.item_key ?? ""),
        item_label: String(row.item_label ?? ""),
        status: String(row.status ?? "pending") as ChecklistStatus,
        notes: (row.notes as string | null) ?? null,
        sort_order: Number(row.sort_order ?? 0),
      }
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
}> {
  const out = {
    checklistByProject: new Map<string, ChecklistItem[]>(),
    pagesByProject: new Map<string, ProjectPage[]>(),
    pluginsByProject: new Map<string, ProjectPluginRow[]>(),
  }
  if (projectIds.length === 0) return out

  try {
    const [checklistRes, pagesRes, pluginsRes] = await Promise.all([
      supabase
        .from("project_checklist")
        .select(
          "id, project_id, item_key, item_label, status, notes, sort_order"
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
    ])

    for (const row of (checklistRes.data ?? []) as Array<
      Record<string, unknown>
    >) {
      const projectId = String(row.project_id ?? "")
      const item: ChecklistItem = {
        id: String(row.id ?? ""),
        item_key: String(row.item_key ?? ""),
        item_label: String(row.item_label ?? ""),
        status: String(row.status ?? "pending") as ChecklistStatus,
        notes: (row.notes as string | null) ?? null,
        sort_order: Number(row.sort_order ?? 0),
      }
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

    const [checklistRes, pagesRes, pluginsRes] = await Promise.all([
      supabase
        .from("project_checklist")
        .select("id, item_key, item_label, status, notes, sort_order")
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
    ])

    const checklist: ChecklistItem[] = (
      (checklistRes.data ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      id: String(row.id ?? ""),
      item_key: String(row.item_key ?? ""),
      item_label: String(row.item_label ?? ""),
      status: String(row.status ?? "pending") as ChecklistStatus,
      notes: (row.notes as string | null) ?? null,
      sort_order: Number(row.sort_order ?? 0),
    }))

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

    return {
      ...project,
      checklist,
      pages: rootPages,
      plugins,
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
