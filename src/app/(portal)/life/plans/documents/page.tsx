import { FileText, AlertCircle, XCircle, Hash } from "lucide-react"
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
export const metadata = { title: "Documents — Life | Suprans" }

interface DocumentRow {
  id: string
  name: string | null
  type: string | null
  number: string | null
  issued_by: string | null
  expiry_date: string | null
  status: string | null
  notes: string | null
}

async function fetchDocuments() {
  const { data, error } = await supabaseLife
    .from("life_documents")
    .select("id, name, type, number, issued_by, expiry_date, status, notes")
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.life_documents:", error.message)
  return (data ?? []) as DocumentRow[]
}

export default async function LifeDocumentsPage() {
  const rows = await fetchDocuments()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const expiringThisMonth = rows.filter((r) => {
    if (!r.expiry_date) return false
    const d = new Date(r.expiry_date)
    return d >= today && d <= monthEnd
  }).length
  const expired = rows.filter((r) => {
    if (!r.expiry_date) return false
    return new Date(r.expiry_date) < today
  }).length
  const withExpiry = rows.filter((r) => !!r.expiry_date).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="life_documents"
            listHref="/life/plans/documents"
            title="New document"
          />
        }
        title="Documents"
        subtitle={`${rows.length.toLocaleString("en-IN")} document${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total documents" value={rows.length} icon={FileText} iconTone="blue" />
        <MetricCard label="Expiring this month" value={expiringThisMonth} icon={AlertCircle} iconTone="amber" />
        <MetricCard label="Expired" value={expired} icon={XCircle} iconTone="red" />
        <MetricCard label="With expiry tracked" value={withExpiry} icon={Hash} iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Passport, PAN, Aadhaar, licenses — index every important document and where the original lives."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Issued by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                  <TableCell>
                    {r.type ? <StatusBadge tone="blue">{r.type}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.number ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.issued_by ?? "—"}</TableCell>
                  <TableCell>
                    {r.status ? <StatusBadge tone="slate">{r.status}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.expiry_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
