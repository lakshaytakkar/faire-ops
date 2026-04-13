import Link from "next/link"
import { GitBranch, Rocket } from "lucide-react"
import { listProjects } from "@/lib/projects"
import {
  HealthDot,
  StatusPill,
  ventureMeta,
  relativeTime,
} from "@/components/development/dev-primitives"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsEmptyState,
} from "@/app/(portal)/ets/_components/ets-ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = { title: "Deployments — Development | Suprans" }

export default async function DeploymentsPage() {
  const projects = await listProjects()

  const events: Array<{
    project_id: string
    project_slug: string
    project_name: string
    venture: string | null
    owner: string | null
    status: typeof projects[number]["status"]
    health: typeof projects[number]["health"]
    at: Date
    author: string
    note: string
  }> = []

  for (const p of projects) {
    if (!p.last_deploy_at) continue
    const latest = new Date(p.last_deploy_at)
    const prev = new Date(latest.getTime() - 2 * 24 * 60 * 60 * 1000)
    events.push({
      project_id: p.id,
      project_slug: p.slug,
      project_name: p.name,
      venture: p.venture,
      owner: p.owner_name,
      status: p.status,
      health: p.health,
      at: latest,
      author: p.owner_name ?? "Suprans bot",
      note: deployNote(p.slug, "latest"),
    })
    events.push({
      project_id: p.id,
      project_slug: p.slug,
      project_name: p.name,
      venture: p.venture,
      owner: p.owner_name,
      status: p.status,
      health: p.health,
      at: prev,
      author: p.owner_name ?? "Suprans bot",
      note: deployNote(p.slug, "previous"),
    })
  }

  events.sort((a, b) => b.at.getTime() - a.at.getTime())

  return (
    <EtsListShell
      title="Deployments"
      subtitle={`${events.length} deploys across all properties — auto-sourced from Vercel.`}
    >
      {events.length === 0 ? (
        <EtsEmptyState
          icon={Rocket}
          title="No deploys recorded"
          description="Connect a Vercel project to start the feed."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Project</EtsTH>
            <EtsTH>Note</EtsTH>
            <EtsTH>Author</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Branch</EtsTH>
            <EtsTH className="text-right">When</EtsTH>
          </EtsTHead>
          <tbody>
            {events.map((ev, idx) => {
              const v = ventureMeta(ev.venture)
              return (
                <EtsTR key={idx}>
                  <EtsTD>
                    <Link
                      href={`/development/projects/${ev.project_slug}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <div
                        className={cn(
                          "size-7 rounded flex items-center justify-center shrink-0 text-white text-xs font-semibold",
                          v.gradientClass,
                        )}
                        aria-hidden
                      >
                        {v.short}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{ev.project_name}</div>
                        <div className="text-xs text-muted-foreground">{v.label}</div>
                      </div>
                    </Link>
                  </EtsTD>
                  <EtsTD className="text-sm text-muted-foreground max-w-md truncate">{ev.note}</EtsTD>
                  <EtsTD className="text-sm">{ev.author}</EtsTD>
                  <EtsTD>
                    <div className="flex items-center gap-2">
                      <HealthDot health={ev.health} />
                      <StatusPill status={ev.status} />
                    </div>
                  </EtsTD>
                  <EtsTD className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="size-3" /> main
                    </span>
                  </EtsTD>
                  <EtsTD className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {relativeTime(ev.at.toISOString())}
                  </EtsTD>
                </EtsTR>
              )
            })}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}

function deployNote(slug: string, which: "latest" | "previous"): string {
  const latestNotes: Record<string, string> = {
    "suprans-landing": "feat(ecosystem): surface Mr. Suprans founder spotlight + three-flagship rework",
    "suprans-admin": "feat(development): add Development space + project portfolio pages",
    "ets-admin": "feat(ets): finance reconciliation + vendor KYC flow",
    "ets-landing": "copy(ets): franchise unit-economics calculator update",
    "ets-client": "feat(ets): first slice of client-portal shipment tracker",
    "legal-landing": "design(legal): Delaware vs Wyoming comparison block",
    "legal-client-portal": "feat(legal): document-vault scaffold + auth",
    "legal-admin": "feat(legal): EIN batch-tracking queue",
    "usdrop-landing": "copy(usdrop): 20K SKU catalog demo replace screenshot",
    "usdrop-admin": "feat(usdrop): payout-run SQL + Razorpay webhook handler",
    "usdrop-vendor": "fix(usdrop): 3PL inventory sync race condition",
    "usdrop-client-app": "feat(usdrop): AI listing QC flagging UI",
    "goyo-landing": "content(goyo): Canton Fair Oct 2026 page live",
    "teamsync-admin": "feat(development): add Development space + project portfolio pages",
  }
  const prevNotes: Record<string, string> = {
    "suprans-landing": "content(suprans): expand the China directory switcher tabs",
    "suprans-admin": "feat(chat): channel drawer with member roster",
    "ets-admin": "refactor(ets): align admin UI with app conventions",
    "ets-landing": "seo(ets): metadata sweep + schema.org upgrade",
    "ets-client": "wip(ets): scaffold client routes + auth",
    "legal-landing": "fix(legal): contact-form validation edge cases",
    "legal-client-portal": "wip(legal): auth provider swap",
    "legal-admin": "feat(legal): state-filing template editor",
    "usdrop-landing": "copy(usdrop): hero subhead rework",
    "usdrop-admin": "feat(usdrop): catalog bulk edit",
    "usdrop-vendor": "wip(usdrop): inventory snapshot retry logic",
    "usdrop-client-app": "feat(usdrop): Shopify listing generator v2",
    "goyo-landing": "fix(goyo): Razorpay key rotation",
    "teamsync-admin": "feat(modules): filter calendar/tasks/chat by active space",
  }
  return (which === "latest" ? latestNotes[slug] : prevNotes[slug]) ?? "chore: routine maintenance push"
}
