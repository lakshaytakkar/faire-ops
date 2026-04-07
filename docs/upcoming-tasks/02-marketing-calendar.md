# Marketing Calendar & Events — PRD

## Overview

A dedicated marketing calendar that tracks all major retail events (holidays, sales seasons, custom campaigns) and helps the team plan marketing activities around them. The calendar visualizes marketing windows — the optimal preparation periods before each event — so the team never misses a campaign launch window.

**Business Value:** Wholesale brands that plan marketing 4-6 weeks ahead of retail events see significantly higher sell-through. This tool ensures systematic, proactive campaign planning aligned to the retail calendar.

## User Stories

- As a **brand owner**, I want to see all upcoming retail events on a timeline, so that I can plan my marketing activities well in advance.
- As a **marketing manager**, I want each event to show its optimal marketing window, so that I know exactly when to start preparing campaigns.
- As a **team member**, I want to create custom events (product launches, flash sales), so that the calendar reflects our full marketing plan.
- As a **brand owner**, I want to track campaign status (planned, active, completed) per event, so that I can see progress at a glance.
- As a **marketing manager**, I want a content checklist for each event, so that I can ensure all deliverables are completed on time.
- As a **brand owner**, I want to assign events to specific stores, so that I can run store-specific campaigns.
- As a **team member**, I want to toggle between a timeline/Gantt view and a list view, so that I can see events in the format I prefer.
- As a **brand owner**, I want budget tracking per event, so that I can monitor marketing spend across the year.

## Technical Requirements

### Database Schema

```sql
CREATE TABLE marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'holiday'
    CHECK (event_type IN ('holiday', 'sale', 'season', 'custom')),
  marketing_window_start DATE,
  marketing_window_end DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  store_ids UUID[] DEFAULT '{}',
  notes TEXT,
  budget_cents INTEGER DEFAULT 0,
  spent_cents INTEGER DEFAULT 0,
  color TEXT DEFAULT '#f59e0b',
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketing_event_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES marketing_events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  due_date DATE,
  assignee UUID REFERENCES team_members(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_events_dates ON marketing_events (start_date, end_date);
CREATE INDEX idx_marketing_events_year ON marketing_events (year);
CREATE INDEX idx_marketing_events_status ON marketing_events (status);
```

### Seed Data — 2026 Retail Events

| # | Event | Start | End | Marketing Window Start | Type |
|---|-------|-------|-----|----------------------|------|
| 1 | New Year's Day | 2026-01-01 | 2026-01-01 | 2025-11-20 | holiday |
| 2 | Valentine's Day | 2026-02-14 | 2026-02-14 | 2026-01-05 | holiday |
| 3 | Presidents' Day Sale | 2026-02-16 | 2026-02-16 | 2026-01-19 | sale |
| 4 | St. Patrick's Day | 2026-03-17 | 2026-03-17 | 2026-02-09 | holiday |
| 5 | Easter | 2026-04-05 | 2026-04-05 | 2026-02-23 | holiday |
| 6 | Mother's Day | 2026-05-10 | 2026-05-10 | 2026-03-30 | holiday |
| 7 | Memorial Day Sale | 2026-05-25 | 2026-05-25 | 2026-04-27 | sale |
| 8 | Father's Day | 2026-06-21 | 2026-06-21 | 2026-05-11 | holiday |
| 9 | 4th of July | 2026-07-04 | 2026-07-04 | 2026-05-25 | holiday |
| 10 | Back to School | 2026-08-01 | 2026-09-07 | 2026-06-22 | season |
| 11 | Labor Day Sale | 2026-09-07 | 2026-09-07 | 2026-08-10 | sale |
| 12 | Halloween | 2026-10-31 | 2026-10-31 | 2026-09-14 | holiday |
| 13 | Veterans Day Sale | 2026-11-11 | 2026-11-11 | 2026-10-19 | sale |
| 14 | Thanksgiving | 2026-11-26 | 2026-11-26 | 2026-10-12 | holiday |
| 15 | Black Friday | 2026-11-27 | 2026-11-27 | 2026-10-12 | sale |
| 16 | Small Business Saturday | 2026-11-28 | 2026-11-28 | 2026-10-19 | sale |
| 17 | Cyber Monday | 2026-11-30 | 2026-11-30 | 2026-10-19 | sale |
| 18 | Hanukkah | 2026-12-05 | 2026-12-12 | 2026-10-26 | holiday |
| 19 | Christmas | 2026-12-25 | 2026-12-25 | 2026-10-26 | holiday |
| 20 | New Year's Eve | 2026-12-31 | 2026-12-31 | 2026-11-16 | holiday |
| 21 | Spring Collection Launch | 2026-03-01 | 2026-03-15 | 2026-01-19 | season |
| 22 | Summer Collection Launch | 2026-06-01 | 2026-06-15 | 2026-04-20 | season |
| 23 | Fall Collection Launch | 2026-09-01 | 2026-09-15 | 2026-07-20 | season |
| 24 | Holiday Gift Guide | 2026-11-01 | 2026-12-20 | 2026-09-21 | season |

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/marketing/events` | List events with filters (`?year=&status=&type=`) |
| POST | `/api/marketing/events` | Create event |
| PUT | `/api/marketing/events/[id]` | Update event |
| DELETE | `/api/marketing/events/[id]` | Delete event |
| GET | `/api/marketing/events/[id]` | Get event with checklist |
| POST | `/api/marketing/events/[id]/checklist` | Add checklist item |
| PUT | `/api/marketing/events/[id]/checklist/[itemId]` | Update checklist item |
| DELETE | `/api/marketing/events/[id]/checklist/[itemId]` | Remove checklist item |
| POST | `/api/marketing/events/seed` | Seed 2026 retail events (admin) |

### UI Components

1. **MarketingCalendarPage** — Main page with view toggle and year selector
2. **TimelineView** — Horizontal Gantt-style chart with months as columns; each event is a bar spanning its date range; marketing window shown as a lighter/hatched bar extending left
3. **ListView** — Table/card list sorted chronologically with status badges, dates, and budget info
4. **EventDetailSheet** — Slide-over panel showing event details, checklist, budget, notes
5. **EventCreateDialog** — Form for creating/editing events
6. **ChecklistWidget** — Inline checklist with add/toggle/delete per event
7. **BudgetTracker** — Progress bar showing spent vs. budget per event
8. **StatusBadge** — Color-coded pill (planned=gray, active=blue, completed=green, cancelled=red)

### Integration Points

- **Stores:** `store_ids` array links events to specific stores for multi-store brands
- **Team Calendar (PRD-01):** Marketing events could optionally surface as calendar events for team visibility
- **Tasks:** Checklist items can optionally create tasks in the task system

## Page Structure

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/operations/marketing-calendar` | `MarketingCalendarPage` | Main marketing calendar |

