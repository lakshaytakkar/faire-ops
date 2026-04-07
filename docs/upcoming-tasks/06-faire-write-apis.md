# Complete Faire Write API Integration — PRD

## Overview

Implement all remaining Faire API write operations to enable full two-way synchronization between the portal and Faire. Currently the portal reads data from Faire but most write operations (creating products, updating listings, managing orders at the item level) are missing. This PRD covers every outstanding write endpoint plus webhook registration for real-time updates.

**Business Value:** Without write APIs, the portal is a read-only dashboard. Full write integration means products can be created and updated directly from the portal, order fulfillment can be managed at the item level, and the brand profile can be edited — all without leaving the portal. This is the foundation for the Publishing Queue to actually publish to Faire.

## User Stories

- As a **product manager**, I want to create a new product on Faire directly from the Publishing Queue, so that I don't have to copy-paste into the Faire dashboard.
- As a **product manager**, I want to update a product's title, description, and images on Faire from the portal, so that I can manage all listing content in one place.
- As a **product manager**, I want to archive/delete a product on Faire from the portal, so that I can manage my catalog lifecycle without switching tools.
- As a **product manager**, I want to update variant prices and names on Faire, so that pricing changes are reflected immediately.
- As a **fulfillment manager**, I want to backorder specific items in an order, so that I can communicate delays to retailers without canceling.
- As a **fulfillment manager**, I want to fulfill specific items (not just whole orders), so that I can ship partial orders as items become available.
- As a **brand owner**, I want to update my brand profile on Faire from the portal, so that brand information stays current.
- As a **developer**, I want real-time webhook notifications for new orders and product changes, so that the portal stays in sync without polling.

## Endpoint Inventory

### 1. Create Product — `POST /api/v2/products`

**Faire API:** `POST https://www.faire.com/api/v2/products`

**Request Body:**
```json
{
  "name": "Lavender Soy Candle",
  "short_description": "Hand-poured 8oz soy candle with natural lavender",
  "description": "Full product description with HTML...",
  "unit_multiplier": 1,
  "minimum_order_quantity": 6,
  "taxonomy_type": {
    "id": "tt_candles"
  },
  "images": [
    { "url": "https://...", "position": 1, "tags": ["HERO"] }
  ],
  "variants": [
    {
      "name": "Lavender - 8oz",
      "sku": "LAV-SOY-8",
      "wholesale_price_cents": 800,
      "retail_price_cents": 1600,
      "available_quantity": 100
    }
  ]
}
```

**Portal Trigger:** "Publish to Faire" button on Publishing Queue items and product detail page.

**Portal API Route:** `POST /api/faire/products`

---

### 2. Update Product — `PUT /api/v2/products/{product_id}`

**Faire API:** `PUT https://www.faire.com/api/v2/products/{product_id}`

**Request Body:** Same as create, but with existing product token. Only changed fields need to be sent.

**Portal Trigger:** "Sync to Faire" button on product detail page, or auto-sync on save if enabled.

**Portal API Route:** `PUT /api/faire/products/[id]`

---

### 3. Delete/Archive Product — `DELETE /api/v2/products/{product_id}`

**Faire API:** `DELETE https://www.faire.com/api/v2/products/{product_id}`

**Behavior:** Archives the product on Faire (makes it inactive). Products are not permanently deleted.

**Portal Trigger:** "Archive on Faire" action in product detail dropdown menu, with confirmation dialog.

**Portal API Route:** `DELETE /api/faire/products/[id]`

---

### 4. Update Variant — `PATCH /api/v2/products/{product_id}/variants/{variant_id}`

**Faire API:** `PATCH https://www.faire.com/api/v2/products/{product_id}/variants/{variant_id}`

**Request Body:**
```json
{
  "name": "Lavender - 12oz",
  "wholesale_price_cents": 1000,
  "retail_price_cents": 2000
}
```

**Note:** Inventory updates (`available_quantity`) are already implemented. This covers name and price updates.

**Portal Trigger:** Inline edit on variant table in product detail, "Update on Faire" button.

**Portal API Route:** `PATCH /api/faire/products/[productId]/variants/[variantId]`

---

### 5. Backorder Items — `POST /api/v2/orders/{order_id}/items/{item_id}/backorder`

