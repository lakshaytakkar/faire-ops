"use client"

import { cn } from "@/lib/utils"

interface StoreLogoProps {
  store: {
    name: string
    short: string
    color: string
    logo_url?: string | null
  }
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}

const SIZES = {
  xs: { container: "w-5 h-5", text: "text-[7px]", img: "w-5 h-5" },
  sm: { container: "w-7 h-7", text: "text-[9px]", img: "w-7 h-7" },
  md: { container: "w-9 h-9", text: "text-[10px]", img: "w-9 h-9" },
  lg: { container: "w-12 h-12", text: "text-xs", img: "w-12 h-12" },
}

export function StoreLogo({ store, size = "sm", className }: StoreLogoProps) {
  const s = SIZES[size]

  if (store.logo_url) {
    return (
      <img
        src={store.logo_url}
        alt={store.name}
        className={cn(s.img, "rounded object-cover bg-muted shrink-0", className)}
        loading="lazy"
      />
    )
  }

  return (
    <span
      className={cn(
        s.container,
        "flex items-center justify-center font-bold text-white rounded shrink-0",
        s.text,
        className
      )}
      style={{ backgroundColor: store.color }}
    >
      {store.short}
    </span>
  )
}
