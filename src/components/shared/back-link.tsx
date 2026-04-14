"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

// Standard back link for detail pages. See SPACE_PATTERN.md §4.
export function BackLink({
  href,
  label,
  className = "",
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Link>
  )
}
