"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

/* ─── Theme registry ──────────────────────────────────────────────── */

export interface ThemeDef {
  id: string
  label: string
  /** Short description shown in the picker tooltip */
  description: string
  /** Preview swatch color (primary) */
  swatch: string
  /** Secondary swatch for the two-tone preview dot */
  swatchAlt: string
}

/**
 * Six industry-grade color themes curated for B2B wholesale / ops portals.
 * "default" is the current Faire Wholesale Admin look — the others are
 * additive CSS-variable overrides applied via `[data-theme="<id>"]` on <html>.
 *
 * The order here is the display order in the theme picker.
 */
export const THEMES: ThemeDef[] = [
  {
    id: "default",
    label: "Wholesale Blue",
    description: "The original Faire Wholesale Admin palette",
    swatch: "hsl(223 83% 53%)",
    swatchAlt: "hsl(225 40% 8%)",
  },
  {
    id: "ocean",
    label: "Ocean Teal",
    description: "Modern SaaS feel with teal accents",
    swatch: "hsl(185 72% 40%)",
    swatchAlt: "hsl(188 55% 12%)",
  },
  {
    id: "forest",
    label: "Forest Green",
    description: "Earthy, premium wholesale tone",
    swatch: "hsl(152 60% 36%)",
    swatchAlt: "hsl(155 45% 10%)",
  },
  {
    id: "slate",
    label: "Graphite",
    description: "Minimal, enterprise-neutral",
    swatch: "hsl(220 14% 40%)",
    swatchAlt: "hsl(220 12% 13%)",
  },
  {
    id: "amber",
    label: "Amber Commerce",
    description: "Warm and energetic, commerce-forward",
    swatch: "hsl(32 95% 44%)",
    swatchAlt: "hsl(25 45% 10%)",
  },
  {
    id: "indigo",
    label: "Indigo Night",
    description: "Deep and creative, premium feel",
    swatch: "hsl(245 58% 51%)",
    swatchAlt: "hsl(248 42% 12%)",
  },
  {
    id: "rose",
    label: "Rose Modern",
    description: "Fresh, contemporary D2C-inspired",
    swatch: "hsl(340 75% 50%)",
    swatchAlt: "hsl(342 40% 11%)",
  },
  {
    id: "usdrop",
    label: "USDrop AI",
    description: "Extracted from the USDrop AI client — violet/purple DM Sans theme",
    swatch: "hsl(262 70% 45%)",
    swatchAlt: "hsl(264 50% 10%)",
  },
  {
    id: "legalnations",
    label: "LegalNations",
    description: "Deep emerald + warm gold — trust, clarity, professionalism for legal services",
    swatch: "hsl(160 45% 22%)",
    swatchAlt: "hsl(42 80% 55%)",
  },
]

export const THEME_MAP = new Map(THEMES.map((t) => [t.id, t]))

/* ─── Persistence ─────────────────────────────────────────────────── */

const STORAGE_KEY = "teamops:theme"

/* ─── Context ─────────────────────────────────────────────────────── */

interface ThemeContextValue {
  themeId: string
  theme: ThemeDef
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>")
  return ctx
}

/* ─── Provider ────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState("default")

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && THEME_MAP.has(stored)) {
        setThemeId(stored)
        document.documentElement.setAttribute("data-theme", stored)
      }
    } catch {
      /* SSR or storage unavailable */
    }
  }, [])

  const setTheme = useCallback((id: string) => {
    if (!THEME_MAP.has(id)) return
    setThemeId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
    // Apply immediately to the document root so CSS variable overrides take effect
    if (id === "default") {
      document.documentElement.removeAttribute("data-theme")
    } else {
      document.documentElement.setAttribute("data-theme", id)
    }
  }, [])

  const theme = THEME_MAP.get(themeId) ?? THEMES[0]

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
