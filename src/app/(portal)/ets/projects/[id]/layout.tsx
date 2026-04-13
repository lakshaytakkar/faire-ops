"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { ArrowLeft, Palette, Map, ListTodo, MessageSquare, FolderOpen, ShoppingBag } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { EtsStatusBadge, formatInitials } from "@/app/(portal)/ets/_components/ets-ui"
import { cn } from "@/lib/utils"

interface ClientHeader {
  id: string
  name: string
  city: string | null
  stage: string | null
  manager_name: string | null
  assigned_to: string | null
  avatar_url: string | null
}

const TABS = [
  { slug: "checklist", label: "Checklist", icon: ListTodo },
  { slug: "brand-kit", label: "Brand kit", icon: Palette },
  { slug: "layout-guide", label: "Layout", icon: Map },
  { slug: "listings", label: "Listings", icon: ShoppingBag },
  { slug: "files", label: "Files", icon: FolderOpen },
  { slug: "chat", label: "Chat", icon: MessageSquare },
]

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const id = params?.id as string
  const [client, setClient] = useState<ClientHeader | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    supabaseEts
      .from("clients")
      .select("id, name, city, stage, manager_name, assigned_to, avatar_url")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setClient(data as ClientHeader | null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href="/ets/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All projects
      </Link>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4 border-b">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base font-bold shrink-0 overflow-hidden">
            {client?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              formatInitials(client?.name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl font-semibold truncate">
                {loading ? "Loading…" : client?.name ?? "Project not found"}
              </h1>
              {client?.stage && <EtsStatusBadge value={client.stage} />}
            </div>
            {(client?.city || client?.manager_name || client?.assigned_to) && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {[client.city, client.manager_name ?? client.assigned_to]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <Link
            href={`/ets/sales/clients/${id}`}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border bg-card text-sm font-medium hover:bg-muted/40"
          >
            Open client
          </Link>
        </div>
        <div className="flex items-center gap-0 border-b overflow-x-auto">
          {TABS.map((t) => {
            const href = `/ets/projects/${id}/${t.slug}`
            const isActive = pathname?.startsWith(href)
            const Icon = t.icon
            return (
              <Link
                key={t.slug}
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}
