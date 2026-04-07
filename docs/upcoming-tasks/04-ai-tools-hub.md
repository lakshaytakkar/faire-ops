# AI Tools Hub — PRD

## Overview

A centralized hub for all AI-powered tools in the portal. Several AI tools already exist embedded within product detail and Image Studio pages — this feature makes them accessible as standalone tools with batch mode support, and introduces new AI capabilities for pricing, outreach, tagging, market research, and listing auditing.

**Business Value:** AI tools currently hidden within specific page contexts are underutilized. A central hub increases discoverability, enables batch workflows (optimize 50 product titles at once instead of one by one), and introduces new AI capabilities that directly improve sales performance.

## User Stories

- As a **brand owner**, I want a single page listing all available AI tools, so that I can discover and use them easily.
- As a **product manager**, I want to batch-optimize multiple product titles at once, so that I can improve my entire catalog efficiently.
- As a **product manager**, I want AI-generated product descriptions in bulk, so that I can fill in missing descriptions across my catalog.
- As a **brand owner**, I want AI pricing recommendations based on margin analysis, so that I can price products competitively.
- As a **sales manager**, I want AI-drafted retailer outreach emails, so that I can personalize outreach at scale.
- As a **product manager**, I want AI-suggested product tags, so that I can improve product discoverability.
- As a **brand owner**, I want AI-powered market research on trends, so that I can make data-driven product decisions.
- As a **product manager**, I want an AI audit of my product listings, so that I can identify and fix quality issues.
- As a **designer**, I want quick access to Image Studio tools (thumbnails, logos, banners) from the hub, so that I can find them without navigating deep menus.

## Tool Inventory

### Existing Tools (to surface in hub)

| # | Tool | Current Location | Hub Mode |
|---|------|-----------------|----------|
| 1 | Product Title Optimizer | Product detail page | Standalone + Batch (select multiple products) |
| 2 | Description Generator | Product detail page | Standalone + Batch (select multiple products) |
| 3 | Collection Thumbnail Creator | Image Studio | Link to Image Studio with pre-selected tool |
| 4 | Logo Generator | Image Studio | Link to Image Studio with pre-selected tool |
| 5 | Banner Creator | Image Studio | Link to Image Studio with pre-selected tool |

### New Tools (to build)

| # | Tool | Description |
|---|------|-------------|
| 6 | Pricing Recommender | Analyze product cost, current price, category benchmarks, and margins; suggest optimal wholesale and retail pricing |
| 7 | Retailer Email Composer | Draft personalized outreach emails to retailers based on their store profile, location, and product interests |
| 8 | Product Tag Generator | Analyze product name, description, and category to suggest relevant tags for Faire search optimization |
| 9 | Market Research Assistant | Analyze trends, competitor products, and market gaps; generate reports on category opportunities |
| 10 | Listing Audit | Score product listing quality (title, description, images, pricing, tags) and provide actionable improvement suggestions |

## Technical Requirements

### Database Schema

