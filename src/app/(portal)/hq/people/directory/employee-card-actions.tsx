"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Mail, MessageSquare, MoreVertical, Phone, Copy, Download, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  fullName: string | null
  phone: string | null
  workEmail: string | null
  waProfileUrl: string | null
}

export function EmployeeCardActions({ id, fullName, phone, workEmail, waProfileUrl }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const phoneClean = phone?.replace(/[^0-9]/g, "") ?? ""
  const whatsappUrl = phoneClean ? `https://wa.me/91${phoneClean.slice(-10)}` : null
  const gmailUrl = workEmail ? `mailto:${workEmail}` : null

  const btnBase =
    "inline-flex items-center justify-center h-9 rounded-md text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(btnBase, "bg-emerald-500 hover:bg-emerald-600")}
          title="WhatsApp"
          aria-label={`WhatsApp ${fullName ?? ""}`}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      ) : (
        <button type="button" disabled className={cn(btnBase, "bg-emerald-500")} title="No phone">
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
        </button>
      )}

      {gmailUrl ? (
        <a
          href={gmailUrl}
          className={cn(btnBase, "bg-blue-500 hover:bg-blue-600")}
          title={workEmail ?? "Email"}
          aria-label={`Email ${fullName ?? ""}`}
        >
          <Mail className="size-4" />
        </a>
      ) : (
        <button type="button" disabled className={cn(btnBase, "bg-blue-500")} title="No email">
          <Mail className="size-4" />
        </button>
      )}

      <Link
        href={`/hq/people/directory/${id}?tab=chat`}
        className={cn(btnBase, "bg-violet-500 hover:bg-violet-600")}
        title="Open chat"
        aria-label={`Chat with ${fullName ?? ""}`}
      >
        <MessageSquare className="size-4" />
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            btnBase,
            "w-full bg-slate-700 hover:bg-slate-800",
            open && "bg-slate-900",
          )}
          title="More"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <MoreVertical className="size-4" />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 bottom-full mb-1.5 z-40 w-48 rounded-md border border-border bg-popover shadow-lg overflow-hidden"
          >
            <Link
              href={`/hq/people/directory/${id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <Eye className="size-4 text-muted-foreground" /> View profile
            </Link>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <Phone className="size-4 text-muted-foreground" /> Call {phone}
              </a>
            )}
            {phone && (
              <button
                type="button"
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => {
                  navigator.clipboard?.writeText(phone)
                  setOpen(false)
                }}
              >
                <Copy className="size-4 text-muted-foreground" /> Copy phone
              </button>
            )}
            {workEmail && (
              <button
                type="button"
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => {
                  navigator.clipboard?.writeText(workEmail)
                  setOpen(false)
                }}
              >
                <Copy className="size-4 text-muted-foreground" /> Copy email
              </button>
            )}
            {waProfileUrl && (
              <a
                href={waProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <Download className="size-4 text-muted-foreground" /> Download profile
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