### Navigation Changes

Add under the **Operations** section in the sidebar:

```
Operations
  ├── Overview
  ├── Shipping
  ├── Marketing Calendar    ← NEW
  └── ...
```

Icon suggestion: `Megaphone` from Lucide.

### UI Mockup Description

**Timeline View (default):**
- Top bar: Year selector (`< 2026 >`), view toggle (Timeline | List), status filter pills, "+ New Event" button
- Timeline: 12 columns (Jan-Dec), each event as a horizontal bar. Event bars use solid color for event dates, hatched/lighter shade for marketing window extending to the left. Hover shows tooltip with details.
- Events grouped by type (holidays, sales, seasons, custom) with section headers
- Current date indicator as a vertical red line

**List View:**
- Sortable table with columns: Name, Type, Dates, Marketing Window, Status, Budget, Progress
- Click row to open detail sheet
- Bulk status update via checkboxes

**Event Detail Sheet:**
- Header: Event name, type badge, status dropdown
- Dates section: Start/end date pickers, marketing window date pickers (auto-calculated as 6 weeks before start, adjustable)
- Description textarea
- Store assignment (multi-select dropdown)
- Budget: Budget input + spent input with progress bar
- Checklist: Add items with due dates and assignees, checkbox to mark done
- Notes: Rich text area
- Delete button (with confirmation)

## Implementation Plan

### Phase 1: MVP
- Create `marketing_events` and `marketing_event_checklist` tables
- Build API CRUD endpoints
- Seed 2026 retail events
- Implement ListView with basic CRUD
- Event create/edit dialog
- Navigation integration

### Phase 2: Enhancements
- TimelineView (Gantt-style) with marketing windows
- Checklist management per event
- Budget tracking (budget vs. spent)
- Status workflow (planned -> active -> completed)
- Store assignment

### Phase 3: Polish
- Auto-calculate marketing windows (configurable lead time: 4/6/8 weeks)
- Duplicate events to next year
- Export calendar as CSV/PDF
- Integration with team calendar
- Email reminders when marketing window opens

## Dependencies

- **External APIs:** None
- **Existing features:** Stores table (for store assignment), Team members (for checklist assignees)
- **Data requirements:** Seed data script for 2026 retail events
- **Libraries:** Consider `vis-timeline` or custom SVG for Gantt view; `date-fns` for date math

## Estimated Effort

| Area | Hours |
|------|-------|
| DB & Migration + Seed Data | 4 |
| API Endpoints | 8 |
| UI — List View | 6 |
| UI — Timeline/Gantt View | 14 |
| UI — Event Detail Sheet | 8 |
| Checklist & Budget | 6 |
| Testing | 6 |
| **Total** | **52 hours** |

## Priority & Timeline

- **Priority:** Medium
- **Target start:** Sprint 3
- **Phase 1 delivery:** 2 weeks
- **Full delivery:** 4 weeks
- **Owner:** Frontend team (Timeline view is the most complex piece)