```sql
CREATE TABLE ai_tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug TEXT NOT NULL,
  user_id UUID REFERENCES team_members(id),
  input_data JSONB NOT NULL,
  output_data JSONB,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_tool_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('content', 'images', 'pricing', 'outreach', 'research')),
  is_enabled BOOLEAN DEFAULT TRUE,
  system_prompt TEXT,
  config JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_tool_usage_tool ON ai_tool_usage (tool_slug);
CREATE INDEX idx_ai_tool_usage_user ON ai_tool_usage (user_id);
CREATE INDEX idx_ai_tool_usage_date ON ai_tool_usage (created_at);
```

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ai-tools` | List all available tools with metadata |
| GET | `/api/ai-tools/[slug]` | Get tool config and recent usage |
| POST | `/api/ai-tools/[slug]/run` | Execute a tool (single item) |
| POST | `/api/ai-tools/[slug]/batch` | Execute a tool in batch mode |
| GET | `/api/ai-tools/[slug]/history` | Get usage history for a tool |
| GET | `/api/ai-tools/usage-stats` | Aggregate usage stats (tokens, runs, by tool) |

### Tool-Specific API Contracts

**6. Pricing Recommender**
```json
// POST /api/ai-tools/pricing-recommender/run
{
  "input": {
    "product_id": "uuid",
    "cost_cents": 500,
    "current_price_cents": 1200,
    "category": "home-decor",
    "competitor_prices_cents": [1100, 1400, 1000]
  }
}
// Response
{
  "suggested_wholesale_cents": 1150,
  "suggested_retail_cents": 2300,
  "margin_percentage": 56.5,
  "reasoning": "Based on category benchmarks and competitor pricing...",
  "confidence": 0.85
}
```

**7. Retailer Email Composer**
```json
// POST /api/ai-tools/retailer-email/run
{
  "input": {
    "retailer_name": "Green Leaf Boutique",
    "retailer_location": "Portland, OR",
    "retailer_categories": ["home-decor", "candles"],
    "tone": "friendly",
    "purpose": "introduction",
    "products_to_highlight": ["uuid1", "uuid2"]
  }
}
// Response
{
  "subject": "Handcrafted candles your Portland customers will love",
  "body": "Hi [Name],\n\nI came across Green Leaf Boutique and...",
  "variations": [{ "subject": "...", "body": "..." }]
}
```

**8. Product Tag Generator**
```json
// POST /api/ai-tools/tag-generator/run
{
  "input": {
    "product_id": "uuid",
    "product_name": "Lavender Soy Candle 8oz",
    "description": "Hand-poured soy candle with natural lavender...",
    "category": "candles"
  }
}
// Response
{
  "suggested_tags": ["soy-candle", "lavender", "hand-poured", "natural", "aromatherapy", "gift", "home-fragrance"],
  "existing_tags": ["candle"],
  "new_tags": ["soy-candle", "lavender", "hand-poured", "natural", "aromatherapy", "gift", "home-fragrance"]
}
```

**9. Market Research Assistant**
```json
// POST /api/ai-tools/market-research/run
{
  "input": {
    "query": "trending home decor products Q2 2026",
    "category": "home-decor",
    "focus": "trends"
  }
}
// Response
{
  "summary": "Key trends in home decor for Q2 2026 include...",
  "trends": [{ "name": "Japandi minimalism", "description": "...", "opportunity_score": 8 }],
  "recommendations": ["Consider adding..."],
  "sources": ["industry reports", "marketplace data"]
}
```

**10. Listing Audit**
```json
// POST /api/ai-tools/listing-audit/run
{
  "input": {
    "product_id": "uuid"
  }
}
// Response
{
  "overall_score": 72,
  "categories": {
    "title": { "score": 85, "feedback": "Good length but missing key descriptor...", "suggestions": ["Add material type"] },
    "description": { "score": 60, "feedback": "Too short, missing key selling points...", "suggestions": ["Add dimensions", "Mention materials"] },
    "images": { "score": 90, "feedback": "Good variety, consider adding lifestyle shot" },
    "pricing": { "score": 55, "feedback": "Below category average, review margins" },
    "tags": { "score": 70, "feedback": "Missing 3 high-value tags", "suggestions": ["handmade", "gift", "eco-friendly"] }
  }
}
```

### UI Components

1. **AIToolsHubPage** — Grid of tool cards, organized by category
2. **ToolCard** — Card with icon, name, description, category badge, "Open" button
3. **ToolPage** — Individual tool page with input form, output display, history sidebar
4. **BatchModeToggle** — Switch between single and batch mode on applicable tools
5. **ProductSelector** — Multi-select product picker for batch operations
6. **OutputDisplay** — Formatted AI output with copy, apply, and save actions
7. **UsageStats** — Small dashboard showing total runs, tokens used, by tool
8. **HistorySidebar** — Previous runs for the current tool with re-run capability

### Integration Points

- **Products:** Title Optimizer, Description Generator, Tag Generator, Pricing Recommender, and Listing Audit all operate on product data
- **Image Studio:** Thumbnail, Logo, and Banner tools link to the existing Image Studio page
- **OpenAI/Anthropic API:** All AI tools use the existing AI API configuration (model, API key)
- **Publishing Queue:** Optimized titles/descriptions can be applied directly and queued for Faire update

## Page Structure

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/workspace/ai-tools` | `AIToolsHubPage` | Hub with grid of all tool cards |
| `/workspace/ai-tools/title-optimizer` | `ToolPage` | Product Title Optimizer |
| `/workspace/ai-tools/description-generator` | `ToolPage` | Description Generator |
| `/workspace/ai-tools/pricing-recommender` | `ToolPage` | Pricing Recommender |
| `/workspace/ai-tools/retailer-email` | `ToolPage` | Retailer Email Composer |
| `/workspace/ai-tools/tag-generator` | `ToolPage` | Product Tag Generator |
| `/workspace/ai-tools/market-research` | `ToolPage` | Market Research Assistant |
| `/workspace/ai-tools/listing-audit` | `ToolPage` | Listing Audit |

