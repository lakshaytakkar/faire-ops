import { Package } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Small square product image with a muted placeholder fallback.
 * Used across ETS catalog pages (compliance queue, image workbench, products list).
 */
export function ProductThumbnail({
  src,
  alt,
  size = 32,
  className,
}: {
  src?: string | null
  alt?: string
  /** pixel edge length */
  size?: number
  className?: string
}) {
  const dim = `${size}px`
  if (!src) {
    return (
      <div
        className={cn(
          "rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground",
          className,
        )}
        style={{ width: dim, height: dim }}
      >
        <Package className="size-[45%]" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      className={cn("rounded object-cover bg-muted shrink-0", className)}
      style={{ width: dim, height: dim }}
    />
  )
}
