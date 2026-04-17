-- Life AI demo seed. Idempotent: every block is gated on WHERE NOT EXISTS so
-- running this twice is safe and will not clobber real data.
--
-- Execute from psql or the Supabase SQL editor:
--   \i docs/seeds/life_demo.sql
-- Or via the Supabase MCP: mcp__supabase__execute_sql with the contents.
--
-- Covers the 14 core tables that drive the Life AI landing surfaces:
--   journal_entries, life_goals, life_issues, life_transactions,
--   net_worth_snapshots, sleep_logs, mood_logs, workout_logs, books,
--   skills, people, interaction_logs, habits, habit_logs.

------------------------------------------------------------------------
-- journal_entries — 14 days
------------------------------------------------------------------------
insert into life.journal_entries (date, brain_dump, best_part, change_one_thing, grateful_for, worried_about, one_learning, mood, energy, day_rating, word_count)
select * from (values
  ((current_date - interval '0 day')::date, 'Deep-worked on Life AI polish. Feeling momentum.', 'Shipped 6 shared primitives', 'Earlier sleep', 'Clear thinking afternoon', 'Pipeline tests', 'Longest-prefix matching makes navigation robust', 8, 8, 8, 220),
  ((current_date - interval '1 day')::date, 'Half-day on client call, half on review', 'Smit''s question forced clarity', 'Fewer context switches', 'Team picking up speed', 'Q2 planning drift', 'When a table looks wrong, the data shape is usually wrong, not the table', 7, 7, 7, 180),
  ((current_date - interval '2 day')::date, 'Long drive to warehouse. Good thinking time.', 'Warehouse visit clarified dispatch bottleneck', 'Bring notes next time', 'Fresh air', 'China batch slipping', 'Bottleneck is always two steps upstream of where it shows', 7, 6, 7, 160),
  ((current_date - interval '3 day')::date, 'Wrote proposal for new space. Got unblocked by a walk.', 'Walk at 4pm', 'Eat breakfast before coffee', 'Good writing flow', 'ETS deadline', 'Walking > scrolling', 8, 7, 8, 210),
  ((current_date - interval '5 day')::date, 'Weekend — spent on family + light reading', 'Lunch with parents', 'Phone stays off at the table', 'Parents in good health', null, 'Presence > productivity', 9, 8, 9, 140),
  ((current_date - interval '6 day')::date, 'Sunday reset. Read, planned, rested.', 'Clear week ahead', null, 'A quiet morning', null, 'Planning Sunday beats reacting Monday', 8, 7, 8, 120),
  ((current_date - interval '7 day')::date, 'Shipped USDrop client split', 'First orders landed', 'More checkpoints mid-deploy', 'Vercel uptime', 'Schema drift between dev/prod', 'Always seed before demo', 7, 8, 8, 240),
  ((current_date - interval '9 day')::date, 'Fought a build error for 3 hours. Was a package version.', 'Finally green', 'Check changelog first', null, 'lucide-react versioning', 'Upstream first, code second', 5, 5, 6, 190),
  ((current_date - interval '10 day')::date, 'Design review with team — good energy', 'Team aligned on canon', 'Bring printouts', 'Team honesty', null, 'Opinions shown visually land faster', 8, 7, 8, 170),
  ((current_date - interval '12 day')::date, 'Slow morning, strong afternoon', 'Afternoon deep-work block', 'Protect mornings', 'Quiet office', null, 'Energy beats schedule', 7, 6, 7, 150),
  ((current_date - interval '14 day')::date, 'Took the day lighter. Ran errands.', 'Cleared the admin backlog', 'Batch errands', 'Time to breathe', null, 'A clear desk makes clear thinking', 6, 6, 7, 100),
  ((current_date - interval '17 day')::date, 'Bhagwati China kickoff', 'Clear scope', 'Lock rupee pricing upfront', 'Partner trust', 'Catalog quality', 'INR-first pricing sidesteps forex risk', 7, 7, 8, 200),
  ((current_date - interval '20 day')::date, 'Good flow day, capped with gym', 'Hit PR on deadlift', null, 'Training consistency', null, 'Show up beats motivation', 8, 9, 8, 140),
  ((current_date - interval '24 day')::date, 'Hard conversation with a vendor — went well', 'Honesty was appreciated', 'Prepare talking points', 'Mature counter-party', null, 'Name the real issue, don''t dance around it', 7, 7, 8, 180)
) as t(date, brain_dump, best_part, change_one_thing, grateful_for, worried_about, one_learning, mood, energy, day_rating, word_count)
where not exists (select 1 from life.journal_entries);

