import { supabaseLegal } from "@/lib/supabase"
import { LnTopbar } from "@/components/legalnations/ln-topbar"
import { FileText, Download, FolderOpen } from "lucide-react"

export const dynamic = "force-dynamic"

const DOC_TYPE_COLORS: Record<string, string> = {
  llc_filing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ein: "bg-blue-50 text-blue-700 border-blue-200",
  tax_return: "bg-violet-50 text-violet-700 border-violet-200",
  bank_statement: "bg-amber-50 text-amber-700 border-amber-200",
  id_proof: "bg-slate-100 text-slate-700 border-slate-200",
  contract: "bg-rose-50 text-rose-700 border-rose-200",
  general: "bg-gray-50 text-gray-600 border-gray-200",
}

const DOC_ICON_COLORS: Record<string, string> = {
  llc_filing: "text-emerald-500",
  ein: "text-blue-500",
  tax_return: "text-violet-500",
  bank_statement: "text-amber-500",
  id_proof: "text-slate-500",
  contract: "text-rose-500",
  general: "text-gray-400",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDocType(t: string) {
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function DocumentsPage() {
  const { data: clients } = await supabaseLegal
    .from("clients")
    .select("id")
    .limit(1)
  const clientId = clients?.[0]?.id
  const { data: rawDocs } = await supabaseLegal
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
  const docs = (rawDocs ?? []) as { id: string; name: string | null; doc_type: string | null; file_url: string | null; uploaded_by: string | null; created_at: string | null; notes: string | null }[]

  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)]">
      <LnTopbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-[hsl(200_15%_12%)]">
            Document Vault
          </h1>
          <p className="text-sm text-[hsl(200_8%_46%)] mt-1">
            Upload and manage your legal documents
          </p>
        </div>

        {/* Upload zone */}
        <div className="border-2 border-dashed border-[hsl(40_10%_82%)] rounded-xl p-8 text-center bg-white hover:border-[hsl(160_30%_60%)] transition-colors cursor-pointer">
          <FileText className="mx-auto size-8 text-[hsl(200_8%_70%)] mb-3" />
          <p className="text-sm font-medium text-[hsl(200_15%_12%)]">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-[hsl(200_8%_46%)] mt-1">
            PDF, DOC, JPG up to 10MB
          </p>
        </div>

        {/* Document list */}
        {docs && docs.length > 0 ? (
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] divide-y divide-[hsl(40_10%_92%)]">
            {docs.map((doc: Record<string, unknown>) => {
              const docType = (doc.doc_type as string) || "general"
              const badgeClass =
                DOC_TYPE_COLORS[docType] || DOC_TYPE_COLORS.general
              const iconClass =
                DOC_ICON_COLORS[docType] || DOC_ICON_COLORS.general

              return (
                <div
                  key={doc.id as string}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <FileText className={`size-5 shrink-0 ${iconClass}`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(200_15%_12%)] truncate">
                      {doc.name as string}
                    </p>
                    <p className="text-xs text-[hsl(200_8%_46%)] mt-0.5">
                      Uploaded{" "}
                      {doc.created_at ? formatDate(doc.created_at as string) : "—"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${badgeClass}`}
                  >
                    {formatDocType(docType)}
                  </span>

                  {doc.file_url ? (
                    <a
                      href={String(doc.file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 rounded-md hover:bg-[hsl(40_8%_95%)] text-[hsl(200_8%_46%)] hover:text-[hsl(160_45%_22%)] transition-colors"
                    >
                      <Download className="size-4" />
                    </a>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[hsl(40_10%_88%)] p-10 text-center">
            <FolderOpen className="mx-auto size-10 text-[hsl(200_8%_78%)] mb-3" />
            <p className="text-sm text-[hsl(200_8%_46%)]">
              No documents yet — your legal team will upload documents as your
              setup progresses
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
