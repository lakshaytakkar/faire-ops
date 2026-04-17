/**
 * ETS pricing helpers.
 *
 * Locked Apr 2026 by user:
 * - RMB→INR fixed at 13.8 (admin-editable per product later)
 * - Margin fixed at 20% over cost (admin-editable per product later)
 */

export const DEFAULT_FX_INR_PER_CNY = 13.8
export const DEFAULT_MARGIN_PCT = 20

export interface PricingInput {
  costPriceCny: number
  fxRate?: number   // INR per CNY
  marginPct?: number
}

export interface PricingOutput {
  costPriceCny: number
  fxRate: number
  marginPct: number
  costPriceInr: number
  sellingPriceInr: number
}

export function computePricing(input: PricingInput): PricingOutput {
  const fxRate = input.fxRate ?? DEFAULT_FX_INR_PER_CNY
  const marginPct = input.marginPct ?? DEFAULT_MARGIN_PCT
  const costPriceCny = round2(input.costPriceCny)
  const costPriceInr = round2(costPriceCny * fxRate)
  const sellingPriceInr = round2(costPriceInr * (1 + marginPct / 100))
  return { costPriceCny, fxRate, marginPct, costPriceInr, sellingPriceInr }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatInr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatCny(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(n)
}
