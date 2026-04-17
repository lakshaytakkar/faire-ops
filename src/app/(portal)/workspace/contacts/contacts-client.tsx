"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Star,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  Search,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { supabase } from "@/lib/supabase"
import { useActiveSpace } from "@/lib/use-active-space"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Category = "vendor" | "client" | "partner" | "internal" | "other"

interface Contact {
  id: string
  space_slug: string
  name: string
  company: string | null
  category: Category
  role: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  address: string | null
  tags: string[] | null
  notes: string | null
  is_favorite: boolean
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

type ContactForm = Omit<Contact, "id" | "created_at" | "updated_at" | "space_slug">

const EMPTY_FORM: ContactForm = {
  name: "",
  company: null,
  category: "vendor",
  role: null,
  email: null,
  phone: null,
  whatsapp: null,
  website: null,
  address: null,
  tags: null,
  notes: null,
  is_favorite: false,
  last_contacted_at: null,
}

const CATEGORY_OPTIONS: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "vendor", label: "Vendors" },
  { value: "client", label: "Clients" },
  { value: "partner", label: "Partners" },
  { value: "internal", label: "Internal" },
  { value: "other", label: "Other" },
]

const CATEGORY_TONE: Record<Category, StatusTone> = {
  vendor: "amber",
  client: "emerald",
  partner: "violet",
  internal: "blue",
  other: "slate",
}

export default function ContactsPage() {
  const { slug: spaceSlug } = useActiveSpace()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [category, setCategory] = useState<Category | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [tagsInput, setTagsInput] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("space_slug", spaceSlug)
      .order("is_favorite", { ascending: false })
      .order("name", { ascending: true })
    if (error) console.error("fetchContacts:", error)
    setContacts((data ?? []) as Contact[])
    setLoading(false)
  }, [spaceSlug])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const kpis = useMemo(() => {
    const byCat = (c: Category) => contacts.filter((x) => x.category === c).length
    return {
      total: contacts.length,
      vendors: byCat("vendor"),
      clients: byCat("client"),
      partners: byCat("partner"),
    }
  }, [contacts])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return contacts.filter((c) => {
      if (category !== "all" && c.category !== category) return false
      if (!needle) return true
      const hay = `${c.name} ${c.company ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${c.role ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [contacts, q, category])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setTagsInput("")
    setDialogOpen(true)
  }

  function openEdit(c: Contact) {
    setEditing(c)
    setForm({
      name: c.name,
      company: c.company,
      category: c.category,
      role: c.role,
      email: c.email,
      phone: c.phone,
      whatsapp: c.whatsapp,
      website: c.website,
      address: c.address,
      tags: c.tags,
      notes: c.notes,
      is_favorite: c.is_favorite,
      last_contacted_at: c.last_contacted_at,
    })
    setTagsInput((c.tags ?? []).join(", "))
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const tagsClean = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const payload = {
      ...form,
      tags: tagsClean.length ? tagsClean : null,
      space_slug: spaceSlug,
    }

    if (editing) {
      await supabase.from("contacts").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("contacts").insert(payload)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchContacts()
  }

  async function handleDelete() {
    if (!deleteId) return
    await supabase.from("contacts").delete().eq("id", deleteId)
    setDeleteId(null)
    fetchContacts()
  }

  async function toggleFavorite(c: Contact) {
    await supabase
      .from("contacts")
      .update({ is_favorite: !c.is_favorite })
      .eq("id", c.id)
    fetchContacts()
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-[60px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[100px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Contacts"
        subtitle={`Scoped to ${spaceSlug}. Vendors, clients, partners, and everyone you keep close.`}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Add contact
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={kpis.total} icon={Users} iconTone="blue" />
        <MetricCard label="Vendors" value={kpis.vendors} icon={Users} iconTone="amber" />
        <MetricCard label="Clients" value={kpis.clients} icon={Users} iconTone="emerald" />
        <MetricCard label="Partners" value={kpis.partners} icon={Users} iconTone="violet" />
      </KPIGrid>

      <DetailCard title={`All contacts (${visible.length})`}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, company, email, tag…"
              className="pl-8 h-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "all")}
            className="h-9 px-2.5 text-sm rounded-md border border-input bg-transparent"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={contacts.length === 0 ? "No contacts yet" : "No contacts match"}
            description={
              contacts.length === 0
                ? `Add your first contact for the ${spaceSlug} space.`
                : "Try clearing filters or searching again."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((c) => {
                const phoneClean = c.phone?.replace(/[^0-9]/g, "") ?? ""
                const waUrl = c.whatsapp
                  ? `https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`
                  : phoneClean
                    ? `https://wa.me/91${phoneClean.slice(-10)}`
                    : null
                return (
                  <TableRow key={c.id}>
                    <TableCell className="py-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(c)}
                        className="inline-flex items-center justify-center p-1 rounded hover:bg-muted"
                        title={c.is_favorite ? "Unstar" : "Star"}
                      >
                        <Star
                          className={cn(
                            "size-4",
                            c.is_favorite
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/50",
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.company ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge tone={CATEGORY_TONE[c.category]}>
                        {c.category}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">{c.role ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center justify-center size-7 rounded-md bg-blue-500 text-white hover:bg-blue-600"
                            title={c.email}
                          >
                            <Mail className="size-3.5" />
                          </a>
                        )}
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center justify-center size-7 rounded-md bg-amber-500 text-white hover:bg-amber-600"
                            title={c.phone}
                          >
                            <Phone className="size-3.5" />
                          </a>
                        )}
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center size-7 rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                            title="WhatsApp"
                          >
                            <MessageSquare className="size-3.5" />
                          </a>
                        )}
                        {c.website && (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center size-7 rounded-md bg-slate-700 text-white hover:bg-slate-800"
                            title="Website"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(c)}
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteId(c.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DetailCard>

      {/* Add / Edit Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                {editing ? "Edit contact" : "Add contact"}
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1 hover:bg-muted">
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Company</label>
                  <Input
                    value={form.company ?? ""}
                    onChange={(e) => setForm({ ...form, company: e.target.value || null })}
                    placeholder="Company name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as Category })
                    }
                    className="mt-1 w-full h-9 px-2.5 text-sm rounded-md border border-input bg-transparent"
                  >
                    <option value="vendor">Vendor</option>
                    <option value="client">Client</option>
                    <option value="partner">Partner</option>
                    <option value="internal">Internal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <Input
                    value={form.role ?? ""}
                    onChange={(e) => setForm({ ...form, role: e.target.value || null })}
                    placeholder="e.g. Procurement Lead"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value || null })}
                    placeholder="name@company.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                    placeholder="+91 …"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
                  <Input
                    value={form.whatsapp ?? ""}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value || null })}
                    placeholder="+91 …"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Website</label>
                <Input
                  value={form.website ?? ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value || null })}
                  placeholder="https://…"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <Input
                  value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value || null })}
                  placeholder="Street, City, State"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Tags (comma-separated)
                </label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. electronics, preferred, gurgaon"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_favorite}
                  onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })}
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="text-sm text-muted-foreground">Star as favorite</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">Delete contact</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              This cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
