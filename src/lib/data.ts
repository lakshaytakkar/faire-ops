export type OrderStatus = "pending" | "accepted" | "shipped" | "fulfilled"

export type BrandId = "b1" | "b2" | "b3" | "b4" | "b5" | "b6"

export interface Brand {
  id: BrandId
  name: string
  short: string
  category: string
  color: string
  gmv: number
  orders: number
  listings: number
  lateShip: number
  fd: number
  reviews: number
  health: "critical" | "monitor" | "good"
}

export interface OrderLineItem {
  name: string
  qty: number
  unitPrice: number
  sku: string
}

export interface Address {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
}

export interface Order {
  id: string
  retailer: string
  email: string
  brand: BrandId
  city: string
  items: number
  total: number
  status: OrderStatus
  date: string
  lineItems: OrderLineItem[]
  shippingAddress: Address
  billingAddress: Address
  paymentMethod: "Faire Net 60" | "Credit Card" | "Wire Transfer"
  paymentStatus: "paid" | "pending" | "net60"
  subtotal: number
  shippingCost: number
  commission: number
  netPayout: number
  orderType: "Wholesale" | "Reorder" | "First Order"
  retailerPhone: string
  trackingNumber?: string
  carrier?: string
  fulfiller?: string
  notes?: string
  placedAt: string
  acceptedAt?: string
  shippedAt?: string
  fulfilledAt?: string
}

export const BRANDS: Brand[] = [
  { id: "b1", name: "Buddha Ayurveda",  short: "BA", category: "Home Decor",       color: "#EF4444", gmv: 4820,  orders: 23, listings: 428, lateShip: 51.6, fd: 0,    reviews: 8,  health: "critical" },
  { id: "b2", name: "Lunar Gifts Co.",  short: "LG", category: "Gifts & Novelty",  color: "#3B82F6", gmv: 6240,  orders: 41, listings: 312, lateShip: 8.2,  fd: 0.18, reviews: 34, health: "good"     },
  { id: "b3", name: "Toy Nest",         short: "TN", category: "Toys & Games",     color: "#10B981", gmv: 8910,  orders: 67, listings: 276, lateShip: 12.1, fd: 0.22, reviews: 52, health: "monitor"  },
  { id: "b4", name: "Bloom Decor",      short: "BD", category: "Home & Garden",    color: "#F59E0B", gmv: 3120,  orders: 28, listings: 198, lateShip: 6.8,  fd: 0.08, reviews: 19, health: "good"     },
  { id: "b5", name: "Spark Novelty",    short: "SN", category: "Party & Events",   color: "#8B5CF6", gmv: 7650,  orders: 54, listings: 445, lateShip: 9.4,  fd: 0.31, reviews: 41, health: "good"     },
  { id: "b6", name: "Cozy Bedding Co.", short: "CB", category: "Bedding & Bath",   color: "#EC4899", gmv: 5430,  orders: 36, listings: 164, lateShip: 11.3, fd: 0.14, reviews: 28, health: "monitor"  },
]