------------------------------------------------------------------------
-- life_goals — 6 across statuses
------------------------------------------------------------------------
insert into life.life_goals (title, description, why, domain, horizon, status, progress)
select * from (values
  ('Ship Life AI v1', 'A private operating system that tracks every domain of my life', 'Compound small daily logs into directional clarity over a lifetime', 'growth', '1_year', 'active', 70),
  ('Read 24 books this year', 'Mix of non-fiction, memoir, and business. Keep notes.', 'Reading rate = learning rate. Protect it.', 'growth', '1_year', 'active', 45),
  ('Net worth +30% YoY', 'Compound investments + tighten expenses', 'Optionality. Nothing else buys it.', 'wealth', '1_year', 'active', 35),
  ('Bench 100kg', 'Strength training 4x/week, progressive overload', 'Strength is the foundation of long-term energy', 'health', '1_year', 'on_hold', 20),
  ('Write 50 journal entries', 'At least 3x a week', 'Compound reflection', 'mind', '1_month', 'complete', 100),
  ('Learn basic Mandarin', 'Duolingo 15 min/day + a class', 'China is where the supply chain lives', 'growth', '3_years', 'dropped', 15)
) as t(title, description, why, domain, horizon, status, progress)
where not exists (select 1 from life.life_goals);

------------------------------------------------------------------------
-- life_issues — 4 issues across severities
------------------------------------------------------------------------
insert into life.life_issues (title, description, domain, severity, status, target_date, notes)
select * from (values
  ('Evening screen time creeping up', 'Passing 2hrs of phone after 9pm three nights a week', 'health', 'medium', 'open', (current_date + interval '30 day')::date, 'Try leaving phone in other room after dinner'),
  ('Cashflow tight end-of-month', 'Last 5 days of every month are cutting it close', 'wealth', 'high', 'in_progress', (current_date + interval '60 day')::date, 'Move a fixed debit earlier in month; build 2-month buffer'),
  ('Unclear Q2 priorities for Life AI', 'Too many good directions, no ranking', 'career', 'critical', 'open', (current_date + interval '7 day')::date, 'One-hour planning session this Saturday'),
  ('Lost touch with 3 close friends', 'Haven''t met or called in 2+ months', 'relationships', 'low', 'open', (current_date + interval '14 day')::date, 'Set 3 coffee dates next week')
) as t(title, description, domain, severity, status, target_date, notes)
where not exists (select 1 from life.life_issues);

