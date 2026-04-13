CREATE SCHEMA IF NOT EXISTS suprans;

-- offices
CREATE TABLE suprans.offices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- users (password column intentionally stripped)
CREATE TABLE suprans.users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'sales_executive',
  phone text,
  avatar text,
  office_id varchar REFERENCES suprans.offices(id),
  salary integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- leads
CREATE TABLE suprans.leads (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  service text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'new',
  assigned_to varchar REFERENCES suprans.users(id),
  team_id text,
  source text NOT NULL,
  address text,
  avatar text,
  rating integer DEFAULT 0,
  tags jsonb DEFAULT '[]'::jsonb,
  temperature text,
  next_follow_up timestamptz,
  won_amount integer,
  won_date timestamptz,
  lost_reason text,
  last_connected jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- activities
CREATE TABLE suprans.activities (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id varchar NOT NULL REFERENCES suprans.leads(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES suprans.users(id),
  type text NOT NULL,
  notes text NOT NULL,
  duration integer,
  outcome text,
  from_stage text,
  to_stage text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- tasks
CREATE TABLE suprans.tasks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz NOT NULL,
  assigned_to varchar NOT NULL REFERENCES suprans.users(id),
  team_id text,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- services
CREATE TABLE suprans.services (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  category text NOT NULL,
  short_description text,
  description text,
  thumbnail text,
  cta_text text DEFAULT 'Learn More',
  cta_link text,
  pricing integer,
  display_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- templates
CREATE TABLE suprans.templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL,
  subject text,
  content text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- employees
CREATE TABLE suprans.employees (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  avatar text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  father_name text,
  relation text,
  date_of_birth text,
  address text,
  employee_type text,
  salary text,
  has_pf boolean DEFAULT false,
  has_esic boolean DEFAULT false,
  pan_card text,
  bank_name text,
  account_number text,
  ifsc_code text,
  employment_status text DEFAULT 'active',
  joining_date text,
  last_working_day text,
  candidate_id varchar
);

-- travel_packages
CREATE TABLE suprans.travel_packages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  destination text NOT NULL,
  duration text NOT NULL,
  days integer NOT NULL DEFAULT 5,
  nights integer NOT NULL DEFAULT 4,
  price integer NOT NULL,
  original_price integer,
  image text NOT NULL,
  gallery jsonb DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'business',
  short_description text NOT NULL,
  description text NOT NULL,
  highlights jsonb DEFAULT '[]'::jsonb,
  inclusions jsonb DEFAULT '[]'::jsonb,
  exclusions jsonb DEFAULT '[]'::jsonb,
  itinerary jsonb DEFAULT '[]'::jsonb,
  accommodation text DEFAULT '4 Star Hotel',
  meals text DEFAULT 'Breakfast included',
  transportation text DEFAULT 'Private Car + Metro',
  group_size integer DEFAULT 40,
  age_range text DEFAULT '18-60',
  start_date timestamptz,
  end_date timestamptz,
  seats_left integer DEFAULT 10,
  booking_amount integer DEFAULT 30000,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- travel_bookings
CREATE TABLE suprans.travel_bookings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id varchar NOT NULL REFERENCES suprans.travel_packages(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  number_of_travelers integer NOT NULL DEFAULT 1,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  travel_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- events
CREATE TABLE suprans.events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  city text NOT NULL,
  venue text,
  venue_address text,
  date timestamptz NOT NULL,
  end_date timestamptz,
  capacity integer NOT NULL DEFAULT 60,
  description text,
  status text NOT NULL DEFAULT 'upcoming',
  ticket_price integer DEFAULT 0,
  hi_tea_time text,
  lunch_time text,
  slot_duration integer DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_attendees
CREATE TABLE suprans.event_attendees (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES suprans.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  company text,
  designation text,
  city text,
  avatar text,
  source text,
  slot_time text,
  group_number integer,
  ticket_id text,
  ticket_qr text,
  ticket_status text NOT NULL DEFAULT 'pending',
  ticket_count integer NOT NULL DEFAULT 1,
  badge_printed boolean NOT NULL DEFAULT false,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  notes text,
  list_locked boolean NOT NULL DEFAULT false,
  plan text,
  budget text,
  client_status text,
  called_by text,
  call_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_hotels
CREATE TABLE suprans.event_hotels (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES suprans.events(id) ON DELETE CASCADE,
  hotel_name text NOT NULL,
  hotel_address text,
  hotel_phone text,
  booking_url text,
  distance_from_venue text,
  guest_name text NOT NULL,
  guest_phone text,
  guest_type text NOT NULL DEFAULT 'team',
  check_in timestamptz NOT NULL,
  check_out timestamptz NOT NULL,
  room_type text NOT NULL DEFAULT 'single',
  room_count integer DEFAULT 1,
  confirmation_number text,
  status text NOT NULL DEFAULT 'pending',
  amount integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_flights
CREATE TABLE suprans.event_flights (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES suprans.events(id) ON DELETE CASCADE,
  passenger_name text NOT NULL,
  passenger_phone text,
  passenger_type text NOT NULL DEFAULT 'team',
  flight_number text NOT NULL,
  airline text,
  booking_url text,
  departure_city text NOT NULL,
  arrival_city text NOT NULL,
  departure_time timestamptz NOT NULL,
  arrival_time timestamptz NOT NULL,
  pnr text,
  seat_number text,
  status text NOT NULL DEFAULT 'pending',
  amount integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_creatives
CREATE TABLE suprans.event_creatives (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES suprans.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  file_url text,
  dimensions text,
  quantity integer DEFAULT 1,
  vendor text,
  status text NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_packing_items
CREATE TABLE suprans.event_packing_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES suprans.events(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  assigned_to text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_communications
CREATE TABLE suprans.event_communications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES suprans.events(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  type text NOT NULL,
  subject text,
  body text NOT NULL,
  sent_count integer DEFAULT 0,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_presentations
CREATE TABLE suprans.event_presentations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES suprans.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  speaker_name text NOT NULL,
  speaker_designation text,
  duration integer,
  "order" integer DEFAULT 1,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- booking_types
CREATE TABLE suprans.booking_types (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES suprans.users(id),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  duration integer NOT NULL DEFAULT 30,
  color text DEFAULT '#3B82F6',
  price integer DEFAULT 0,
  currency text DEFAULT 'INR',
  location text DEFAULT 'Google Meet',
  buffer_before integer DEFAULT 0,
  buffer_after integer DEFAULT 10,
  max_bookings_per_day integer,
  requires_approval boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- bookings
CREATE TABLE suprans.bookings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type_id varchar NOT NULL REFERENCES suprans.booking_types(id),
  host_user_id varchar NOT NULL REFERENCES suprans.users(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  meeting_link text,
  customer_notes text,
  internal_notes text,
  cancellation_reason text,
  rescheduled_from_id varchar,
  payment_request_id varchar,
  cancel_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- website_content
CREATE TABLE suprans.website_content (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar
);

-- Grants
GRANT USAGE ON SCHEMA suprans TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA suprans TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA suprans TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA suprans TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA suprans GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA suprans GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA suprans GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- RLS
ALTER TABLE suprans.offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.offices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.leads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.activities FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.tasks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.services FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.employees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.travel_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.travel_packages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.travel_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.travel_bookings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.event_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.event_attendees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.event_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.event_hotels FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.event_flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.event_flights FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.event_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.event_creatives FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.event_packing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.event_packing_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.event_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.event_communications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.event_presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.event_presentations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.booking_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.booking_types FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.bookings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE suprans.website_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suprans.website_content FOR ALL USING (true) WITH CHECK (true);
