/**
 * Shared types for the Bhagwati-China supplier ingestion pipeline.
 */

export const BHAGWATI_SOURCE = "Bhagwati-China" as const

export type ListingStatus = "draft" | "ready" | "published" | "archived"
export type ImagePolishStatus = "pending" | "skipped" | "done" | "failed"
export type NameQuality = "raw" | "ai_cleaned" | "human_verified"

export interface PublishChecklist {
  image_polished: boolean
  name_normalized: boolean
  variants_modeled: boolean
  prices_inr: boolean
  categorized: boolean
  source_tagged: boolean
}

export const EMPTY_CHECKLIST: PublishChecklist = {
  image_polished: false,
  name_normalized: false,
  variants_modeled: false,
  prices_inr: false,
  categorized: false,
  source_tagged: false,
}

/** A row staged out of an XLSX file (pre-import). */
export interface StagedRow {
  source_file: string
  sheet_name: string
  row_number: number
  source_row_id: string             // `${file}:${sheet}:${row}` — idempotency key
  description: string | null         // raw "DES" cell — usually CN/EN mix
  exw_rmb: number | null             // EXW (RMB/PCS)
  moq: number | null
  carton_qty: number | null
  box_qty: number | null
  image_path: string | null          // local path to extracted image
  image_ext: string | null
  raw_row: Record<string, unknown>   // every column for forensics
}

export interface ImportBatchSummary {
  source_file: string
  rows_total: number
  rows_imported: number
  rows_skipped: number
  images_extracted: number
  images_matched: number
  notes?: string
}

export interface PolishResult {
  status: "done" | "skipped" | "failed"
  reason?: string
  publicUrl?: string
  storagePath?: string
  bytesIn?: number
  bytesOut?: number
}
