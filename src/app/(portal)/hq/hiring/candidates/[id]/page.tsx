import { notFound } from "next/navigation"
import { BackLink } from "@/components/shared/back-link"
import { supabaseHq } from "@/lib/supabase"
import { CandidateDetailTabs } from "./candidate-detail-tabs"

export const dynamic = "force-dynamic"

type Params = { id: string }

export interface CandidateRow {
  id: string
  role_id: string | null
  name: string
  email: string | null
  phone: string | null
  stage: string
  source: string | null
  skill_match: number | null
  rating: number | null
  applied_for: string | null
  profile_url: string | null
  cv_url: string | null
  location: string | null
  last_activity_at: string | null
  next_action: string | null
  internal_notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface JobRoleRow {
  id: string
  title: string | null
  department: string | null
  vertical: string | null
}

export interface CandidateCallRow {
  id?: string
  candidate_id: string
  called_at: string | null
  call_status: string | null
  call_response: string | null
  call_notes: string | null
  called_by: string | null
}

export interface InterviewRow {
  id: string
  candidate_id: string | null
  role_id: string | null
  interviewer: string | null
  scheduled_at: string | null
  format: string | null
  status: string | null
  feedback_score: number | null
  round_number: number | null
  round_label: string | null
  location: string | null
  panel: string[] | null
  recommendation: string | null
}

export interface OfferRow {
  id: string
  candidate_id: string | null
  role_id: string | null
  offer_date: string | null
  ctc_offered: number | null
  currency: string | null
  joining_date: string | null
  deadline: string | null
  status: string | null
  response_date: string | null
  notes: string | null
}

export interface StageLogRow {
  id?: string
  candidate_id: string
  from_stage: string | null
  to_stage: string | null
  changed_at: string | null
  changed_by: string | null
  note: string | null
}

export interface ResumeRow {
  id?: string
  candidate_id: string
  file_name: string | null
  storage_path: string | null
  external_url: string | null
  raw_text: string | null
  ai_summary: string | null
  ai_skills: string[] | null
  ai_strengths: string[] | null
  ai_concerns: string[] | null
  ai_match_score: number | null
  ai_processed_at: string | null
}

export interface OnboardingTaskRow {
  id: string
  employee_id: string | null
  candidate_id: string | null
  task_name: string | null
  category: string | null
  status: string | null
  due_date: string | null
  done_at: string | null
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const { data } = await supabaseHq
    .from("candidates")
    .select("name")
    .eq("id", id)
    .maybeSingle<{ name: string }>()
  return {
    title: data?.name
      ? `${data.name} — Candidates | HQ | Suprans`
      : `Candidate — HQ | Suprans`,
  }
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const { data: candidate } = await supabaseHq
    .from("candidates")
    .select(
      "id, role_id, name, email, phone, stage, source, skill_match, rating, applied_for, profile_url, cv_url, location, last_activity_at, next_action, internal_notes, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle<CandidateRow>()

  if (!candidate) notFound()

  const [
    roleRes,
    callsRes,
    interviewsRes,
    offersRes,
    stagesRes,
    resumeRes,
    onboardingRes,
    callCountRes,
    interviewCountRes,
    assignmentCountRes,
  ] = await Promise.all([
    candidate.role_id
      ? supabaseHq
          .from("job_roles")
          .select("id, title, department, vertical")
          .eq("id", candidate.role_id)
          .maybeSingle<JobRoleRow>()
      : Promise.resolve({ data: null as JobRoleRow | null }),
    supabaseHq
      .from("candidate_calls")
      .select(
        "id, candidate_id, called_at, call_status, call_response, call_notes, called_by",
      )
      .eq("candidate_id", id)
      .order("called_at", { ascending: false })
      .limit(50),
    supabaseHq
      .from("interviews")
      .select(
        "id, candidate_id, role_id, interviewer, scheduled_at, format, status, feedback_score, round_number, round_label, location, panel, recommendation",
      )
      .eq("candidate_id", id)
      .order("round_number", { ascending: true }),
    supabaseHq
      .from("offers")
      .select(
        "id, candidate_id, role_id, offer_date, ctc_offered, currency, joining_date, deadline, status, response_date, notes",
      )
      .eq("candidate_id", id)
      .order("offer_date", { ascending: false }),
    supabaseHq
      .from("candidate_stages")
      .select(
        "id, candidate_id, from_stage, to_stage, changed_at, changed_by, note",
      )
      .eq("candidate_id", id)
      .order("changed_at", { ascending: false }),
    supabaseHq
      .from("candidate_resumes")
      .select(
        "id, candidate_id, file_name, storage_path, external_url, raw_text, ai_summary, ai_skills, ai_strengths, ai_concerns, ai_match_score, ai_processed_at",
      )
      .eq("candidate_id", id)
      .order("ai_processed_at", { ascending: false })
      .limit(1)
      .maybeSingle<ResumeRow>(),
    supabaseHq
      .from("onboarding_tasks")
      .select(
        "id, employee_id, candidate_id, task_name, category, status, due_date, done_at",
      )
      .eq("candidate_id", id)
      .order("due_date", { ascending: true }),
    supabaseHq
      .from("candidate_calls")
      .select("*", { count: "exact", head: true })
      .eq("candidate_id", id),
    supabaseHq
      .from("interviews")
      .select("*", { count: "exact", head: true })
      .eq("candidate_id", id),
    supabaseHq
      .from("candidate_assignments")
      .select("*", { count: "exact", head: true })
      .eq("candidate_id", id),
  ])

  const role = (roleRes.data as JobRoleRow | null) ?? null
  const calls = (callsRes.data ?? []) as CandidateCallRow[]
  const interviews = (interviewsRes.data ?? []) as InterviewRow[]
  const offers = (offersRes.data ?? []) as OfferRow[]
  const stages = (stagesRes.data ?? []) as StageLogRow[]
  const resume = (resumeRes.data as ResumeRow | null) ?? null
  const onboarding = (onboardingRes.data ?? []) as OnboardingTaskRow[]
  const counts = {
    calls: callCountRes.count ?? 0,
    interviews: interviewCountRes.count ?? 0,
    assignments: assignmentCountRes.count ?? 0,
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/hiring/candidates" label="All candidates" />

      <CandidateDetailTabs
        candidate={candidate}
        role={role}
        calls={calls}
        interviews={interviews}
        offers={offers}
        stages={stages}
        resume={resume}
        onboarding={onboarding}
        counts={counts}
      />
    </div>
  )
}
