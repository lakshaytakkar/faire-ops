import { Sparkles } from "lucide-react"
import { VentureBadge } from "@/components/development/dev-primitives"
import { EtsListShell } from "@/app/(portal)/ets/_components/ets-ui"
import { Card } from "@/components/ui/card"

export const metadata = { title: "Roadmap — Development | Suprans" }

type Quarter = {
  key: string
  label: string
  blurb: string
  themes: Array<{
    title: string
    venture: string
    description: string
    bullets: string[]
  }>
}

const ROADMAP: Quarter[] = [
  {
    key: "q2-2026",
    label: "Q2 · 2026 (April–June) — Now",
    blurb:
      "The open-sourcing desk goes public. Client-facing visibility for every active engagement. Two B2B brands leave Faire.",
    themes: [
      {
        title: "Open the sourcing desk",
        venture: "suprans",
        description:
          "Relaunch Suprans.in as an operator-grade China trade site. Surface Mr. Suprans. Capture lead flow directly to the sourcing team.",
        bullets: [
          "Suprans.in pivot to China trade positioning (shipped)",
          "Ecosystem page surfacing USDrop AI + LegalNations (shipped)",
          "Image upload tool for non-technical operators",
          "Founder newsletter + case study pipeline",
        ],
      },
      {
        title: "Client-facing LegalNations portal",
        venture: "legalnations",
        description:
          "Founders track their US LLC end-to-end. EIN status, document vault, bank handoff, renewal alerts.",
        bullets: [
          "Document vault with role-based access",
          "State-filing progress tracker",
          "EIN issuance notifier",
          "Annual compliance calendar (per-state)",
        ],
      },
      {
        title: "Unbundle two wholesale brands from Faire",
        venture: "b2b-brands",
        description:
          "Gullee Gadgets and Toyarina get their own retailer-direct landings with net-30 terms and login-gated catalogs.",
        bullets: [
          "Gullee landing + retailer auth",
          "Toyarina landing + retailer auth",
          "Net-30 invoicing integration",
          "Retailer CRM hooks into the portal",
        ],
      },
    ],
  },
  {
    key: "q3-2026",
    label: "Q3 · 2026 (July–September)",
    blurb:
      "Internal platform maturity. HRMS and ATS ship to replace the Notion+Sheets stack that's creaking at 20 people.",
    themes: [
      {
        title: "HRMS + ATS + knowledge base",
        venture: "cross-cutting",
        description:
          "The 20-person team scaling to 60+ deserves a real HRIS. HRMS, ATS, and a searchable SOP library replace four scattered Notion workspaces.",
        bullets: [
          "HRMS: employees, attendance, leaves, payroll scaffolding",
          "ATS: job posts, candidate pipeline, offer letters",
          "Knowledge base: MDX-backed, versioned, role-scoped",
          "HRMS ↔ ATS handoff (offer → employee, no double entry)",
        ],
      },
      {
        title: "USDrop AI moves to stable",
        venture: "usdrop-ai",
        description:
          "The app graduates from beta. Paid tier introduced. First external Indian-seller cohort onboarded.",
        bullets: [
          "Stable release — pricing + billing",
          "AI listing QC auto-approval for trusted sellers",
          "3PL network expansion to two coasts",
          "Public status page for uptime transparency",
        ],
      },
    ],
  },
  {
    key: "q4-2026",
    label: "Q4 · 2026 (October–December)",
    blurb:
      "Suprans HRMS + ATS productised as TeamSync AI. Scale the operating-platform bet.",
    themes: [
      {
        title: "TeamSync AI external launch",
        venture: "teamsync-ai",
        description:
          "White-label the portal. First three external teams use the full stack (HRMS, ATS, chat, docs, analytics) as a paid SaaS.",
        bullets: [
          "Marketing site (teamsync-landing) live",
          "Paid tier billing + SLA",
          "Tenant isolation audit",
          "First three paying customers",
        ],
      },
      {
        title: "ETS client portal v1",
        venture: "ets",
        description:
          "40+ franchisees finally get a portal for orders, inventory allocation, and monthly statements instead of WhatsApp groups.",
        bullets: [
          "Order placement + allocation",
          "Monthly statement PDFs",
          "Marketing-asset downloads (posters, reels, POS kits)",
          "Franchisee helpdesk channel",
        ],
      },
    ],
  },
]

export default function RoadmapPage() {
  return (
    <EtsListShell
      title="Roadmap"
      subtitle="Themes through end of 2026. Each rolls up to a venture; each bullet is a deliverable someone is named on. We re-plan at the end of every quarter."
    >
      <div className="space-y-8">
        {ROADMAP.map((q) => (
          <div key={q.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-heading text-lg font-semibold tracking-tight">{q.label}</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl">{q.blurb}</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {q.themes.map((t) => (
                <Card key={t.title} className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <VentureBadge venture={t.venture} />
                    <h3 className="text-sm font-semibold leading-snug">{t.title}</h3>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {t.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <span className="inline-block size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </EtsListShell>
  )
}
