"use client"

import { useEffect, useState } from "react"
import { Layers, Plus, Trash2 } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsStatusBadge,
  EtsEmptyState,
  EtsEditDrawer,
} from "@/app/(portal)/ets/_components/ets-ui"

interface CollectionRow {
  id: string
  name: string
  subtitle: string | null
  description: string | null
  type: string
  badge_label: string | null
  badge_color: string | null
  cover_image_url: string | null
  icon_emoji: string | null
  sort_order: number | null
  is_active: boolean | null
  is_featured: boolean | null
  target_count: number | null
  suggested_qty_per_item: number | null
}

export default function EtsCatalogCollectionsPage() {
  const [rows, setRows] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CollectionRow | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("collections")
      .select("id, name, subtitle, description, type, badge_label, badge_color, cover_image_url, icon_emoji, sort_order, is_active, is_featured, target_count, suggested_qty_per_item")
      .order("sort_order", { ascending: true })
    setRows((data ?? []) as CollectionRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(c: CollectionRow, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete collection "${c.name}"?`)) return
    const { error } = await supabaseEts.from("collections").delete().eq("id", c.id)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  return (
    <EtsListShell
      title="Collections"
      subtitle={loading ? "Loading…" : `${rows.length} collection${rows.length === 1 ? "" : "s"}`}
      action={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="size-4" /> New Collection
        </button>
      }
    >
      {!loading && rows.length === 0 ? (
        <EtsEmptyState
          icon={Layers}
          title="No collections yet"
          description="Create curated product groupings for store-setup themes."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Name</EtsTH>
            <EtsTH>Type</EtsTH>
            <EtsTH>Badge</EtsTH>
            <EtsTH className="text-right">Target</EtsTH>
            <EtsTH className="text-right">Qty/item</EtsTH>
            <EtsTH>Active</EtsTH>
            <EtsTH>Featured</EtsTH>
            <EtsTH className="text-right">Sort</EtsTH>
            <EtsTH />
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((c) => (
                  <EtsTR key={c.id} onClick={() => setEditing(c)}>
                    <EtsTD>
                      <div className="flex items-center gap-2">
                        {c.icon_emoji && <span className="text-base">{c.icon_emoji}</span>}
                        <div>
                          <div className="font-medium text-sm">{c.name}</div>
                          {c.subtitle && (
                            <div className="text-xs text-muted-foreground">{c.subtitle}</div>
                          )}
                        </div>
                      </div>
                    </EtsTD>
                    <EtsTD className="text-xs">{c.type}</EtsTD>
                    <EtsTD>{c.badge_label ?? <span className="text-muted-foreground text-xs">—</span>}</EtsTD>
                    <EtsTD className="text-right font-mono text-xs">{c.target_count ?? "—"}</EtsTD>
                    <EtsTD className="text-right font-mono text-xs">{c.suggested_qty_per_item ?? "—"}</EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={c.is_active ? "Yes" : "No"} />
                    </EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={c.is_featured ? "Yes" : "No"} />
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs">{c.sort_order ?? 0}</EtsTD>
                    <EtsTD className="text-right">
                      <button
                        onClick={(e) => handleDelete(c, e)}
                        className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <CollectionDrawer
        open={creating || !!editing}
        mode={editing ? "edit" : "create"}
        initial={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={() => {
          setCreating(false)
          setEditing(null)
          load()
        }}
      />
    </EtsListShell>
  )
}

function CollectionDrawer({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: "create" | "edit"
  initial: CollectionRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    description: "",
    type: "theme",
    badge_label: "",
    badge_color: "",
    cover_image_url: "",
    icon_emoji: "",
    sort_order: "0",
    is_active: true,
    is_featured: false,
    target_count: "",
    suggested_qty_per_item: "",
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErr(null)
    if (initial) {
      setForm({
        name: initial.name,
        subtitle: initial.subtitle ?? "",
        description: initial.description ?? "",
        type: initial.type,
        badge_label: initial.badge_label ?? "",
        badge_color: initial.badge_color ?? "",
        cover_image_url: initial.cover_image_url ?? "",
        icon_emoji: initial.icon_emoji ?? "",
        sort_order: String(initial.sort_order ?? 0),
        is_active: initial.is_active ?? true,
        is_featured: initial.is_featured ?? false,
        target_count: initial.target_count?.toString() ?? "",
        suggested_qty_per_item: initial.suggested_qty_per_item?.toString() ?? "",
      })
    } else {
      setForm({
        name: "",
        subtitle: "",
        description: "",
        type: "theme",
        badge_label: "",
        badge_color: "",
        cover_image_url: "",
        icon_emoji: "",
        sort_order: "0",
        is_active: true,
        is_featured: false,
        target_count: "",
        suggested_qty_per_item: "",
      })
    }
  }, [open, initial])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.name.trim()) {
      setErr("Name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const payload = {
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      type: form.type,
      badge_label: form.badge_label.trim() || null,
      badge_color: form.badge_color.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      icon_emoji: form.icon_emoji.trim() || null,
      sort_order: parseInt(form.sort_order || "0", 10),
      is_active: form.is_active,
      is_featured: form.is_featured,
      target_count: form.target_count ? parseInt(form.target_count, 10) : null,
      suggested_qty_per_item: form.suggested_qty_per_item ? parseInt(form.suggested_qty_per_item, 10) : null,
    }
    let error
    if (mode === "edit" && initial) {
      ;({ error } = await supabaseEts.from("collections").update(payload).eq("id", initial.id))
    } else {
      ;({ error } = await supabaseEts.from("collections").insert(payload))
    }
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit collection" : "New collection"}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/40">Cancel</button>
          <button onClick={submit} disabled={busy} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Saving…" : mode === "edit" ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Subtitle">
          <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
              <option value="theme">theme</option>
              <option value="seasonal">seasonal</option>
              <option value="category">category</option>
              <option value="custom">custom</option>
            </select>
          </Field>
          <Field label="Sort order">
            <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Badge label">
            <input value={form.badge_label} onChange={(e) => set("badge_label", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </Field>
          <Field label="Badge color">
            <input value={form.badge_color} onChange={(e) => set("badge_color", e.target.value)} placeholder="#10b981 or bg-emerald-500" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </Field>
        </div>
        <Field label="Cover image URL">
          <input value={form.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Icon emoji">
          <input value={form.icon_emoji} onChange={(e) => set("icon_emoji", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target count">
            <input type="number" value={form.target_count} onChange={(e) => set("target_count", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </Field>
          <Field label="Suggested qty / item">
            <input type="number" value={form.suggested_qty_per_item} onChange={(e) => set("suggested_qty_per_item", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </Field>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
            Featured
          </label>
        </div>
        {err && <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>}
      </div>
    </EtsEditDrawer>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
