import crypto from "node:crypto"
import { createClient } from "@supabase/supabase-js"

/**
 * Vercel integration helpers backing /development/deployments.
 *
 * Data lands in public.deployment_events via two paths:
 *   1. Webhook: POST /api/webhooks/vercel-deploy
 *   2. Daily backfill: GET /api/cron/vercel-backfill
 *
 * Env required:
 *   - VERCEL_TOKEN (read scope)
 *   - VERCEL_TEAM_ID (or VERCEL_TEAM_SLUG) for team-scoped queries
 *   - VERCEL_WEBHOOK_SECRET (shared secret set on each Vercel project webhook)
 */

export type VercelDeployStatus = "queued" | "building" | "ready" | "error" | "canceled"

type RawDeployment = {
  id?: string
  uid?: string
  url?: string
  name?: string
  state?: string
  readyState?: string
  created?: number
  createdAt?: number
  ready?: number
  target?: string | null
  meta?: Record<string, string> & {
    githubCommitSha?: string
    githubCommitMessage?: string
    githubCommitAuthorName?: string
    githubCommitRef?: string
    githubCommitRepo?: string
    githubRepo?: string
  }
  creator?: { username?: string; email?: string; name?: string }
  [k: string]: unknown
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    // write-access uses service role so RLS (is_superadmin) isn't blocking
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  )
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.VERCEL_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac("sha1", secret).update(rawBody).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function normalizeStatus(state: string | undefined): VercelDeployStatus {
  const s = (state ?? "").toUpperCase()
  if (s === "READY" || s === "SUCCEEDED") return "ready"
  if (s === "ERROR" || s === "FAILED") return "error"
  if (s === "CANCELED" || s === "CANCELLED") return "canceled"
  if (s === "BUILDING" || s === "INITIALIZING") return "building"
  return "queued"
}

export async function mapVercelProjectToSlug(meta: RawDeployment["meta"], projectName?: string): Promise<{ projectId: string | null; projectSlug: string | null }> {
  const repo = (meta?.githubCommitRepo ?? meta?.githubRepo ?? "").toLowerCase()
  const candidates = [repo, projectName?.toLowerCase()].filter(Boolean) as string[]
  if (candidates.length === 0) return { projectId: null, projectSlug: null }

  const sb = getSupabase()
  const { data, error } = await sb.from("projects").select("id, slug").in("slug", candidates)
  if (error || !data || data.length === 0) {
    // try partial match: project.slug ends with repo token
    const { data: fuzzy } = await sb.from("projects").select("id, slug")
    const hit = (fuzzy ?? []).find((p) =>
      candidates.some((c) => p.slug === c || p.slug.endsWith(`-${c}`) || c.endsWith(`-${p.slug}`)),
    )
    if (hit) return { projectId: hit.id as string, projectSlug: hit.slug as string }
    return { projectId: null, projectSlug: candidates[0] ?? null }
  }
  return { projectId: (data[0].id as string) ?? null, projectSlug: (data[0].slug as string) ?? null }
}

export async function upsertDeploymentEvent(dep: RawDeployment) {
  const id = dep.id ?? dep.uid
  if (!id) return { ok: false, reason: "no-id" }
  const { projectId, projectSlug } = await mapVercelProjectToSlug(dep.meta, dep.name)
  const deployedAtMs = dep.ready ?? dep.createdAt ?? dep.created
  const row = {
    vercel_deployment_id: id,
    project_id: projectId,
    project_slug: projectSlug,
    commit_sha: dep.meta?.githubCommitSha ?? null,
    commit_message: dep.meta?.githubCommitMessage ?? null,
    branch: dep.meta?.githubCommitRef ?? dep.target ?? null,
    author_name: dep.meta?.githubCommitAuthorName ?? dep.creator?.name ?? dep.creator?.username ?? null,
    author_email: dep.creator?.email ?? null,
    status: normalizeStatus(dep.state ?? dep.readyState),
    deployed_at: deployedAtMs ? new Date(deployedAtMs).toISOString() : null,
    url: dep.url ? (dep.url.startsWith("http") ? dep.url : `https://${dep.url}`) : null,
    raw: dep as unknown as Record<string, unknown>,
  }
  const { error } = await getSupabase()
    .from("deployment_events")
    .upsert(row, { onConflict: "vercel_deployment_id" })
  if (error) return { ok: false, reason: error.message }
  return { ok: true, vercel_deployment_id: id }
}

export async function fetchRecentDeployments(limit = 100): Promise<RawDeployment[]> {
  const token = process.env.VERCEL_TOKEN
  if (!token) return []
  const params = new URLSearchParams({ limit: String(limit) })
  if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID)
  const res = await fetch(`https://api.vercel.com/v6/deployments?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) return []
  const body = (await res.json()) as { deployments?: RawDeployment[] }
  return body.deployments ?? []
}
