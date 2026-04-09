"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Plus,
  ExternalLink,
  Star,
  Trash2,
  X,
  Link2,
  Wrench,
  BookOpen,
  Truck,
  Store,
  Globe,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LinkCategory = "tool" | "documentation" | "supplier" | "faire" | "general"

interface ImportantLink {
  id: string
  title: string
  url: string
  description: string | null
  category: LinkCategory
  icon: string | null
  is_pinned: boolean
  sort_order: number | null
  created_at: string
}

type LinkForm = {
  title: string
  url: string
  description: string | null
  category: LinkCategory
  is_pinned: boolean
}

const EMPTY_FORM: LinkForm = {
  title: "",
  url: "",
  description: null,
  category: "general",
  is_pinned: false,
}

const CATEGORIES: LinkCategory[] = ["tool", "documentation", "supplier", "faire", "general"]

const CATEGORY_LABELS: Record<LinkCategory, string> = {
  tool: "Tools",
  documentation: "Documentation",
  supplier: "Suppliers",
  faire: "Faire",
  general: "General",
}

const CATEGORY_STYLES: Record<LinkCategory, string> = {
  tool: "bg-blue-50 text-blue-700",
  documentation: "bg-purple-50 text-purple-700",
  supplier: "bg-amber-50 text-amber-700",
  faire: "bg-emerald-50 text-emerald-700",
  general: "bg-gray-100 text-gray-700",
}

const CATEGORY_THUMBNAIL: Record<LinkCategory, { gradient: string; icon: typeof Wrench }> = {
  tool: { gradient: "bg-gradient-to-br from-blue-500 to-blue-600", icon: Wrench },
  documentation: { gradient: "bg-gradient-to-br from-green-500 to-green-600", icon: BookOpen },
  supplier: { gradient: "bg-gradient-to-br from-amber-500 to-amber-600", icon: Truck },
  faire: { gradient: "bg-gradient-to-br from-purple-500 to-purple-600", icon: Store },
  general: { gradient: "bg-gradient-to-br from-slate-500 to-slate-600", icon: Globe },
}

/* ------------------------------------------------------------------ */
/*  Default seed links                                                 */
/* ------------------------------------------------------------------ */

