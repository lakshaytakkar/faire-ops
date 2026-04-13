"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Package,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsStatusBadge,
  EtsEmptyState,
  formatCurrency,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface ProductRow {
  id: string
  legacy_id: number | null
  product_code: string | null
  barcode: string | null
  name_en: string | null
  name_cn: string | null
  category: string | null
  material: string | null
  description: string | null
  image_url: string | null
  cost_price: number | null
  partner_price: number | null
  unit_price: number | null
  wholesale_price_inr: number | null
  suggested_mrp: number | null
  units_per_carton: number | null
  moq: number | null
  weight_kg: number | null
  box_length_cm: number | null
  box_width_cm: number | null
  box_height_cm: number | null
  hs_code: string | null
  source: string | null
  vendor_id: string | null
  stock_quantity: number | null
  is_active: boolean
  is_published: boolean
  is_featured: boolean | null
  market_fit: string | null
  market_fit_reason: string | null
  compliance_status: string | null
  label_status: string | null
  bis_required: boolean | null
  bis_status: string | null
  sellability_score: number | null
  tags: string[] | null
  supply_meta: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
}

interface VendorMini {
  id: string
  name: string
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug as string
  const [row, setRow] = useState<ProductRow | null>(null)
  const [vendor, setVendor] = useState<VendorMini | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      // Resolve by SKU first; fall back to UUID for legacy links.
      let { data } = await supabaseEts
        .from("products")
        .select("*")
        .eq("product_code", slug)
        .maybeSingle()
      if (!data) {
        const fallback = await supabaseEts
          .from("products")
          .select("*")
          .eq("id", slug)
          .maybeSingle()
        data = fallback.data
      }
      if (cancelled) return
      setRow(data as ProductRow | null)
      if (data?.vendor_id) {
        const { data: v } = await supabaseEts
          .from("vendors")
          .select("id, name")
          .eq("id", data.vendor_id)
          .maybeSingle()
        if (!cancelled) setVendor(v as VendorMini | null)
      }
      setLoading(false)
    }
    if (slug) load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!row) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link
          href="/ets/catalog/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All products
        </Link>
        <EtsEmptyState
          icon={Package}
          title="Product not found"
          description={`No product with SKU "${slug}".`}
          cta={
            <Link
              href="/ets/catalog/products"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Back to products
            </Link>
          }
        />
      </div>
    )
  }

  const title = row.name_en || row.name_cn || "Untitled product"
  const dimensions =
    row.box_length_cm && row.box_width_cm && row.box_height_cm
      ? `${row.box_length_cm} × ${row.box_width_cm} × ${row.box_height_cm} cm`
      : null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href="/ets/catalog/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            {row.image_url ? (
              <a
                href={row.image_url}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.image_url}
                  alt={title}
                  className="size-full object-cover"
                />
              </a>
            ) : (
              <div className="aspect-square bg-muted flex items-center justify-center">
                <Package className="size-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-lg border bg-card shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-semibold leading-tight">
                  {title}
                </h1>
                {row.name_cn && row.name_en && row.name_cn !== row.name_en && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {row.name_cn}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  SKU&nbsp;
                  <span className="text-foreground">{row.product_code ?? "—"}</span>
                  {row.category && (
                    <>
                      <span className="mx-1">·</span>
                      {row.category}
                    </>
                  )}
                  {row.material && (
                    <>
                      <span className="mx-1">·</span>
                      {row.material}
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {row.is_active ? (
                  <EtsStatusBadge value="Active" />
                ) : (
                  <EtsStatusBadge value="Inactive" />
                )}
                {row.is_published && <EtsStatusBadge value="Published" />}
                {row.is_featured && <EtsStatusBadge value="Featured" />}
              </div>
            </div>
            {row.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {row.description}
              </p>
            )}
            {row.tags && row.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {row.tags.map((t) => (
                  <EtsStatusBadge key={t} value={t} />
                ))}
              </div>
            )}
          </div>

          <Card title="Pricing">
            <Row label="Partner price" value={formatCurrency(row.partner_price)} />
            <Row label="Cost price" value={formatCurrency(row.cost_price)} />
            <Row
              label="Wholesale (INR)"
              value={formatCurrency(row.wholesale_price_inr)}
            />
            <Row label="Suggested MRP" value={formatCurrency(row.suggested_mrp)} />
          </Card>

          <Card title="Stock & logistics">
            <Row label="Stock" value={(row.stock_quantity ?? 0).toLocaleString()} />
            <Row label="MOQ" value={row.moq ? row.moq.toLocaleString() : "—"} />
            <Row
              label="Units / carton"
              value={row.units_per_carton?.toString() ?? "—"}
            />
            <Row label="Weight" value={row.weight_kg ? `${row.weight_kg} kg` : "—"} />
            <Row label="Box dims" value={dimensions ?? "—"} />
            <Row label="HS code" value={row.hs_code ?? "—"} />
          </Card>

          <Card title="Source & compliance">
            <Row label="Source" value={row.source ?? "—"} />
            <Row
              label="Vendor"
              value={
                vendor ? (
                  <Link
                    href={`/ets/vendors/${vendor.id}`}
                    className="hover:text-primary"
                  >
                    {vendor.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Barcode" value={row.barcode ?? "—"} />
            <Row label="Compliance" value={row.compliance_status ?? "—"} />
            <Row label="Label" value={row.label_status ?? "—"} />
            <Row
              label="BIS"
              value={
                row.bis_required ? (
                  <span className="inline-flex items-center gap-1">
                    {row.bis_status === "ok" ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="size-3.5 text-rose-600" />
                    )}
                    {row.bis_status ?? "required"}
                  </span>
                ) : (
                  "Not required"
                )
              }
            />
          </Card>

          {row.market_fit && (
            <Card title="Market fit">
              <Row label="Fit" value={row.market_fit} />
              {row.market_fit_reason && (
                <Row label="Reason" value={row.market_fit_reason} />
              )}
              {row.sellability_score != null && (
                <Row
                  label="Sellability score"
                  value={`${row.sellability_score}/100`}
                />
              )}
            </Card>
          )}

          {row.supply_meta && Object.keys(row.supply_meta).length > 0 && (
            <Card title="Supply chain (admin only)">
              <div className="text-sm text-muted-foreground">
                Cost-breakdown imported from legacy. Internal use only — never
                exposed to client portal.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {Object.entries(row.supply_meta)
                  .filter(([, v]) => v !== null && v !== 0 && v !== "")
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-3 px-3 py-1.5 rounded border bg-background text-sm"
                    >
                      <span className="text-muted-foreground">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Created {formatDate(row.created_at)} · Updated{" "}
              {formatDate(row.updated_at)}
            </span>
            {row.image_url && (
              <a
                href={row.image_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="size-3.5" /> Open image
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  )
}
