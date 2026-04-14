"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Copy,
  Check,
  Trash2,
  RotateCcw,
  ImageOff,
  Save,
} from "lucide-react"
import { Tabs } from "@base-ui/react/tabs"

import { supabaseEts } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

import { useAutosave } from "./_components/use-autosave"
import {
  type ProductRow,
  type VendorMini,
} from "./_components/product-row"
import { BasicsTab } from "./_components/basics-tab"
import { PricingTab } from "./_components/pricing-tab"
import { LogisticsTab } from "./_components/logistics-tab"
import { ComplianceTab } from "./_components/compliance-tab"
import { MediaTab, UploadButton } from "./_components/media-tab"
import { MetaTab } from "./_components/meta-tab"

type TabId =
  | "basics"
  | "pricing"
  | "logistics"
  | "compliance"
  | "media"
  | "meta"

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "pricing", label: "Pricing" },
  { id: "logistics", label: "Logistics" },
  { id: "compliance", label: "Compliance" },
  { id: "media", label: "Media" },
  { id: "meta", label: "Meta" },
]

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug as string
  const router = useRouter()

  const [row, setRow] = useState<ProductRow | null>(null)
  const [vendor, setVendor] = useState<VendorMini | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [tab, setTab] = useState<TabId>("basics")

  const autosave = useAutosave(row?.id)

  // Push fresh updated_at into row state on every successful save.
  useEffect(() => {
    autosave.onSaved((updatedAt) => {
      setRow((r) => (r ? { ...r, updated_at: updatedAt } : r))
    })
  }, [autosave])

  const load = useCallback(async () => {
    setLoading(true)
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
    setRow(data as ProductRow | null)
    if (data?.vendor_id) {
      const { data: v } = await supabaseEts
        .from("vendors")
        .select("id, name")
        .eq("id", data.vendor_id)
        .maybeSingle()
      setVendor(v as VendorMini | null)
    } else {
      setVendor(null)
    }
    setLoading(false)
  }, [slug])

  useEffect(() => {
    if (slug) void load()
  }, [slug, load])

  const patch = useCallback((p: Partial<ProductRow>) => {
    setRow((r) => (r ? { ...r, ...p } : r))
  }, [])

  const statusValue = useMemo(() => {
    if (!row) return "—"
    if (!row.is_active && !row.is_published) return "soft-deleted"
    if (!row.is_active) return "inactive"
    if (row.is_published) return "published"
    return "unpublished"
  }, [row])

  async function handleCopy() {
    if (!row?.product_code) return
    await navigator.clipboard.writeText(row.product_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  async function handleDuplicate() {
    if (!row || duplicating) return
    setDuplicating(true)
    try {
      const now = new Date().toISOString()
      const newCode = `${row.product_code ?? "SKU"}-COPY-${Date.now().toString(36).toUpperCase()}`
      const {
        id: _id,
        legacy_id: _legacy,
        created_at: _ca,
        updated_at: _ua,
        product_code: _pc,
        name_en,
        name_cn,
        ...rest
      } = row
      void _id
      void _legacy
      void _ca
      void _ua
      void _pc
      const { data, error } = await supabaseEts
        .from("products")
        .insert({
          ...rest,
          product_code: newCode,
          name_en: name_en ? `${name_en}_copy` : null,
          name_cn: name_cn ? `${name_cn}_copy` : null,
          is_published: false,
          created_at: now,
          updated_at: now,
        })
        .select("product_code")
        .single()
      if (error) throw error
      if (data?.product_code) {
        router.push(`/ets/products/${data.product_code}`)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setDuplicating(false)
    }
  }

  async function handleDelete() {
    if (!row || deleting) return
    const ok = window.confirm(
      "Soft-delete this product? It will be hidden from the client portal.",
    )
    if (!ok) return
    setDeleting(true)
    await autosave.flush()
    const { error } = await supabaseEts
      .from("products")
      .update({
        is_active: false,
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
    setDeleting(false)
    if (error) {
      alert(error.message)
      return
    }
    patch({ is_active: false, is_published: false })
  }

  async function handleRestore() {
    if (!row) return
    const { error } = await supabaseEts
      .from("products")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", row.id)
    if (error) {
      alert(error.message)
      return
    }
    patch({ is_active: true })
  }

  async function togglePublished() {
    if (!row) return
    const next = !row.is_published
    patch({ is_published: next })
    autosave.save("is_published", next)
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-5 w-64 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!row) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <PageHeader
          title="Product not found"
          breadcrumbs={[
            { label: "Catalog", href: "/ets/catalog/products" },
            { label: "Products", href: "/ets/catalog/products" },
            { label: slug },
          ]}
        />
        <EmptyState
          title="No product with that SKU"
          description={`We couldn't find a product with code "${slug}".`}
          action={
            <Link
              href="/ets/catalog/products"
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to products
            </Link>
          }
        />
      </div>
    )
  }

  const title = row.name_en || row.name_cn || "Untitled product"
  const softDeleted = !row.is_active && !row.is_published

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: "Catalog", href: "/ets/catalog/products" },
          { label: "Products", href: "/ets/catalog/products" },
          { label: row.product_code ?? slug },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void autosave.flush()}
              disabled={!autosave.hasPending}
              title={
                autosave.hasPending
                  ? "Flush pending autosaves"
                  : "All changes saved"
              }
            >
              <Save /> Save all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              disabled={duplicating}
            >
              <Copy />
              {duplicating ? "Duplicating…" : "Duplicate"}
            </Button>
            {softDeleted ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestore}
              >
                <RotateCcw /> Restore
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
        }
      />

      {/* Identity strip: image + sku + badges + publish toggle */}
      <div className="rounded-lg border bg-card shadow-sm p-5 flex items-start gap-5">
        <div className="shrink-0">
          {row.image_url ? (
            <a
              href={row.image_url}
              target="_blank"
              rel="noreferrer"
              className="block size-[200px] rounded-lg border bg-muted overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.image_url}
                alt={title}
                className="size-full object-cover"
              />
            </a>
          ) : (
            <div className="size-[200px] rounded-lg border bg-muted flex items-center justify-center">
              <ImageOff className="size-8 text-muted-foreground" />
            </div>
          )}
          <div className="mt-2">
            <UploadButton
              productId={row.id}
              onUploaded={(url) => {
                patch({ image_url: url })
                autosave.save("image_url", url)
              }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">SKU</span>
            <span className="font-mono text-sm">
              {row.product_code ?? "—"}
            </span>
            {row.product_code && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Copy SKU"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge tone={toneForStatus(statusValue)}>
              {statusValue.replace("-", " ")}
            </StatusBadge>
            {row.is_featured && <StatusBadge tone="violet">Featured</StatusBadge>}
            <button
              type="button"
              onClick={togglePublished}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize transition-colors",
                row.is_published
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200",
              )}
            >
              {row.is_published ? "Unpublish" : "Publish"}
            </button>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated {formatRelative(row.updated_at)}
          </div>
        </div>
      </div>

      <Tabs.Root
        value={tab}
        onValueChange={(v: unknown) => setTab(v as TabId)}
        className="rounded-lg border bg-card shadow-sm"
      >
        <Tabs.List className="flex items-center border-b overflow-x-auto">
          {TABS.map((t) => (
            <Tabs.Tab
              key={t.id}
              value={t.id}
              className={cn(
                "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none",
                "data-[selected]:text-foreground text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator
            className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all"
            style={{
              width: "var(--active-tab-width)",
              transform: "translateX(var(--active-tab-left))",
            }}
          />
        </Tabs.List>

        <Tabs.Panel value="basics" className="p-5 outline-none">
          <BasicsTab row={row} patch={patch} autosave={autosave} />
        </Tabs.Panel>
        <Tabs.Panel value="pricing" className="p-5 outline-none">
          <PricingTab row={row} patch={patch} autosave={autosave} />
        </Tabs.Panel>
        <Tabs.Panel value="logistics" className="p-5 outline-none">
          <LogisticsTab row={row} patch={patch} autosave={autosave} />
        </Tabs.Panel>
        <Tabs.Panel value="compliance" className="p-5 outline-none">
          <ComplianceTab row={row} patch={patch} autosave={autosave} />
        </Tabs.Panel>
        <Tabs.Panel value="media" className="p-5 outline-none">
          <MediaTab row={row} patch={patch} autosave={autosave} />
        </Tabs.Panel>
        <Tabs.Panel value="meta" className="p-5 outline-none">
          <MetaTab
            row={row}
            vendor={vendor}
            patch={patch}
            autosave={autosave}
            onVendorChange={setVendor}
          />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  if (isNaN(then)) return "—"
  const diff = Date.now() - then
  if (diff < 0) return "just now"
  const sec = Math.floor(diff / 1000)
  if (sec < 5) return "just now"
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