const SEED_LINKS: Omit<ImportantLink, "id" | "created_at">[] = [
  {
    title: "Faire Seller Dashboard",
    url: "https://www.faire.com/brand-portal",
    description: "Main Faire brand portal for managing orders and products",
    category: "faire",
    icon: null,
    is_pinned: true,
    sort_order: 1,
  },
  {
    title: "Faire API Docs",
    url: "https://www.faire.com/api-docs",
    description: "Official Faire API documentation for integrations",
    category: "documentation",
    icon: null,
    is_pinned: true,
    sort_order: 2,
  },
  {
    title: "Faire Help Center",
    url: "https://www.faire.com/support",
    description: "Faire support and knowledge base articles",
    category: "faire",
    icon: null,
    is_pinned: false,
    sort_order: 3,
  },
  {
    title: "Canva",
    url: "https://www.canva.com",
    description: "Design tool for product images, marketing, and social media",
    category: "tool",
    icon: null,
    is_pinned: false,
    sort_order: 4,
  },
  {
    title: "Google Analytics",
    url: "https://analytics.google.com",
    description: "Track website and store traffic analytics",
    category: "tool",
    icon: null,
    is_pinned: false,
    sort_order: 5,
  },
  {
    title: "Shopify",
    url: "https://admin.shopify.com",
    description: "Shopify admin for DTC store management",
    category: "tool",
    icon: null,
    is_pinned: false,
    sort_order: 6,
  },
  {
    title: "AliExpress",
    url: "https://www.aliexpress.com",
    description: "Supplier marketplace for sourcing products",
    category: "supplier",
    icon: null,
    is_pinned: false,
    sort_order: 7,
  },
  {
    title: "Minea",
    url: "https://app.minea.com",
    description: "Product research and ad spy tool",
    category: "tool",
    icon: null,
    is_pinned: false,
    sort_order: 8,
  },
  {
    title: "WhatsApp Web",
    url: "https://web.whatsapp.com",
    description: "Communication with vendors and suppliers",
    category: "general",
    icon: null,
    is_pinned: false,
    sort_order: 9,
  },
  {
    title: "Google Sheets",
    url: "https://docs.google.com/spreadsheets",
    description: "Spreadsheets for inventory tracking and reports",
    category: "tool",
    icon: null,
    is_pinned: false,
    sort_order: 10,
  },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LinksPage() {
  const [links, setLinks] = useState<ImportantLink[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<LinkForm>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<LinkCategory | "all">("all")

  /* ---- fetch ---- */
  const fetchLinks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("important_links")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("fetchLinks:", error)
      setLinks([])
      setLoading(false)
      return
    }

    /* Seed defaults if empty */
    if (!data || data.length === 0) {
      const { data: seeded, error: seedErr } = await supabase
        .from("important_links")
        .insert(SEED_LINKS)
        .select()
      if (seedErr) console.error("seed error:", seedErr)
      setLinks(seeded ?? [])
    } else {
      setLinks(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  /* ---- filtered + sorted ---- */
  const filtered = useMemo(() => {
    const base =
      activeTab === "all" ? links : links.filter((l) => l.category === activeTab)
    return [...base].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return (a.sort_order ?? 999) - (b.sort_order ?? 999)
    })
  }, [links, activeTab])

  /* ---- dialog helpers ---- */
  function openAdd() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.url.trim()) return
    setSaving(true)

    const payload = {
      title: form.title,
      url: form.url,
      description: form.description || null,
      category: form.category,
      is_pinned: form.is_pinned,
      icon: null,
      sort_order: links.length + 1,
    }

    await supabase.from("important_links").insert(payload)
    setSaving(false)
    setDialogOpen(false)
    fetchLinks()
  }

  async function handleDelete() {
    if (!deleteId) return
    await supabase.from("important_links").delete().eq("id", deleteId)
    setDeleteId(null)
    fetchLinks()
  }

  async function togglePin(link: ImportantLink) {
    await supabase
      .from("important_links")
      .update({ is_pinned: !link.is_pinned })
      .eq("id", link.id)
    fetchLinks()
  }

  /* ---- loading skeleton ---- */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-[60px] rounded-md bg-muted animate-pulse" />
        <div className="h-[40px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[120px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Important Links
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quick access to tools and resources
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Add Link
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "all"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === cat
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 text-center">
          <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No links found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {links.length === 0
              ? "Add your first link to get started."
              : "No links match the selected category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((link) => (
            <div
              key={link.id}
              className="group rounded-lg border border-border/80 bg-card shadow-sm p-4 hover:shadow-sm transition-shadow relative"
            >
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteId(link.id)
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-muted transition-all"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>

              {/* Clickable area */}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  {(() => {
                    const thumb = CATEGORY_THUMBNAIL[link.category]
                    const ThumbIcon = thumb.icon
                    return (
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${thumb.gradient}`}>
                        <ThumbIcon className="h-5 w-5 text-white" />
                      </div>
                    )
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {link.title}
                      </h3>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    {link.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                  </div>
                </div>
              </a>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <span
                  className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[link.category]}`}
                >
                  {CATEGORY_LABELS[link.category]}
                </span>
                <button
                  onClick={() => togglePin(link)}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      link.is_pinned
                        ? "fill-amber-400 text-amber-400"
                        : "fill-none text-muted-foreground/40"
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Link Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Add Link
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Link title"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  URL <span className="text-destructive">*</span>
                </label>
                <Input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value || null })
                  }
                  placeholder="Brief description..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as LinkCategory })
                    }
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_pinned}
                      onChange={(e) =>
                        setForm({ ...form, is_pinned: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="text-xs font-medium text-muted-foreground">Pin to top</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.url.trim()}
              >
                {saving ? "Saving..." : "Create"}
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
              Delete Link
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this link? This action cannot be undone.
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