**Faire API:** `POST https://www.faire.com/api/v2/orders/{order_id}/items/{item_id}/backorder`

**Request Body:**
```json
{
  "quantity": 3,
  "estimated_available_date": "2026-05-15"
}
```

**Portal Trigger:** "Backorder" button on individual order line items in order detail page.

**Portal API Route:** `POST /api/faire/orders/[orderId]/items/[itemId]/backorder`

---

### 6. Update Brand Profile — `PUT /api/v2/brand`

**Faire API:** `PUT https://www.faire.com/api/v2/brand`

**Request Body:**
```json
{
  "name": "My Brand",
  "description": "Brand description...",
  "minimum_order_amount_cents": 10000,
  "profile_image": { "url": "https://..." },
  "website_url": "https://mybrand.com",
  "social_media": {
    "instagram": "@mybrand",
    "facebook": "mybrand"
  }
}
```

**Portal Trigger:** "Save & Sync to Faire" button on brand/store settings page.

**Portal API Route:** `PUT /api/faire/brand`

---

### 7. Fulfill Specific Items — `POST /api/v2/orders/{order_id}/items/{item_id}/fulfill`

**Faire API:** `POST https://www.faire.com/api/v2/orders/{order_id}/items/{item_id}/fulfill`

**Request Body:**
```json
{
  "quantity": 2,
  "tracking_number": "1Z999AA10123456784",
  "carrier": "UPS"
}
```

**Note:** Currently only whole-order fulfillment exists. This enables partial/item-level fulfillment.

**Portal Trigger:** Per-item "Fulfill" button on order detail, with quantity input and tracking info.

**Portal API Route:** `POST /api/faire/orders/[orderId]/items/[itemId]/fulfill`

---

### 8. Webhooks — `POST /api/v2/webhooks`

**Faire API:** `POST https://www.faire.com/api/v2/webhooks`

**Webhook Events to Register:**

| Event | Description | Portal Action |
|-------|-------------|---------------|
| `ORDER_CREATED` | New order placed | Create order record, send notification |
| `ORDER_UPDATED` | Order status changed | Update order record |
| `ORDER_CANCELED` | Order canceled | Update status, adjust inventory |
| `PRODUCT_UPDATED` | Product changed on Faire | Sync changes to portal |
| `PRODUCT_CREATED` | New product on Faire | Import to portal |
| `SHIPMENT_UPDATED` | Shipping status changed | Update tracking info |
| `PAYOUT_COMPLETED` | Payout sent | Update payout record |

**Webhook Registration Request:**
```json
{
  "url": "https://your-domain.com/api/webhooks/faire",
  "events": ["ORDER_CREATED", "ORDER_UPDATED", "ORDER_CANCELED", "PRODUCT_UPDATED", "PAYOUT_COMPLETED"]
}
```

**Portal Webhook Receiver:** `POST /api/webhooks/faire` — validates signature, routes to handler by event type.

**Portal API Route:** `POST /api/faire/webhooks/register`

## Technical Requirements

### Database Schema

```sql
-- Track all write operations to Faire for audit and retry
CREATE TABLE faire_api_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('POST', 'PUT', 'PATCH', 'DELETE')),
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  faire_token TEXT,
  entity_type TEXT CHECK (entity_type IN ('product', 'variant', 'order', 'brand', 'webhook')),
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'failed', 'retrying', 'pending')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook registration tracking
CREATE TABLE faire_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT UNIQUE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  registered_at TIMESTAMPTZ,
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook event log
CREATE TABLE faire_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES faire_webhooks(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_faire_api_log_entity ON faire_api_log (entity_type, entity_id);
CREATE INDEX idx_faire_api_log_status ON faire_api_log (status);
CREATE INDEX idx_faire_webhook_events_type ON faire_webhook_events (event_type);
CREATE INDEX idx_faire_webhook_events_processed ON faire_webhook_events (processed);
```

