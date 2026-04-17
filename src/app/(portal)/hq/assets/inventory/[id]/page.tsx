import { notFound } from "next/navigation"
import { Laptop } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { supabase, supabaseHq } from "@/lib/supabase"
import { formatCurrency, formatDate, formatInitials } from "@/lib/format"

// HQ → Assets → Devices → [id] (detail). Spec §5.1 + SPACE_PATTERN.md §4.
// Server component; fetches asset + assignment history + current assignee.

export const dynamic = "force-dynamic"

type Params = { id: string }

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

interface AssetDetail {
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

interface AssignmentLogRow {
  id: string
  asset_id: string
  from_employee_id: string | null
  to_employee_id: string | null
  effective_date: string | null
  notes: string | null
}

interface EmployeeRow {
  id: string
  full_name: string | null
  department: string | null
  photo_url: string | null
  team_member_id: string | null
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Asset ${id.slice(0, 8)} — HQ | Suprans` }
}

async function fetchAsset(id: string) {
  const [assetRes, logRes] = await Promise.all([
    supabaseHq
      .from("assets")
      .select(
        "id, asset_code, type, brand_model, serial_no, assigned_to_employee_id, department, status, purchase_date, value, warranty_expiry",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseHq
      .from("asset_assignment_log")
      .select("id, asset_id, from_employee_id, to_employee_id, effective_date, notes")
      .eq("asset_id", id)
      .order("effective_date", { ascending: false }),
  ])

  if (!assetRes.data) return null
  const asset = assetRes.data as AssetDetail
  const log = (logRes.data ?? []) as AssignmentLogRow[]

  // Gather unique employee ids for from/to/current assignee.
  const empIds = new Set<string>()
  if (asset.assigned_to_employee_id) empIds.add(asset.assigned_to_employee_id)
  for (const row of log) {
    if (row.from_employee_id) empIds.add(row.from_employee_id)
    if (row.to_employee_id) empIds.add(row.to_employee_id)
  }

  const empMap = new Map<string, EmployeeRow>()
  if (empIds.size > 0) {
    const { data } = await supabaseHq
      .from("employees")
      .select("id, full_name, department, photo_url, team_member_id")
      .in("id", Array.from(empIds))
    for (const row of (data ?? []) as EmployeeRow[]) {
      empMap.set(row.id, row)
    }
  }

  // Cross-schema avatar lookup for current assignee via public.team_members.
  let currentAvatar: string | null = null
  const currentEmp = asset.assigned_to_employee_id
    ? empMap.get(asset.assigned_to_employee_id) ?? null
    : null
  if (currentEmp?.team_member_id) {
    const { data } = await supabase
      .from("team_members")
      .select("id, avatar_url")
      .eq("id", currentEmp.team_member_id)
      .maybeSingle()
    currentAvatar = (data as { avatar_url: string | null } | null)?.avatar_url ?? null
  }

  // Find the most recent assignment-to date for "since-when" display.
  let assignedSince: string | null = null
  if (asset.assigned_to_employee_id) {
    const mostRecent = log.find(
      (l) => l.to_employee_id === asset.assigned_to_employee_id,
    )
    assignedSince = mostRecent?.effective_date ?? null
  }

  return { asset, log, empMap, currentEmp, currentAvatar, assignedSince }
}

export default async function HqAssetDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchAsset(id)
  if (!data) notFound()
  const { asset, log, empMap, currentEmp, currentAvatar, assignedSince } = data

  const subtitleParts = [asset.type, asset.brand_model].filter(Boolean) as string[]

  const currentAvatarNode = currentAvatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentAvatar}
      alt=""
      className="size-10 rounded-full object-cover border border-border bg-muted"
    />
  ) : currentEmp?.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentEmp.photo_url}
      alt=""
      className="size-10 rounded-full object-cover border border-border bg-muted"
    />
  ) : (
    <span className="size-10 rounded-full inline-flex items-center justify-center bg-muted text-muted-foreground text-[11px] font-semibold border border-border">
      {formatInitials(currentEmp?.full_name ?? null)}
    </span>
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/assets/devices" label="All devices" />

      <HeroCard
        title={asset.asset_code ?? "Untitled asset"}
        subtitle={subtitleParts.length ? subtitleParts.join(" · ") : undefined}
        icon={Laptop}
        tone="blue"
        meta={
          asset.status ? (
            <StatusBadge tone={ASSET_STATUS_TONE[asset.status] ?? "slate"}>
              {ASSET_STATUS_LABEL[asset.status] ?? asset.status.replace(/_/g, " ")}
            </StatusBadge>
          ) : undefined
        }
        actions={
          <>
            <Button size="sm" variant="outline" disabled>
              Edit
            </Button>
            <Button size="sm" variant="outline" disabled>
              Reassign
            </Button>
            <Button size="sm" variant="outline" disabled>
              Mark Under Repair
            </Button>
            <Button size="sm" variant="outline" disabled>
              Retire
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Device info">
            <div className="divide-y">
              <InfoRow label="Type" value={asset.type ?? "—"} />
              <InfoRow label="Brand / Model" value={asset.brand_model ?? "—"} />
              <InfoRow
                label="Serial No"
                value={
                  <span className="font-mono">{asset.serial_no ?? "—"}</span>
                }
              />
              <InfoRow
                label="Purchase Date"
                value={formatDate(asset.purchase_date)}
              />
              <InfoRow label="Value" value={formatCurrency(asset.value)} />
              <InfoRow
                label="Warranty Expiry"
                value={formatDate(asset.warranty_expiry)}
              />
            </div>
          </DetailCard>

          <DetailCard title="Assignment history">
            {log.length === 0 ? (
              <EmptyState
                icon={Laptop}
                title="No assignment history"
                description="This device hasn't been assigned yet."
              />
            ) : (
              <div className="space-y-3">
                {log.map((entry) => {
                  const fromName = entry.from_employee_id
                    ? empMap.get(entry.from_employee_id)?.full_name ?? "—"
                    : "—"
                  const toName = entry.to_employee_id
                    ? empMap.get(entry.to_employee_id)?.full_name ?? "—"
                    : "—"
                  return (
                    <div
                      key={entry.id}
                      className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">
                          <span className="text-muted-foreground">{fromName}</span>
                          <span className="mx-2 text-muted-foreground">→</span>
                          <span>{toName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {formatDate(entry.effective_date)}
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Current assignment">
            {currentEmp ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {currentAvatarNode}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {currentEmp.full_name ?? "—"}
                    </div>
                    {currentEmp.department && (
                      <div className="text-xs text-muted-foreground">
                        {currentEmp.department}
                      </div>
                    )}
                  </div>
                </div>
                <div className="divide-y border-t">
                  <InfoRow label="Department" value={currentEmp.department ?? "—"} />
                  <InfoRow label="Since" value={formatDate(assignedSince)} />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Laptop}
                title="Available — not assigned"
                description="This device is currently in stock and ready to be assigned."
              />
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
