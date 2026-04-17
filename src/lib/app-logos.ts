export function logoFor(app: { url?: string | null; logo_url?: string | null }): string | null {
  if (app.logo_url) return app.logo_url
  if (app.url) {
    try { return `https://logo.clearbit.com/${new URL(app.url).hostname}` } catch { return null }
  }
  return null
}

export function maskIdentifier(value: string | null | undefined): string {
  if (!value) return "—"
  if (value.length <= 6) return value
  return `${value.slice(0, 3)}***${value.slice(-2)}`
}
