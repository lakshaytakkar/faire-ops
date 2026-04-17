import { cn } from "@/lib/utils"
import { logoFor } from "@/lib/app-logos"

export function AppLogo({
  app,
  size = 40,
  className,
}: {
  app: { name?: string | null; url?: string | null; logo_url?: string | null }
  size?: number
  className?: string
}) {
  const src = logoFor(app)
  const letter = (app.name ?? "?").charAt(0).toUpperCase()
  const style = { width: size, height: size } as const

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={app.name ?? ""}
        style={style}
        className={cn(
          "rounded-md object-contain bg-muted shrink-0",
          className,
        )}
      />
    )
  }

  return (
    <div
      style={style}
      className={cn(
        "rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0 font-semibold",
        className,
      )}
    >
      {letter}
    </div>
  )
}
