"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Truck,
  Phone,
  Mail,
  ExternalLink,
  Package,
  ClipboardList,
  Banknote,
  ShieldCheck,
} from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsDetailShell,
  EtsKpi,
  EtsTabsPanel,
  EtsStatusBadge,
  EtsEmptyState,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  formatCurrency,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface Vendor {
  id: string
  name: string
  type: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  gst_number: string | null
  address: string | null
  city: string | null
  state: string | null
  payment_terms: string | null
  lead_time_days: number | null
  commission_percent: number | null
  is_active: boolean
  kyc_status: string | null
  bank_name: string | null
  bank_account: string | null
  bank_ifsc: string | null
  pan_number: string | null
  website: string | null
  description: string | null
  category: string | null
  rating: number | null
  total_orders: number | null
  total_revenue: number | null
  created_at: string | null
  updated_at: string | null
}

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [counts, setCounts] = useState({
    products: 0,
    orders: 0,
    payouts: 0,
    outstanding: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabaseEts
      .from("vendors")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) setErr(error.message)
    setVendor(data as Vendor | null)
    setLoading(false)

    const [products, orders, payouts] = await Promise.all([
      supabaseEts
        .from("vendor_products")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", id),
      supabaseEts
        .from("vendor_orders")
        .select("id, total_inr, status", { count: "exact" })
        .eq("vendor_id", id),
      supabaseEts
        .from("vendor_payouts")
        .select("id, amount, status", { count: "exact" })
        .eq("vendor_id", id),
    ])

    const outstanding = ((orders.data ?? []) as Array<{
      total_inr: number | null
      status: string | null
    }>)
      .filter((o) => o.status !== "cancelled" && o.status !== "completed")
      .reduce((s, o) => s + Number(o.total_inr ?? 0), 0)

    setCounts({
      products: products.count ?? 0,
      orders: orders.count ?? 0,
      payouts: payouts.count ?? 0,
      outstanding,
    })
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-5 w-20 rounded bg-muted animate-pulse" />
        <div className="h-24 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <EtsEmptyState
          icon={Truck}
          title="Vendor not found"
          description={err ?? "The vendor you're looking for doesn't exist or has been removed."}
          cta={
            <Link
              href="/ets/vendors"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Back to vendors
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <EtsDetailShell
      backHref="/ets/vendors"
      backLabel="All vendors"
      avatar={
        <div className="size-12 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center text-lg font-bold shrink-0">
          <Truck className="size-6" />
        </div>
      }
      title={vendor.name}
      subtitle={
        [vendor.contact_name, [vendor.city, vendor.state].filter(Boolean).join(", ")]
          .filter(Boolean)
          .join(" · ") || undefined
      }
      badges={
        <>
          <span
            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ring-inset ${
              vendor.type === "china"
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-blue-50 text-blue-700 ring-blue-200"
            }`}
          >
            {vendor.type ?? "vendor"}
          </span>
          {vendor.kyc_status && (
            <EtsStatusBadge value={`KYC: ${vendor.kyc_status}`} />
          )}
          {!vendor.is_active && <EtsStatusBadge value="inactive" />}
        </>
      }
      actions={
        <div className="flex items-center gap-2 text-xs">
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border/80 bg-card hover:bg-muted/40"
            >
              <Phone className="size-3" /> {vendor.phone}
            </a>
          )}
          {vendor.email && (
            <a
              href={`mailto:${vendor.email}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border/80 bg-card hover:bg-muted/40"
            >
              <Mail className="size-3" /> email
            </a>
          )}
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border/80 bg-card hover:bg-muted/40"
            >
              <ExternalLink className="size-3" /> site
            </a>
          )}
        </div>
      }
      kpis={
        <>
          <EtsKpi label="Products" value={counts.products} />
          <EtsKpi
            label="Orders"
            value={counts.orders}
            hint={`${vendor.total_orders ?? 0} historical`}
          />
          <EtsKpi
            label="Revenue"
            value={formatCurrency(vendor.total_revenue)}
          />
          <EtsKpi
            label="Outstanding"
            value={formatCurrency(counts.outstanding)}
          />
          <EtsKpi
            label="Lead time"
            value={vendor.lead_time_days ? `${vendor.lead_time_days}d` : "—"}
          />
          <EtsKpi
            label="Rating"
            value={vendor.rating ? `${Number(vendor.rating).toFixed(1)} ★` : "—"}
            hint={vendor.category ?? undefined}
          />
        </>
      }
    >
      <EtsTabsPanel
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "products", label: "Products", count: counts.products },
          { id: "orders", label: "Orders", count: counts.orders },
          { id: "payouts", label: "Payouts", count: counts.payouts },
          { id: "kyc", label: "KYC & bank" },
        ]}
        render={(active) => {
          if (active === "overview") return <OverviewTab vendor={vendor} />
          if (active === "products") return <ProductsTab vendorId={id} />
          if (active === "orders") return <OrdersTab vendorId={id} />
          if (active === "payouts") return <PayoutsTab vendorId={id} />
          if (active === "kyc") return <KycTab vendor={vendor} />
          return null
        }}
      />
    </EtsDetailShell>
  )
}

