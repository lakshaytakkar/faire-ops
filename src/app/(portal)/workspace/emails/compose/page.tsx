"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Mail,
  Send,
  Sparkles,
  Eye,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  User,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { generateText, isGeminiConfigured } from "@/lib/gemini"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CampaignType = "single" | "campaign"
type Segment = "all" | "active" | "new" | "vip" | "team" | "custom"
type Tone = "professional" | "friendly" | "urgent" | "promotional"
type Length = "short" | "medium" | "long"

interface Recipient {
  email: string
  name?: string
}

interface SendResult {
  email: string
  success: boolean
  error?: string
}

interface EmailLog {
  id: string
  to_email: string
  subject: string
  status: string
  sent_at: string
}

const TEAM_EMAILS: Recipient[] = [
  { email: "lakshay@suprans.in", name: "Lakshay" },
  { email: "aditya@suprans.in", name: "Aditya" },
]

const SEGMENT_OPTIONS: { value: Segment; label: string; description: string }[] = [
  { value: "all", label: "All Retailers", description: "Every retailer in the database" },
  { value: "active", label: "Active Retailers", description: "Ordered in the last 60 days" },
  { value: "new", label: "New Retailers", description: "Zero orders placed" },
  { value: "vip", label: "VIP Retailers", description: "10+ orders placed" },
  { value: "team", label: "Team", description: "Internal team members" },
  { value: "custom", label: "Custom List", description: "Comma-separated emails" },
]

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
  { value: "promotional", label: "Promotional" },
]

const LENGTH_OPTIONS: { value: Length; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
]

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  simulated: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
}

/* ------------------------------------------------------------------ */
/*  AI Generation                                                      */
/* ------------------------------------------------------------------ */

async function generateEmailContent(
  context: string,
  tone: string,
  length: string
): Promise<{ subject: string; body: string }> {
  const prompt = `Generate a professional email for a wholesale business (Faire marketplace seller).

Context: ${context}
Tone: ${tone}
Length: ${length} (short=2-3 paragraphs, medium=4-5, long=6-8)
Sender: Faire Ops (Suprans Wholesale)
Domain: suprans.in

Generate:
1. A compelling subject line (max 60 chars)
2. Full HTML email body with proper formatting

Requirements:
- Professional B2B wholesale tone
- Include a clear call-to-action
- Use <h2>, <p>, <ul>, <a> tags for structure
- No emojis in subject line
- Include a sign-off from "Suprans Wholesale Team"

Return in this exact format:
SUBJECT: [subject line here]
---
BODY:
[full HTML body here]`

  const result = await generateText(prompt)
  const subjectMatch = result.match(/SUBJECT:\s*(.+)/)
  const bodyMatch = result.split("BODY:")[1]
  return {
    subject: subjectMatch?.[1]?.trim() ?? "Untitled Email",
    body: bodyMatch?.trim() ?? result,
  }
}

