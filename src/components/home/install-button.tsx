"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"

/**
 * Small persistent "Download app" button for the homepage.
 *
 * Uses the standard Web App `beforeinstallprompt` event to trigger a native
 * PWA install dialog when supported. Falls back gracefully:
 *   - If the app is already installed (display-mode standalone) → hide
 *   - If the browser doesn't fire `beforeinstallprompt` (Safari, Firefox) →
 *     show a static button that opens a small instructions popover
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Already installed?
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
      return
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }

    function onInstalled() {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === "accepted") setInstalled(true)
      setDeferred(null)
      return
    }
    // No native prompt available — show OS-specific instructions
    setShowHint((v) => !v)
  }

  if (installed) return null

  return (
    <div className="fixed bottom-4 right-4 z-20">
      {showHint && (
        <div className="mb-2 w-64 rounded-md border border-border/80 bg-card shadow-xl p-3 text-xs text-foreground leading-relaxed">
          <p className="font-semibold mb-1">Install TeamSync AI</p>
          <p className="text-muted-foreground">
            On <span className="font-medium text-foreground">Safari</span>: tap Share → Add to Home Screen.
            <br />
            On <span className="font-medium text-foreground">Firefox</span>: open menu → Install.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        title="Download app"
        className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-md border border-border/80 bg-card shadow-sm text-foreground hover:bg-muted/40 transition-colors"
      >
        <Download className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Download</span>
      </button>
    </div>
  )
}
