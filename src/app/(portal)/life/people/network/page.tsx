import { Network, Building2, Users, Briefcase } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Network — Life | Suprans" }

interface NetworkRow {
  id: string
  name: string | null
  company: string | null
  title: string | null
  how_we_know: string | null
  last_touchpoint: string | null
}

async function fetchNetwork() {
  const { data, error } = await supabaseLife
    .from("professional_network")
    .select("id, name, company, title, how_we_know, last_touchpoint")
    .order("last_touchpoint", { ascending: false, nullsFirst: false })
    .limit(500)
  if (error) console.error("life.professional_network:", error.message)
  return (data ?? []) as NetworkRow[]
}

export default async function LifeNetworkPage() {
  const rows = await fetchNetwork()
  const companies = new Set(rows.map((r) => r.company).filter(Boolean)).size
  const withTouchpoint = rows.filter((r) => !!r.last_touchpoint).length
  const howWeKnowCount = new Set(rows.map((r) => r.how_we_know).filter(Boolean)).size

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="professional_network"
            listHref="/life/people/network"
            title="New contact"
          />
        }
        title="Professional network"
        subtitle={`${rows.length.toLocaleString("en-IN")} contact${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total contacts" value={rows.length} icon={Network} iconTone="blue" />
        <MetricCard label="Companies" value={companies} icon={Building2} iconTone="violet" />
        <MetricCard label="Contexts" value={howWeKnowCount} icon={Users} iconTone="emerald" />
        <MetricCard label="With touchpoint" value={withTouchpoint} icon={Briefcase} iconTone="amber" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Network}
          title="Network is empty"
          description="People you've worked with, met at conferences, exchanged ideas with — log them while context is fresh."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>How we know</TableHead>
                <TableHead>Last touchpoint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.company ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.title ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.how_we_know ? (
                      <StatusBadge tone="slate">{r.how_we_know}</StatusBadge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.last_touchpoint)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
