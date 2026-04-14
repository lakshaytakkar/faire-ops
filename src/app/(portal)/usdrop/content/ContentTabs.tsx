"use client"

import { useState } from "react"
import { FileText, Link as LinkIcon, Film, Map, CheckSquare, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

type Article = {
  id: string
  slug: string | null
  title: string | null
  category: string | null
  featured: boolean | null
  featured_image: string | null
  read_time: number | null
  views: number | null
  likes: number | null
  published_date: string | null
  created_at: string | null
}

type Link = {
  id: string
  title: string | null
  url: string | null
  description: string | null
  category: string | null
  is_published: boolean | null
  order_index: number | null
  created_at: string | null
}

type AdVideo = {
  id: string
  title: string | null
  video_url: string | null
  thumbnail_url: string | null
  category: string | null
  views: number | null
  likes: number | null
  is_published: boolean | null
  order_index: number | null
  date_added: string | null
  created_at: string | null
}

type RoadmapTask = {
  id: string
  stage_id: string | null
  task_no: number | null
  title: string | null
  link: string | null
  order_index: number | null
  is_published: boolean | null
  created_at: string | null
}

type CroItem = {
  id: string
  category_id: string | null
  label: string | null
  description: string | null
  priority: string | null
  order_index: number | null
  is_published: boolean | null
  created_at: string | null
}

type OnboardingVideo = {
  id: string
  module_id: string | null
  title: string | null
  description: string | null
  video_url: string | null
  video_duration: number | null
  order_index: number | null
  created_at: string | null
}

type TabId = "articles" | "links" | "ads" | "tasks" | "cro" | "onboarding"

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

export function ContentTabs({
  articles,
  links,
  adVideos,
  roadmapTasks,
  croItems,
  onboardingVideos,
}: {
  articles: Article[]
  links: Link[]
  adVideos: AdVideo[]
  roadmapTasks: RoadmapTask[]
  croItems: CroItem[]
  onboardingVideos: OnboardingVideo[]
}) {
  const [tab, setTab] = useState<TabId>("articles")

  const tabs: FilterTab[] = [
    { id: "articles", label: "Articles", count: articles.length },
    { id: "links", label: "Links", count: links.length },
    { id: "ads", label: "Ad videos", count: adVideos.length },
    { id: "tasks", label: "Roadmap tasks", count: roadmapTasks.length },
    { id: "cro", label: "CRO items", count: croItems.length },
    { id: "onboarding", label: "Onboarding", count: onboardingVideos.length },
  ]

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as TabId)} />

      {tab === "articles" && (
        <DetailCard title="Intelligence articles">
          {articles.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No articles yet"
              description="Intelligence articles shown in the client app appear here once published."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5 text-right">Read</th>
                    <th className="px-4 py-2.5 text-right">Views</th>
                    <th className="px-4 py-2.5 text-right">Likes</th>
                    <th className="px-4 py-2.5">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{a.title ?? "Untitled"}</div>
                        <div className="text-sm text-muted-foreground">{a.slug ?? "—"}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline">{a.category ?? "—"}</Badge>
                        {a.featured && <Badge className="ml-1.5">Featured</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {a.read_time ? `${a.read_time}m` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {(a.views ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {(a.likes ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(a.published_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "links" && (
        <DetailCard title="Important links">
          {links.length === 0 ? (
            <EmptyState
              icon={LinkIcon}
              title="No links yet"
              description="Curated resource links the client app surfaces in the help tab live here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">URL</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Published</th>
                    <th className="px-4 py-2.5 text-right">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((l) => (
                    <tr key={l.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{l.title ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {l.url ? (
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="hover:text-primary"
                          >
                            {l.url.replace(/^https?:\/\//, "").slice(0, 60)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5">{l.category ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(l.is_published ? "live" : "inactive")}>
                          {l.is_published ? "live" : "draft"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {l.order_index ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "ads" && (
        <DetailCard title="Ad videos">
          {adVideos.length === 0 ? (
            <EmptyState
              icon={Film}
              title="No ad videos yet"
              description="The ad inspiration library shown in the client app appears here once videos are uploaded."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5 text-right">Views</th>
                    <th className="px-4 py-2.5 text-right">Likes</th>
                    <th className="px-4 py-2.5">Published</th>
                    <th className="px-4 py-2.5">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {adVideos.map((v) => (
                    <tr key={v.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          {v.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.thumbnail_url}
                              alt=""
                              className="size-10 rounded object-cover bg-muted shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-10 rounded bg-muted shrink-0" />
                          )}
                          <div className="font-medium line-clamp-2">{v.title ?? "—"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">{v.category ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {(v.views ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {(v.likes ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(v.is_published ? "live" : "inactive")}>
                          {v.is_published ? "live" : "draft"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(v.date_added)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "tasks" && (
        <DetailCard title="Roadmap tasks">
          {roadmapTasks.length === 0 ? (
            <EmptyState
              icon={Map}
              title="No roadmap tasks"
              description="Tasks assigned to roadmap stages appear here. Manage stages on the Roadmap page."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-right">#</th>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Link</th>
                    <th className="px-4 py-2.5">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {roadmapTasks.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                        {t.task_no ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{t.title ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{t.link ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(t.is_published ? "live" : "inactive")}>
                          {t.is_published ? "live" : "draft"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "cro" && (
        <DetailCard title="CRO checklist">
          {croItems.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No CRO items yet"
              description="Conversion-rate-optimization checklist items surface to clients in the store-audit flow."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Label</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Priority</th>
                    <th className="px-4 py-2.5">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {croItems.map((i) => (
                    <tr key={i.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{i.label ?? "—"}</div>
                        {i.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {i.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{i.category_id ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(i.priority)}>
                          {i.priority ?? "—"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(i.is_published ? "live" : "inactive")}>
                          {i.is_published ? "live" : "draft"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "onboarding" && (
        <DetailCard title="Onboarding videos">
          {onboardingVideos.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No onboarding videos yet"
              description="Videos shown in the new-user onboarding flow live here — attach them to an onboarding module."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Module</th>
                    <th className="px-4 py-2.5 text-right">Duration</th>
                    <th className="px-4 py-2.5 text-right">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {onboardingVideos.map((v) => (
                    <tr key={v.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{v.title ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {v.module_id ? v.module_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {v.video_duration ? `${Math.round(v.video_duration / 60)}m` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {v.order_index ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}
    </>
  )
}
