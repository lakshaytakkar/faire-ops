"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Phone,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SmsTemplate {
  id: string
  name: string
  body: string
  channel: string
  category: string
  template_type: string
  variables: string[]
  is_active: boolean
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SmsComposerPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [toNumber, setToNumber] = useState("")
  const [toName, setToName] = useState("")
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [customBody, setCustomBody] = useState("")
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("channel", "sms")
        .eq("is_active", true)
        .order("name")
      setTemplates((data ?? []) as SmsTemplate[])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )

  // When template changes, reset variables
  useEffect(() => {
    if (selectedTemplate) {
      const vars: Record<string, string> = {}
      ;(selectedTemplate.variables ?? []).forEach((v) => {
        vars[v] = ""
      })
      setVariables(vars)
      setCustomBody("")
    } else {
      setVariables({})
    }
  }, [selectedTemplate])

  // Build preview body
  const previewBody = useMemo(() => {
    if (selectedTemplate) {
      let body = selectedTemplate.body
      Object.entries(variables).forEach(([key, val]) => {
        body = body.replaceAll(`{{${key}}}`, val || `{{${key}}}`)
      })
      return body
    }
    return customBody
  }, [selectedTemplate, variables, customBody])

  // Format phone number
  function formatPhoneInput(val: string) {
    // Strip non-digits except +
    const cleaned = val.replace(/[^\d+]/g, "")
    setToNumber(cleaned)
  }

  async function handleSend() {
    if (!toNumber) {
      setToast({ type: "error", message: "Phone number is required" })
      return
    }
    if (!selectedTemplateId && !customBody.trim()) {
      setToast({ type: "error", message: "Select a template or write a custom message" })
      return
    }

    setSending(true)
    try {
      const payload: Record<string, unknown> = {
        channel: "sms",
        to_number: toNumber.startsWith("+") ? toNumber : `+1${toNumber}`,
        to_name: toName || undefined,
      }
      if (selectedTemplateId) {
        payload.template_id = selectedTemplateId
        payload.variables = variables
      } else {
        payload.body_override = customBody
      }

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (result.success) {
        setToast({ type: "success", message: result.simulated ? "SMS simulated (Twilio not configured)" : "SMS sent successfully" })
        setToNumber("")
        setToName("")
        setCustomBody("")
        if (selectedTemplate) {
          const vars: Record<string, string> = {}
          ;(selectedTemplate.variables ?? []).forEach((v) => { vars[v] = "" })
          setVariables(vars)
        }
      } else {
        setToast({ type: "error", message: result.error || "Failed to send SMS" })
      }
    } catch (err) {
      setToast({ type: "error", message: (err as Error).message })
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <Link
          href="/workspace/messaging"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back to Messaging
        </Link>
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <Phone className="size-6 text-blue-600" />
          Send SMS
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Compose and send an SMS message</p>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Compose */}
        <div className="space-y-4">
          <div className="rounded-md border bg-card p-5 space-y-4">
            {/* Template Selector */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Custom message (no template)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Template body preview */}
            {selectedTemplate && (
              <div className="rounded-md bg-muted/30 border p-3">
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">Template Body</p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedTemplate.body.split(/(\{\{[^}]+\}\})/).map((part, i) =>
                    part.startsWith("{{") ? (
                      <span key={i} className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 px-1 rounded font-mono text-xs">
                        {part}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            )}

            {/* Recipient */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-mono shrink-0">+1</span>
                <input
                  type="tel"
                  value={toNumber}
                  onChange={(e) => formatPhoneInput(e.target.value)}
                  placeholder="2125551234"
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Enter number without country code, or include + for international
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name (optional)</label>
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Recipient name"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Template Variables */}
            {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Variables</p>
                {selectedTemplate.variables.map((v) => (
                  <div key={v}>
                    <label className="block text-xs text-muted-foreground mb-1 font-mono">{`{{${v}}}`}</label>
                    <input
                      type="text"
                      value={variables[v] ?? ""}
                      onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                      placeholder={v}
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Custom message */}
            {!selectedTemplateId && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message</label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Type your SMS message..."
                  className="w-full min-h-[120px] px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {customBody.length} / 160 characters {customBody.length > 160 ? `(${Math.ceil(customBody.length / 153)} segments)` : ""}
                </p>
              </div>
            )}

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={sending || (!selectedTemplateId && !customBody.trim()) || !toNumber}
              className="inline-flex items-center gap-2 h-9 px-6 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send SMS
            </button>
          </div>
        </div>

        {/* Right - Preview */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <div className="mx-auto max-w-[320px]">
            {/* Phone mockup */}
            <div className="rounded-[2rem] border-4 border-zinc-800 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-900 overflow-hidden shadow-xl">
              {/* Status bar */}
              <div className="h-6 bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center">
                <div className="w-16 h-1.5 rounded-full bg-zinc-600" />
              </div>

              {/* Header */}
              <div className="bg-zinc-200 dark:bg-zinc-800 px-4 py-3 border-b border-zinc-300 dark:border-zinc-700">
                <p className="text-xs font-semibold text-center text-zinc-600 dark:text-zinc-400">
                  {toName || toNumber || "SMS"}
                </p>
              </div>

              {/* Messages area */}
              <div className="min-h-[300px] p-4 flex flex-col justify-end">
                {previewBody ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-500 text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm">
                      {previewBody}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    Select a template or type a message to preview
                  </p>
                )}
              </div>

              {/* Bottom bar */}
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                <div className="w-24 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
