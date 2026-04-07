import { supabase } from "@/lib/supabase"

const BUCKET = "images"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

/* ------------------------------------------------------------------ */
/*  Upload                                                             */
/* ------------------------------------------------------------------ */

export async function uploadImage(
  file: File,
  folder: string // e.g., "products/p_xxx" or "stores/logo"
): Promise<{ path: string; publicUrl: string } | null> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    console.error("Upload error:", error)
    return null
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`
  return { path: fileName, publicUrl }
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

export async function deleteImage(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.error("Delete error:", error)
    return false
  }
  return true
}

/* ------------------------------------------------------------------ */
/*  Save product image reference                                       */
/* ------------------------------------------------------------------ */

export async function saveProductImage(args: {
  faireProductId: string
  storeId: string
  storagePath: string
  publicUrl: string
  imageType: string
  fileName: string
  fileSizeBytes: number
  description?: string
}) {
  const { error } = await supabase.from("product_images").insert({
    faire_product_id: args.faireProductId,
    store_id: args.storeId,
    storage_path: args.storagePath,
    public_url: args.publicUrl,
    image_type: args.imageType,
    file_name: args.fileName,
    file_size_bytes: args.fileSizeBytes,
    description: args.description ?? null,
  })
  if (error) console.error("Save product image error:", error)
  return !error
}

/* ------------------------------------------------------------------ */
/*  Save store asset                                                   */
/* ------------------------------------------------------------------ */

export async function saveStoreAsset(args: {
  storeId: string
  assetType: string // logo, banner, collection_thumb
  storagePath: string
  publicUrl: string
  fileName: string
  description?: string
}) {
  const { error } = await supabase.from("store_assets").insert({
    store_id: args.storeId,
    asset_type: args.assetType,
    storage_path: args.storagePath,
    public_url: args.publicUrl,
    file_name: args.fileName,
    description: args.description ?? null,
  })
  if (error) console.error("Save store asset error:", error)
  return !error
}

/* ------------------------------------------------------------------ */
/*  Fetch product images                                               */
/* ------------------------------------------------------------------ */

export async function getProductImages(faireProductId: string) {
  const { data } = await supabase
    .from("product_images")
    .select("*")
    .eq("faire_product_id", faireProductId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getStoreAssets(storeId: string, assetType?: string) {
  let query = supabase
    .from("store_assets")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
  if (assetType) query = query.eq("asset_type", assetType)
  const { data } = await query
  return data ?? []
}

/* ------------------------------------------------------------------ */
/*  File to Base64 (for Gemini Vision)                                 */
/* ------------------------------------------------------------------ */

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix to get pure base64
      const base64 = result.split(",")[1] ?? result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
