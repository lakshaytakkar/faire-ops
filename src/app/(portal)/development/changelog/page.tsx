import Link from "next/link"
import { VentureBadge } from "@/components/development/dev-primitives"
import { EtsListShell } from "@/app/(portal)/ets/_components/ets-ui"
import { Card } from "@/components/ui/card"

export const metadata = { title: "Changelog — Development | Suprans" }

type Entry = {
  date: string
  venture: string
  title: string
  description: string
  projectSlug?: string
}

const ENTRIES: Entry[] = [
  {
    date: "2026-04-13",
    venture: "teamsync-ai",
    projectSlug: "teamsync-admin",
    title: "Development space added to the portal",
    description:
      "New top-level space dedicated to engineering. Portfolio of every landing, portal, and app. Sprints, deployments, roadmap, and changelog all live here now. Projects surface moved out of Home.",
  },
  {
    date: "2026-04-13",
    venture: "suprans",
    projectSlug: "suprans-landing",
    title: "Suprans.in surfaces Mr. Suprans + three-flagship ecosystem",
    description:
      "Homepage and /brands restructured around Mr. Suprans as the operator protagonist. Three flagships surfaced: the US Wholesale House (category leader in toys), USDrop AI, and LegalNations.",
  },
  {
    date: "2026-04-13",
    venture: "suprans",
    projectSlug: "suprans-landing",
    title: "Preserved routes rebuilt — travel, events, about, careers, contact",
    description:
      "All legacy routes revamped with China-trade positioning. 12 new page assets generated via Gemini. Two-step lead form on /contact, Razorpay-backed booking on /travel and /events preserved.",
  },
  {
    date: "2026-04-10",
    venture: "suprans",
    projectSlug: "suprans-admin",
    title: "Suprans schema migrated — full dataset parity",
    description:
      "All 2,185 rows from the original Suprans database migrated cleanly. Zero orphans across all foreign keys. Added notes, payment_amount, payment_status columns to bookings to match source.",
  },
  {
    date: "2026-04-10",
    venture: "ets",
    projectSlug: "ets-admin",
    title: "ETS Phases 2–5 shipped",
    description:
      "Full admin pages across finance, vendor KYC, vendor detail, products, stores, orders detail. Shared UI primitives unified across ETS and the core portal.",
  },
  {
    date: "2026-04-09",
    venture: "teamsync-ai",
    projectSlug: "teamsync-admin",
    title: "Universal modules via ?space= param",
    description:
      "Calendar, tasks, chat, tickets, knowledge, training, links, and files now filter by active space. One module, many tenants.",
  },
  {
    date: "2026-04-08",
    venture: "teamsync-ai",
    projectSlug: "teamsync-admin",
    title: "Chat platform: channels + membership + drawers",
    description:
      "End-to-end chat with channel creation, member rosters, clickable drawers for channels and people, full admin controls, and cross-portal @order mentions.",
  },
  {
    date: "2026-04-06",
    venture: "suprans",
    projectSlug: "suprans-admin",
    title: "HQ overview + projects hub + brand matrix",
    description:
      "Top-of-hierarchy HQ space launched with ventures grid, portfolio progress rollups, and a brand-kit gallery.",
  },
]

export default function ChangelogPage() {
  return (
    <EtsListShell
      title="Changelog"
      subtitle="Notable releases in reverse order. For live deploys see the Deployments feed."
    >
      <div className="space-y-3">
        {ENTRIES.map((e) => (
          <Card key={`${e.date}-${e.title}`} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <VentureBadge venture={e.venture} />
                <span className="text-xs text-muted-foreground">
                  {new Date(e.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              {e.projectSlug && (
                <Link
                  href={`/development/projects/${e.projectSlug}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Open project →
                </Link>
              )}
            </div>
            <h3 className="text-sm font-semibold leading-snug">{e.title}</h3>
            <p className="text-sm text-muted-foreground">{e.description}</p>
          </Card>
        ))}
      </div>
    </EtsListShell>
  )
}
