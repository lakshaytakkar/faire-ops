"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Hash } from "lucide-react"
import { ChannelEmbed } from "@/components/chat/channel-embed"

// Project-scoped channel kinds. The same values are seeded per-client
// by the DB trigger, and read by the client portal's ChannelEmbed.
const THREADS = [
  { id: "project-general", label: "General" },
  { id: "project-brand-kit", label: "Brand kit" },
  { id: "project-layout", label: "Layout" },
] as const

export default function ProjectChatPage() {
  const params = useParams<{ id: string }>()
  const clientId = (params?.id as string) ?? null
  const [kind, setKind] = useState<string>("project-general")

  if (!clientId) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-6">
        <p className="text-sm text-muted-foreground">Loading client…</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[560px] gap-3">
      <aside className="w-48 shrink-0 rounded-lg border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="px-3 py-2.5 border-b">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Channels
          </h2>
        </div>
        <ul className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {THREADS.map((t) => {
            const isActive = kind === t.id
            return (
              <li key={t.id}>
                <button
                  onClick={() => setKind(t.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Hash className="size-3.5 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
      <div className="flex-1 min-w-0">
        <ChannelEmbed
          key={`${clientId}-${kind}`}
          projectId={clientId}
          channelKind={kind}
          senderName="Admin"
          height="100%"
          showHeader
          emptyHint="Say hi — this message will also appear in the client's chat."
        />
      </div>
    </div>
  )
}