### API Endpoints (Portal)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/faire/products` | Create product on Faire |
| PUT | `/api/faire/products/[id]` | Update product on Faire |
| DELETE | `/api/faire/products/[id]` | Archive product on Faire |
| PATCH | `/api/faire/products/[productId]/variants/[variantId]` | Update variant on Faire |
| POST | `/api/faire/orders/[orderId]/items/[itemId]/backorder` | Backorder item |
| POST | `/api/faire/orders/[orderId]/items/[itemId]/fulfill` | Fulfill specific item |
| PUT | `/api/faire/brand` | Update brand profile on Faire |
| POST | `/api/faire/webhooks/register` | Register webhooks with Faire |
| GET | `/api/faire/webhooks` | List registered webhooks |
| DELETE | `/api/faire/webhooks/[id]` | Unregister a webhook |
| POST | `/api/webhooks/faire` | Webhook receiver (called by Faire) |
| GET | `/api/faire/api-log` | View API call log |

### Faire API Client

Extend the existing Faire API client module with write methods:

```typescript
// Pseudocode — extend existing faire-api.ts

export const faireApi = {
  // Existing read methods...
  
  // New write methods
  createProduct(data: CreateProductPayload): Promise<FaireProduct>,
  updateProduct(id: string, data: UpdateProductPayload): Promise<FaireProduct>,
  deleteProduct(id: string): Promise<void>,
  updateVariant(productId: string, variantId: string, data: UpdateVariantPayload): Promise<FaireVariant>,
  backorderItem(orderId: string, itemId: string, data: BackorderPayload): Promise<void>,
  fulfillItem(orderId: string, itemId: string, data: FulfillPayload): Promise<void>,
  updateBrand(data: UpdateBrandPayload): Promise<FaireBrand>,
  registerWebhook(data: WebhookPayload): Promise<FaireWebhook>,
  deleteWebhook(id: string): Promise<void>,
};
```

### Error Handling & Retry

- All write operations are logged to `faire_api_log`
- Failed requests (5xx) are retried up to 3 times with exponential backoff (1s, 4s, 16s)
- Failed requests (4xx) are logged but not retried (likely validation errors)
- Rate limiting: Respect Faire API rate limits (check `X-RateLimit-*` headers); queue requests if limit approached
- Optimistic UI: Show success state immediately, roll back if API call fails

### Webhook Security

- Verify webhook signature using the secret provided during registration
- Reject requests without valid signature
- Idempotency: Use `event_id` from payload to prevent duplicate processing
- Process webhooks asynchronously (queue for background processing)

### UI Components

1. **PublishToFaireButton** — Button on Publishing Queue items; shows progress, handles errors
2. **SyncToFaireButton** — Button on product detail; syncs current state to Faire
3. **ArchiveOnFaireDialog** — Confirmation dialog for product archival
4. **VariantPriceEditor** — Inline edit for variant prices with "Sync" action
5. **ItemBackorderDialog** — Dialog for backorder with quantity and date inputs
6. **ItemFulfillDialog** — Dialog for item fulfillment with quantity, carrier, tracking number
7. **BrandProfileEditor** — Form on settings page with "Save & Sync" button
8. **WebhookManager** — Admin panel showing registered webhooks, event log, status
9. **APILogViewer** — Admin page showing recent API calls with status, expandable request/response
10. **SyncStatusIndicator** — Small icon on product cards/rows showing Faire sync status (synced, pending, error)

### Integration Points

- **Publishing Queue:** "Publish to Faire" action calls `POST /api/faire/products` and updates queue item status
- **Product Detail:** "Sync to Faire" updates product; inline variant edits sync prices
- **Order Detail:** Item-level backorder and fulfill actions
- **Settings:** Brand profile sync
- **Notifications:** Webhook events trigger portal notifications (new order alert, etc.)
- **Banking (PRD-03):** `PAYOUT_COMPLETED` webhook can trigger payout record creation for reconciliation

## Page Structure

### Routes

No new pages — all write actions integrate into existing pages:

| Existing Page | New Actions |
|---------------|------------|
| `/catalog/publishing-queue` | "Publish to Faire" button per item |
| `/catalog/products/[id]` | "Sync to Faire" button, "Archive on Faire" menu item, variant price sync |
| `/operations/orders/[id]` | Per-item "Backorder" and "Fulfill" buttons |
| `/settings` | Brand profile "Save & Sync to Faire" |
| `/settings/integrations` | Webhook manager, API log (new sub-section) |

### Navigation Changes

No new navigation items. Add a sub-section under Settings > Integrations for webhook and API log management.

```
Settings
  ├── General
  ├── Team
  ├── Integrations
  │   ├── Faire API         ← existing
  │   ├── Webhooks          ← NEW sub-section
  │   └── API Log           ← NEW sub-section
  └── ...
```