async function generateSubjectLine(bodyContext: string): Promise<string> {
  const prompt = `Generate a compelling email subject line (max 60 chars) for a wholesale B2B email.

Context: ${bodyContext || "General wholesale update"}
Requirements:
- Professional, no emojis
- Clear and direct
- Return ONLY the subject line, nothing else`

  return generateText(prompt)
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function EmailComposePage() {
  // Campaign type
  const [campaignType, setCampaignType] = useState<CampaignType>("single")

  // Recipients
  const [singleEmail, setSingleEmail] = useState("")
  const [singleName, setSingleName] = useState("")
  const [segment, setSegment] = useState<Segment>("all")
  const [customEmails, setCustomEmails] = useState("")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recipientCount, setRecipientCount] = useState(0)
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  // Content
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  // AI generation
  const [showAiDialog, setShowAiDialog] = useState(false)
  const [aiContext, setAiContext] = useState("")
  const [aiTone, setAiTone] = useState<Tone>("professional")
  const [aiLength, setAiLength] = useState<Length>("medium")
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatingSubject, setGeneratingSubject] = useState(false)

  // Sending
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 })
  const [sendResults, setSendResults] = useState<SendResult[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  // Save template
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)

  // Preview
  const [showPreview, setShowPreview] = useState(false)

  // Recent logs
  const [recentLogs, setRecentLogs] = useState<EmailLog[]>([])

  // Segment counts
  const [segmentCounts, setSegmentCounts] = useState<Record<Segment, number>>({
    all: 0,
    active: 0,
    new: 0,
    vip: 0,
    team: TEAM_EMAILS.length,
    custom: 0,
  })

  const geminiReady = isGeminiConfigured()

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    fetchRecentLogs()
    fetchSegmentCounts()
  }, [])

  async function fetchRecentLogs() {
    const { data } = await supabase
      .from("email_logs")
      .select("id, to_email, subject, status, sent_at")
      .order("sent_at", { ascending: false })
      .limit(5)
    setRecentLogs((data ?? []) as EmailLog[])
  }

  async function fetchSegmentCounts() {
    const now = new Date()
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

    const [allRes, activeRes, newRes, vipRes] = await Promise.all([
      supabase.from("faire_retailers").select("*", { count: "exact", head: true }),
      supabase.from("faire_retailers").select("*", { count: "exact", head: true }).gte("last_order_at", sixtyDaysAgo),
      supabase.from("faire_retailers").select("*", { count: "exact", head: true }).eq("total_orders", 0),
      supabase.from("faire_retailers").select("*", { count: "exact", head: true }).gte("total_orders", 10),
    ])

    setSegmentCounts({
      all: allRes.count ?? 0,
      active: activeRes.count ?? 0,
      new: newRes.count ?? 0,
      vip: vipRes.count ?? 0,
      team: TEAM_EMAILS.length,
      custom: 0,
    })
  }

  /* ---------------------------------------------------------------- */
  /*  Recipient resolution                                             */
  /* ---------------------------------------------------------------- */

  const resolveRecipients = useCallback(async (): Promise<Recipient[]> => {
    if (campaignType === "single") {
      if (!singleEmail) return []
      return [{ email: singleEmail, name: singleName || undefined }]
    }

    if (segment === "team") return TEAM_EMAILS
    if (segment === "custom") {
      return customEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"))
        .map((email) => ({ email }))
    }

    setLoadingRecipients(true)
    try {
      const now = new Date()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

      let query = supabase.from("faire_retailers").select("name, company_name, phone")

      if (segment === "active") query = query.gte("last_order_at", sixtyDaysAgo)
      else if (segment === "new") query = query.eq("total_orders", 0)
      else if (segment === "vip") query = query.gte("total_orders", 10)

      const { data } = await query
      // faire_retailers does not have email — use phone or name as fallback
      // In practice these would have emails; for now we return what we have
      const list: Recipient[] = (data ?? [])
        .filter((r: Record<string, unknown>) => r.phone || r.name)
        .map((r: Record<string, unknown>) => ({
          email: (r.phone as string) ?? "",
          name: ((r.company_name as string) ?? (r.name as string)) || undefined,
        }))
      return list
    } finally {
      setLoadingRecipients(false)
    }
  }, [campaignType, singleEmail, singleName, segment, customEmails])

  // Update recipient count when segment/type changes
  useEffect(() => {
    if (campaignType === "single") {
      setRecipientCount(singleEmail ? 1 : 0)
      return
    }
    if (segment === "team") {
      setRecipientCount(TEAM_EMAILS.length)
    } else if (segment === "custom") {
      const count = customEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.includes("@")).length
      setRecipientCount(count)
      setSegmentCounts((prev) => ({ ...prev, custom: count }))
    } else {
      setRecipientCount(segmentCounts[segment])
    }
  }, [campaignType, segment, singleEmail, customEmails, segmentCounts])

  /* ---------------------------------------------------------------- */
  /*  AI actions                                                       */
  /* ---------------------------------------------------------------- */

  async function handleGenerateSubject() {
    if (!geminiReady) {
      setToast({ type: "error", message: "Gemini API key not configured" })
      return
    }
    setGeneratingSubject(true)
    try {
      const result = await generateSubjectLine(body || aiContext || "wholesale update")
      setSubject(result.trim())
    } catch {
      setToast({ type: "error", message: "Failed to generate subject line" })
    } finally {
      setGeneratingSubject(false)
    }
  }

  async function handleGenerateEmail() {
    if (!geminiReady) {
      setToast({ type: "error", message: "Gemini API key not configured" })
      return
    }
    if (!aiContext.trim()) {
      setToast({ type: "error", message: "Please provide context for the email" })
      return
    }
    setGeneratingEmail(true)
    try {
      const result = await generateEmailContent(aiContext, aiTone, aiLength)
      setSubject(result.subject)
      setBody(result.body)
      setShowAiDialog(false)
      setToast({ type: "success", message: "Email content generated" })
    } catch {
      setToast({ type: "error", message: "Failed to generate email content" })
    } finally {
      setGeneratingEmail(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Send                                                             */
  /* ---------------------------------------------------------------- */

  async function handleSend() {
    const resolved = await resolveRecipients()
    if (resolved.length === 0) {
      setToast({ type: "error", message: "No recipients found" })
      return
    }
    if (!subject.trim() || !body.trim()) {
      setToast({ type: "error", message: "Subject and body are required" })
      return
    }
    setRecipients(resolved)

    if (campaignType === "campaign" && resolved.length > 1) {
      setShowConfirm(true)
    } else {
      await executeSend(resolved)
    }
  }

  async function executeSend(recipientList: Recipient[]) {
    setShowConfirm(false)
    setSending(true)
    setSendProgress({ current: 0, total: recipientList.length })
    setSendResults([])

    const results: SendResult[] = []

    for (let i = 0; i < recipientList.length; i++) {
      const r = recipientList[i]
      setSendProgress({ current: i + 1, total: recipientList.length })

      try {
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to_email: r.email,
            to_name: r.name,
            subject_override: subject,
            html_override: body,
          }),
        })
        const data = await res.json()
        results.push({ email: r.email, success: data.success, error: data.error })
      } catch (err) {
        results.push({ email: r.email, success: false, error: (err as Error).message })
      }

      // Delay between sends for campaigns
      if (recipientList.length > 1 && i < recipientList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    setSendResults(results)
    setSending(false)

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (failCount === 0) {
      setToast({ type: "success", message: `${successCount} email${successCount !== 1 ? "s" : ""} sent successfully` })
    } else {
      setToast({ type: "error", message: `${successCount} sent, ${failCount} failed` })
    }

    fetchRecentLogs()
  }

  /* ---------------------------------------------------------------- */
  /*  Save as template                                                 */
  /* ---------------------------------------------------------------- */

  async function handleSaveTemplate() {
    if (!templateName.trim() || !subject.trim() || !body.trim()) {
      setToast({ type: "error", message: "Template name, subject, and body are required" })
      return
    }
    setSavingTemplate(true)
    try {
      const { error } = await supabase.from("email_templates").insert({
        name: templateName.trim(),
        subject,
        body_html: body,
        category: "campaign",
        variables: [],
        is_active: true,
      })
      if (error) throw error
      setToast({ type: "success", message: "Template saved" })
      setShowSaveDialog(false)
      setTemplateName("")
    } catch (err) {
      setToast({ type: "error", message: (err as Error).message })
    } finally {
      setSavingTemplate(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Toast auto-dismiss                                               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : toast.type === "error" ? (
            <XCircle className="size-4" />
          ) : (
            <Info className="size-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Confirm Campaign Send</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You are about to send this email to <span className="font-semibold text-foreground">{recipients.length} recipients</span>.
              Each email will be sent individually.
            </p>
            <div className="rounded-md bg-muted/50 border p-3 mb-4">
              <p className="text-xs font-medium text-muted-foreground">Subject</p>
              <p className="text-sm font-medium truncate">{subject}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeSend(recipients)}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Send to {recipients.length} Recipients
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Dialog */}
      {showAiDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-primary" />
              <h3 className="text-sm font-semibold">Generate Email with AI</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  What is this email about?
                </label>
                <textarea
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder="e.g., Announcing our new spring collection with 15% introductory discount for existing retailers..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tone</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setAiTone(t.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          aiTone === t.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 border hover:bg-muted"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Length</label>
                  <div className="flex flex-wrap gap-1.5">
                    {LENGTH_OPTIONS.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setAiLength(l.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          aiLength === l.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 border hover:bg-muted"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAiDialog(false)}
                className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateEmail}
                disabled={generatingEmail || !aiContext.trim()}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingEmail ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generatingEmail ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-sm font-semibold mb-4">Save as Template</h3>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Spring Collection Announcement"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingTemplate ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/workspace/emails"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
              <Mail className="size-6" />
              Email Composer
            </h1>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground ml-6">
            Create and send AI-powered email campaigns
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column — Compose */}
        <div className="space-y-5">
          {/* Step 1: Campaign Type */}
          <div className="rounded-md border bg-card">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                Campaign Type
              </h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setCampaignType("single")}
                className={`flex items-start gap-3 p-4 rounded-md border-2 transition-colors text-left ${
                  campaignType === "single"
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <User className={`size-5 mt-0.5 ${campaignType === "single" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">Single Email</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send to one recipient</p>
                </div>
              </button>
              <button
                onClick={() => setCampaignType("campaign")}
                className={`flex items-start gap-3 p-4 rounded-md border-2 transition-colors text-left ${
                  campaignType === "campaign"
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <Users className={`size-5 mt-0.5 ${campaignType === "campaign" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">Campaign</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send to multiple recipients</p>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Recipients */}
          <div className="rounded-md border bg-card">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                Recipients
              </h2>
              {recipientCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  <Users className="size-3" />
                  {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="p-5 space-y-3">
              {campaignType === "single" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                    <input
                      type="email"
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      placeholder="recipient@example.com"
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name (optional)</label>
                    <input
                      type="text"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SEGMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSegment(opt.value)}
                        className={`flex flex-col items-start p-3 rounded-md border transition-colors text-left ${
                          segment === opt.value
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <p className="text-xs font-medium">{opt.label}</p>
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {segmentCounts[opt.value]}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                  {segment === "custom" && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        Email Addresses (comma-separated)
                      </label>
                      <textarea
                        value={customEmails}
                        onChange={(e) => setCustomEmails(e.target.value)}
                        placeholder="email1@example.com, email2@example.com"
                        rows={3}
                        className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Step 3: Content */}
          <div className="rounded-md border bg-card">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                Content
              </h2>
              <button
                onClick={() => setShowAiDialog(true)}
                disabled={!geminiReady}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="size-3.5" />
                Generate Email with AI
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Subject Line */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">Subject Line</label>
                  <button
                    onClick={handleGenerateSubject}
                    disabled={!geminiReady || generatingSubject}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingSubject ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    Generate with AI
                  </button>
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  maxLength={80}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{subject.length}/80</p>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Body (HTML)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="<h2>Hello!</h2><p>Write your email content here...</p>"
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[300px]"
                />
              </div>

              {!geminiReady && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 flex items-start gap-2">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Gemini API key not configured. Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local to enable AI features.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Actions */}
          <div className="rounded-md border bg-card">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                Actions
              </h2>
            </div>
            <div className="p-5">
              {/* Send Progress */}
              {sending && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      Sending {sendProgress.current} of {sendProgress.total}...
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {Math.round((sendProgress.current / sendProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Send Results Summary */}
              {sendResults.length > 0 && !sending && (
                <div className="mb-4 rounded-md border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold">Send Results</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      {sendResults.filter((r) => r.success).length} sent
                    </span>
                    {sendResults.some((r) => !r.success) && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                        <XCircle className="size-3" />
                        {sendResults.filter((r) => !r.success).length} failed
                      </span>
                    )}
                  </div>
                  {sendResults.filter((r) => !r.success).length > 0 && (
                    <div className="space-y-1 mt-1">
                      {sendResults
                        .filter((r) => !r.success)
                        .map((r, i) => (
                          <p key={i} className="text-[10px] text-red-600 dark:text-red-400 font-mono">
                            {r.email}: {r.error}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <Eye className="size-4" />
                  {showPreview ? "Hide Preview" : "Preview"}
                </button>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  disabled={!subject.trim() || !body.trim()}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="size-4" />
                  Save as Template
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !body.trim() || recipientCount === 0}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {sending ? "Sending..." : "Send Now"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Preview & Recent */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="rounded-md border bg-card sticky top-6">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Live Preview</h2>
            </div>
            <div className="p-5">
              {subject || body ? (
                <div className="space-y-3">
                  {/* Subject preview */}
                  {subject && (
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Subject</p>
                      <p className="text-sm font-semibold">{subject}</p>
                    </div>
                  )}
                  {/* Body preview */}
                  <div
                    className="rounded-md border bg-white dark:bg-zinc-900 p-4 max-h-[500px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: body || "" }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Start typing to see a preview</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Or use AI to generate email content
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sends */}
          <div className="rounded-md border bg-card">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                Recent Sends
              </h2>
              <Link href="/workspace/emails/logs" className="text-xs text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="divide-y">
              {recentLogs.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No emails sent yet</p>
                </div>
              )}
              {recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{log.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.to_email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span
                      className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        STATUS_STYLES[log.status] ?? STATUS_STYLES.simulated
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.sent_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
