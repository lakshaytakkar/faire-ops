import Link from "next/link"
import {
  Radio,
  FileEdit,
  Users,
  Eye,
  Megaphone,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react"

import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import {
  StatusBadge,
  toneForStatus,
  type StatusTone,
} from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatDate, formatNumber } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Job posts — Hiring · Suprans HQ" }

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "draft", label: "Draft" },
  { key: "paused", label: "Paused" },
  { key: "closed", label: "Closed" },
] as const

type StatusKey = (typeof STATUS_TABS)[number]["key"]

interface PostRow {
  id: string
  role_id: string | null
  platform_id: string | null
  external_post_id: string | null
  external_url: string | null
  title: string | null
  status: string
  posted_at: string | null
  closed_at: string | null
  applicants_count: number | null
  views_count: number | null
  created_at: string | null
  updated_at: string | null
}

interface RoleLookup {
  id: string
  title: string | null
}

interface PlatformLookup {
  id: string
  name: string
}

function platformTone(name: string | null | undefined): StatusTone {
  if (!name) return "slate"
  const key = name.toLowerCase()
  if (key.includes("naukri")) return "blue"
  if (key.includes("workindia")) return "amber"
  if (key.includes("internshala")) return "emerald"
  if (key.includes("indeed")) return "violet"
  if (key.includes("linkedin")) return "blue"
  if (key.includes("direct") || key.includes("referral")) return "slate"
  return "slate"
}

export default async function HqHiringPostsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const activeTab: StatusKey =
    (STATUS_TABS.find((t) => t.key === sp.status)?.key ?? "all") as StatusKey

  // Load posts + lookup tables in parallel.
  const [postsRes, rolesRes, platformsRes] = await Promise.all([
    supabaseHq
      .from("job_posts")
      .select(
        "id, role_id, platform_id, external_post_id, external_url, title, status, posted_at, closed_at, applicants_count, views_count, created_at, updated_at",
      )
      .order("posted_at", { ascending: false, nullsFirst: false }),
    supabaseHq.from("job_roles").select("id, title"),
    supabaseHq.from("job_platforms").select("id, name"),
  ])

  const allPosts = (postsRes.data ?? []) as PostRow[]
  const roles = (rolesRes.data ?? []) as RoleLookup[]
  const platforms = (platformsRes.data ?? []) as PlatformLookup[]

  const rolesById = new Map(roles.map((r) => [r.id, r]))
  const platformsById = new Map(platforms.map((p) => [p.id, p]))

  // KPIs across all posts regardless of tab
  const livePosts = allPosts.filter((p) => p.status === "live").length
  const drafts = allPosts.filter((p) => p.status === "draft").length
  const totalApplicants = allPosts.reduce(
    (sum, p) => sum + (p.applicants_count ?? 0),
    0,
  )
  const totalViews = allPosts.reduce(
    (sum, p) => sum + (p.views_count ?? 0),
    0,
  )

  const tabCounts: Record<StatusKey, number> = {
    all: allPosts.length,
    live: allPosts.filter((p) => p.status === "live").length,
    draft: allPosts.filter((p) => p.status === "draft").length,
    paused: allPosts.filter((p) => p.status === "paused").length,
    closed: allPosts.filter((p) => p.status === "closed").length,
  }

  const posts =
    activeTab === "all"
      ? allPosts
      : allPosts.filter((p) => p.status === activeTab)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Job posts"
        subtitle="Every live posting across Naukri, Workindia, Internshala, Indeed and LinkedIn — with applicant + view counts."
        actions={
          <Button size="sm" disabled>
            + Publish post
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Live posts"
          value={livePosts}
          icon={Radio}
          iconTone="emerald"
        />
        <MetricCard
          label="Drafts"
          value={drafts}
          icon={FileEdit}
          iconTone="amber"
        />
        <MetricCard
          label="Total applicants"
          value={formatNumber(totalApplicants)}
          icon={Users}
          iconTone="blue"
        />
        <MetricCard
          label="Total views"
          value={formatNumber(totalViews)}
          icon={Eye}
          iconTone="violet"
        />
      </KPIGrid>

      <DetailCard title="All posts">
        {/* Chip-style status tabs — URL-driven, server-rendered */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUS_TABS.map((t) => {
            const isActive = t.key === activeTab
            const href =
              t.key === "all"
                ? "/hq/hiring/posts"
                : `/hq/hiring/posts?status=${t.key}`
            const n = tabCounts[t.key]
            return (
              <Link
                key={t.key}
                href={href}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
                    : "inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                }
              >
                <span>{t.label}</span>
                <span className="tabular-nums opacity-75">{n}</span>
              </Link>
            )
          })}
        </div>

        {posts.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No job posts yet"
            description="Once you publish a role to a platform (Naukri / Workindia / Internshala / Indeed / LinkedIn) it'll show up here with live applicant counts."
            action={
              <Button size="sm" disabled>
                + Publish first post
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Platform</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Posted</th>
                  <th className="text-right px-3 py-2 tabular-nums">
                    Applicants
                  </th>
                  <th className="text-right px-3 py-2 tabular-nums">Views</th>
                  <th className="px-3 py-2 w-10" aria-label="External" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((p) => {
                  const role = p.role_id ? rolesById.get(p.role_id) : null
                  const platform = p.platform_id
                    ? platformsById.get(p.platform_id)
                    : null
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium">
                        {p.title ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {role?.title ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {platform ? (
                          <StatusBadge tone={platformTone(platform.name)}>
                            {platform.name}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge tone={toneForStatus(p.status)}>
                          {p.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(p.posted_at)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(p.applicants_count ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(p.views_count ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {p.external_url ? (
                          <a
                            href={p.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground"
                            aria-label="Open external post"
                          >
                            <ExternalLinkIcon className="size-3.5" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
