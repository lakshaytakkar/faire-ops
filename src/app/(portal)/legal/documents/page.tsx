import { FolderOpen } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"

export const dynamic = "force-dynamic"
export const metadata = { title: "Documents — Legal | Suprans" }

interface DocRow {
  id: string
  name: string | null
  doc_type: string | null
  client_id: string | null
  filing_id: string | null
  uploaded_by: string | null
  created_at: string | null
}

interface ClientLookup {
  id: string
  client_name: string | null
}

function docTypeTone(t: string | null | undefined) {
  switch (t) {
    case "llc_filing": return "blue" as const
    case "ein": return "violet" as const
    case "tax_return": return "amber" as const
    case "bank_statement": return "emerald" as const
    case "id_proof": return "slate" as const
    case "contract": return "blue" as const
    default: return "slate" as const
  }
}

export default async function DocumentsPage() {
  const [docRes, clientRes] = await Promise.all([
    supabaseLegal
      .from("documents")
      .select("id, name, doc_type, client_id, filing_id, uploaded_by, created_at")
      .order("created_at", { ascending: false }),
    supabaseLegal.from("clients").select("id, client_name"),
  ])

  if (docRes.error) console.error("legal.documents:", docRes.error.message)
  if (clientRes.error) console.error("legal.clients lookup:", clientRes.error.message)

  const rows = (docRes.data ?? []) as DocRow[]
  const clients = (clientRes.data ?? []) as ClientLookup[]
  const clientMap = new Map(clients.map((c) => [c.id, c.client_name ?? "—"]))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Documents"
        subtitle={`${rows.length.toLocaleString("en-IN")} document${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="documents"
            listHref="/legal/documents"
            title="Upload document"
            size="lg"
          />
        }
      />

      <DetailCard title="All documents">
        {rows.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents uploaded yet"
            description="Upload your first document."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="w-[140px]">Filing ID</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead className="w-[140px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">
                      {r.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={docTypeTone(r.doc_type)}>
                        {r.doc_type ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.client_id ? clientMap.get(r.client_id) ?? r.client_id : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {r.filing_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.uploaded_by ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </DetailCard>
    </div>
  )
}
