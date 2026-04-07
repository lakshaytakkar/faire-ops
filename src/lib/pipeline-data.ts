import type { BrandId } from "./data"

export type PipelineStatus = "sourced" | "pending" | "approved" | "live"

export interface PipelineProduct {
  id: string
  name: string
  source: string
  tags: string[]
  cogs: number
  wsPrice: number
  margin: number
  brand?: BrandId
  status: PipelineStatus
  notes?: string
  sourceUrl?: string
  addedDate: string
  isNew?: boolean
}

export interface ScraperProduct {
  id: string
  name: string
  source: string
  trendSignal: string
  cogs: number
  wsPrice: number
  msrp: number
  margin: number
  signal: "high" | "medium" | "low"
  category: string
  queued?: boolean
}

export const PIPELINE_PRODUCTS: PipelineProduct[] = [
  // Sourced (3)
  {
    id: "pp1",
    name: "Macrame Wall Hanging Set",
    source: "Minea",
    tags: ["Home", "Trending"],
    cogs: 4.20,
    wsPrice: 6.00,
    margin: 72,
    status: "sourced",
    sourceUrl: "minea.com/trending/macrame",
    addedDate: "Apr 1",
  },
  {
    id: "pp2",
    name: "40pc Balloon Arch Kit",
    source: "AliExpress",
    tags: ["Party"],
    cogs: 6.80,
    wsPrice: 9.71,
    margin: 68,
    status: "sourced",
    addedDate: "Apr 1",
  },
  {
    id: "pp3",
    name: "Plush Llama Keychain 6pk",
    source: "ToyNetwork",
    tags: ["Gifts", "Animals"],
    cogs: 2.10,
    wsPrice: 3.00,
    margin: 71,
    status: "sourced",
    addedDate: "Mar 31",
  },
  // Pending Approval (3)
  {
    id: "pp4",
    name: "LED Moon Lamp 16cm",
    source: "Alibaba",
    tags: ["Home", "LED"],
    cogs: 5.50,
    wsPrice: 7.86,
    margin: 74,
    brand: "b1",
    status: "pending",
    addedDate: "Mar 30",
  },
  {
    id: "pp5",
    name: "Fairy Garden Miniature Set",
    source: "WonATrading",
    tags: ["Garden", "Spring"],
    cogs: 3.80,
    wsPrice: 5.43,
    margin: 70,
    brand: "b4",
    status: "pending",
    addedDate: "Mar 30",
  },
  {
    id: "pp6",
    name: "Crystal Suncatcher 4pk",
    source: "Minea",
    tags: ["Home", "Trending"],
    cogs: 7.20,
    wsPrice: 10.29,
    margin: 69,
    brand: "b2",
    status: "pending",
    addedDate: "Mar 29",
  },
  // Approved (2)
  {
    id: "pp7",
    name: "Magnetic Wooden Building Blocks",
    source: "ToyNetwork",
    tags: ["Toys", "STEM"],
    cogs: 9.40,
    wsPrice: 13.43,
    margin: 66,
    brand: "b3",
    status: "approved",
    addedDate: "Mar 28",
  },
  {
    id: "pp8",
    name: "Aromatherapy Diffuser Set",
    source: "Alibaba",
    tags: ["Wellness", "Home"],
    cogs: 8.60,
    wsPrice: 12.29,
    margin: 71,
    brand: "b1",
    status: "approved",
    addedDate: "Mar 28",
  },
  // Live on Faire (2)
  {
    id: "pp9",
    name: "Cotton Rope Basket 3-Piece",
    source: "UtopiaBedding",
    tags: ["Home", "Storage"],
    cogs: 12.00,
    wsPrice: 17.14,
    margin: 67,
    brand: "b6",
    status: "live",
    addedDate: "Mar 25",
  },
  {
    id: "pp10",
    name: "Star Projector Night Light",
    source: "AliExpress",
    tags: ["Kids", "LED"],
    cogs: 6.50,
    wsPrice: 9.29,
    margin: 73,
    brand: "b3",
    status: "live",
    addedDate: "Mar 24",
  },
]

export const SCRAPER_PRODUCTS: ScraperProduct[] = [
  { id: "sp1", name: "Vintage Brass Candle Holder 3pc", source: "Minea", trendSignal: "Rising fast on Etsy + Pinterest", cogs: 7.20, wsPrice: 10.29, msrp: 22.63, margin: 71, signal: "high", category: "Home Decor" },
  { id: "sp2", name: "Pressed Flower Art Kit DIY", source: "AliExpress", trendSignal: "Trending on TikTok craft", cogs: 5.40, wsPrice: 7.71, msrp: 16.97, margin: 68, signal: "high", category: "Crafts" },
  { id: "sp3", name: "Resin Coaster Making Kit 6pc", source: "Alibaba", trendSignal: "Steady demand Q1-Q2", cogs: 6.80, wsPrice: 9.71, msrp: 21.37, margin: 71, signal: "medium", category: "Crafts" },
  { id: "sp4", name: "Wicker Rattan Tray Set 2pc", source: "WonATrading", trendSignal: "Spring seasonal peak", cogs: 9.50, wsPrice: 13.57, msrp: 29.86, margin: 68, signal: "medium", category: "Home Decor" },
  { id: "sp5", name: "Dried Pampas Grass Bundle 5-stem", source: "AliExpress", trendSignal: "Consistent seller", cogs: 4.10, wsPrice: 5.86, msrp: 12.89, margin: 67, signal: "low", category: "Home Decor" },
  { id: "sp6", name: "Night Sky Projector w/ Bluetooth", source: "Alibaba", trendSignal: "Viral TikTok product", cogs: 14.20, wsPrice: 20.29, msrp: 44.63, margin: 73, signal: "high", category: "Toys & Games" },
  { id: "sp7", name: "Wooden Stacking Toy Rainbow Arch", source: "ToyNetwork", trendSignal: "Montessori trend growth", cogs: 8.40, wsPrice: 12.00, msrp: 26.40, margin: 67, signal: "medium", category: "Toys & Games" },
  { id: "sp8", name: "Air Dry Clay Kit 24-color", source: "AliExpress", trendSignal: "Kids craft staple", cogs: 5.90, wsPrice: 8.43, msrp: 18.54, margin: 70, signal: "medium", category: "Toys & Games" },
  { id: "sp9", name: "Boho Tassel Garland Set 3m", source: "Minea", trendSignal: "Party decor trending", cogs: 3.10, wsPrice: 4.43, msrp: 9.74, margin: 70, signal: "low", category: "Party & Events" },
  { id: "sp10", name: "Mini Succulent Planter Set 4pk", source: "WonATrading", trendSignal: "Year-round demand", cogs: 5.80, wsPrice: 8.29, msrp: 18.23, margin: 69, signal: "medium", category: "Home & Garden" },
]

export const SCRAPER_SOURCES = ["Minea", "AliExpress", "ToyNetwork", "WonATrading", "Alibaba", "Faire New Arrivals"]
export const SCRAPER_CATEGORIES = ["All Categories", "Home Decor", "Crafts", "Toys & Games", "Party & Events", "Home & Garden"]

export const COLUMNS: { key: PipelineStatus; label: string; dotColor: string }[] = [
  { key: "sourced", label: "Sourced", dotColor: "#94A3B8" },
  { key: "pending", label: "Pending Approval", dotColor: "#F59E0B" },
  { key: "approved", label: "Approved", dotColor: "#10B981" },
  { key: "live", label: "Live on Faire", dotColor: "#3B82F6" },
]