Image Studio tools (thumbnails, logo, banner) link to `/workspace/image-studio` with query params to pre-select the tool.

### Navigation Changes

Add under the **Workspace** section in the sidebar:

```
Workspace
  ├── Dashboard
  ├── Tasks
  ├── Calendar
  ├── AI Tools           ← NEW
  └── Image Studio
```

Icon suggestion: `Sparkles` from Lucide.

### UI Mockup Description

**Hub Page (`/workspace/ai-tools`):**
- Header: "AI Tools" title with usage stats summary (total runs this month, badge showing "10 tools available")
- Category sections with horizontal dividers: Content, Images, Pricing, Outreach, Research
- Each section: Row of tool cards (3-4 per row)
- Tool card: Icon (left), tool name (bold), one-line description, category badge (top-right), usage count (bottom-right), "Open" button

**Individual Tool Page (`/workspace/ai-tools/[slug]`):**
- Left panel (60%): Input form specific to tool + "Generate" button + Output display area
- Right panel (40%): History of previous runs (timestamp, input summary, "Re-run" link)
- Batch mode banner at top (for applicable tools): "Switch to Batch Mode" toggle
- Batch mode: Product multi-select picker replaces single input; results shown as a table with per-product outputs

## Implementation Plan

### Phase 1: MVP
- Create `ai_tool_usage` and `ai_tool_configs` tables
- Build hub page with tool cards
- Surface existing tools (Title Optimizer, Description Generator) as standalone pages with batch mode
- Link Image Studio tools from hub
- Navigation integration

### Phase 2: New Tools
- Pricing Recommender (build prompt engineering + API route)
- Product Tag Generator (build prompt + API route)
- Listing Audit (build scoring logic + prompt)
- Retailer Email Composer (build prompt + API route)

### Phase 3: Advanced
- Market Research Assistant (requires web search integration or curated data)
- Batch mode for all applicable tools
- Usage analytics dashboard
- Tool configuration panel (adjust prompts, models, temperature)
- Favorite/pin tools to dashboard

## Dependencies

- **External APIs:** OpenAI or Anthropic API for LLM inference (already configured in portal)
- **Existing features:** Products table, Image Studio, existing AI tool components
- **Data requirements:** Product data for all product-related tools; retailer data for email composer
- **Libraries:** Existing AI SDK integration; may need streaming support for long-running tools

## Estimated Effort

| Area | Hours |
|------|-------|
| DB & Migration | 2 |
| Hub Page UI | 8 |
| Standalone Tool Page Framework | 10 |
| Batch Mode System | 8 |
| Migrate Existing Tools (Title, Description) | 6 |
| New Tool — Pricing Recommender | 8 |
| New Tool — Retailer Email Composer | 6 |
| New Tool — Tag Generator | 5 |
| New Tool — Market Research | 10 |
| New Tool — Listing Audit | 8 |
| Usage Tracking & Stats | 4 |
| Testing | 10 |
| **Total** | **85 hours** |

## Priority & Timeline

- **Priority:** Medium
- **Target start:** Sprint 3
- **Phase 1 delivery:** 2 weeks
- **Phase 2 delivery:** 3 weeks
- **Full delivery:** 6 weeks
- **Owner:** Full-stack team (prompt engineering + UI)
