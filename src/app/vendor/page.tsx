"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Package } from "lucide-react"
import { supabaseB2B } from "@/lib/supabase"

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

interface QuoteItem {
  product_name: string
  quantity: number
  vendor_price_cents?: number
}

interface VendorQuote {
  id: string
  order_id: string
  vendor_id: string
  status: string
  items: QuoteItem[]
  shipping_cost_cents: number | null
  total_cost_cents: number | null
  notes: string | null
  tracking_code: string | null
  carrier: string | null
  shipped_at: string | null
  created_at: string
  updated_at: string | null
}

interface FaireOrder {
  faire_order_id: string
  display_id: string | null
  total_cents: number
  shipping_address: Record<string, string> | null
  item_count: number
  store_id: string
  state: string
}

interface LedgerEntry {
  id: string
  entry_date: string
  entry_type: string
  description: string
  amount_cents: number
  status: string
  order_id: string | null
  created_at: string
}

type Tab = "dashboard" | "orders" | "ship" | "history" | "ledger"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orders", label: "Orders" },
  { key: "ship", label: "Ship" },
  { key: "history", label: "History" },
  { key: "ledger", label: "Ledger" },
]

const CARRIERS = [
  "UPS",
  "USPS",
  "FedEx",
  "DHL",
  "China Post",
  "YunExpress",
  "4PX",
  "CNE Express",
  "Other",
]

/* ------------------------------------------------------------------ */
/*  Badge helpers                                                      */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700",
  quoted: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  canceled: "bg-gray-100 text-gray-500",
  invoice: "bg-blue-50 text-blue-700",
  payment: "bg-emerald-50 text-emerald-700",
  refund: "bg-amber-50 text-amber-700",
  expense: "bg-red-50 text-red-700",
  payout: "bg-gray-100 text-gray-700",
}