### UI Mockup Description

**Publishing Queue — Publish Action:**
- Each queue item gets a "Publish to Faire" button (replaces or accompanies existing actions)
- Click: Shows confirmation with product preview (name, variants, images, prices)
- On confirm: Button shows spinner → success checkmark or error with retry
- Published items show "Live on Faire" badge with link to Faire listing

**Product Detail — Sync Action:**
- Top action bar: "Sync to Faire" button (blue, with sync icon)
- Dropdown menu: "Archive on Faire" (red text, with confirmation)
- Variant table: Inline price edit → "Update on Faire" button appears next to changed row
- Sync status badge: "In Sync", "Pending Changes", "Sync Error" with last synced timestamp

**Order Detail — Item Actions:**
- Each line item row gets action buttons:
  - "Fulfill" button → opens dialog: Quantity (default: remaining), Carrier dropdown, Tracking number input
  - "Backorder" button → opens dialog: Quantity, Estimated available date picker
- Order status updates in real-time as items are fulfilled/backordered

**Webhook Manager (Settings > Integrations > Webhooks):**
- Registered webhooks table: URL, Events (tag list), Status (active/inactive), Last received
- "Register Webhooks" button (registers all standard events)
- Event log: Table of recent webhook events with type, timestamp, processed status, expand for payload

## Implementation Plan

### Phase 1: Product Write APIs
- `POST /api/faire/products` — Create product
- `PUT /api/faire/products/[id]` — Update product
- `DELETE /api/faire/products/[id]` — Archive product
- API log table and logging middleware
- "Publish to Faire" button on Publishing Queue
- "Sync to Faire" and "Archive" on product detail

### Phase 2: Order & Variant APIs
- `PATCH /api/faire/products/[pid]/variants/[vid]` — Update variant
- `POST /api/faire/orders/[oid]/items/[iid]/backorder` — Backorder
- `POST /api/faire/orders/[oid]/items/[iid]/fulfill` — Item fulfill
- Variant price inline edit + sync
- Order detail item-level action dialogs

### Phase 3: Brand & Webhooks
- `PUT /api/faire/brand` — Update brand profile
- Brand profile editor in settings
- Webhook registration endpoint
- Webhook receiver with signature validation
- Event processing pipeline
- Webhook manager UI

### Phase 4: Polish & Reliability
- Retry logic with exponential backoff
- Rate limit handling
- Sync status indicators on product cards
- API log viewer in admin
- Error notification system
- Bulk sync (update all products in batch)

## Dependencies

- **External APIs:** Faire API v2 — requires existing API token (already configured)
- **Existing features:** Publishing Queue, Product detail page, Order detail page, Settings page, Faire API client
- **Data requirements:** Faire API token with write permissions (may need to re-authorize if current token is read-only)
- **Libraries:** Existing HTTP client; `crypto` for webhook signature verification
- **Permissions:** Verify Faire API token has write scopes; may need to regenerate in Faire dashboard

## Estimated Effort

| Area | Hours |
|------|-------|
| DB & Migration | 3 |
| Faire API Client Extensions | 10 |
| Product Write Endpoints (create/update/delete) | 12 |
| Variant Update Endpoint | 4 |
| Order Item Endpoints (backorder/fulfill) | 6 |
| Brand Profile Endpoint | 4 |
| Webhook System (register/receive/process) | 14 |
| API Log & Retry System | 8 |
| UI — Publishing Queue Integration | 6 |
| UI — Product Detail Sync Actions | 6 |
| UI — Order Detail Item Actions | 6 |
| UI — Brand Profile Editor | 4 |
| UI — Webhook Manager & API Log | 6 |
| Testing (unit + integration + E2E) | 14 |
| **Total** | **103 hours** |

## Priority & Timeline

- **Priority:** High
- **Target start:** Sprint 1 (alongside Calendar)
- **Phase 1 delivery:** 2 weeks
- **Phase 2 delivery:** 2 weeks
- **Phase 3 delivery:** 2 weeks
- **Full delivery:** 7 weeks
- **Owner:** Backend team (API integration), Frontend team (UI triggers)
- **Blocker:** Confirm Faire API token has write permissions before starting. If not, re-authorize with Faire.
