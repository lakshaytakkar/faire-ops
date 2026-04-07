# Team Calendar & Scheduling — PRD

## Overview

A full-featured team calendar that lets every team member manage their schedule, book meeting slots, and view events across day, week, and month views. The calendar integrates with the existing task system so deadlines can be visualized alongside meetings and personal events, giving each team member a single pane of glass for their time.

**Business Value:** Eliminates the need for external calendar tools, keeps scheduling context inside the portal, and connects calendar events directly to tasks and team workflows.

## User Stories

- As a **team member**, I want to create calendar events with a title, time, and description, so that I can track my schedule in one place.
- As a **team member**, I want to drag across time slots to quickly create an event, so that scheduling is fast and intuitive.
- As a **team lead**, I want to view all team members' events in a single calendar, so that I can coordinate meetings without conflicts.
- As a **team member**, I want to set up recurring events (daily, weekly, monthly), so that I don't have to recreate regular meetings.
- As a **team member**, I want to link a calendar event to a task, so that task deadlines appear on my calendar.
- As a **team member**, I want to toggle between month, week, and day views, so that I can see my schedule at the right level of detail.
- As a **team member**, I want events color-coded by team member, so that I can quickly identify who owns each event.
- As a **team member**, I want a personal calendar view filtered to only my events, so that I can focus on my own schedule.

## Technical Requirements

### Database Schema

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  assignee UUID REFERENCES team_members(id),
  event_type TEXT NOT NULL DEFAULT 'meeting'
    CHECK (event_type IN ('meeting', 'task_deadline', 'reminder', 'block', 'other')),
  color TEXT DEFAULT '#3b82f6',
  recurring JSONB DEFAULT NULL,
  -- recurring schema: { "frequency": "daily"|"weekly"|"monthly"|"yearly", "interval": 1, "end_date": "2026-12-31", "days_of_week": [1,3,5] }
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_start ON calendar_events (start_time);
CREATE INDEX idx_calendar_events_assignee ON calendar_events (assignee);
CREATE INDEX idx_calendar_events_range ON calendar_events (start_time, end_time);
```

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/calendar/events` | List events with date range filter (`?start=&end=&assignee=`) |
| POST | `/api/calendar/events` | Create a new event |
| PUT | `/api/calendar/events/[id]` | Update an event |
| DELETE | `/api/calendar/events/[id]` | Delete an event |
| GET | `/api/calendar/events/[id]` | Get single event detail |
| POST | `/api/calendar/events/[id]/duplicate` | Duplicate an event to another date |

**Query parameters for GET /events:**
- `start` (ISO date) — range start (required)
- `end` (ISO date) — range end (required)
- `assignee` (UUID) — filter by team member
- `event_type` (string) — filter by type

### UI Components

1. **CalendarPage** — Main page container with view toggle and navigation
2. **MonthView** — Grid of days showing event pills; click day to drill into day view
3. **WeekView** — 7-column layout with hourly rows; events rendered as positioned blocks
4. **DayView** — Single-column hourly timeline with full event detail
5. **EventCreateDialog** — Modal/sheet for creating events (title, time pickers, assignee dropdown, color picker, recurrence selector, task link)
6. **EventDetailPopover** — Click an event to see details, edit, or delete
7. **MiniCalendar** — Small month picker in sidebar for quick date navigation
8. **TeamMemberFilter** — Checkbox list of team members to toggle visibility

### Integration Points

- **Tasks:** When a task has a due date, optionally create a `task_deadline` calendar event. Calendar events with `linked_task_id` show task status badge.
- **Team Members:** Assignee field references the existing `team_members` table. Color defaults can be pulled from a team member's assigned color.
- **Notifications:** Future integration — send reminders N minutes before an event.

## Page Structure

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/workspace/calendar` | `CalendarPage` | Main team calendar (default: month view) |
| `/workspace/calendar/my` | `CalendarPage` | Personal view (pre-filtered to current user) |

### Navigation Changes

Add under the **Workspace** section in the sidebar:

```
Workspace
  ├── Dashboard
  ├── Tasks
  ├── Calendar          ← NEW
  ├── AI Tools
  └── ...
```

Icon suggestion: `CalendarDays` from Lucide.

### UI Mockup Description

**Month View (default):**
- Top bar: `< April 2026 >` with Month / Week / Day toggle buttons, "Today" button, "+ New Event" button
- Grid: 7 columns (Mon-Sun), 5-6 rows per month. Each cell shows date number and up to 3 event pills (colored by assignee). "+N more" link if overflow.
- Sidebar (collapsible): Mini calendar for navigation, team member filter checkboxes

**Week View:**
- Top bar: Same navigation, showing `Mar 30 – Apr 5, 2026`
- Grid: 7 columns, rows for each hour (7am-9pm default). All-day events in a top strip. Timed events as positioned, resizable blocks.

**Day View:**
- Single column with hourly slots. Events rendered as cards with full title, description preview, assignee avatar. Drag to reschedule.

**Event Create Dialog:**
- Title (text input)
- Date & time pickers (start, end) with all-day toggle
- Assignee (dropdown of team members)
- Event type (dropdown)
- Color picker (preset swatches)
- Recurrence (none / daily / weekly / monthly / yearly + end date)
- Link to task (searchable dropdown of tasks)
- Description (textarea)
- Save / Cancel buttons

## Implementation Plan

### Phase 1: MVP (Core Calendar)
- Create `calendar_events` table and migration
- Build API CRUD endpoints
- Implement MonthView with event pills
- Event create/edit dialog (basic fields: title, time, assignee)
- Navigation integration

### Phase 2: Enhancements
- WeekView and DayView with hourly grid
- Drag-to-create and drag-to-reschedule
- Recurring events (create series, edit single/all)
- Task linking — show task deadlines on calendar
- Team member color coding and filtering

### Phase 3: Polish
- Mini calendar sidebar navigation
- Personal view (`/my` route with pre-filter)
- Keyboard shortcuts (arrow keys to navigate dates, `n` to create)
- Mobile/responsive layout
- Event duplication
- Export to ICS format

## Dependencies

- **External APIs:** None (self-contained)
- **Existing features:** Team members table, Tasks table
- **Data requirements:** Team members must exist; tasks integration requires tasks table with `due_date` column
- **Libraries:** Consider `@fullcalendar/react` or build custom with `date-fns` for date math

## Estimated Effort

| Area | Hours |
|------|-------|
| DB & Migration | 2 |
| API Endpoints | 6 |
| UI — Month View | 10 |
| UI — Week/Day Views | 12 |
| UI — Event Dialogs | 6 |
| Drag Interactions | 8 |
| Recurring Events Logic | 6 |
| Task Integration | 4 |
| Testing | 8 |
| **Total** | **62 hours** |

## Priority & Timeline

- **Priority:** High
- **Target start:** Sprint 1
- **Phase 1 delivery:** 2 weeks
- **Full delivery:** 5 weeks
- **Owner:** Frontend + Backend team