function Badge({ label }: { label: string }) {
  const style = STATUS_STYLES[label] ?? "bg-gray-100 text-gray-700"
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */

function cents(amount: number | null | undefined): string {
  if (amount == null) return "$0.00"
  const abs = Math.abs(amount) / 100
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return amount < 0 ? `-$${formatted}` : `$${formatted}`
}

function shortAddr(addr: Record<string, string> | null): string {
  if (!addr) return "N/A"
  const parts = [addr.city, addr.state_code ?? addr.state ?? addr.province].filter(Boolean)
  return parts.join(", ") || "N/A"
}

function fullAddr(addr: Record<string, string> | null): string {
  if (!addr) return "N/A"
  const parts = [
    addr.name ?? addr.first_name,
    addr.address1,
    addr.address2,
    addr.city,
    addr.state_code ?? addr.state ?? addr.province,
    addr.zip ?? addr.postal_code,
    addr.country,
  ].filter(Boolean)
  return parts.join(", ") || "N/A"
}

function fmtDate(d: string | null): string {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function fmtRelative(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(d)
}

/* ------------------------------------------------------------------ */
/*  Toast notification                                                 */
/* ------------------------------------------------------------------ */

function Toast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-lg border bg-white px-5 py-3 shadow-lg flex items-center gap-3">
        <span className="text-emerald-600 text-lg">&#10003;</span>
        <span className="text-sm font-medium text-gray-900">{message}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-2"
        >
          &#215;
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Vendor avatar (initials)                                           */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
]

function VendorAvatar({
  name,
  size = "sm",
}: {
  name: string
  size?: "sm" | "md"
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const colorIdx =
    name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length
  const sizeClass = size === "md" ? "size-10 text-sm" : "size-8 text-xs"
  return (
    <div
      className={`${AVATAR_COLORS[colorIdx]} ${sizeClass} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
    >
      {initials}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-md border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      <p className="text-2xl font-bold font-heading mt-1">{value}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-md ${className ?? ""}`}
    />
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-5 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[84px]" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-md border bg-card p-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quote Card (Orders tab)                                            */
/* ------------------------------------------------------------------ */

function PendingQuoteCard({
  quote,
  order,
  onSubmitted,
  productImages,
}: {
  quote: VendorQuote
  order: FaireOrder | undefined
  onSubmitted: (msg: string) => void
  productImages: Record<string, string>
}) {
  const [itemCosts, setItemCosts] = useState<Record<number, string>>({})
  const [shipping, setShipping] = useState("")
  const [notes, setNotes] = useState(quote.notes ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items: QuoteItem[] = Array.isArray(quote.items) ? quote.items : []

  const total = useMemo(() => {
    let sum = 0
    items.forEach((item, i) => {
      const cost = parseFloat(itemCosts[i] ?? "0") || 0
      sum += cost * (item.quantity ?? 1)
    })
    sum += parseFloat(shipping || "0") || 0
    return sum
  }, [itemCosts, shipping, items])

  async function handleSubmit() {
    const hasAllCosts = items.every(
      (_, i) => parseFloat(itemCosts[i] ?? "0") > 0
    )
    if (!hasAllCosts) {
      setError("Please enter a cost for every item.")
      return
    }
    if (!shipping || parseFloat(shipping) < 0) {
      setError("Please enter a shipping cost (0 or more).")
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      quote_id: quote.id,
      items: items.map((item, i) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        vendor_price_cents: Math.round(
          (parseFloat(itemCosts[i] ?? "0") || 0) * 100
        ),
      })),
      shipping_cost_cents: Math.round((parseFloat(shipping) || 0) * 100),
      notes: notes.trim() || null,
    }

    try {
      const res = await fetch("/api/vendor/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to submit quote")
      }
      onSubmitted(`Quote submitted for Order ${order?.display_id ?? quote.order_id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-md border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-sm font-semibold">Order #{order?.display_id ?? quote.order_id.slice(0, 12)}</span>
            <p className="text-xs text-muted-foreground">
              Ship to: {shortAddr(order?.shipping_address ?? null)}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Badge label="requested" />
      </div>

      {/* Item table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Product
              </th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground w-[80px]">
                Qty
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground w-[140px]">
                Your Cost ($)
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {productImages[(item as any).product_id] ? (
                      <img src={productImages[(item as any).product_id]} className="w-8 h-8 rounded object-cover bg-muted shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted shrink-0" />
                    )}
                    <span>{item.product_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-medium">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={itemCosts[i] ?? ""}
                    onChange={(e) =>
                      setItemCosts((prev) => ({
                        ...prev,
                        [i]: e.target.value,
                      }))
                    }
                    className="w-[110px] rounded-md border px-3 py-2 text-sm text-right bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shipping + Total */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Combined Shipping ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            className="w-[110px] rounded-md border px-3 py-2 text-sm text-right bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="ml-auto text-base font-semibold">
          Total: ${total.toFixed(2)}
        </div>
      </div>

      {/* Notes */}
      <textarea
        rows={2}
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />

      {/* Error + submit */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {submitting ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Submitting...
          </>
        ) : (
          "Submit Quote"
        )}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Ship Card (Ship tab)                                               */
/* ------------------------------------------------------------------ */

function ShipCard({
  quote,
  order,
  onShipped,
  productImages,
}: {
  quote: VendorQuote
  order: FaireOrder | undefined
  onShipped: (msg: string) => void
  productImages: Record<string, string>
}) {
  const [trackingCode, setTrackingCode] = useState("")
  const [carrier, setCarrier] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shipped, setShipped] = useState(false)

  const items: QuoteItem[] = Array.isArray(quote.items) ? quote.items : []

  async function handleShip() {
    if (!trackingCode.trim()) {
      setError("Tracking code is required.")
      return
    }
    if (!carrier) {
      setError("Please select a carrier.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/vendor/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quote.id,
          tracking_code: trackingCode.trim(),
          carrier,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to mark as shipped")
      }
      setShipped(true)
      onShipped(`Shipped! Tracking updated on Faire. Order ${order?.display_id ?? quote.order_id}`)
      setTimeout(() => setShipped(false), 2000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (shipped) {
    return (
      <div className="rounded-md border bg-emerald-50 p-5 flex items-center gap-3 text-emerald-700">
        <span className="text-xl">&#10003;</span>
        <span className="text-sm font-medium">
          Shipped! Tracking updated on Faire. &mdash; Order #{order?.display_id ?? quote.order_id.slice(0, 12)}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-semibold">Order #{order?.display_id ?? quote.order_id.slice(0, 12)}</span>
          <p className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} &middot;{" "}
            Your quoted cost: {cents(quote.total_cost_cents)}
          </p>
        </div>
        <Badge label="approved" />
      </div>

      {/* Items summary */}
      <div className="text-sm space-y-1 rounded-md bg-muted/30 p-3">
        {items.map((item, i) => (
          <p key={i} className="text-muted-foreground flex items-center gap-2">
            {productImages[(item as any).product_id] ? (
              <img src={productImages[(item as any).product_id]} className="w-8 h-8 rounded object-cover bg-muted shrink-0" loading="lazy" />
            ) : (
              <div className="w-8 h-8 rounded bg-muted shrink-0" />
            )}
            <span className="text-foreground font-medium">{item.product_name}</span>
            <span className="text-xs bg-muted rounded px-1.5 py-0.5">x{item.quantity}</span>
          </p>
        ))}
      </div>

      {/* Ship to (FULL address) */}
      <div className="text-sm rounded-md border p-3 bg-muted/20">
        <p className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">Ship to</p>
        <p className="text-foreground">{fullAddr(order?.shipping_address ?? null)}</p>
      </div>

      {/* Ship form */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Tracking Code
          </label>
          <input
            type="text"
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="Enter tracking code"
            className="w-full rounded-md border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Carrier
          </label>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full rounded-md border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select carrier...</option>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleShip}
          disabled={submitting}
          className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {submitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Shipping...
            </>
          ) : (
            "Ship Order"
          )}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Vendor Profile card (Dashboard)                                    */
/* ------------------------------------------------------------------ */

function VendorProfileCard({ vendor }: { vendor: Vendor }) {
  const whatsappLink = vendor.whatsapp
    ? `https://wa.me/${vendor.whatsapp.replace(/[^0-9]/g, "")}`
    : vendor.phone
      ? `https://wa.me/${vendor.phone.replace(/[^0-9]/g, "")}`
      : null

  return (
    <div className="rounded-md border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Vendor Profile</h3>
        {vendor.is_default && (
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
            Default Vendor
          </span>
        )}
      </div>

      <div className="flex items-start gap-4">
        <VendorAvatar name={vendor.name} size="md" />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="font-semibold text-foreground">{vendor.name}</p>
            {vendor.contact_name && (
              <p className="text-sm text-muted-foreground">
                Contact: {vendor.contact_name}
              </p>
            )}
          </div>

          {/* Email */}
          {vendor.email && (
            <p className="text-sm">
              <a
                href={`mailto:${vendor.email}`}
                className="text-primary hover:underline"
              >
                {vendor.email}
              </a>
            </p>
          )}

          {/* Phone */}
          {vendor.phone && (
            <p className="text-sm text-muted-foreground">{vendor.phone}</p>
          )}
        </div>
      </div>

      {/* WhatsApp button */}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#20bd5a] transition-colors"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>
      )}

      <div className="border-t pt-4 space-y-3">
        {/* Country */}
        {vendor.country && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Country</span>
            <span className="font-medium">
              {vendor.country.toLowerCase().includes("china") ? "\u{1F1E8}\u{1F1F3}" : ""}{" "}
              {vendor.country}
            </span>
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rating</span>
          <span className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={i < vendor.rating ? "text-amber-400" : "text-gray-300"}
              >
                &#9733;
              </span>
            ))}
          </span>
        </div>

        {/* Lead time */}
        {vendor.avg_lead_days != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lead Time</span>
            <span className="font-medium">
              {vendor.avg_lead_days} day{vendor.avg_lead_days !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Completed orders */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Completed Orders</span>
          <span className="font-semibold">{vendor.completed_orders}</span>
        </div>
      </div>

      {/* Specialties */}
      {vendor.specialties && vendor.specialties.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Specialties
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vendor.specialties.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function VendorPortalPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorId, setVendorId] = useState<string>("")
  const [tab, setTab] = useState<Tab>("dashboard")
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Data
  const [pendingQuotes, setPendingQuotes] = useState<VendorQuote[]>([])
  const [approvedQuotes, setApprovedQuotes] = useState<VendorQuote[]>([])
  const [shippedQuotes, setShippedQuotes] = useState<VendorQuote[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [orders, setOrders] = useState<Map<string, FaireOrder>>(new Map())
  const [productImages, setProductImages] = useState<Record<string, string>>({})
  const [dataLoading, setDataLoading] = useState(false)

  // History pagination
  const [historyPage, setHistoryPage] = useState(0)
  const HISTORY_PER_PAGE = 15
  const [historySortAsc, setHistorySortAsc] = useState(false)

  // Ledger pagination
  const [ledgerPage, setLedgerPage] = useState(0)
  const LEDGER_PER_PAGE = 15
  const [ledgerSortAsc, setLedgerSortAsc] = useState(false)

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === vendorId) ?? null,
    [vendors, vendorId]
  )

  /* ---- Fetch vendors on mount ---- */
  useEffect(() => {
    async function load() {
      const { data, error } = await supabaseB2B
        .from("faire_vendors")
        .select("*")
        .order("name")
      if (error) console.error("fetchVendors:", error)
      const list = (data ?? []) as Vendor[]
      setVendors(list)
      // Auto-select default vendor if available
      const defaultV = list.find((v) => v.is_default)
      if (defaultV) setVendorId(defaultV.id)
      else if (list.length === 1) setVendorId(list[0].id)
      setLoading(false)
    }
    load()
  }, [])

  /* ---- Fetch data when vendor changes ---- */
  const fetchVendorData = useCallback(async (vid: string) => {
    if (!vid) return
    setDataLoading(true)

    const [pendingRes, approvedRes, shippedRes, ledgerRes] = await Promise.all([
      supabaseB2B
        .from("vendor_quotes")
        .select("*")
        .eq("vendor_id", vid)
        .eq("status", "requested")
        .order("created_at", { ascending: false }),
      supabaseB2B
        .from("vendor_quotes")
        .select("*")
        .eq("vendor_id", vid)
        .eq("status", "approved")
        .order("created_at", { ascending: false }),
      supabaseB2B
        .from("vendor_quotes")
        .select("*")
        .eq("vendor_id", vid)
        .in("status", ["shipped", "delivered"])
        .order("shipped_at", { ascending: false }),
      supabaseB2B
        .from("faire_ledger_entries")
        .select("*")
        .eq("vendor_id", vid)
        .order("entry_date", { ascending: false }),
    ])

    if (pendingRes.error) console.error("pendingQuotes:", pendingRes.error)
    if (approvedRes.error) console.error("approvedQuotes:", approvedRes.error)
    if (shippedRes.error) console.error("shippedQuotes:", shippedRes.error)
    if (ledgerRes.error) console.error("ledgerEntries:", ledgerRes.error)

    const pending = (pendingRes.data ?? []) as VendorQuote[]
    const approved = (approvedRes.data ?? []) as VendorQuote[]
    const shipped = (shippedRes.data ?? []) as VendorQuote[]

    setPendingQuotes(pending)
    setApprovedQuotes(approved)
    setShippedQuotes(shipped)
    setLedgerEntries((ledgerRes.data ?? []) as LedgerEntry[])

    // Collect all unique order IDs and fetch orders
    const allOrderIds = [
      ...new Set([
        ...pending.map((q) => q.order_id),
        ...approved.map((q) => q.order_id),
        ...shipped.map((q) => q.order_id),
      ]),
    ]

    if (allOrderIds.length > 0) {
      const { data: ordersData, error: ordersErr } = await supabaseB2B
        .from("faire_orders")
        .select(
          "faire_order_id, display_id, total_cents, shipping_address, item_count, store_id, state"
        )
        .in("faire_order_id", allOrderIds)

      if (ordersErr) console.error("fetchOrders:", ordersErr)

      const map = new Map<string, FaireOrder>()
      for (const o of ordersData ?? []) {
        map.set(o.faire_order_id, o as FaireOrder)
      }
      setOrders(map)
    } else {
      setOrders(new Map())
    }

    setDataLoading(false)
  }, [])

  useEffect(() => {
    if (vendorId) {
      fetchVendorData(vendorId)
      setHistoryPage(0)
      setLedgerPage(0)
    }
  }, [vendorId, fetchVendorData])

  /* ---- Fetch product images ---- */
  useEffect(() => {
    const allProductIds = new Set<string>()
    for (const q of [...pendingQuotes, ...approvedQuotes, ...shippedQuotes]) {
      const items = Array.isArray(q.items) ? q.items : []
      for (const item of items) {
        if ((item as any).product_id) allProductIds.add((item as any).product_id)
      }
    }
    if (allProductIds.size === 0) return
    supabaseB2B
      .from("faire_products")
      .select("faire_product_id, primary_image_url")
      .in("faire_product_id", Array.from(allProductIds))
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const p of data ?? []) {
          if (p.primary_image_url) map[p.faire_product_id] = p.primary_image_url
        }
        setProductImages(map)
      })
  }, [pendingQuotes, approvedQuotes, shippedQuotes])

  /* ---- Stats ---- */
  const totalRevenue = useMemo(
    () => shippedQuotes.reduce((s, q) => s + (q.total_cost_cents ?? 0), 0),
    [shippedQuotes]
  )

  const shippedThisMonth = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return shippedQuotes.filter((q) => {
      if (!q.shipped_at) return false
      const d = new Date(q.shipped_at)
      return d.getFullYear() === y && d.getMonth() === m
    }).length
  }, [shippedQuotes])

  /* ---- Ledger totals ---- */
  const { totalInvoiced, pendingPayment } = useMemo(() => {
    let invoiced = 0
    let pending = 0
    for (const e of ledgerEntries) {
      if (e.status === "completed") {
        invoiced += Math.abs(e.amount_cents)
      }
      if (e.status === "pending") {
        pending += Math.abs(e.amount_cents)
      }
    }
    return { totalInvoiced: invoiced, pendingPayment: pending }
  }, [ledgerEntries])

  /* ---- Recent activity (for dashboard) ---- */
  const recentActivity = useMemo(() => {
    const activities: { label: string; time: string; type: string }[] = []

    for (const q of pendingQuotes.slice(0, 3)) {
      const order = orders.get(q.order_id)
      activities.push({
        label: `Quote requested for Order #${order?.display_id ?? q.order_id}`,
        time: q.created_at,
        type: "requested",
      })
    }
    for (const q of approvedQuotes.slice(0, 3)) {
      const order = orders.get(q.order_id)
      activities.push({
        label: `Quote approved for Order #${order?.display_id ?? q.order_id}`,
        time: q.updated_at ?? q.created_at,
        type: "approved",
      })
    }
    for (const q of shippedQuotes.slice(0, 3)) {
      const order = orders.get(q.order_id)
      activities.push({
        label: `Order #${order?.display_id ?? q.order_id} shipped`,
        time: q.shipped_at ?? q.updated_at ?? q.created_at,
        type: "shipped",
      })
    }

    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5)
  }, [pendingQuotes, approvedQuotes, shippedQuotes, orders])

  /* ---- Sorted/paginated history ---- */
  const sortedHistory = useMemo(() => {
    const list = [...shippedQuotes]
    list.sort((a, b) => {
      const da = new Date(a.shipped_at ?? a.created_at).getTime()
      const db = new Date(b.shipped_at ?? b.created_at).getTime()
      return historySortAsc ? da - db : db - da
    })
    return list
  }, [shippedQuotes, historySortAsc])

  const historyTotalPages = Math.max(1, Math.ceil(sortedHistory.length / HISTORY_PER_PAGE))
  const pagedHistory = sortedHistory.slice(
    historyPage * HISTORY_PER_PAGE,
    (historyPage + 1) * HISTORY_PER_PAGE
  )

  /* ---- Sorted/paginated ledger ---- */
  const sortedLedger = useMemo(() => {
    const list = [...ledgerEntries]
    list.sort((a, b) => {
      const da = new Date(a.entry_date).getTime()
      const db = new Date(b.entry_date).getTime()
      return ledgerSortAsc ? da - db : db - da
    })
    return list
  }, [ledgerEntries, ledgerSortAsc])

  const ledgerTotalPages = Math.max(1, Math.ceil(sortedLedger.length / LEDGER_PER_PAGE))
  const pagedLedger = sortedLedger.slice(
    ledgerPage * LEDGER_PER_PAGE,
    (ledgerPage + 1) * LEDGER_PER_PAGE
  )

  /* ---- Callback after actions ---- */
  function handleActionDone(msg: string) {
    setToast(msg)
    fetchVendorData(vendorId)
  }

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-[hsl(225,47%,15%)] text-white h-14 px-6 flex items-center">
          <Skeleton className="h-5 w-40 bg-white/10" />
        </div>
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Single merged nav bar */}
      <div className="shrink-0 sticky top-0 z-40">
        <nav className="bg-[hsl(225,47%,15%)] text-white">
          <div className="flex items-center h-12">
            {/* Left: logo + name */}
            <div className="flex items-center gap-2 px-4 shrink-0 w-[180px]">
              <Package className="size-5" />
              <span className="text-sm font-semibold">Vendor Portal</span>
            </div>

            {/* Center: tabs in equal grid */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center justify-center gap-1.5 h-12 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t.label}
                  {t.key === "orders" && pendingQuotes.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{pendingQuotes.length}</span>
                  )}
                  {t.key === "ship" && approvedQuotes.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{approvedQuotes.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Right: vendor selector + avatar */}
            <div className="flex items-center gap-2 px-4 shrink-0">
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white focus:outline-none min-w-[140px]"
              >
                <option value="" className="text-gray-900">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id} className="text-gray-900">{v.name}</option>
                ))}
              </select>
              {selectedVendor && (
                <div className="flex items-center gap-2">
                  <VendorAvatar name={selectedVendor.name} />
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto w-full px-4 py-5 md:px-6 lg:px-8">
        {!vendorId ? (
          <EmptyState
            icon="&#128101;"
            title="Select a vendor"
            description="Choose your vendor from the dropdown above to get started."
          />
        ) : dataLoading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* ====== Tab: Dashboard ====== */}
            {tab === "dashboard" && (
              <div className="space-y-5">
                {/* Quick Actions */}
                {(pendingQuotes.length > 0 || approvedQuotes.length > 0) && (
                  <div className="flex items-center gap-3">
                    {pendingQuotes.length > 0 && (
                      <button onClick={() => setTab("orders")} className="flex-1 flex items-center justify-center gap-2 rounded-md bg-amber-500 text-white px-4 py-3 text-sm font-semibold hover:bg-amber-600 transition-colors">
                        📝 Send Quotations
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs">{pendingQuotes.length}</span>
                      </button>
                    )}
                    {approvedQuotes.length > 0 && (
                      <button onClick={() => setTab("ship")} className="flex-1 flex items-center justify-center gap-2 rounded-md bg-emerald-500 text-white px-4 py-3 text-sm font-semibold hover:bg-emerald-600 transition-colors">
                        🚚 Ship Orders
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs">{approvedQuotes.length}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Pending Quotes" value={pendingQuotes.length} />
                  <StatCard label="Orders to Ship" value={approvedQuotes.length} />
                  <StatCard label="Shipped This Month" value={shippedThisMonth} />
                  <StatCard label="Total Revenue" value={cents(totalRevenue)} />
                </div>

                {/* Two columns */}
                <div className="grid lg:grid-cols-2 gap-5">
                  {/* Left: Recent Activity */}
                  <div className="rounded-md border bg-card p-5">
                    <h3 className="text-sm font-semibold mb-4">
                      Recent Activity
                    </h3>
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No recent activity
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recentActivity.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0"
                          >
                            <div
                              className={`mt-0.5 size-2 rounded-full shrink-0 ${
                                a.type === "requested"
                                  ? "bg-amber-400"
                                  : a.type === "approved"
                                    ? "bg-emerald-400"
                                    : "bg-indigo-400"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">
                                {a.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {fmtRelative(a.time)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Vendor Profile */}
                  {selectedVendor && (
                    <VendorProfileCard vendor={selectedVendor} />
                  )}
                </div>
              </div>
            )}

            {/* ====== Tab: Orders (Pending Quotes) ====== */}
            {tab === "orders" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Pending Quotes</h2>
                {pendingQuotes.length === 0 ? (
                  <EmptyState
                    icon="&#128203;"
                    title="No pending quotes"
                    description="No quote requests right now. Check back soon."
                  />
                ) : (
                  pendingQuotes.map((q) => (
                    <PendingQuoteCard
                      key={q.id}
                      quote={q}
                      order={orders.get(q.order_id)}
                      onSubmitted={handleActionDone}
                      productImages={productImages}
                    />
                  ))
                )}
              </div>
            )}

            {/* ====== Tab: Ship (Approved Orders) ====== */}
            {tab === "ship" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Approved Orders — Ready to Ship</h2>
                {approvedQuotes.length === 0 ? (
                  <EmptyState
                    icon="&#128666;"
                    title="No orders to ship"
                    description="No approved orders waiting to be shipped right now."
                  />
                ) : (
                  approvedQuotes.map((q) => (
                    <ShipCard
                      key={q.id}
                      quote={q}
                      order={orders.get(q.order_id)}
                      onShipped={handleActionDone}
                      productImages={productImages}
                    />
                  ))
                )}
              </div>
            )}

            {/* ====== Tab: History (Shipped Orders) ====== */}
            {tab === "history" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Shipment History</h2>
                <div className="rounded-md border overflow-hidden">
                  {shippedQuotes.length === 0 ? (
                    <EmptyState
                      icon="&#128220;"
                      title="No shipped orders yet"
                      description="Shipped orders will appear here."
                    />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/40">
                              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">
                                Order ID
                              </th>
                              <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">
                                Items
                              </th>
                              <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">
                                Your Cost
                              </th>
                              <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">
                                Shipping
                              </th>
                              <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">
                                Total
                              </th>
                              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">
                                Tracking
                              </th>
                              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">
                                Carrier
                              </th>
                              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">
                                <button
                                  onClick={() => {
                                    setHistorySortAsc(!historySortAsc)
                                    setHistoryPage(0)
                                  }}
                                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                >
                                  Shipped
                                  <span className="text-[10px]">
                                    {historySortAsc ? "\u25B2" : "\u25BC"}
                                  </span>
                                </button>
                              </th>
                              <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedHistory.map((q) => {
                              const order = orders.get(q.order_id)
                              const items: QuoteItem[] = Array.isArray(q.items)
                                ? q.items
                                : []
                              const itemCostTotal = items.reduce(
                                (s, it) =>
                                  s +
                                  (it.vendor_price_cents ?? 0) *
                                    (it.quantity ?? 1),
                                0
                              )
                              return (
                                <tr key={q.id} className="border-t hover:bg-muted/20">
                                  <td className="px-4 py-3.5">
                                    <span className="text-sm font-semibold">Order #{order?.display_id ?? q.order_id.slice(0, 12)}</span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                      {items.length}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-medium">
                                    {cents(itemCostTotal)}
                                  </td>
                                  <td className="px-4 py-3.5 text-right text-muted-foreground">
                                    {cents(q.shipping_cost_cents)}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-semibold">
                                    {cents(q.total_cost_cents)}
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-xs">
                                    {q.tracking_code ?? "-"}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {q.carrier ?? "-"}
                                  </td>
                                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                    {fmtDate(q.shipped_at)}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <Badge label={q.status} />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {historyTotalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                          <p className="text-xs text-muted-foreground">
                            Showing {historyPage * HISTORY_PER_PAGE + 1}
                            &ndash;
                            {Math.min(
                              (historyPage + 1) * HISTORY_PER_PAGE,
                              sortedHistory.length
                            )}{" "}
                            of {sortedHistory.length}
                          </p>
                          <div className="flex gap-1">
                            <button
                              disabled={historyPage === 0}
                              onClick={() => setHistoryPage((p) => p - 1)}
                              className="px-3 py-1 text-xs rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Previous
                            </button>
                            <button
                              disabled={historyPage >= historyTotalPages - 1}
                              onClick={() => setHistoryPage((p) => p + 1)}
                              className="px-3 py-1 text-xs rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ====== Tab: Ledger ====== */}
            {tab === "ledger" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Ledger</h2>

                {/* Ledger summary cards */}
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Total Invoiced"
                    value={cents(totalInvoiced)}
                  />
                  <StatCard
                    label="Pending Payment"
                    value={cents(pendingPayment)}
                  />
                </div>

                <div className="rounded-md border overflow-hidden">
                  {ledgerEntries.length === 0 ? (
                    <EmptyState
                      icon="&#128176;"
                      title="No ledger entries"
                      description="Ledger entries will appear here as orders are processed."
                    />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/40">
                              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">
                                <button
                                  onClick={() => {
                                    setLedgerSortAsc(!ledgerSortAsc)
                                    setLedgerPage(0)
                                  }}
                                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                >
                                  Date
                                  <span className="text-[10px]">
                                    {ledgerSortAsc ? "\u25B2" : "\u25BC"}
                                  </span>
                                </button>
                              </th>
                              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">
                                Description
                              </th>
                              <th className="text-right px-4 py-3.5 font-medium text-muted-foreground">
                                Amount
                              </th>
                              <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">
                                Type
                              </th>
                              <th className="text-center px-4 py-3.5 font-medium text-muted-foreground">
                                Status
                              </th>
                              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground">
                                Order ID
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedLedger.map((e) => {
                              const isCredit =
                                e.entry_type === "payment" ||
                                e.entry_type === "payout" ||
                                e.amount_cents > 0
                              return (
                                <tr key={e.id} className="border-t hover:bg-muted/20">
                                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                                    {fmtDate(e.entry_date)}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {e.description}
                                  </td>
                                  <td
                                    className={`px-4 py-3.5 text-right font-medium whitespace-nowrap ${
                                      isCredit
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {cents(e.amount_cents)}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <Badge label={e.entry_type} />
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <Badge label={e.status} />
                                  </td>
                                  <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                                    {e.order_id ?? "-"}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {ledgerTotalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                          <p className="text-xs text-muted-foreground">
                            Showing {ledgerPage * LEDGER_PER_PAGE + 1}
                            &ndash;
                            {Math.min(
                              (ledgerPage + 1) * LEDGER_PER_PAGE,
                              sortedLedger.length
                            )}{" "}
                            of {sortedLedger.length}
                          </p>
                          <div className="flex gap-1">
                            <button
                              disabled={ledgerPage === 0}
                              onClick={() => setLedgerPage((p) => p - 1)}
                              className="px-3 py-1 text-xs rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Previous
                            </button>
                            <button
                              disabled={ledgerPage >= ledgerTotalPages - 1}
                              onClick={() => setLedgerPage((p) => p + 1)}
                              className="px-3 py-1 text-xs rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