------------------------------------------------------------------------
-- life_transactions — 30 days of realistic transactions
------------------------------------------------------------------------
insert into life.life_transactions (date, type, category, sub_category, amount, currency, account, narration)
select * from (values
  ((current_date - interval '0 day')::date, 'expense', 'food', 'coffee', 380, 'INR', 'HDFC', 'Blue Tokai'),
  ((current_date - interval '0 day')::date, 'expense', 'transport', 'uber', 240, 'INR', 'HDFC', 'Office'),
  ((current_date - interval '1 day')::date, 'expense', 'food', 'groceries', 2450, 'INR', 'HDFC', 'BigBasket weekly'),
  ((current_date - interval '2 day')::date, 'expense', 'food', 'dining', 1820, 'INR', 'HDFC', 'Team lunch'),
  ((current_date - interval '3 day')::date, 'income', 'salary', 'monthly', 185000, 'INR', 'HDFC', 'April salary'),
  ((current_date - interval '4 day')::date, 'expense', 'subscriptions', 'software', 1250, 'INR', 'HDFC', 'Cursor Pro'),
  ((current_date - interval '5 day')::date, 'expense', 'health', 'supplements', 3200, 'INR', 'HDFC', 'Monthly stack'),
  ((current_date - interval '6 day')::date, 'transfer', 'savings', 'investment', 40000, 'INR', 'HDFC', 'Index SIP'),
  ((current_date - interval '7 day')::date, 'expense', 'home', 'utilities', 2800, 'INR', 'HDFC', 'Electricity'),
  ((current_date - interval '8 day')::date, 'expense', 'food', 'dining', 720, 'INR', 'HDFC', 'Friday dinner'),
  ((current_date - interval '10 day')::date, 'income', 'consulting', 'project', 75000, 'INR', 'HDFC', 'Retainer — LegalNations'),
  ((current_date - interval '11 day')::date, 'expense', 'transport', 'fuel', 3100, 'INR', 'HDFC', 'Petrol full tank'),
  ((current_date - interval '12 day')::date, 'expense', 'food', 'groceries', 1980, 'INR', 'HDFC', 'Weekly'),
  ((current_date - interval '14 day')::date, 'expense', 'health', 'gym', 4500, 'INR', 'HDFC', 'Gold''s Gym quarterly'),
  ((current_date - interval '15 day')::date, 'expense', 'personal', 'apparel', 2890, 'INR', 'HDFC', 'Running shoes'),
  ((current_date - interval '17 day')::date, 'expense', 'home', 'rent', 42000, 'INR', 'HDFC', 'April rent'),
  ((current_date - interval '18 day')::date, 'expense', 'food', 'coffee', 420, 'INR', 'HDFC', 'Third Wave'),
  ((current_date - interval '20 day')::date, 'transfer', 'savings', 'emergency', 10000, 'INR', 'HDFC', 'Buffer top-up'),
  ((current_date - interval '22 day')::date, 'income', 'other', 'refund', 1800, 'INR', 'HDFC', 'Amazon return'),
  ((current_date - interval '24 day')::date, 'expense', 'food', 'dining', 2460, 'INR', 'HDFC', 'Date night'),
  ((current_date - interval '26 day')::date, 'expense', 'travel', 'flights', 7800, 'INR', 'HDFC', 'Weekend trip'),
  ((current_date - interval '28 day')::date, 'expense', 'subscriptions', 'services', 899, 'INR', 'HDFC', 'Netflix'),
  ((current_date - interval '29 day')::date, 'expense', 'health', 'supplements', 1400, 'INR', 'HDFC', 'Refills')
) as t(date, type, category, sub_category, amount, currency, account, narration)
where not exists (select 1 from life.life_transactions);

------------------------------------------------------------------------
-- net_worth_snapshots — last 6 months
------------------------------------------------------------------------
-- net_worth is a GENERATED column (total_assets - total_liabilities), don't insert it.
insert into life.net_worth_snapshots (month, total_assets, total_liabilities, notes)
select * from (values
  (to_char(current_date, 'YYYY-MM'),                                       4850000, 1200000, 'Index SIP continuing'),
  (to_char((current_date - interval '1 month')::date, 'YYYY-MM'),          4720000, 1220000, null),
  (to_char((current_date - interval '2 month')::date, 'YYYY-MM'),          4580000, 1240000, null),
  (to_char((current_date - interval '3 month')::date, 'YYYY-MM'),          4440000, 1260000, 'New year — rebalancing'),
  (to_char((current_date - interval '4 month')::date, 'YYYY-MM'),          4380000, 1280000, null),
  (to_char((current_date - interval '5 month')::date, 'YYYY-MM'),          4250000, 1300000, null)
) as t(month, total_assets, total_liabilities, notes)
where not exists (select 1 from life.net_worth_snapshots);

