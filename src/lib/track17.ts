/**
 * 17Track API v2.4 Client
 * Docs: https://api.17track.net/en/doc?version=v2.4
 */

const API_KEY = process.env.TRACK17_API_KEY ?? ""
const BASE_URL = "https://api.17track.net/track/v2.2"

export function is17TrackConfigured(): boolean {
  return API_KEY !== ""
}

interface TrackingResult {
  number: string
  carrier: number
  status: string // NotFound, InTransit, Expired, PickedUp, Undelivered, Delivered, Alert
  lastEvent: string
  lastEventTime: string
  originCountry: string
  destinationCountry: string
  transitDays: number
  deliveredAt: string | null
}

// Register tracking numbers for monitoring
export async function registerTracking(trackingNumbers: { number: string; carrier?: number }[]): Promise<boolean> {
  if (!API_KEY) return false
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": API_KEY,
      },
      body: JSON.stringify(trackingNumbers.map(t => ({
        number: t.number,
        carrier: t.carrier ?? 0, // 0 = auto-detect
      }))),
    })
    return res.ok
  } catch {
    return false
  }
}

// Get tracking status for registered numbers
export async function getTrackingStatus(trackingNumbers: string[]): Promise<TrackingResult[]> {
  if (!API_KEY || trackingNumbers.length === 0) return []
  try {
    const res = await fetch(`${BASE_URL}/gettrackinfo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": API_KEY,
      },
      body: JSON.stringify(trackingNumbers.map(n => ({ number: n }))),
    })
    if (!res.ok) return []
    const data = await res.json()

    const results: TrackingResult[] = []
    const accepted = data?.data?.accepted ?? []

    for (const item of accepted) {
      const track = item.track ?? {}
      const events = track.z1 ?? track.z2 ?? []
      const lastEvent = events[0] ?? {}

      // Map 17Track status codes
      let status = "pending"
      const trackStatus = track.e ?? 0
      if (trackStatus === 40) status = "delivered"
      else if (trackStatus === 20 || trackStatus === 30) status = "in_transit"
      else if (trackStatus === 50) status = "exception"
      else if (trackStatus === 0) status = "pending"

      results.push({
        number: item.number ?? "",
        carrier: item.carrier ?? 0,
        status,
        lastEvent: lastEvent.z ?? "",
        lastEventTime: lastEvent.a ?? "",
        originCountry: track.b ?? "",
        destinationCountry: track.c ?? "",
        transitDays: track.f ?? 0,
        deliveredAt: status === "delivered" ? (lastEvent.a ?? null) : null,
      })
    }

    return results
  } catch (err) {
    console.error("17Track error:", err)
    return []
  }
}

// Map common carrier names to 17Track carrier codes
export const CARRIER_CODES: Record<string, number> = {
  "UPS": 100002,
  "USPS": 100001,
  "FedEx": 100003,
  "DHL": 100004,
  "China Post": 3011,
  "YunExpress": 190271,
  "4PX": 190233,
  "CNE Express": 190012,
  "Yanwen": 190012,
}
