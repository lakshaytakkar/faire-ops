import { NextResponse } from "next/server"
import { getTrackingStatus, registerTracking, CARRIER_CODES } from "@/lib/track17"
import { sendWhatsApp, isTwilioConfigured } from "@/lib/twilio"
import { supabaseB2B } from "@/lib/supabase"

export async function POST() {
  try {
    // Step 1: Find all shipped orders with tracking codes that need monitoring
    const { data: activeTracking } = await supabaseB2B
      .from("shipment_tracking")
      .select("id, order_id, tracking_code, carrier, status, delivery_notification_sent")
      .in("status", ["pending", "in_transit"])
      .order("created_at", { ascending: true })
      .range(0, 99) // batch of 100

    if (!activeTracking || activeTracking.length === 0) {
      // Check for new shipped orders without tracking entries
      const { data: shippedOrders } = await supabaseB2B
        .from("vendor_quotes")
        .select("order_id, tracking_code, carrier, shipped_at")
        .eq("status", "shipped")
        .not("tracking_code", "is", null)

      if (shippedOrders && shippedOrders.length > 0) {
        // Check which don't have tracking entries yet
        const { data: existingTracking } = await supabaseB2B
          .from("shipment_tracking")
          .select("order_id")

        const existingOrderIds = new Set((existingTracking ?? []).map(t => t.order_id))
        const newShipments = shippedOrders.filter(o => !existingOrderIds.has(o.order_id))

        if (newShipments.length > 0) {
          // Register with 17Track and create tracking entries
          const trackingNums = newShipments.map(s => ({
            number: s.tracking_code,
            carrier: CARRIER_CODES[s.carrier ?? ""] ?? 0,
          }))
          await registerTracking(trackingNums)

          const rows = newShipments.map(s => ({
            order_id: s.order_id,
            tracking_code: s.tracking_code,
            carrier: s.carrier,
            carrier_code: CARRIER_CODES[s.carrier ?? ""] ?? 0,
            shipped_at: s.shipped_at,
            status: "pending",
          }))
          await supabaseB2B.from("shipment_tracking").insert(rows)

          return NextResponse.json({ success: true, registered: newShipments.length, updated: 0, delivered: 0 })
        }
      }

      return NextResponse.json({ success: true, message: "No active shipments to track", registered: 0, updated: 0, delivered: 0 })
    }

    // Step 2: Get tracking status from 17Track
    const trackingCodes = activeTracking.map(t => t.tracking_code)
    const results = await getTrackingStatus(trackingCodes)

    let updated = 0
    let delivered = 0
    let delayed = 0

    // Step 3: Update tracking status in DB
    for (const result of results) {
      const tracking = activeTracking.find(t => t.tracking_code === result.number)
      if (!tracking) continue

      const isDelayed = result.transitDays > 14 // consider delayed if > 14 days
      const updates: Record<string, unknown> = {
        status: result.status,
        last_event: result.lastEvent,
        last_event_time: result.lastEventTime || null,
        origin_country: result.originCountry,
        destination_country: result.destinationCountry,
        transit_days: result.transitDays,
        is_delayed: isDelayed,
        last_checked_at: new Date().toISOString(),
        raw_tracking: result,
      }

      if (result.status === "delivered" && result.deliveredAt) {
        updates.delivered_at = result.deliveredAt
        updates.status = "delivered"
        delivered++

        // Update order state to DELIVERED
        await supabaseB2B
          .from("faire_orders")
          .update({ state: "DELIVERED" })
          .eq("faire_order_id", tracking.order_id)

        // Send delivery WhatsApp notification if not already sent
        if (!tracking.delivery_notification_sent && isTwilioConfigured()) {
          const { data: order } = await supabaseB2B
            .from("faire_orders")
            .select("shipping_address, store_id, display_id")
            .eq("faire_order_id", tracking.order_id)
            .single()

          if (order) {
            const addr = order.shipping_address as Record<string, unknown> | null
            const phone = addr?.phone_number as string
            const name = (addr?.company_name as string) || (addr?.name as string) || "Retailer"

            const { data: store } = await supabaseB2B
              .from("faire_stores")
              .select("name, faire_store_id")
              .eq("id", order.store_id)
              .single()

            if (phone && store) {
              await sendWhatsApp({
                to: phone,
                body: `Hi ${name}! Your order #${order.display_id} has been delivered! Thank you for your business. Ready to restock? Visit our Faire store: https://faire.com/brand/${store.faire_store_id}\n\nTracking: ${tracking.tracking_code}\n\n— ${store.name} Team`,
              })
              updates.delivery_notification_sent = true
            }
          }
        }
      }

      if (isDelayed) delayed++

      await supabaseB2B.from("shipment_tracking").update(updates).eq("id", tracking.id)
      updated++
    }

    return NextResponse.json({
      success: true,
      registered: 0,
      updated,
      delivered,
      delayed,
      total_active: activeTracking.length,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