export const ORDERS: Order[] = [
  {
    id: "VXTKE5DRYW",
    retailer: "Twilight House of Salem",
    email: "buyer@twilighthouse.com",
    brand: "b1",
    city: "Salem, MA",
    items: 4,
    total: 163.50,
    status: "pending",
    date: "Apr 1",
    placedAt: "Apr 1, 2026",
    lineItems: [
      { name: "3D LED Butterfly Wall Lights × Assorted", qty: 2, unitPrice: 8.99, sku: "SKU-BA-001" },
      { name: "Crystal Deer Ornament 15cm", qty: 2, unitPrice: 1.49, sku: "SKU-BA-002" },
    ],
    shippingAddress: { name: "Twilight House of Salem", line1: "42 Essex Street", city: "Salem", state: "MA", zip: "01970", country: "US" },
    billingAddress: { name: "Twilight House of Salem", line1: "42 Essex Street", city: "Salem", state: "MA", zip: "01970", country: "US" },
    paymentMethod: "Faire Net 60",
    paymentStatus: "pending",
    subtotal: 20.96,
    shippingCost: 15.00,
    commission: 3.14,
    netPayout: 17.82,
    orderType: "First Order",
    retailerPhone: "(978) 555-0142",
  },
  {
    id: "2JU3QUA2XW",
    retailer: "The Olive Branch Boutique",
    email: "orders@olivebranchboutique.com",
    brand: "b1",
    city: "Portland, OR",
    items: 6,
    total: 248.00,
    status: "pending",
    date: "Apr 1",
    placedAt: "Apr 1, 2026",
    lineItems: [
      { name: "Mini Wool Penguin Plush with Card", qty: 4, unitPrice: 8.99, sku: "SKU-BA-003" },
      { name: "Flameless LED Candles Gothic Set", qty: 2, unitPrice: 1.99, sku: "SKU-BA-004" },
    ],
    shippingAddress: { name: "The Olive Branch Boutique", line1: "1820 NW Lovejoy St", line2: "Suite 200", city: "Portland", state: "OR", zip: "97209", country: "US" },
    billingAddress: { name: "The Olive Branch Boutique", line1: "1820 NW Lovejoy St", line2: "Suite 200", city: "Portland", state: "OR", zip: "97209", country: "US" },
    paymentMethod: "Credit Card",
    paymentStatus: "pending",
    subtotal: 39.94,
    shippingCost: 18.50,
    commission: 5.99,
    netPayout: 33.95,
    orderType: "First Order",
    retailerPhone: "(503) 555-0287",
  },
  {
    id: "AX3BK9PLMW",
    retailer: "Enchanted Shire",
    email: "buying@enchantedshire.com",
    brand: "b2",
    city: "Austin, TX",
    items: 10,
    total: 412.50,
    status: "accepted",
    date: "Mar 29",
    placedAt: "Mar 29, 2026",
    acceptedAt: "Mar 29, 2026",
    lineItems: [
      { name: "Constellation Star Map Print 12×16", qty: 6, unitPrice: 7.99, sku: "SKU-LG-001" },
      { name: "Lunar Phase Wall Calendar", qty: 4, unitPrice: 12.99, sku: "SKU-LG-002" },
    ],
    shippingAddress: { name: "Enchanted Shire", line1: "3401 South Congress Ave", city: "Austin", state: "TX", zip: "78704", country: "US" },
    billingAddress: { name: "Enchanted Shire", line1: "3401 South Congress Ave", city: "Austin", state: "TX", zip: "78704", country: "US" },
    paymentMethod: "Wire Transfer",
    paymentStatus: "net60",
    subtotal: 99.90,
    shippingCost: 20.00,
    commission: 14.99,
    netPayout: 84.92,
    orderType: "First Order",
    retailerPhone: "(512) 555-0391",
  },
  {
    id: "QR7MP2DVXN",
    retailer: "Advocate Condell Gift",
    email: "gifts@advocatecondell.org",
    brand: "b3",
    city: "Chicago, IL",
    items: 15,
    total: 683.67,
    status: "accepted",
    date: "Mar 28",
    placedAt: "Mar 28, 2026",
    acceptedAt: "Mar 28, 2026",
    lineItems: [
      { name: "Glow-in-Dark Dinosaur Toy Set 12pc", qty: 9, unitPrice: 12.99, sku: "SKU-TN-001" },
      { name: "Magnetic Puzzle Tiles 100pc", qty: 6, unitPrice: 18.50, sku: "SKU-TN-002" },
    ],
    shippingAddress: { name: "Advocate Condell Gift Shop", line1: "801 S Milwaukee Ave", city: "Chicago", state: "IL", zip: "60601", country: "US" },
    billingAddress: { name: "Advocate Condell Gift Shop", line1: "900 N Michigan Ave", line2: "Floor 3", city: "Chicago", state: "IL", zip: "60611", country: "US" },
    paymentMethod: "Faire Net 60",
    paymentStatus: "net60",
    subtotal: 227.91,
    shippingCost: 25.00,
    commission: 34.19,
    netPayout: 193.72,
    orderType: "First Order",
    retailerPhone: "(312) 555-0478",
  },
  {
    id: "TY9XK3WBLP",
    retailer: "Great Turtle Toys",
    email: "orders@greatturtletoys.com",
    brand: "b3",
    city: "Denver, CO",
    items: 8,
    total: 332.03,
    status: "shipped",
    date: "Mar 27",
    placedAt: "Mar 27, 2026",
    acceptedAt: "Mar 27, 2026",
    shippedAt: "Mar 28, 2026",
    trackingNumber: "1ZA234F70342521948",
    carrier: "UPS",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Magnetic Wooden Building Blocks", qty: 8, unitPrice: 9.40, sku: "SKU-TN-003" },
    ],
    shippingAddress: { name: "Great Turtle Toys", line1: "1560 Larimer St", city: "Denver", state: "CO", zip: "80202", country: "US" },
    billingAddress: { name: "Great Turtle Toys", line1: "1560 Larimer St", city: "Denver", state: "CO", zip: "80202", country: "US" },
    paymentMethod: "Credit Card",
    paymentStatus: "paid",
    subtotal: 75.20,
    shippingCost: 14.50,
    commission: 11.28,
    netPayout: 63.92,
    orderType: "Wholesale",
    retailerPhone: "(720) 555-0563",
  },
  {
    id: "MN4VP8RQZX",
    retailer: "Wildflowers Boutique",
    email: "info@wildflowersboutique.com",
    brand: "b4",
    city: "Seattle, WA",
    items: 5,
    total: 197.21,
    status: "shipped",
    date: "Mar 26",
    placedAt: "Mar 26, 2026",
    acceptedAt: "Mar 26, 2026",
    shippedAt: "Mar 27, 2026",
    trackingNumber: "9400111899223456789012",
    carrier: "USPS",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Macrame Wall Art Boho 24in", qty: 5, unitPrice: 15.99, sku: "SKU-BD-001" },
    ],
    shippingAddress: { name: "Wildflowers Boutique", line1: "215 Pike St", city: "Seattle", state: "WA", zip: "98101", country: "US" },
    billingAddress: { name: "Wildflowers Boutique", line1: "215 Pike St", city: "Seattle", state: "WA", zip: "98101", country: "US" },
    paymentMethod: "Faire Net 60",
    paymentStatus: "net60",
    subtotal: 79.95,
    shippingCost: 12.50,
    commission: 12.00,
    netPayout: 67.95,
    orderType: "Wholesale",
    retailerPhone: "(206) 555-0614",
  },
  {
    id: "KL2GH5TYJB",
    retailer: "Furniture Cottage",
    email: "buyer@furniturecottage.com",
    brand: "b5",
    city: "Nashville, TN",
    items: 12,
    total: 555.73,
    status: "fulfilled",
    date: "Mar 25",
    placedAt: "Mar 25, 2026",
    acceptedAt: "Mar 25, 2026",
    shippedAt: "Mar 26, 2026",
    fulfilledAt: "Mar 28, 2026",
    trackingNumber: "1FE234567890",
    carrier: "FedEx",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Balloon Garland Kit 100pc Rose Gold", qty: 12, unitPrice: 22.99, sku: "SKU-SN-001" },
    ],
    shippingAddress: { name: "Furniture Cottage", line1: "400 Broadway", city: "Nashville", state: "TN", zip: "37203", country: "US" },
    billingAddress: { name: "Furniture Cottage", line1: "400 Broadway", city: "Nashville", state: "TN", zip: "37203", country: "US" },
    paymentMethod: "Wire Transfer",
    paymentStatus: "paid",
    subtotal: 275.88,
    shippingCost: 22.00,
    commission: 41.38,
    netPayout: 234.50,
    orderType: "Wholesale",
    retailerPhone: "(615) 555-0729",
  },
  {
    id: "WX6QM1RSNV",
    retailer: "Urban Bloom Store",
    email: "shop@urbanbloom.com",
    brand: "b5",
    city: "Brooklyn, NY",
    items: 7,
    total: 278.27,
    status: "fulfilled",
    date: "Mar 24",
    placedAt: "Mar 24, 2026",
    acceptedAt: "Mar 24, 2026",
    shippedAt: "Mar 25, 2026",
    fulfilledAt: "Mar 27, 2026",
    trackingNumber: "1ZB456G70349876543",
    carrier: "UPS",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Balloon Arch Kit 40pc Assorted", qty: 7, unitPrice: 22.99, sku: "SKU-SN-002" },
    ],
    shippingAddress: { name: "Urban Bloom Store", line1: "78 Atlantic Ave", city: "Brooklyn", state: "NY", zip: "11201", country: "US" },
    billingAddress: { name: "Urban Bloom Store", line1: "78 Atlantic Ave", city: "Brooklyn", state: "NY", zip: "11201", country: "US" },
    paymentMethod: "Credit Card",
    paymentStatus: "paid",
    subtotal: 160.93,
    shippingCost: 18.00,
    commission: 24.14,
    netPayout: 136.79,
    orderType: "Wholesale",
    retailerPhone: "(718) 555-0835",
  },
  {
    id: "PD8NR3KZAW",
    retailer: "Coast & Craft Co.",
    email: "buy@coastcraft.com",
    brand: "b6",
    city: "San Diego, CA",
    items: 9,
    total: 358.50,
    status: "fulfilled",
    date: "Mar 23",
    placedAt: "Mar 23, 2026",
    acceptedAt: "Mar 23, 2026",
    shippedAt: "Mar 24, 2026",
    fulfilledAt: "Mar 26, 2026",
    trackingNumber: "9400111899223344556677",
    carrier: "USPS",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Bamboo Aromatherapy Diffuser with 5 Oils", qty: 9, unitPrice: 24.99, sku: "SKU-CB-001" },
    ],
    shippingAddress: { name: "Coast & Craft Co.", line1: "550 Fifth Ave", line2: "Unit 12", city: "San Diego", state: "CA", zip: "92101", country: "US" },
    billingAddress: { name: "Coast & Craft Co.", line1: "550 Fifth Ave", line2: "Unit 12", city: "San Diego", state: "CA", zip: "92101", country: "US" },
    paymentMethod: "Faire Net 60",
    paymentStatus: "paid",
    subtotal: 224.91,
    shippingCost: 20.00,
    commission: 33.74,
    netPayout: 191.17,
    orderType: "Reorder",
    retailerPhone: "(619) 555-0948",
  },
  {
    id: "YH5GX7VPTB",
    retailer: "Hearth & Home Shop",
    email: "orders@hearthandhome.com",
    brand: "b2",
    city: "Phoenix, AZ",
    items: 3,
    total: 145.45,
    status: "fulfilled",
    date: "Mar 22",
    placedAt: "Mar 22, 2026",
    acceptedAt: "Mar 22, 2026",
    shippedAt: "Mar 23, 2026",
    fulfilledAt: "Mar 25, 2026",
    trackingNumber: "1ZC789H70347654321",
    carrier: "UPS",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Felt Ball Wreath Colorful Boho 14in", qty: 3, unitPrice: 11.50, sku: "SKU-LG-003" },
    ],
    shippingAddress: { name: "Hearth & Home Shop", line1: "2140 E Camelback Rd", city: "Phoenix", state: "AZ", zip: "85016", country: "US" },
    billingAddress: { name: "Hearth & Home Shop", line1: "2140 E Camelback Rd", city: "Phoenix", state: "AZ", zip: "85016", country: "US" },
    paymentMethod: "Wire Transfer",
    paymentStatus: "paid",
    subtotal: 34.50,
    shippingCost: 12.50,
    commission: 5.18,
    netPayout: 29.33,
    orderType: "Reorder",
    retailerPhone: "(480) 555-1057",
  },
  {
    id: "BM3PK9XTYZ",
    retailer: "Paper & Thread",
    email: "hello@paperandthread.com",
    brand: "b4",
    city: "Minneapolis, MN",
    items: 7,
    total: 289.00,
    status: "fulfilled",
    date: "Mar 21",
    placedAt: "Mar 21, 2026",
    acceptedAt: "Mar 21, 2026",
    shippedAt: "Mar 22, 2026",
    fulfilledAt: "Mar 24, 2026",
    trackingNumber: "9400111899221122334455",
    carrier: "USPS",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Macrame Wall Art Boho 24in", qty: 7, unitPrice: 15.99, sku: "SKU-BD-002" },
    ],
    shippingAddress: { name: "Paper & Thread", line1: "3000 Hennepin Ave", city: "Minneapolis", state: "MN", zip: "55408", country: "US" },
    billingAddress: { name: "Paper & Thread", line1: "3000 Hennepin Ave", city: "Minneapolis", state: "MN", zip: "55408", country: "US" },
    paymentMethod: "Faire Net 60",
    paymentStatus: "paid",
    subtotal: 111.93,
    shippingCost: 16.00,
    commission: 16.79,
    netPayout: 95.14,
    orderType: "Reorder",
    retailerPhone: "(612) 555-1163",
  },
  {
    id: "CX7VN2QRSW",
    retailer: "The Green Market",
    email: "buy@thegreenmarket.com",
    brand: "b6",
    city: "Burlington, VT",
    items: 4,
    total: 174.77,
    status: "fulfilled",
    date: "Mar 20",
    placedAt: "Mar 20, 2026",
    acceptedAt: "Mar 20, 2026",
    shippedAt: "Mar 21, 2026",
    fulfilledAt: "Mar 23, 2026",
    trackingNumber: "1ZD012J70345432109",
    carrier: "UPS",
    fulfiller: "HQ Dropshipping (Charlie)",
    lineItems: [
      { name: "Cotton Rope Basket 3-Piece Set", qty: 4, unitPrice: 12.00, sku: "SKU-CB-002" },
    ],
    shippingAddress: { name: "The Green Market", line1: "132 Church St", city: "Burlington", state: "VT", zip: "05401", country: "US" },
    billingAddress: { name: "The Green Market", line1: "132 Church St", city: "Burlington", state: "VT", zip: "05401", country: "US" },
    paymentMethod: "Credit Card",
    paymentStatus: "paid",
    subtotal: 48.00,
    shippingCost: 13.50,
    commission: 7.20,
    netPayout: 40.80,
    orderType: "Reorder",
    retailerPhone: "(802) 555-1274",
  },
]

export function getBrand(id: BrandId): Brand {
  return BRANDS.find((b) => b.id === id)!
}

export function getOrdersByStatus(status: OrderStatus | "all"): Order[] {
  if (status === "all") return ORDERS
  return ORDERS.filter((o) => o.status === status)
}
