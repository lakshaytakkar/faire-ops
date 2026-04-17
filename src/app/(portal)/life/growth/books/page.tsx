import Link from "next/link"
import { BookOpen, BookMarked, Star, X } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
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
export const metadata = { title: "Books — Life | Suprans" }

interface BookRow {
  id: string
  title: string | null
  author: string | null
  status: string | null
  rating: number | null
  finished_at: string | null
  started_at: string | null
}

async function fetchBooks() {
  const { data, error } = await supabaseLife
    .from("books")
    .select("id, title, author, status, rating, finished_at, started_at")
    .order("finished_at", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.books:", error.message)
  return (data ?? []) as BookRow[]
}

export default async function LifeBooksPage() {
  const rows = await fetchBooks()
  const reading = rows.filter((r) => r.status === "reading").length
  const now = new Date()
  const finishedThisYear = rows.filter(
    (r) =>
      r.status === "finished" &&
      r.finished_at &&
      new Date(r.finished_at).getFullYear() === now.getFullYear(),
  ).length
  const ratings = rows.map((r) => r.rating).filter((n): n is number => typeof n === "number")
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null
  const abandoned = rows.filter((r) => r.status === "abandoned").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Books"
        subtitle={`${rows.length.toLocaleString("en-IN")} book${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="books"
            listHref="/life/growth/books"
            title="New book"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Reading" value={reading} icon={BookOpen} iconTone="blue" />
        <MetricCard
          label="Finished this year"
          value={finishedThisYear}
          icon={BookMarked}
          iconTone="emerald"
        />
        <MetricCard
          label="Avg rating"
          value={avgRating !== null ? `${avgRating} / 5` : "—"}
          icon={Star}
          iconTone="amber"
        />
        <MetricCard label="Abandoned" value={abandoned} icon={X} iconTone="slate" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books logged"
          description="Add the books you're reading, finished, or abandoned. Even DNFs are data."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">
                    <Link href={`/life/growth/books/${r.id}`} className="hover:text-primary">
                      {r.title ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.author ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.rating !== null ? `${r.rating} / 5` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.started_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.finished_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
