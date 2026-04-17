import { ClipboardList } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "By Phase — Onboarding | Suprans" }

interface ChecklistRow {
  id: string
  client_id: string | null
  phase: string | null
  step_name: string | null
  completed: boolean | null
  completed_at: string | null
}

interface ClientLookup {
  id: string
  client_name: string | null
}

const PHASE_ORDER = [
  "Onboarding",
  "LLC Filing",
  "EIN",
  "Bank Account",
  "Website",
  "Reseller Permit",
  "ITIN",
]

export default async function LegalOnboardingByPhasePage() {
  const [checklistRes, clientsRes] = await Promise.all([
    supabaseLegal
      .from("onboarding_checklist")
      .select("id, client_id, phase, step_name, completed, completed_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseLegal.from("clients").select("id, client_name"),
  ])

  if (checklistRes.error) console.error("legal.onboarding_checklist:", checklistRes.error.message)
  if (clientsRes.error) console.error("legal.clients:", clientsRes.error.message)

  const rows = (checklistRes.data ?? []) as ChecklistRow[]
  const clientMap = new Map(
    ((clientsRes.data ?? []) as ClientLookup[]).map((c) => [c.id, c]),
  )

  /* Group by phase */
  const groups = new Map<string, ChecklistRow[]>()
  for (const r of rows) {
    const key = r.phase && r.phase.trim() ? r.phase : "Uncategorised"
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }

  /* Sort phases: known order first, then any extras alphabetically */
  const knownSet = new Set(PHASE_ORDER)
  const extras = [...groups.keys()]
    .filter((k) => !knownSet.has(k))
    .sort()
  const orderedPhases = [...PHASE_ORDER.filter((p) => groups.has(p)), ...extras]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Onboarding — by phase"
        subtitle={`${rows.length.toLocaleString("en-IN")} step${rows.length === 1 ? "" : "s"} across ${orderedPhases.length} phase${orderedPhases.length === 1 ? "" : "s"}`}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No onboarding steps yet"
          description="Checklist items will appear here once clients begin onboarding."
        />
      ) : (
        <div className="space-y-4">
          {orderedPhases.map((phase) => {
            const items = groups.get(phase) ?? []
            return (
              <DetailCard key={phase} title={`${phase} (${items.length})`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Step Name</TableHead>
                      <TableHead className="w-[100px]">Completed</TableHead>
                      <TableHead className="w-[140px]">Completed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => {
                      const client = r.client_id
                        ? clientMap.get(r.client_id)
                        : null
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">
                            {client?.client_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {r.step_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            {r.completed ? "\u2705" : "\u2014"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {formatDate(r.completed_at)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </DetailCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
