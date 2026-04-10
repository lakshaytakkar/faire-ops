"use client"

import { useEffect, useMemo, useState } from "react"
import { X, LifeBuoy, Tag, User, AlertTriangle, Search } from "lucide-react"
import { supabase, supabaseB2B } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketSource = "internal" | "client"
type TicketPriority = "low" | "medium" | "high" | "urgent" | "critical"

interface Category {
  id: string
  name: string
  source: string
  default_priority: TicketPriority | null
  color: string | null
  icon: string | null
  is_active: boolean
}

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

interface RetailerRow {
  id: string
  name: string | null
  company_name: string | null
}

export interface NewTicketModalProps {
  open: boolean
  onClose: () => void
  defaultSource?: TicketSource
  onCreated?: (ticket: unknown) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewTicketModal({
  open,
  onClose,
  defaultSource = "internal",
  onCreated,
}: NewTicketModalProps) {
  const [source, setSource] = useState<TicketSource>(defaultSource)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [priority, setPriority] = useState<TicketPriority>("medium")
  const [assigneeUserId, setAssigneeUserId] = useState<string>("")
  const [reporterName, setReporterName] = useState("")
  const [reporterEmail, setReporterEmail] = useState("")
  const [reporterPhone, setReporterPhone] = useState("")
  const [retailerId, setRetailerId] = useState<string>("")
  const [retailerSearch, setRetailerSearch] = useState("")
  const [tags, setTags] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [retailers, setRetailers] = useState<RetailerRow[]>([])
  const [loadingLookups, setLoadingLookups] = useState(false)

  // Reset fields when opening
  useEffect(() => {
    if (open) {
      setSource(defaultSource)
      setTitle("")
      setDescription("")
      setCategoryId("")
      setPriority("medium")
      setAssigneeUserId("")
      setReporterName("")
      setReporterEmail("")
      setReporterPhone("")
      setRetailerId("")
      setRetailerSearch("")
      setTags("")
      setError(null)
    }
  }, [open, defaultSource])

  // Fetch lookups
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function run() {
      setLoadingLookups(true)
      const [catRes, userRes] = await Promise.all([
        supabase
          .from("ticket_categories")
          .select("id, name, source, default_priority, color, icon, is_active")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("users")
          .select("id, full_name, email, avatar_url")
          .order("full_name")
          .limit(200),
      ])
      if (cancelled) return
      setCategories((catRes.data as Category[]) ?? [])
      setUsers((userRes.data as UserRow[]) ?? [])
      setLoadingLookups(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open])

  // Retailer search when client source
  useEffect(() => {
    if (!open || source !== "client") return
    let cancelled = false
    async function run() {
      let query = supabaseB2B
        .from("faire_retailers")
        .select("id, name, company_name")
        .order("last_order_at", { ascending: false })
        .limit(20)
      if (retailerSearch.trim()) {
        query = query.or(
          `name.ilike.%${retailerSearch}%,company_name.ilike.%${retailerSearch}%`,
        )
      }
      const { data } = await query
      if (cancelled) return
      setRetailers((data as RetailerRow[]) ?? [])
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, source, retailerSearch])

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.source === source || c.source === "both"),
    [categories, source],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        source,
        category_id: categoryId || null,
        priority,
        assignee_user_id: assigneeUserId || null,
        reporter_name: source === "client" ? reporterName.trim() || null : null,
        reporter_email: source === "client" ? reporterEmail.trim() || null : null,
        reporter_phone: source === "client" ? reporterPhone.trim() || null : null,
        retailer_id: source === "client" && retailerId ? retailerId : null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: "open",
      }
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || "Failed to create ticket")
      }
      const ticket = await res.json().catch(() => null)
      onCreated?.(ticket)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-border/80 bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[0.9375rem] font-semibold tracking-tight">New Ticket</h2>
              <p className="text-xs text-muted-foreground">Create a support ticket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Source toggle */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Source</label>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {(["internal", "client"] as TicketSource[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`h-9 px-4 text-sm font-medium capitalize transition-colors ${
                    source === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Brief summary of the issue"
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide context, steps to reproduce, links..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  const id = e.target.value
                  setCategoryId(id)
                  const cat = filteredCategories.find((c) => c.id === id)
                  if (cat?.default_priority) setPriority(cat.default_priority)
                }}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <User className="h-3 w-3" /> Assignee
            </label>
            <select
              value={assigneeUserId}
              onChange={(e) => setAssigneeUserId(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.email ?? u.id}
                </option>
              ))}
            </select>
          </div>

          {/* Client fields */}
          {source === "client" && (
            <div className="rounded-md border border-border/80 bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Reporter
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Phone
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Retailer (optional)
                </label>
                <div className="relative mb-2">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={retailerSearch}
                    onChange={(e) => setRetailerSearch(e.target.value)}
                    placeholder="Search retailers..."
                    className="w-full h-9 rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <select
                  value={retailerId}
                  onChange={(e) => setRetailerId(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">No retailer</option>
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.company_name ?? r.name ?? r.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="billing, shipping, urgent"
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 text-red-700 px-3 py-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}

          {loadingLookups && (
            <p className="text-xs text-muted-foreground">Loading options...</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewTicketModal
