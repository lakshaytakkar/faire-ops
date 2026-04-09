"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface SubNavItem {
  title: string
  href: string
}

export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname()

  return (
    <div
      className="grid border-b border-border bg-background -mx-4 md:-mx-6 lg:-mx-8 -mt-5 mb-5"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((item, i) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center h-11 text-sm transition-colors",
              i < items.length - 1 && "border-r border-border",
              active
                ? "bg-primary/8 text-foreground font-bold border-b-2 border-b-primary"
                : "text-foreground font-medium hover:bg-muted/50"
            )}
          >
            {item.title}
          </Link>
        )
      })}
    </div>
  )
}
