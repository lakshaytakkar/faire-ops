"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  MessageSquare,
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
/*  WhatsApp formatting helpers                                        */
/* ------------------------------------------------------------------ */

function renderWhatsAppFormatting(text: string): string {
  // Bold: *text* → <strong>text</strong>
  let html = text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
  // Italic: _text_ → <em>text</em>
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>")
  // Strikethrough: ~text~ → <del>text</del>
  html = html.replace(/~([^~]+)~/g, "<del>$1</del>")
  // Monospace: ```text``` → <code>text</code>
  html = html.replace(/```([^`]+)```/g, "<code>$1</code>")
  // Newlines
  html = html.replace(/\n/g, "<br/>")
  return html
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WhatsAppComposerPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [toNumber, setToNumber] = useState("")
  const [countryCode, setCountryCode] = useState("+1")
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
        .eq("channel", "whatsapp")
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

  function formatPhoneInput(val: string) {
    const cleaned = val.replace(/[^\d]/g, "")
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
      const fullNumber = `${countryCode}${toNumber}`
      const payload: Record<string, unknown> = {
        channel: "whatsapp",
        to_number: fullNumber,
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
        setToast({ type: "success", message: result.simulated ? "WhatsApp simulated (Twilio not configured)" : "WhatsApp sent successfully" })
        setToNumber("")
        setToName("")
        setCustomBody("")
        if (selectedTemplate) {
          const vars: Record<string, string> = {}
          ;(selectedTemplate.variables ?? []).forEach((v) => { vars[v] = "" })
          setVariables(vars)
        }
      } else {
        setToast({ type: "error", message: result.error || "Failed to send WhatsApp" })
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

  const COUNTRY_CODES = [
    { code: "+1", label: "US/CA" },
    { code: "+44", label: "UK" },
    { code: "+91", label: "IN" },
    { code: "+61", label: "AU" },
    { code: "+49", label: "DE" },
    { code: "+33", label: "FR" },
    { code: "+81", label: "JP" },
    { code: "+86", label: "CN" },
    { code: "+55", label: "BR" },
    { code: "+52", label: "MX" },
  ]

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
          <MessageSquare className="size-6 text-emerald-600" />
          Send WhatsApp
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Compose and send a WhatsApp message</p>
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
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3">
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">Template Body</p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedTemplate.body.split(/(\{\{[^}]+\}\})/).map((part, i) =>
                    part.startsWith("{{") ? (
                      <span key={i} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-1 rounded font-mono text-xs">
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
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-9 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 shrink-0"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>
                      {cc.code} {cc.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={toNumber}
                  onChange={(e) => formatPhoneInput(e.target.value)}
                  placeholder="2125551234"
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
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
                  placeholder="Type your WhatsApp message... Use *bold*, _italic_, ~strikethrough~"
                  className="w-full min-h-[120px] px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Supports *bold*, _italic_, ~strikethrough~, ```monospace```
                </p>
              </div>
            )}

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={sending || (!selectedTemplateId && !customBody.trim()) || !toNumber}
              className="inline-flex items-center gap-2 h-9 px-6 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send WhatsApp
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
              <div className="h-6 bg-emerald-700 dark:bg-emerald-800 flex items-center justify-center">
                <div className="w-16 h-1.5 rounded-full bg-emerald-500" />
              </div>

              {/* WhatsApp Header */}
              <div className="bg-emerald-700 dark:bg-emerald-800 px-4 py-3 flex items-center gap-3">
                <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {(toName || toNumber || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {toName || toNumber || "Contact"}
                  </p>
                  <p className="text-[10px] text-emerald-200">online</p>
                </div>
              </div>

              {/* Chat background */}
              <div className="min-h-[300px] p-4 flex flex-col justify-end bg-[#ece5dd] dark:bg-zinc-900" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                {previewBody ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg rounded-br-sm bg-[#dcf8c6] dark:bg-emerald-900 text-zinc-800 dark:text-emerald-100 px-3 py-2 text-sm leading-relaxed shadow-sm">
                      <span dangerouslySetInnerHTML={{ __html: renderWhatsAppFormatting(previewBody) }} />
                      <span className="flex justify-end mt-1">
                        <span className="text-[9px] text-zinc-500 dark:text-emerald-400">
                          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-muted-foreground bg-white/80 dark:bg-zinc-800/80 rounded-md py-2 px-3">
                    Select a template or type a message to preview
                  </p>
                )}
              </div>

              {/* Input bar */}
              <div className="h-12 bg-zinc-200 dark:bg-zinc-800 flex items-center px-3 gap-2">
                <div className="flex-1 h-8 rounded-full bg-white dark:bg-zinc-700 px-3 flex items-center">
                  <span className="text-xs text-zinc-400">Type a message</span>
                </div>
                <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Send className="size-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