function OverviewTab({ vendor }: { vendor: Vendor }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Section title="Contact">
        <Row label="Contact" value={vendor.contact_name ?? "—"} />
        <Row label="Phone" value={vendor.phone ?? "—"} />
        <Row label="Email" value={vendor.email ?? "—"} />
        <Row
          label="Address"
          value={
            [vendor.address, vendor.city, vendor.state]
              .filter(Boolean)
              .join(", ") || "—"
          }
        />
      </Section>
      <Section title="Commercial">
        <Row label="Category" value={vendor.category ?? "—"} />
        <Row label="Payment terms" value={vendor.payment_terms ?? "—"} />
        <Row
          label="Commission"
          value={
            vendor.commission_percent != null
              ? `${Number(vendor.commission_percent).toFixed(1)}%`
              : "—"
          }
        />
        <Row
          label="Lead time"
          value={vendor.lead_time_days ? `${vendor.lead_time_days}d` : "—"}
        />
      </Section>
      {vendor.description && (
        <div className="md:col-span-2">
          <Section title="Description">
            <p className="text-sm leading-relaxed">{vendor.description}</p>
          </Section>
        </div>
      )}
    </div>
  )
}

function ProductsTab({ vendorId }: { vendorId: string }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("vendor_products")
      .select(
        "id, name, vendor_sku, vendor_price_inr, mrp, moq, available_stock, listing_status, is_active",
      )
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [vendorId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={Package}
        title="No products listed"
        description="This vendor hasn't listed any products yet."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Product</EtsTH>
        <EtsTH>SKU</EtsTH>
        <EtsTH className="text-right">Price</EtsTH>
        <EtsTH className="text-right">MRP</EtsTH>
        <EtsTH className="text-right">MOQ</EtsTH>
        <EtsTH className="text-right">Stock</EtsTH>
        <EtsTH>Status</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((p) => (
          <EtsTR key={p.id as string}>
            <EtsTD className="text-sm font-semibold">
              {(p.name as string) ?? "—"}
            </EtsTD>
            <EtsTD className="text-xs font-mono">
              {(p.vendor_sku as string) ?? "—"}
            </EtsTD>
            <EtsTD className="text-right text-xs font-mono">
              {formatCurrency(p.vendor_price_inr as number | null)}
            </EtsTD>
            <EtsTD className="text-right text-xs font-mono text-muted-foreground">
              {formatCurrency(p.mrp as number | null)}
            </EtsTD>
            <EtsTD className="text-right text-xs">
              {(p.moq as number) ?? "—"}
            </EtsTD>
            <EtsTD className="text-right text-xs">
              {(p.available_stock as number) ?? "—"}
            </EtsTD>
            <EtsTD>
              <EtsStatusBadge value={p.listing_status as string | null} />
              {!(p.is_active as boolean) && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  inactive
                </div>
              )}
            </EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function OrdersTab({ vendorId }: { vendorId: string }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("vendor_orders")
      .select(
        "id, po_number, status, total_inr, expected_delivery, actual_delivery, created_at",
      )
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [vendorId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={ClipboardList}
        title="No vendor orders"
        description="Purchase orders to this vendor appear here."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>PO #</EtsTH>
        <EtsTH>Created</EtsTH>
        <EtsTH className="text-right">Total</EtsTH>
        <EtsTH>Expected</EtsTH>
        <EtsTH>Actual</EtsTH>
        <EtsTH>Status</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((o) => (
          <EtsTR key={o.id as string}>
            <EtsTD className="text-xs font-mono font-semibold">
              {(o.po_number as string) ?? (o.id as string).slice(0, 8)}
            </EtsTD>
            <EtsTD className="text-xs whitespace-nowrap">
              {formatDate(o.created_at as string | null)}
            </EtsTD>
            <EtsTD className="text-right text-xs font-mono">
              {formatCurrency(o.total_inr as number | null)}
            </EtsTD>
            <EtsTD className="text-xs whitespace-nowrap">
              {formatDate(o.expected_delivery as string | null)}
            </EtsTD>
            <EtsTD className="text-xs whitespace-nowrap">
              {formatDate(o.actual_delivery as string | null)}
            </EtsTD>
            <EtsTD>
              <EtsStatusBadge value={o.status as string | null} />
            </EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function PayoutsTab({ vendorId }: { vendorId: string }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabaseEts
      .from("vendor_payouts")
      .select(
        "id, amount, currency, payment_method, reference_number, status, paid_at, created_at",
      )
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [vendorId])
  if (loading) return <div className="h-24 rounded-md bg-muted animate-pulse" />
  if (rows.length === 0)
    return (
      <EtsEmptyState
        icon={Banknote}
        title="No payouts yet"
        description="Payouts made to this vendor will appear here."
      />
    )
  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Paid at</EtsTH>
        <EtsTH className="text-right">Amount</EtsTH>
        <EtsTH>Method</EtsTH>
        <EtsTH>Reference</EtsTH>
        <EtsTH>Status</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((p) => (
          <EtsTR key={p.id as string}>
            <EtsTD className="text-xs whitespace-nowrap">
              {formatDate(
                (p.paid_at as string | null) ?? (p.created_at as string | null),
              )}
            </EtsTD>
            <EtsTD className="text-right text-xs font-mono">
              {formatCurrency(
                p.amount as number | null,
                p.currency === "USD" ? "$" : "₹",
              )}
            </EtsTD>
            <EtsTD className="text-xs capitalize">
              {(p.payment_method as string) ?? "—"}
            </EtsTD>
            <EtsTD className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
              {(p.reference_number as string) ?? "—"}
            </EtsTD>
            <EtsTD>
              <EtsStatusBadge value={p.status as string | null} />
            </EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

function KycTab({ vendor }: { vendor: Vendor }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Section title="Identification">
        <Row label="KYC status" value={vendor.kyc_status ?? "Unsubmitted"} />
        <Row label="PAN" value={vendor.pan_number ?? "—"} mono />
        <Row label="GST" value={vendor.gst_number ?? "—"} mono />
      </Section>
      <Section title="Bank details">
        <Row label="Bank" value={vendor.bank_name ?? "—"} />
        <Row
          label="Account"
          value={
            vendor.bank_account
              ? `•••• ${vendor.bank_account.slice(-4)}`
              : "—"
          }
          mono
        />
        <Row label="IFSC" value={vendor.bank_ifsc ?? "—"} mono />
      </Section>
      {vendor.kyc_status !== "verified" && (
        <div className="md:col-span-2">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <ShieldCheck className="size-4" />
            KYC is{" "}
            <strong>
              {vendor.kyc_status === "pending"
                ? "pending review"
                : vendor.kyc_status === "rejected"
                  ? "rejected"
                  : "not submitted"}
            </strong>
            . Payouts may be blocked until verification is complete.
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </div>
      <div className="rounded-lg border border-border/80 bg-card shadow-sm divide-y divide-border/60">
        {children}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}