------------------------------------------------------------------------
-- sleep_logs — 14 nights
------------------------------------------------------------------------
insert into life.sleep_logs (date, bedtime, wake_time, hours, quality, notes)
select (current_date - (n || ' day')::interval)::date,
       (time '23:30' + ((random() * interval '80 minutes') - interval '40 minutes'))::time,
       (time '07:00' + ((random() * interval '70 minutes') - interval '20 minutes'))::time,
       round((6.5 + random() * 2)::numeric, 1),
       -- quality has a CHECK (1..5) constraint in the DB (not 1..10 like mood/energy)
       greatest(1, least(5, (3 + floor(random() * 3))::int)),
       null
from generate_series(0, 13) as n
where not exists (select 1 from life.sleep_logs);

------------------------------------------------------------------------
-- mood_logs — 14 days
------------------------------------------------------------------------
insert into life.mood_logs (date, mood, energy, tag)
select (current_date - (n || ' day')::interval)::date,
       greatest(1, least(10, (6 + floor(random() * 4))::int)),
       greatest(1, least(10, (6 + floor(random() * 4))::int)),
       (array['focused', 'tired', 'happy', 'anxious', 'clear', 'scattered', 'grateful'])[1 + floor(random() * 7)::int]
from generate_series(0, 13) as n
where not exists (select 1 from life.mood_logs);

------------------------------------------------------------------------
-- workout_logs — 10 workouts over last 3 weeks
------------------------------------------------------------------------
insert into life.workout_logs (date, type, duration_mins, energy_level, notes)
select * from (values
  ((current_date - interval '0 day')::date,  'strength', 55, 8, 'Push day — bench + OHP'),
  ((current_date - interval '2 day')::date,  'cardio',   40, 7, '5K run'),
  ((current_date - interval '3 day')::date,  'strength', 60, 8, 'Pull day — deadlifts hit PR'),
  ((current_date - interval '5 day')::date,  'yoga',     45, 6, 'Restorative'),
  ((current_date - interval '7 day')::date,  'strength', 50, 7, 'Legs'),
  ((current_date - interval '9 day')::date,  'cardio',   30, 6, 'Treadmill intervals'),
  ((current_date - interval '11 day')::date, 'strength', 55, 7, 'Push'),
  ((current_date - interval '13 day')::date, 'strength', 60, 8, 'Pull'),
  ((current_date - interval '16 day')::date, 'cardio',   35, 5, 'Easy recovery jog'),
  ((current_date - interval '19 day')::date, 'strength', 50, 7, 'Legs — lighter day')
) as t(date, type, duration_mins, energy_level, notes)
where not exists (select 1 from life.workout_logs);

------------------------------------------------------------------------
-- books — 5 across statuses
------------------------------------------------------------------------
insert into life.books (title, author, category, status, rating, started_at, finished_at, key_takeaway)
select * from (values
  ('Atomic Habits',            'James Clear',      'self-help', 'finished',  5, '2025-12-01'::date, '2025-12-22'::date, 'Systems > goals. Make it obvious, attractive, easy, satisfying.'),
  ('The Almanack of Naval',    'Eric Jorgenson',   'wealth',    'finished',  5, '2026-01-05'::date, '2026-01-28'::date, 'Specific knowledge, accountability, leverage, and judgement.'),
  ('Shoe Dog',                 'Phil Knight',      'memoir',    'reading',   null, '2026-03-20'::date, null, 'On page 180 — the Onitsuka chapters'),
  ('The Psychology of Money',  'Morgan Housel',    'wealth',    'wishlist',  null, null, null, null),
  ('Deep Work',                'Cal Newport',      'self-help', 'abandoned', 3, '2025-09-10'::date, null, 'Good but dense — restart later')
) as t(title, author, category, status, rating, started_at, finished_at, key_takeaway)
where not exists (select 1 from life.books);

------------------------------------------------------------------------
-- skills — 4 skills
------------------------------------------------------------------------
insert into life.skills (name, category, current_level, target_level, last_practiced, notes)
select * from (values
  ('TypeScript',      'engineering', 8, 9,  current_date,                          'Daily use. Next: advanced generics.'),
  ('Postgres/SQL',    'engineering', 7, 9,  (current_date - interval '2 day')::date, 'Planning a deeper dive on window functions.'),
  ('Negotiation',     'leadership',  5, 8,  (current_date - interval '14 day')::date, 'Read Never Split the Difference — practice needed.'),
  ('Mandarin',        'language',    2, 5,  (current_date - interval '60 day')::date, 'Paused. Resume after Q2.')
) as t(name, category, current_level, target_level, last_practiced, notes)
where not exists (select 1 from life.skills);

