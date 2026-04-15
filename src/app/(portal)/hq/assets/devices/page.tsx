import Link from "next/link"
import { Laptop, CheckCircle2, PackageOpen, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { supabaseHq } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/format"
import { DevicesFilterBar } from "./devices-filter-bar"

// HQ → Assets → Devices (list). Spec §5.1. Server-rendered. URL query params
// (?q=&type=&status=) drive filter state so every link/refresh is shareable.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Devices — Assets | HQ | Suprans",
}

// Spec-locked status tones for assets. Kept inline because these values
// aren't in toneForStatus()'s default map.
const ASSET_STATUS_TONE: Record<string, StatusTone> = {
  assigned: "blue",
  available: "emerald",
  under_repair: "amber",
  retired: "slate",
}

const ASSET_STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  available: "Available",
  under_repair: "Under Repair",
  retired: "Retired",
}

interface AssetRow {
  id: string
  asset_code: string | null
  type: string | null
  brand_model: string | null
  serial_no: string | null
  assigned_to_employee_id: string | null
  department: string | null
  status: string | null
  purchase_date: string | null
  value: number | null
  warranty_expiry: string | null
}

interface EmployeeRow {
  id: string
  full_name: string | null
}

async function fetchDevicesData() {
  const [assetsRes, employeesRes] = await Promise.all([
    supabaseHq
      .from("assets")
      .select(
        "id, asset_code, type, brand_model, serial_no, assigned_to_employee_id, department, status, purchase_date, value, warranty_expiry",
      )
      .order("purchase_date", { ascending: false, nullsFirst: false }),
    supabaseHq.from("employees").select("id, full_name"),
  ])

  const assets = (assetsRes.data ?? []) as AssetRow[]
  const employees = (employeesRes.data ?? []) as EmployeeRow[]
  const employeeMap = new Map(employees.map((e) => [e.id, e.full_name ?? ""]))

  return { assets, employeeMap }
}

function isWarrantyWarning(expiry: string | null): boolean {
  if (!expiry) return false
  const d = new Date(expiry)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  return d >= now && d <= in60
}

type SearchParams = {
  q?: string
  type?: string
  status?: string
}

export default async function HqDevicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = "", type = "all", status = "all" } = await searchParams
  const { assets, employeeMap } = await fetchDevicesData()

  const counts = {
    all: assets.length,
    assigned: assets.filter((a) => a.status === "assigned").length,
    available: assets.filter((a) => a.status === "available").length,
    under_repair: assets.filter((a) => a.status === "under_repair").length,
    retired: assets.filter((a) => a.status === "retired").length,
  }

  const total = counts.all
  const assignedCount = counts.assigned
  const availableCount = counts.available
  const underRepairCount = counts.under_repair

  const qLower = q.trim().toLowerCase()
  const filtered = assets.filter((a) => {
    if (status !== "all" && a.status !== status) return false
    if (type !== "all" && a.type !== type) return false
    if (qLower) {
      const hay = `${a.asset_code ?? ""} ${a.brand_model ?? ""} ${a.serial_no ?? ""}`.toLowerCase()
      if (!hay.includes(qLower)) return false
    }
    return true
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Devices"
        subtitle="All company devices — laptops, phones, printers, and more."
        actions={
          <>
            <Button size="sm" disabled>
              + Add Asset
            </Button>
            <Button size="sm" variant="outline" disabled>
              Print Label (QR)
            </Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={total} icon={Laptop} iconTone="blue" />
        <MetricCard
          label="Assigned"
          value={assignedCount}
          icon={CheckCircle2}
          iconTone="blue"
        />
        <MetricCard
          label="Available"
          value={availableCount}
          icon={PackageOpen}
          iconTone="emerald"
        />
        <MetricCard
          label="Under Repair"
          value={underRepairCount}
          icon={Wrench}
          iconTone="amber"
        />
      </KPIGrid>

      <DevicesFilterBar q={q} type={type} status={status} counts={counts} />

      <DetailCard title="All devices">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Laptop}
            title="No devices match"
            description={
              total === 0
                ? "Add your first asset to get started."
                : "Try clearing filters or searching for another code."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Brand / Model</TableHead>
                <TableHead>Serial No</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Warranty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const assignee = a.assigned_to_employee_id
                  ? employeeMap.get(a.assigned_to_employee_id) ?? "—"
                  : "—"
                const warrantyWarn = isWarrantyWarning(a.warranty_expiry)
                return (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link
                        href={`/hq/assets/devices/${a.id}`}
                        className="text-foreground hover:underline"
                      >
                        {a.asset_code ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {a.type ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{a.brand_model ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {a.serial_no ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{assignee}</TableCell>
                    <TableCell className="text-sm">{a.department ?? "—"}</TableCell>
                    <TableCell>
                      {a.status ? (
                        <StatusBadge tone={ASSET_STATUS_TONE[a.status] ?? "slate"}>
                          {ASSET_STATUS_LABEL[a.status] ?? a.status.replace(/_/g, " ")}
                        </StatusBadge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(a.purchase_date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(a.value)}
                    </TableCell>
                    <TableCell
                      className={
                        warrantyWarn
                          ? "text-sm font-medium text-amber-700"
                          : "text-sm"
                      }
                    >
                      {formatDate(a.warranty_expiry)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DetailCard>
    </div>
  )
}
