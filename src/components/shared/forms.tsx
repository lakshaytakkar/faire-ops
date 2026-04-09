"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  FormField — single labeled field                                   */
/* ------------------------------------------------------------------ */

export function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FormSection — group of fields with optional title                  */
/* ------------------------------------------------------------------ */

export function FormSection({
  title,
  children,
  collapsible,
}: {
  title?: string
  children: ReactNode
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)

  return (
    <div className="space-y-3">
      {title && (
        <button
          type="button"
          onClick={() => collapsible && setOpen(!open)}
          className={`text-sm font-semibold text-foreground flex items-center gap-2 ${collapsible ? "cursor-pointer hover:text-primary" : ""}`}
        >
          {title}
          {collapsible && (
            <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          )}
        </button>
      )}
      {open && <div className="space-y-3">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SingleForm — standard form with submit/cancel                      */
/* ------------------------------------------------------------------ */

export function SingleForm({
  title,
  description,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  submitting,
  children,
}: {
  title: string
  description?: string
  onSubmit: () => void
  onCancel?: () => void
  submitLabel?: string
  submitting?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MultiStepForm — wizard with steps, progress, next/back/submit      */
/* ------------------------------------------------------------------ */

interface Step {
  title: string
  description?: string
  content: ReactNode
  validate?: () => boolean
}

export function MultiStepForm({
  steps,
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  submitting,
}: {
  steps: Step[]
  onSubmit: () => void
  onCancel?: () => void
  submitLabel?: string
  submitting?: boolean
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  function handleNext() {
    const step = steps[currentStep]
    if (step.validate && !step.validate()) return
    if (isLast) {
      onSubmit()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (!isFirst) setCurrentStep((s) => s - 1)
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${done ? "bg-primary" : "bg-border"}`} />}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Step description */}
      {steps[currentStep].description && (
        <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
      )}

      {/* Step content */}
      <div className="min-h-[200px]">{steps[currentStep].content}</div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          {!isFirst && (
            <Button variant="outline" onClick={handleBack} disabled={submitting}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button onClick={handleNext} disabled={submitting}>
            {isLast ? (submitting ? "Submitting..." : submitLabel) : "Next"}
            {!isLast && <ChevronRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FormInput — styled input matching app patterns                     */
/* ------------------------------------------------------------------ */

export function FormInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full h-9 rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
      {...props}
    />
  )
}

export function FormTextarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px] resize-y ${className}`}
      {...props}
    />
  )
}

export function FormSelect({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`w-full h-9 rounded-md border border-border px-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
