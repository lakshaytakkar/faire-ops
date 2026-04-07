"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { BookOpen, Video, Link as LinkIcon, X, ExternalLink, FileText, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageResourcesProps {
  pageRoute: string
}

export function PageResourcesButton({ pageRoute }: PageResourcesProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const [sops, setSops] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)

  // Fetch counts on mount for badge
  useEffect(() => {
    async function fetchCounts() {
      const [v, s, l] = await Promise.all([
        supabase.from("training_videos").select("id", { count: "exact", head: true }).contains("page_routes", [pageRoute]),
        supabase.from("sops").select("id", { count: "exact", head: true }).contains("page_routes", [pageRoute]).eq("status", "published"),
        supabase.from("important_links").select("id", { count: "exact", head: true }).contains("page_routes", [pageRoute]),
      ])
      setCount((v.count ?? 0) + (s.count ?? 0) + (l.count ?? 0))
    }
    fetchCounts()
  }, [pageRoute])

  async function fetchResources() {
    setLoading(true)
    const [v, s, l] = await Promise.all([
      supabase.from("training_videos").select("*").contains("page_routes", [pageRoute]),
      supabase.from("sops").select("*").contains("page_routes", [pageRoute]).eq("status", "published"),
      supabase.from("important_links").select("*").contains("page_routes", [pageRoute]),
    ])
    setVideos(v.data ?? [])
    setSops(s.data ?? [])
    setLinks(l.data ?? [])
    setLoading(false)
  }

  function handleOpen() {
    setOpen(true)
    fetchResources()
  }

  const total = videos.length + sops.length + links.length
  const hasContent = !loading && total > 0
  const isEmpty = !loading && total === 0

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <BookOpen className="size-3.5 mr-1" />
        Resources
        {count > 0 && (
          <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 rounded-full">{count}</span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-2xl rounded-lg border bg-card shadow-xl mx-4 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">Page Resources</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="py-2">
              {loading && (
                <div className="px-5 py-8 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {isEmpty && (
                <div className="px-5 py-12 text-center">
                  <BookOpen className="mx-auto size-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No resources mapped to this page yet</p>
                </div>
              )}

              {/* Training Videos */}
              {videos.length > 0 && (
                <div>
                  <div className="px-5 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Training Videos
                    </p>
                  </div>
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => window.open(video.video_url, "_blank")}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Play className="size-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        {video.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{video.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {video.duration && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{video.duration}</span>
                        )}
                        {video.is_required && (
                          <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Required</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SOPs */}
              {sops.length > 0 && (
                <div>
                  <div className="px-5 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Standard Operating Procedures
                    </p>
                  </div>
                  {sops.map((sop) => (
                    <div
                      key={sop.id}
                      onClick={() => { setOpen(false); router.push(`/workspace/sops/${sop.id}`) }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <FileText className="size-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sop.title}</p>
                        {sop.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{sop.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sop.version && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">v{sop.version}</span>
                        )}
                        {sop.owner && (
                          <span className="text-xs text-muted-foreground">{sop.owner}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Important Links */}
              {links.length > 0 && (
                <div>
                  <div className="px-5 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Important Links
                    </p>
                  </div>
                  {links.map((link) => (
                    <div
                      key={link.id}
                      onClick={() => window.open(link.url, "_blank")}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <ExternalLink className="size-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        {link.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{link.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {link.category && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{link.category}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
