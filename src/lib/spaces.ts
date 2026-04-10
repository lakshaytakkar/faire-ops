import { supabase } from "@/lib/supabase"

export interface Space {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  kind: string
  icon: string | null
  color: string
  entry_url: string
  channels: string[]
  sort_order: number
  is_active: boolean
  is_featured: boolean
  metadata: Record<string, unknown>
}

const SPACE_COLUMNS =
  "id, slug, name, tagline, description, kind, icon, color, entry_url, channels, sort_order, is_active, is_featured, metadata"

function normalizeSpace(row: Record<string, unknown>): Space {
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    tagline: (row.tagline as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    kind: String(row.kind ?? ""),
    icon: (row.icon as string | null) ?? null,
    color: String(row.color ?? "#3b82f6"),
    entry_url: String(row.entry_url ?? "/"),
    channels: Array.isArray(row.channels) ? (row.channels as string[]) : [],
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    is_featured: Boolean(row.is_featured),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
  }
}

export async function listSpaces(): Promise<Space[]> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select(SPACE_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
    if (error) {
      console.error("listSpaces error:", error)
      return []
    }
    return (data ?? []).map((row) => normalizeSpace(row as Record<string, unknown>))
  } catch (err) {
    console.error("listSpaces exception:", err)
    return []
  }
}

export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select(SPACE_COLUMNS)
      .eq("slug", slug)
      .maybeSingle()
    if (error) {
      console.error("getSpaceBySlug error:", error)
      return null
    }
    if (!data) return null
    return normalizeSpace(data as Record<string, unknown>)
  } catch (err) {
    console.error("getSpaceBySlug exception:", err)
    return null
  }
}
