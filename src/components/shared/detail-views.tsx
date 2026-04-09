"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, X } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  FullPageDetail — standard detail page wrapper                      */
/* ------------------------------------------------------------------ */

interface Badge {
  label: string
  className?: string
}

export function FullPageDetail({
  backLink,
  title,
  subtitle,
  badges,
  actions,
  children,
}: {
  backLink: { href: string; label: string }
  title: string
  subtitle?: string
  badges?: Badge[]
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="space-y-3">
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {backLink.label}
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-foreground">{title}</h1>
            {badges?.map((badge, i) => (
              <span
                key={i}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className ?? "bg-muted text-muted-foreground"}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  DetailCard — card used within detail pages                         */
/* ------------------------------------------------------------------ */

export function DetailCard({
  title,
  actions,
  children,
  className = "",
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <span className="text-[0.9375rem] font-semibold tracking-tight">{title}</span>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  InfoRow — label: value pair for detail cards                       */
/* ------------------------------------------------------------------ */

export function InfoRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value || "—"}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  LargeModal — large detail modal (max-w-2xl)                        */
/* ------------------------------------------------------------------ */

export function LargeModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  QuickDetailModal — small quick-view modal (max-w-md)               */
/* ------------------------------------------------------------------ */

export function QuickDetailModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card border rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h3 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PreviewPanel — right-side slide-out panel for previews             */
/* ------------------------------------------------------------------ */

export function PreviewPanel({
  title,
  onClose,
  children,
  width = "max-w-lg",
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className={`bg-card border-l shadow-2xl ${width} w-full h-full flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
