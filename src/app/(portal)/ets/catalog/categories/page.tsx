"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Plus, Trash2, FolderTree } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { EtsEditDrawer, EtsEmptyState } from "@/app/(portal)/ets/_components/ets-ui"

interface CategoryRow {
  id: string
  name: string
  parent_id: string | null
  level: number
  customs_duty_percent: number | null
  igst_percent: number | null
  hs_code: string | null
  compliance_default: string | null
  slug: string | null
  description: string | null
  sort_order: number | null
}

export default function EtsCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("categories")
      .select("id, name, parent_id, level, customs_duty_percent, igst_percent, hs_code, compliance_default, slug, description, sort_order")
      .order("level", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
    setRows((data ?? []) as CategoryRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const childrenByParent = useMemo(() => {
    const m = new Map<string | null, CategoryRow[]>()
    for (const r of rows) {
      const k = r.parent_id
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return m
  }, [rows])

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function handleDelete(c: CategoryRow, e: React.MouseEvent) {
    e.stopPropagation()
    const kids = childrenByParent.get(c.id) ?? []
    if (kids.length > 0) {
      alert(`Cannot delete "${c.name}" — has ${kids.length} child categor${kids.length === 1 ? "y" : "ies"}.`)
      return
    }
    if (!confirm(`Delete category "${c.name}"?`)) return
    const { error } = await supabaseEts.from("categories").delete().eq("id", c.id)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  const roots = childrenByParent.get(null) ?? []

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${rows.length} category nodes`}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="size-4" /> New Category
        </button>
      </div>

      {!loading && rows.length === 0 ? (
        <EtsEmptyState icon={FolderTree} title="No categories yet" description="Add a root category to start the tree." />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <Th>Name</Th>
                  <Th>Level</Th>
                  <Th className="text-right">Customs %</Th>
                  <Th className="text-right">IGST %</Th>
                  <Th>HS Code</Th>
                  <Th>Compliance</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : roots.map((r) => (
                      <CatTreeRow
                        key={r.id}
                        cat={r}
                        depth={0}
                        childrenByParent={childrenByParent}
                        expanded={expanded}
                        toggle={toggle}
                        onEdit={setEditing}
                        onDelete={handleDelete}
                      />
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CategoryDrawer
        open={creating || !!editing}
        mode={editing ? "edit" : "create"}
        initial={editing}
        all={rows}
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
    </div>
  )
}

function CatTreeRow({
  cat,
  depth,
  childrenByParent,
  expanded,
  toggle,
  onEdit,
  onDelete,
}: {
  cat: CategoryRow
  depth: number
  childrenByParent: Map<string | null, CategoryRow[]>
  expanded: Set<string>
  toggle: (id: string) => void
  onEdit: (c: CategoryRow) => void
  onDelete: (c: CategoryRow, e: React.MouseEvent) => void
}) {
  const kids = childrenByParent.get(cat.id) ?? []
  const isOpen = expanded.has(cat.id)
  return (
    <>
      <tr
        onClick={() => onEdit(cat)}
        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
      >
        <td className="px-4 py-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
            {kids.length > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(cat.id)
                }}
                className="p-0.5 rounded hover:bg-muted"
              >
                <ChevronRight className={`size-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
            ) : (
              <span className="size-4 inline-block" />
            )}
            <span className="font-medium">{cat.name}</span>
            {kids.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">({kids.length})</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2 text-muted-foreground text-xs">{cat.level}</td>
        <td className="px-4 py-2 text-right font-mono text-xs">{cat.customs_duty_percent ?? 0}%</td>
        <td className="px-4 py-2 text-right font-mono text-xs">{cat.igst_percent ?? 0}%</td>
        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{cat.hs_code ?? "—"}</td>
        <td className="px-4 py-2">
          <span
            className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
              cat.compliance_default === "safe"
                ? "bg-emerald-50 text-emerald-700"
                : cat.compliance_default === "restricted"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {cat.compliance_default ?? "—"}
          </span>
        </td>
        <td className="px-4 py-2 text-right">
          <button
            onClick={(e) => onDelete(cat, e)}
            className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </td>
      </tr>
      {isOpen &&
        kids.map((k) => (
          <CatTreeRow
            key={k.id}
            cat={k}
            depth={depth + 1}
            childrenByParent={childrenByParent}
            expanded={expanded}
            toggle={toggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  )
}

function CategoryDrawer({
  open,
  mode,
  initial,
  all,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: "create" | "edit"
  initial: CategoryRow | null
  all: CategoryRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState<string>("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErr(null)
    if (initial) {
      setName(initial.name)
      setParentId(initial.parent_id ?? "")
      setSlug(initial.slug ?? "")
      setDescription(initial.description ?? "")
      setSortOrder(String(initial.sort_order ?? 0))
    } else {
      setName("")
      setParentId("")
      setSlug("")
      setDescription("")
      setSortOrder("0")
    }
  }, [open, initial])

  async function submit() {
    if (!name.trim()) {
      setErr("Name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    let level = 0
    if (parentId) {
      const p = all.find((c) => c.id === parentId)
      level = (p?.level ?? 0) + 1
    }
    const payload = {
      name: name.trim(),
      parent_id: parentId || null,
      level,
      slug: slug.trim() || null,
      description: description.trim() || null,
      sort_order: parseInt(sortOrder || "0", 10),
    }
    let error
    if (mode === "edit" && initial) {
      ;({ error } = await supabaseEts.from("categories").update(payload).eq("id", initial.id))
    } else {
      ;({ error } = await supabaseEts.from("categories").insert(payload))
    }
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  // Don't allow choosing self or descendants as parent (simple guard: exclude self)
  const parentOptions = all.filter((c) => !initial || c.id !== initial.id)

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit category" : "New category"}
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
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Parent">
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option value="">— root —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.level)}{c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Slug">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm font-mono" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="Sort order">
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        {err && <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>}
      </div>
    </EtsEditDrawer>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide ${className ?? ""}`}
    >
      {children}
    </th>
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