------------------------------------------------------------------------
-- people — 6 contacts
------------------------------------------------------------------------
insert into life.people (name, category, phone, email, location, frequency_target, last_contact, contact_health, active)
select * from (values
  ('Rohan Mehta',        'friend',    '+91 98100 00001', 'rohan@example.com',    'Delhi',     'monthly',   (current_date - interval '12 day')::date, 'good',      true),
  ('Priya Narayan',      'family',    '+91 98100 00002', 'priya@example.com',    'Bengaluru', 'weekly',    (current_date - interval '3 day')::date,  'excellent', true),
  ('Karan Shah',         'colleague', '+91 98100 00003', 'karan@example.com',    'Gurgaon',   'weekly',    (current_date - interval '1 day')::date,  'excellent', true),
  ('Anjali Iyer',        'friend',    '+91 98100 00004', 'anjali@example.com',   'Mumbai',    'monthly',   (current_date - interval '45 day')::date, 'fading',    true),
  ('Vikram Sethi',       'mentor',    '+91 98100 00005', 'vikram@example.com',   'Delhi',     'quarterly', (current_date - interval '80 day')::date, 'cold',      true),
  ('Divya Rao',          'friend',    '+91 98100 00006', 'divya@example.com',    'Pune',      'monthly',   (current_date - interval '25 day')::date, 'good',      true)
) as t(name, category, phone, email, location, frequency_target, last_contact, contact_health, active)
where not exists (select 1 from life.people);

------------------------------------------------------------------------
-- interaction_logs — 5 recent touchpoints
------------------------------------------------------------------------
insert into life.interaction_logs (person_id, date, mode, summary)
select p.id, t.date, t.mode, t.summary
from life.people p
join (values
  ('Rohan Mehta',   (current_date - interval '12 day')::date, 'call',  'Catch-up — he''s moving jobs'),
  ('Priya Narayan', (current_date - interval '3 day')::date,  'meet',  'Sunday lunch'),
  ('Karan Shah',    (current_date - interval '1 day')::date,  'text',  'Quick sync on review'),
  ('Divya Rao',     (current_date - interval '25 day')::date, 'meet',  'Coffee downtown'),
  ('Anjali Iyer',   (current_date - interval '45 day')::date, 'email', 'Forwarded the article she asked about')
) as t(name, date, mode, summary) on t.name = p.name
where not exists (select 1 from life.interaction_logs);

------------------------------------------------------------------------
-- habits — 4 active habits
------------------------------------------------------------------------
insert into life.habits (name, category, frequency, target_description, why, status, sort_order)
select * from (values
  ('Morning pages',   'mind',   'daily',  '3 pages in a journal before phone',  'Clear head first thing',       'active', 1),
  ('Workout',         'health', 'daily',  '45+ min of movement',                 'Strength + energy compound',  'active', 2),
  ('Read 30 min',     'growth', 'daily',  '30 min of a real book',               'Learning rate',                'active', 3),
  ('No phone at dinner','mind', 'daily',  'Phone stays in another room',         'Presence with family',         'active', 4)
) as t(name, category, frequency, target_description, why, status, sort_order)
where not exists (select 1 from life.habits);

------------------------------------------------------------------------
-- habit_logs — last 21 days, weighted toward completion
------------------------------------------------------------------------
insert into life.habit_logs (habit_id, date, status)
select h.id,
       (current_date - (n || ' day')::interval)::date,
       case
         when random() < 0.72 then 'done'
         when random() < 0.88 then 'partial'
         else 'skipped'
       end
from life.habits h
cross join generate_series(0, 20) as n
where not exists (select 1 from life.habit_logs);
