# Real Product Scraping Flow — PRD

## Overview

Build a product sourcing pipeline that scrapes trending wholesale products from real sources (AliExpress, Alibaba, Amazon, Etsy, Minea), presents them in a review dashboard, and feeds approved products into the existing Publishing Queue for listing on Faire. This replaces manual product research with an automated discovery engine.

**Business Value:** Finding trending products to sell on Faire currently requires hours of manual browsing across multiple marketplaces. Automated scraping surfaces high-potential products, scores them by trend signals, and connects directly to the publishing pipeline — reducing sourcing time from hours to minutes.

## User Stories

- As a **product sourcer**, I want products automatically scraped from multiple marketplaces, so that I don't have to manually browse each platform.
- As a **product sourcer**, I want each scraped product scored by trend signals, so that I can focus on the highest-potential items.
- As a **product manager**, I want to review scraped products and approve or reject them, so that only quality products enter our pipeline.
- As a **product manager**, I want to queue approved products directly to the Publishing Queue, so that the sourcing-to-listing flow is seamless.
- As a **brand owner**, I want to configure which categories and sources to scrape, so that results are relevant to my brand.
- As a **product sourcer**, I want to filter scraped products by source, category, price range, and trend score, so that I can efficiently review results.
- As a **product manager**, I want to see the original source URL for each product, so that I can verify details before approving.
- As a **brand owner**, I want scraping to run on a schedule, so that new products are discovered automatically.

## Technical Requirements

### Database Schema

```sql
CREATE TABLE scraping_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'scrape')),
  config JSONB DEFAULT '{}',
  -- config: { "categories": ["home-decor"], "keywords": ["trending"], "max_pages": 5 }
  is_enabled BOOLEAN DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scraped_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES scraping_sources(id),
  source_slug TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_product_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  price_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  seller_name TEXT,
  seller_rating REAL,
  review_count INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  trend_score REAL DEFAULT 0,
  -- trend_score: 0-100, computed from order velocity, review count, recency
  trend_signals JSONB DEFAULT '{}',
  -- trend_signals: { "order_velocity": 85, "review_sentiment": 72, "recency": 90, "price_competitiveness": 65 }
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'approved', 'queued', 'rejected', 'duplicate')),
  reviewed_by UUID REFERENCES team_members(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  queued_product_id UUID,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scraping_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES scraping_sources(id),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  products_found INTEGER DEFAULT 0,
  products_new INTEGER DEFAULT 0,
  products_duplicate INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_scraped_products_status ON scraped_products (status);
CREATE INDEX idx_scraped_products_source ON scraped_products (source_slug);
CREATE INDEX idx_scraped_products_trend ON scraped_products (trend_score DESC);
CREATE INDEX idx_scraped_products_scraped ON scraped_products (scraped_at);
CREATE UNIQUE INDEX idx_scraped_products_source_url ON scraped_products (source_url);
```

### Scraping Architecture

**Option A: Supabase Edge Functions (recommended for MVP)**
- Deploy Edge Functions per source
- Triggered via cron (pg_cron) or manual API call
- Lightweight, serverless, no infrastructure to maintain

**Option B: Next.js API Routes + Background Jobs**
- API routes trigger scraping jobs
- Use a job queue (BullMQ/pg-boss) for background processing
- Better for heavy scraping with Puppeteer/Playwright

### Source Implementations

| Source | Method | Details |
|--------|--------|---------|
| **Etsy** | API | Etsy Open API v3 — `GET /v3/application/listings/active?keywords=&sort_on=score` |
| **Amazon** | API | Product Advertising API — search by category + keywords (requires affiliate account) |
| **AliExpress** | Scrape | Scrape search results pages via Puppeteer; parse product cards for name, price, orders, image |
| **Alibaba** | Scrape | Scrape search results; extract MOQ, price range, supplier rating |
| **Minea** | API/Scrape | If API available, use it; otherwise scrape trending product feeds |
| **Google Trends** | API | Trends API for trend scoring validation |
| **RSS Feeds** | RSS | Subscribe to wholesale trend blogs, parse product mentions |

### Trend Scoring Algorithm

```
trend_score = (
  order_velocity * 0.30 +      // orders per day relative to category avg
  review_sentiment * 0.20 +     // average rating normalized to 0-100
  recency * 0.20 +              // how recently listed (newer = higher)
  price_competitiveness * 0.15 + // price vs category median
  seller_reliability * 0.15     // seller rating and order count
)
```

Each factor is normalized to 0-100 before weighting.

### Deduplication Logic

