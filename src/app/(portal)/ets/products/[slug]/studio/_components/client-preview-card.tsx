import { ImageOff } from "lucide-react"

import { DetailCard } from "@/components/shared/detail-views"
import { formatCny, formatInr } from "@/lib/pricing/ets-pricing"
import type { StudioProduct } from "./types"

/**
 * Visual mock of how the client portal renders this product card.
 *
 * Pure server-renderable — no logic. Mirrors the look-and-feel that the
 * eventual client portal product grid will use so admins can sanity-check
 * the polished image, name, and INR pricing before publishing.
 */
export function ClientPreviewCard({ product }: { product: StudioProduct }) {
  const title = product.name_en || product.name_cn || product.product_code || "Untitled"
  return (
    <DetailCard title="Client preview">
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          How clients will see it
        </div>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={title}
              className="w-full aspect-square object-cover bg-muted"
            />
          ) : (
            <div className="w-full aspect-square bg-muted flex items-center justify-center">
              <ImageOff className="size-8 text-muted-foreground" />
            </div>
          )}
          <div className="p-3 space-y-1.5">
            <div className="text-sm font-semibold leading-snug line-clamp-2">{title}</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 px-2 py-0.5 text-xs font-semibold">
                {formatInr(product.selling_price_inr)}
              </span>
              {product.cost_price_cny != null && (
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 px-2 py-0.5 text-[11px]">
                  cost {formatCny(product.cost_price_cny)}
                </span>
              )}
            </div>
            {product.moq != null && (
              <div className="text-[11px] text-muted-foreground">MOQ {product.moq}</div>
            )}
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Live styling will match the client portal once that surface ships.
        </div>
      </div>
    </DetailCard>
  )
}
