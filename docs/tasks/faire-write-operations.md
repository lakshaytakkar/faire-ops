# Faire API Write Operations Reference

Complete reference of all Faire API write operations — what's implemented, what's planned, and what's future.

---

## Implemented (v1)

| Operation | Method | Faire Endpoint | Our API Route | Status |
|-----------|--------|----------------|---------------|--------|
| Accept Order | POST | `/orders/{id}/processing` | `/api/faire/orders/[orderId]/accept` | Done |
| Ship Order | POST | `/orders/{id}/shipments` | `/api/faire/orders/[orderId]/ship` | Done |
| Cancel Order | POST | `/orders/{id}/cancel` | `/api/faire/orders/[orderId]/cancel` | Done |

---

## Planned (v2)

| Operation | Method | Faire Endpoint | Priority |
|-----------|--------|----------------|----------|
| Update Variant Inventory | PATCH | `/products/{id}/variants/{variantId}` | High |
| Create Product | POST | `/products` | Medium |
| Update Product | PUT | `/products/{id}` | Medium |
| Delete/Archive Product | DELETE | `/products/{id}` | Low |
| Backorder Item | POST | `/orders/{id}/items/{itemId}/backorder` | Medium |

---

## Future (v3+)

- Webhook listener for real-time order/product updates
- Bulk inventory sync (push all stock levels to Faire nightly)
- Auto-accept orders based on rules (inventory check -> auto-accept)
- Image upload to Faire product listings
- Shipment label generation
- Returns/replacement request handling

---

## Request/Response Formats

Exact JSON body and expected response for each write operation.

### Accept Order

```
POST https://www.faire.com/external-api/v2/orders/{orderId}/processing
Headers:
  X-FAIRE-OAUTH-ACCESS-TOKEN: <token>
  X-FAIRE-APP-CREDENTIALS: <credentials>
Body: (none)
Response: Updated order object with state=PROCESSING
```

### Ship Order

```
POST https://www.faire.com/external-api/v2/orders/{orderId}/shipments
Headers:
  X-FAIRE-OAUTH-ACCESS-TOKEN: <token>
  X-FAIRE-APP-CREDENTIALS: <credentials>
Body:
{
  "shipment": {
    "tracking_code": "1Z234567890",
    "carrier": "UPS",
    "shipping_type": "SHIP_ON_YOUR_OWN"
  }
}
Response: Shipment object with id, tracking URL
```

### Cancel Order

```
POST https://www.faire.com/external-api/v2/orders/{orderId}/cancel
Headers:
  X-FAIRE-OAUTH-ACCESS-TOKEN: <token>
  X-FAIRE-APP-CREDENTIALS: <credentials>
Body: (none)
Response: Updated order object with state=CANCELED
```

### Update Inventory (Planned)

```
PATCH https://www.faire.com/external-api/v2/products/{productId}/variants/{variantId}
Headers:
  X-FAIRE-OAUTH-ACCESS-TOKEN: <token>
  X-FAIRE-APP-CREDENTIALS: <credentials>
Body:
{
  "available_quantity": 50
}
Response: Updated variant object
```

### Create Product (Planned)

```
POST https://www.faire.com/external-api/v2/products
Headers:
  X-FAIRE-OAUTH-ACCESS-TOKEN: <token>
  X-FAIRE-APP-CREDENTIALS: <credentials>
Body:
{
  "name": "Product Name",
  "description": "Product description",
  "wholesale_price_cents": 1500,
  "retail_price_cents": 3000,
  "minimum_order_quantity": 6,
  "variants": [
    {
      "name": "Default",
      "sku": "SKU-001",
      "available_quantity": 100
    }
  ]
}
Response: Created product object with id
```

### Backorder Item (Planned)

```
POST https://www.faire.com/external-api/v2/orders/{orderId}/items/{itemId}/backorder
Headers:
  X-FAIRE-OAUTH-ACCESS-TOKEN: <token>
  X-FAIRE-APP-CREDENTIALS: <credentials>
Body:
{
  "available_date": "2026-05-01"
}
Response: Updated order item with backorder status
```
