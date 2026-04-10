"use client"

import { useEffect, useState } from "react"
import { Shuffle } from "lucide-react"

interface Wallpaper {
  id: string
  name: string
  url: string
}

interface WallpaperSwitcherProps {
  wallpapers: Wallpaper[]
}

const STORAGE_KEY = "teamsync.homepage.wallpaperId"

/**
 * Renders the active homepage wallpaper as a fixed background layer and
 * exposes a small shuffle button (positioned by the parent) that cycles
 * through the available wallpapers. The active choice persists in
 * localStorage so the user's pick survives reloads.
 */
export function WallpaperSwitcher({ wallpapers }: WallpaperSwitcherProps) {
  const [index, setIndex] = useState(0)

  // Restore the saved choice on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const found = wallpapers.findIndex((w) => w.id === saved)
      if (found >= 0) setIndex(found)
    }
  }, [wallpapers])

  function shuffle() {
    const next = (index + 1) % wallpapers.length
    setIndex(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, wallpapers[next].id)
    }
  }

  const current = wallpapers[index]

  return (
    <>
      {/* Render every wallpaper stacked, fade between them via opacity. */}
      {wallpapers.map((w, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={w.id}
          src={w.url}
          alt=""
          aria-hidden="true"
          className={`fixed inset-0 -z-10 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-500 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Shuffle button — positioned absolutely by the parent via portal-style placement.
          We give it a fixed position in the top-right corner of the viewport. */}
      <button
        type="button"
        onClick={shuffle}
        title={`Shuffle wallpaper · ${current.name}`}
        className="fixed top-4 right-16 z-20 inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/80 bg-card shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <Shuffle className="h-4 w-4" />
      </button>
    </>
  )
}
