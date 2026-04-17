import { Layers, GraduationCap, BookOpen, Hash } from "lucide-react"
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
export const metadata = { title: "Skills — Life | Suprans" }

interface SkillRow {
  id: string
  name: string | null
  category: string | null
  current_level: number | null
  target_level: number | null
  last_practiced: string | null
}

async function fetchSkills() {
  const { data, error } = await supabaseLife
    .from("skills")
    .select("id, name, category, current_level, target_level, last_practiced")
    .order("current_level", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.skills:", error.message)
  return (data ?? []) as SkillRow[]
}

export default async function LifeSkillsPage() {
  const rows = await fetchSkills()
  const mastering = rows.filter((r) => (r.current_level ?? 0) >= 4).length
  const learning = rows.filter((r) => (r.current_level ?? 0) > 0 && (r.current_level ?? 0) < 4).length
  const categories = new Set(rows.map((r) => r.category).filter(Boolean)).size

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Skills"
        subtitle={`${rows.length.toLocaleString("en-IN")} skill${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="skills"
            listHref="/life/growth/skills"
            title="New skill"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total skills" value={rows.length} icon={Layers} iconTone="violet" />
        <MetricCard label="Mastering (≥4)" value={mastering} icon={GraduationCap} iconTone="emerald" />
        <MetricCard label="Learning (1-3)" value={learning} icon={BookOpen} iconTone="amber" />
        <MetricCard label="Categories" value={categories} icon={Hash} iconTone="blue" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No skills tracked"
          description="Map what you're growing — language, instrument, craft. Levels and last-practice dates make stagnation visible."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Level</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead>Last practiced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                  <TableCell>
                    {r.category ? <StatusBadge tone="violet">{r.category}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {r.current_level !== null ? `${r.current_level} / 5` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.target_level !== null ? `${r.target_level} / 5` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.last_practiced)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
