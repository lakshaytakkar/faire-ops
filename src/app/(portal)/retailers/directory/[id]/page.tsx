"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, MessageCircle, Phone, MapPin, Store, ShoppingBag, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Check, AlertCircle, Loader2 } from "lucide-react"
import { supabase, supabaseB2B } from "@/lib/supabase"
import type { FaireRetailer, FaireOrder } from "@/lib/supabase"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  State badge styles                                                 */
/* ------------------------------------------------------------------ */

const STATE_BADGE: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  PRE_TRANSIT: "bg-blue-50 text-blue-700",
  IN_TRANSIT: "bg-emerald-50 text-emerald-700",
  DELIVERED: "bg-slate-100 text-slate-600",
  CANCELED: "bg-red-50 text-red-700",
  PENDING_RETAILER_CONFIRMATION: "bg-amber-50 text-amber-700",
  BACKORDERED: "bg-amber-50 text-amber-700",
}

const STATE_LABEL: Record<string, string> = {
  NEW: "New",
  PROCESSING: "Processing",
  PRE_TRANSIT: "Pre-Transit",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELED: "Canceled",
  PENDING_RETAILER_CONFIRMATION: "Pending",
  BACKORDERED: "Backordered",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getRetailerName(order: FaireOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "\u2014"
  return (addr.company_name as string) || (addr.name as string) || "\u2014"
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function RetailerDetailPage() {
  const params = useParams<{ id: string }>()
  const { stores } = useBrandFilter()
  const [retailer, setRetailer] = useState<FaireRetailer | null>(null)
  const [orders, setOrders] = useState<FaireOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [adjacentIds, setAdjacentIds] = useState<{prev: string | null, next: string | null}>({prev: null, next: null})
  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [retailerRes, ordersRes] = await Promise.all([
        supabaseB2B
          .from("faire_retailers")
          .select("*")
          .eq("faire_retailer_id", params.id)
          .single(),
        supabaseB2B
          .from("faire_orders")
          .select("*")
          .eq("retailer_id", params.id)
          .order("faire_created_at", { ascending: false })
          .range(0, 99),
      ])

      if (cancelled) return

      if (retailerRes.error || !retailerRes.data) {
        setNotFound(true)
      } else {
        setRetailer(retailerRes.data)
      }
      setOrders(ordersRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [params.id])

  useEffect(() => {
    if (!retailer) return
    supabaseB2B
      .from("faire_retailers")
      .select("faire_retailer_id")
      .order("total_orders", { ascending: false })
      .range(0, 4999)
      .then(({ data }) => {
        if (!data) return
        const idx = data.findIndex(o => o.faire_retailer_id === params.id)
        setAdjacentIds({
          prev: idx > 0 ? data[idx - 1].faire_retailer_id : null,
          next: idx < data.length - 1 ? data[idx + 1].faire_retailer_id : null,
        })
      })
  }, [retailer, params.id])

  /* Revenue summary */
  const revenue = useMemo(() => {
    const totalCents = orders.reduce((s, o) => s + (o.total_cents ?? 0), 0)
    const count = orders.length
    const avgCents = count > 0 ? Math.round(totalCents / count) : 0
    const dates = orders
      .map((o) => o.faire_created_at)
      .filter(Boolean)
      .sort()
    return {
      totalCents,
      count,
      avgCents,
      firstOrder: dates[0] ?? null,
      lastOrder: dates[dates.length - 1] ?? null,
    }
  }, [orders])

  /* ---------------------------------------------------------------- */
  /*  Loading skeleton                                                 */
  /* Unique stores this retailer has ordered from — must be before early returns */
  const retailerStores = useMemo(() => {
    if (!retailer) return []
    const ids = retailer.store_ids ?? []
    return ids.map((id: string) => stores.find((s) => s.id === id)).filter(Boolean)
  }, [retailer, stores])

  /* Derive email from shipping address on orders — must be before early returns */
  const retailerEmail = useMemo(() => {
    for (const o of orders) {
      const addr = o.shipping_address as Record<string, unknown> | null
      if (addr?.email) return addr.email as string
    }
    return ""
  }, [orders])

  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-7 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-64 bg-muted animate-pulse rounded-md" />
            <div className="h-40 bg-muted animate-pulse rounded-md" />
          </div>
          <div className="space-y-5">
            <div className="h-48 bg-muted animate-pulse rounded-md" />
            <div className="h-32 bg-muted animate-pulse rounded-md" />
            <div className="h-32 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  404                                                              */
  /* ---------------------------------------------------------------- */

  if (notFound || !retailer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium">Retailer not found</p>
          <Link href="/retailers/directory" className="text-sm text-primary hover:underline mt-2 inline-block">
            &larr; Back to Retailers
          </Link>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const displayName = retailer.company_name || retailer.name || "\u2014"
  const location = [retailer.city, retailer.state, retailer.country].filter(Boolean).join(", ")
  const displayOrders = orders.slice(0, 20)
  const hasMoreOrders = orders.length > 20

  /* Store lookup helper */
  function getStore(storeId: string) {
    return stores.find((s) => s.id === storeId)
  }

  /* retailerStores + retailerEmail computed above (before early returns) */

  /* Derive phone for WhatsApp */
  const retailerPhone = retailer.phone ?? ""

  /* ---------------------------------------------------------------- */
  /*  Email Modal                                                      */
  /* ---------------------------------------------------------------- */

  function EmailModal({ onClose }: { onClose: () => void }) {
    const [to, setTo] = useState(retailerEmail)
    const [subject, setSubject] = useState("")
    const [bodyHtml, setBodyHtml] = useState("")
    const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; body_html: string }[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

    useEffect(() => {
      supabase
        .from("email_templates")
        .select("id, name, subject, body_html")
        .eq("is_active", true)
        .then(({ data }) => setTemplates(data ?? []))
    }, [])

    function handleTemplateChange(templateId: string) {
      setSelectedTemplate(templateId)
      if (templateId === "custom") {
        setSubject("")
        setBodyHtml("")
        return
      }
      const tpl = templates.find((t) => t.id === templateId)
      if (tpl) {
        setSubject(tpl.subject)
        setBodyHtml(tpl.body_html)
      }
    }

    async function handleSend() {
      setSending(true)
      setResult(null)
      try {
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, body_html: bodyHtml, template_id: selectedTemplate !== "custom" ? selectedTemplate : undefined }),
        })
        const data = await res.json()
        if (res.ok) {
          setResult({ ok: true, message: "Email sent successfully" })
        } else {
          setResult({ ok: false, message: data.error || "Failed to send email" })
        }
      } catch {
        setResult({ ok: false, message: "Network error" })
      } finally {
        setSending(false)
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-card border rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2"><Mail className="size-4" /> Send Email</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="custom">Compose Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder="Subject line"
              />
            </div>
            {selectedTemplate === "custom" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background resize-y"
                  placeholder="Write your email..."
                />
              </div>
            )}
            {selectedTemplate && selectedTemplate !== "custom" && bodyHtml && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Preview</label>
                <div
                  className="mt-1 rounded-md border p-3 text-sm bg-muted/30 max-h-40 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              </div>
            )}
            {result && (
              <div className={`flex items-center gap-2 text-sm rounded-md p-2 ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {result.ok ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                {result.message}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-4 py-3 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSend} disabled={sending || !to || !subject}>
              {sending && <Loader2 className="size-3 mr-1 animate-spin" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  WhatsApp Modal                                                   */
  /* ---------------------------------------------------------------- */

  function WhatsAppModal({ onClose }: { onClose: () => void }) {
    const [to, setTo] = useState(retailerPhone)
    const [message, setMessage] = useState("")
    const [templates, setTemplates] = useState<{ id: string; name: string; body: string }[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

    useEffect(() => {
      supabase
        .from("sms_templates")
        .select("id, name, body")
        .eq("channel", "whatsapp")
        .eq("is_active", true)
        .then(({ data }) => setTemplates(data ?? []))
    }, [])

    function replaceVars(body: string) {
      return body
        .replace(/\{\{retailer_name\}\}/g, retailer?.name ?? displayName)
        .replace(/\{\{store_name\}\}/g, retailer?.company_name ?? displayName)
    }

    function handleTemplateChange(templateId: string) {
      setSelectedTemplate(templateId)
      if (templateId === "custom") {
        setMessage("")
        return
      }
      const tpl = templates.find((t) => t.id === templateId)
      if (tpl) {
        setMessage(replaceVars(tpl.body))
      }
    }

    async function handleSend() {
      setSending(true)
      setResult(null)
      try {
        const res = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, message, channel: "whatsapp", template_id: selectedTemplate !== "custom" ? selectedTemplate : undefined }),
        })
        const data = await res.json()
        if (res.ok) {
          setResult({ ok: true, message: "WhatsApp message sent successfully" })
        } else {
          setResult({ ok: false, message: data.error || "Failed to send message" })
        }
      } catch {
        setResult({ ok: false, message: "Network error" })
      } finally {
        setSending(false)
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-card border rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2"><MessageCircle className="size-4 text-emerald-600" /> WhatsApp</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">To (Phone)</label>
              <input
                type="tel"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder="+1 555 123 4567"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="custom">Custom Message</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background resize-y"
                placeholder="Type your message..."
              />
            </div>
            {result && (
              <div className={`flex items-center gap-2 text-sm rounded-md p-2 ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {result.ok ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                {result.message}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-4 py-3 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSend} disabled={sending || !to || !message}>
              {sending && <Loader2 className="size-3 mr-1 animate-spin" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/retailers/directory"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="size-3" /> Retailers
          </Link>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {location && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="size-3" /> {location}
            </p>
          )}
          {retailer.phone && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <Phone className="size-3" /> {retailer.phone}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 mr-2">
            <Link
              href={adjacentIds.prev ? `/retailers/directory/${adjacentIds.prev}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.prev ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Previous retailer"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={adjacentIds.next ? `/retailers/directory/${adjacentIds.next}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.next ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Next retailer"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowEmailModal(true)}>
            <Mail className="size-3 mr-1" />Send Email
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => setShowWhatsAppModal(true)}>
            <MessageCircle className="size-3 mr-1" />WhatsApp
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COL (span 2) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order History */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b">
              <span className="text-[0.9375rem] font-semibold tracking-tight">Order History ({orders.length})</span>
            </div>
            {displayOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Order ID</th>
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Store</th>
                      <th className="px-4 py-3.5 text-right text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("total")}><span className="flex items-center justify-end">Total <SortIcon col="total" /></span></th>
                      <th className="px-4 py-3.5 text-right text-xs font-medium text-muted-foreground">Items</th>
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("date")}><span className="flex items-center">Date <SortIcon col="date" /></span></th>
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...displayOrders].sort((a, b) => {
                      const dir = sortDir === "asc" ? 1 : -1
                      if (sortKey === "date") {
                        const aTime = a.faire_created_at ? new Date(a.faire_created_at).getTime() : 0
                        const bTime = b.faire_created_at ? new Date(b.faire_created_at).getTime() : 0
                        return (aTime - bTime) * dir
                      }
                      if (sortKey === "total") return ((a.total_cents ?? 0) - (b.total_cents ?? 0)) * dir
                      return 0
                    }).map((order) => {
                      const store = getStore(order.store_id)
                      return (
                        <tr key={order.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3.5">
                            <Link
                              href={"/orders/" + order.faire_order_id}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {order.display_id ?? order.faire_order_id}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: store?.color ?? "#94a3b8" }}
                              />
                              <span className="text-sm truncate">{store?.name ?? "\u2014"}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm font-medium">
                            ${formatCents(order.total_cents)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm">{order.item_count}</td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {formatDate(order.faire_created_at)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATE_BADGE[order.state] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {STATE_LABEL[order.state] ?? order.state}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No orders found for this retailer.
              </div>
            )}
            {hasMoreOrders && (
              <div className="px-4 py-3 border-t">
                <Link
                  href={"/orders?retailer=" + params.id}
                  className="text-sm text-primary hover:underline"
                >
                  View all orders &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Revenue Summary */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b">
              <span className="text-[0.9375rem] font-semibold tracking-tight">Revenue Summary</span>
            </div>
            <div className="p-4 space-y-0">
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-sm font-semibold text-foreground">${formatCents(revenue.totalCents)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Total Orders</span>
                <span className="text-sm font-semibold text-foreground">{revenue.count}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Average Order</span>
                <span className="text-sm font-semibold text-foreground">${formatCents(revenue.avgCents)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">First Order</span>
                <span className="text-sm font-semibold text-foreground">{formatDate(revenue.firstOrder)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Last Order</span>
                <span className="text-sm font-semibold text-foreground">{formatDate(revenue.lastOrder)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="space-y-5">
          {/* Contact Card */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b">
              <span className="text-[0.9375rem] font-semibold tracking-tight">Contact</span>
            </div>
            <div className="p-4 space-y-2">
              {retailer.name && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-semibold text-foreground">{retailer.name}</span>
                </div>
              )}
              {retailer.company_name && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Company</span>
                  <span className="text-sm font-semibold text-foreground">{retailer.company_name}</span>
                </div>
              )}
              {location && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <span className="text-sm font-semibold text-foreground text-right">{location}</span>
                </div>
              )}
              {retailer.phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="text-sm font-semibold text-foreground">{retailer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stores Card */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2">
              <Store className="size-3.5 text-muted-foreground" />
              <span className="text-[0.9375rem] font-semibold tracking-tight">Stores</span>
            </div>
            <div className="p-4">
              {retailerStores.length > 0 ? (
                <div className="space-y-2">
                  {retailerStores.map((store) => (
                    <div key={store!.id} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: store!.color }}
                      />
                      <span className="text-sm">{store!.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{"\u2014"}</p>
              )}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2">
              <ShoppingBag className="size-3.5 text-muted-foreground" />
              <span className="text-[0.9375rem] font-semibold tracking-tight">Quick Stats</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Spent</span>
                <span className="text-sm font-semibold text-foreground">${formatCents(retailer.total_spent_cents ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Orders</span>
                <span className="text-sm font-semibold text-foreground">{retailer.total_orders ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">First</span>
                <span className="text-sm font-semibold text-foreground">{formatDate(retailer.first_order_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last</span>
                <span className="text-sm font-semibold text-foreground">{formatDate(retailer.last_order_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEmailModal && <EmailModal onClose={() => setShowEmailModal(false)} />}
      {showWhatsAppModal && <WhatsAppModal onClose={() => setShowWhatsAppModal(false)} />}
    </div>
  )
}