Before inserting a scraped product:
1. Check `source_url` uniqueness (exact match)
2. Fuzzy match product name against existing scraped products (Levenshtein distance < 0.2)
3. If duplicate found: update `trend_score` and `order_count` but don't create new record
4. Mark confirmed duplicates with `status = 'duplicate'`

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sourcing/products` | List scraped products with filters |
| GET | `/api/sourcing/products/[id]` | Single product detail |
| PUT | `/api/sourcing/products/[id]/status` | Update status (approve/reject/queue) |
| POST | `/api/sourcing/products/[id]/queue` | Queue to Publishing Queue |
| POST | `/api/sourcing/products/batch-action` | Bulk approve/reject/queue |
| GET | `/api/sourcing/sources` | List scraping sources |
| POST | `/api/sourcing/sources` | Add a scraping source |
| PUT | `/api/sourcing/sources/[id]` | Update source config |
| POST | `/api/sourcing/scrape` | Trigger a scraping run (all or specific source) |
| GET | `/api/sourcing/runs` | List scraping run history |
| GET | `/api/sourcing/stats` | Dashboard stats (total scraped, by status, by source) |

### UI Components

1. **SourcingDashboard** — Main page with stats, source tabs, product grid
2. **SourceTabs** — Tab bar for filtering by source (All, Etsy, AliExpress, Alibaba, Amazon, Minea)
3. **ProductCard** — Card showing image, name, price, source badge, trend score bar, status badge, action buttons
4. **ProductGrid** — Responsive grid of ProductCards with infinite scroll
5. **FilterBar** — Category dropdown, price range slider, trend score minimum, status filter, sort by
6. **TrendScoreBadge** — Circular gauge or colored bar showing 0-100 score
7. **ProductDetailSheet** — Slide-over with full details, all images, source link, trend breakdown, notes, approve/reject/queue buttons
8. **ScrapeControls** — Panel showing source configs, run buttons, last-run timestamps, run history
9. **BulkActionBar** — Appears when products are selected; batch approve/reject/queue buttons
10. **QueueConfirmDialog** — Confirms queuing to Publishing Queue, lets user set initial Faire category and pricing

### Integration Points

- **Publishing Queue:** Approved products are sent to the Publishing Queue as draft products, pre-filled with scraped data (name, description, images, price)
- **Products:** Once a queued product is published on Faire, `queued_product_id` links back to the scraped product
- **AI Tools (PRD-04):** Tag Generator and Description Generator can be run on scraped products before queuing

## Page Structure

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/catalog/sourcing` | `SourcingDashboard` | Main sourcing page (enhance existing) |

### Navigation Changes

The `/catalog/sourcing` route likely already exists. Enhance the existing page or replace it with the new dashboard. If it doesn't exist:

```
Catalog
  ├── Products
  ├── Collections
  ├── Publishing Queue
  ├── Sourcing           ← NEW or ENHANCED
  └── ...
```

Icon suggestion: `Search` or `Radar` from Lucide.

### UI Mockup Description

**Sourcing Dashboard:**
- Top bar: "Product Sourcing" title, "Run Scraper" button (dropdown to select source or all), last-run timestamp
- Stats row: 4 cards — Total Scraped, New (unreviewed), Approved, Queued (this week)
- Source tabs: All | Etsy | AliExpress | Alibaba | Amazon | Minea (with count badges)
- Filter bar: Category dropdown, Price range ($0-$100 slider), Min trend score (slider), Status (New, Reviewed, Approved, Rejected), Sort (Trend Score, Newest, Price)
- Product grid: 3-4 columns of product cards
  - Card: Product image (top), Source badge overlay (top-left, e.g., "Etsy"), Trend score badge (top-right, color-coded: green >70, yellow 40-70, red <40), Product name, Price, Order count, Status pill (bottom), Checkbox (top-left for bulk select)
- Bulk action bar (sticky bottom, appears on selection): "X selected" | Approve | Reject | Queue to Publishing | Clear
- Click card: Opens ProductDetailSheet

**Product Detail Sheet:**
- Image gallery (carousel if multiple images)
- Product name, price, source name + link to original listing
- Trend score breakdown: Bar chart showing each factor score
- Seller info: Name, rating, total orders
- Description (from source)
- Tags (from source)
- Notes textarea (for reviewer comments)
- Action buttons: Approve | Reject | Queue to Publishing
- Status history timeline

## Implementation Plan

### Phase 1: MVP
- Create database tables and migrations
- Build Etsy API scraper (most structured, good starting point)
- Build basic sourcing dashboard with product grid
- Manual "Run Scraper" button
- Review workflow (approve/reject)
- Navigation integration

### Phase 2: More Sources
- AliExpress scraper (Puppeteer-based)
- Alibaba scraper
- Amazon Product API integration
- Trend scoring algorithm
- Deduplication logic
- Filter and sort capabilities

### Phase 3: Pipeline Integration
- Queue to Publishing Queue flow
- Bulk actions (batch approve/reject/queue)
- Scheduled scraping (daily/weekly cron)
- Source configuration UI
- Scraping run history and error monitoring
- AI-powered product analysis before queuing (integrate with AI Tools Hub)

## Dependencies

- **External APIs:** Etsy Open API v3 (requires API key), Amazon Product Advertising API (requires affiliate account), Puppeteer/Playwright for scraping
- **Existing features:** Publishing Queue (for queuing approved products), Products table
- **Data requirements:** API keys configured for each source
- **Libraries:** `puppeteer` or `playwright` for web scraping, `cheerio` for HTML parsing, `fuse.js` for fuzzy dedup, `node-cron` or `pg_cron` for scheduled runs
- **Infrastructure:** Headless browser environment for scraping (Supabase Edge Functions may need a separate service for Puppeteer)

## Estimated Effort

| Area | Hours |
|------|-------|
| DB & Migration | 3 |
| Etsy API Scraper | 8 |
| AliExpress Scraper | 12 |
| Alibaba Scraper | 10 |
| Amazon API Scraper | 8 |
| Trend Scoring Engine | 6 |
| Deduplication Logic | 4 |
| API Endpoints | 8 |
| UI — Sourcing Dashboard | 12 |
| UI — Product Detail Sheet | 6 |
| UI — Scrape Controls | 4 |
| Publishing Queue Integration | 6 |
| Scheduled Scraping | 4 |
| Testing | 10 |
| **Total** | **101 hours** |

## Priority & Timeline

- **Priority:** Medium-High
- **Target start:** Sprint 4
- **Phase 1 delivery (Etsy only):** 2 weeks
- **Phase 2 delivery (all sources):** 4 weeks
- **Full delivery:** 7 weeks
- **Owner:** Backend team (scrapers), Frontend team (dashboard)
- **Risk:** Web scraping is fragile — source websites can change HTML structure. API-based sources (Etsy, Amazon) are more reliable. Plan for scraper maintenance.
