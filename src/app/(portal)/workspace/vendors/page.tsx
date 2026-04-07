"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Users,
  Star,
  Clock,
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Vendor {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  country: string | null
  specialties: string[] | null
  notes: string | null
  is_default: boolean
  rating: number
  avg_lead_days: number | null
  completed_orders: number
  created_at: string
}

type VendorForm = Omit<Vendor, "id" | "created_at">

const EMPTY_FORM: VendorForm = {
  name: "",
  contact_name: null,
  email: null,
  phone: null,
  whatsapp: null,
  country: null,
  specialties: null,
  notes: null,
  is_default: false,
  rating: 0,
  avg_lead_days: null,
  completed_orders: 0,
}

/* ------------------------------------------------------------------ */
/*  Stars helper                                                       */
/* ------------------------------------------------------------------ */

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= value
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-muted-foreground/40"
          }`}
        />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VendorsPage() {
  type SortKey = "orders" | "leadTime"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("orders")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorForm>(EMPTY_FORM)
  const [specialtiesInput, setSpecialtiesInput] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  /* ---- fetch ---- */
  const fetchVendors = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("faire_vendors")
      .select("*")
      .order("name")
    if (error) console.error("fetchVendors:", error)
    setVendors(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  /* ---- stats ---- */
  const totalVendors = vendors.length
  const defaultVendor = vendors.find((v) => v.is_default)?.name ?? "None"
  const avgLead =
    vendors.filter((v) => v.avg_lead_days != null).length > 0
      ? Math.round(
          vendors.reduce((s, v) => s + (v.avg_lead_days ?? 0), 0) /
            vendors.filter((v) => v.avg_lead_days != null).length
        )
      : 0
  const totalOrders = vendors.reduce((s, v) => s + v.completed_orders, 0)

  /* ---- dialog helpers ---- */
  function openAdd() {
    setEditingVendor(null)
    setForm(EMPTY_FORM)
    setSpecialtiesInput("")
    setDialogOpen(true)
  }

  function openEdit(v: Vendor) {
    setEditingVendor(v)
    setForm({
      name: v.name,
      contact_name: v.contact_name,
      email: v.email,
      phone: v.phone,
      whatsapp: v.whatsapp,
      country: v.country,
      specialties: v.specialties,
      notes: v.notes,
      is_default: v.is_default,
      rating: v.rating,
      avg_lead_days: v.avg_lead_days,
      completed_orders: v.completed_orders,
    })
    setSpecialtiesInput((v.specialties ?? []).join(", "))
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      specialties: specialtiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }

    if (editingVendor) {
      await supabase
        .from("faire_vendors")
        .update(payload)
        .eq("id", editingVendor.id)
    } else {
      await supabase.from("faire_vendors").insert(payload)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchVendors()
  }

  async function handleDelete() {
    if (!deleteId) return
    await supabase.from("faire_vendors").delete().eq("id", deleteId)
    setDeleteId(null)
    fetchVendors()
  }

  /* ---- loading skeleton ---- */
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Vendors</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage supplier relationships
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Add Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Vendors</p>
            <p className="text-2xl font-bold mt-1">{totalVendors}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Default Vendor</p>
            <p className="text-lg font-semibold mt-1 truncate max-w-[140px]">{defaultVendor}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Star className="h-4 w-4 text-emerald-500" />
          </div>
        </div>

        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Avg Lead Time</p>
            <p className="text-2xl font-bold mt-1">{avgLead} days</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
        </div>

        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Completed Orders</p>
            <p className="text-2xl font-bold mt-1">{totalOrders}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      {vendors.length === 0 ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <Truck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No vendors yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your first vendor to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Country</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Specialties</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("leadTime")}>
                    <span className="flex items-center">Lead Days <SortIcon col="leadTime" /></span>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("orders")}>
                    <span className="flex items-center">Orders <SortIcon col="orders" /></span>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Rating</th>
                  <th className="px-4 py-3.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...vendors].sort((a, b) => {
                  const dir = sortDir === "asc" ? 1 : -1
                  switch (sortKey) {
                    case "orders":
                      return dir * (a.completed_orders - b.completed_orders)
                    case "leadTime":
                      return dir * ((a.avg_lead_days ?? 0) - (b.avg_lead_days ?? 0))
                    default:
                      return 0
                  }
                }).map((v) => (
                  <tr
                    key={v.id}
                    className="border-t hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">
                      {v.name}
                      {v.is_default && (
                        <span className="ml-2 border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {v.contact_name ?? "-"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {v.email ?? "-"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {v.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {v.country ?? "-"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(v.specialties ?? []).map((s) => (
                          <span
                            key={s}
                            className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                          >
                            {s}
                          </span>
                        ))}
                        {(!v.specialties || v.specialties.length === 0) && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {v.avg_lead_days ?? "-"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {v.completed_orders}
                    </td>
                    <td className="px-4 py-3.5">
                      <Stars value={v.rating} />
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(v)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteId(v.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                {editingVendor ? "Edit Vendor" : "Add Vendor"}
              </Dialog.Title>
              <Dialog.Close
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
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
                  placeholder="Vendor name"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Contact Name</label>
                  <Input
                    value={form.contact_name ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, contact_name: e.target.value || null })
                    }
                    placeholder="Contact person"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value || null })
                    }
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value || null })
                    }
                    placeholder="+1 555 000 0000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
                  <Input
                    value={form.whatsapp ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, whatsapp: e.target.value || null })
                    }
                    placeholder="+1 555 000 0000"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Country</label>
                  <Input
                    value={form.country ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value || null })
                    }
                    placeholder="e.g. China"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Avg Lead Days</label>
                  <Input
                    type="number"
                    value={form.avg_lead_days ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        avg_lead_days: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="e.g. 14"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Specialties (comma-separated)
                </label>
                <Input
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
                  placeholder="e.g. Candles, Jewelry, Home Decor"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value || null })
                  }
                  placeholder="Additional notes..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rating (0-5)</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={form.rating}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rating: Math.min(5, Math.max(0, Number(e.target.value))),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(e) =>
                        setForm({ ...form, is_default: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="text-xs font-medium text-muted-foreground">Default Vendor</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : editingVendor ? "Update" : "Create"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Delete Vendor
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this vendor? This action cannot be undone.
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
