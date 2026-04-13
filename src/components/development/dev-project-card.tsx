import Link from "next/link"
import { ArrowUpRight, ExternalLink, GitBranch } from "lucide-react"
import type { Project } from "@/lib/projects"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  HealthDot,
  KindPill,
  StatusPill,
  VersionPill,
  ventureMeta,
  relativeTime,
} from "./dev-primitives"

export function DevProjectCard({ project }: { project: Project }) {
  const v = ventureMeta(project.venture)
  return (
    <Link
      href={`/development/projects/${project.slug}`}
      className="group block focus-visible:outline-none"
    >
      <Card className="p-4 transition-shadow hover:shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "size-10 rounded-md flex items-center justify-center shrink-0 text-white font-semibold text-sm",
                v.gradientClass,
              )}
              aria-hidden
            >
              {v.short}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold leading-tight truncate group-hover:text-primary">
                  {project.name}
                </h3>
                <VersionPill version={project.version} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {v.label} · {project.owner_name ?? "Unassigned"}
              </p>
            </div>
          </div>
          <HealthDot health={project.health} />
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex items-center gap-1.5 flex-wrap">
            <KindPill kind={project.kind} />
            <StatusPill status={project.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {project.last_deploy_at && (
              <span className="inline-flex items-center gap-1" title="Last deploy">
                <GitBranch className="size-3" />
                {relativeTime(project.last_deploy_at)}
              </span>
            )}
            {project.url && (
              <span className="inline-flex items-center gap-1 text-primary group-hover:underline">
                Visit
                <ExternalLink className="size-3" />
              </span>
            )}
            <ArrowUpRight className="size-3.5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
