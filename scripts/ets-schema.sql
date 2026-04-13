-- ets schema: 46 tables generated from PostgREST OpenAPI spec
-- Source: https://rnuomvecynmiiayprakl.supabase.co

CREATE SCHEMA IF NOT EXISTS ets;

-- stores
CREATE TABLE ets.stores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  client_id uuid,
  name text NOT NULL,
  city text,
  state text,
  address text,
  pincode text,
  store_size_sqft integer,
  floor_type text,
  launch_date date,
  status text DEFAULT 'onboarding',
  store_type text,
  package_tier text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT stores_pkey PRIMARY KEY (id)
);

-- users
CREATE TABLE ets.users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  auth_id uuid,
  email text,
  name text NOT NULL,
  phone text,
  role text DEFAULT 'partner' NOT NULL,
  sub_role text,
  store_id uuid,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- clients
CREATE TABLE ets.clients (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  city text,
  state text,
  stage text DEFAULT 'new-lead',
  package_tier text,
  store_size text,
  store_area numeric,
  store_frontage numeric,
  store_address text,
  store_name text,
  store_type text,
  store_floor text,
  nearby_landmark text,
  monthly_rent numeric,
  expected_footfall integer,
  market_type text,
  selected_package text,
  assigned_sales_id uuid,
  assigned_ops_id uuid,
  total_paid numeric DEFAULT 0,
  pending_dues numeric DEFAULT 0,
  total_investment numeric DEFAULT 0,
  inventory_budget numeric DEFAULT 0,
  qualification_score integer DEFAULT 0,
  score_budget integer DEFAULT 0,
  score_location integer DEFAULT 0,
  score_operator integer DEFAULT 0,
  score_timeline integer DEFAULT 0,
  score_experience integer DEFAULT 0,
  score_engagement integer DEFAULT 0,
  total_score integer DEFAULT 0,
  lead_source text,
  next_action text,
  next_action_date date,
  manager_name text,
  manager_phone text,
  gst_number text,
  pan_number text,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  launch_phase text,
  estimated_launch_date date,
  actual_launch_date date,
  notes text,
  last_note text,
  days_in_stage integer DEFAULT 0,
  stage_changed_at timestamptz,
  operating_hours text,
  profile_completed boolean DEFAULT false,
  onboarding_step integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  avatar_url text,
  payment_medium text,
  payment_status text,
  date_of_payment text,
  store_finalised boolean DEFAULT false,
  has_3d_model boolean DEFAULT false,
  has_2d_floor_layout boolean DEFAULT false,
  shared_with_alex boolean DEFAULT false,
  meeting_date text,
  documents_url text,
  assigned_to text,
  auth_id text,
  is_lost boolean DEFAULT false,
  lost_reason text,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- vendors
CREATE TABLE ets.vendors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  "type" text DEFAULT 'india' NOT NULL,
  contact_name text,
  phone text,
  email text,
  gst_number text,
  address text,
  city text,
  state text,
  payment_terms text,
  lead_time_days integer,
  commission_percent numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  kyc_status text DEFAULT 'pending',
  kyc_data jsonb,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  pan_number text,
  website text,
  description text,
  logo_url text,
  category text,
  rating numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  CONSTRAINT vendors_pkey PRIMARY KEY (id)
);

-- categories
CREATE TABLE ets.categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  parent_id uuid,
  level integer DEFAULT 1 NOT NULL,
  customs_duty_percent numeric DEFAULT 0,
  igst_percent numeric DEFAULT 0,
  hs_code text,
  compliance_default text DEFAULT 'safe',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ets.categories(id) ON DELETE SET NULL
);

-- collections
CREATE TABLE ets.collections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  subtitle text,
  description text,
  "type" text NOT NULL,
  badge_label text,
  badge_color text,
  cover_image_url text,
  icon_emoji text,
  cover_gradient text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  tags jsonb,
  filter_rules jsonb,
  target_count integer DEFAULT 50,
  suggested_qty_per_item integer DEFAULT 18,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT collections_pkey PRIMARY KEY (id)
);

-- products
CREATE TABLE ets.products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_code text NOT NULL,
  barcode text,
  name_cn text NOT NULL,
  name_en text,
  category text,
  material text,
  unit_price numeric,
  currency text DEFAULT 'CNY',
  unit text,
  auxiliary_quantity text,
  box_length_cm numeric,
  box_width_cm numeric,
  box_height_cm numeric,
  volume_m3 numeric,
  weight_kg numeric,
  floor_location text,
  stock_quantity integer DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT false,
  market_fit text DEFAULT 'pending_review',
  market_fit_reason text,
  source text,
  source_file text,
  description text,
  vendor_id uuid,
  compliance_status text DEFAULT 'safe',
  bis_required boolean DEFAULT false,
  bis_status text,
  label_status text DEFAULT 'english',
  hs_code text,
  wholesale_price_inr numeric,
  partner_price numeric,
  cost_price numeric,
  suggested_mrp numeric,
  is_featured boolean DEFAULT false,
  sellability_score integer DEFAULT 5,
  units_per_carton integer DEFAULT 6,
  moq integer DEFAULT 18,
  tags jsonb,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES ets.vendors(id) ON DELETE SET NULL
);

-- store_staff
CREATE TABLE ets.store_staff (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  user_id uuid,
  designation text NOT NULL,
  pin_code text,
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT store_staff_pkey PRIMARY KEY (id),
  CONSTRAINT store_staff_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT store_staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES ets.users(id) ON DELETE SET NULL
);

-- store_boq
CREATE TABLE ets.store_boq (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  status text DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT store_boq_pkey PRIMARY KEY (id),
  CONSTRAINT store_boq_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- setup_kit_items
CREATE TABLE ets.setup_kit_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  unit_price numeric NOT NULL,
  unit text DEFAULT 'piece',
  supplier text,
  lead_time_days integer DEFAULT 7,
  image_url text,
  dimensions jsonb,
  material text,
  weight_kg numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT setup_kit_items_pkey PRIMARY KEY (id)
);

-- collection_items
CREATE TABLE ets.collection_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  collection_id uuid NOT NULL,
  product_id uuid NOT NULL,
  suggested_qty integer DEFAULT 18,
  sort_order integer DEFAULT 0,
  CONSTRAINT collection_items_pkey PRIMARY KEY (id),
  CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES ets.collections(id) ON DELETE SET NULL,
  CONSTRAINT collection_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- vendor_products
CREATE TABLE ets.vendor_products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendor_id uuid NOT NULL,
  product_id uuid,
  vendor_sku text,
  vendor_price_inr numeric,
  lead_time_days integer,
  moq integer DEFAULT 1,
  available_stock integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  name text,
  description text,
  category_id uuid,
  brand text,
  images jsonb,
  weight_grams integer,
  dimensions text,
  material text,
  mrp numeric,
  hsn_code text,
  barcode text,
  unit text DEFAULT 'piece',
  listing_status text DEFAULT 'draft',
  rejection_reason text,
  admin_notes text,
  CONSTRAINT vendor_products_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES ets.vendors(id) ON DELETE SET NULL,
  CONSTRAINT vendor_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL,
  CONSTRAINT vendor_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES ets.categories(id) ON DELETE SET NULL
);

-- launch_batches
CREATE TABLE ets.launch_batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  target_launch_date date,
  status text DEFAULT 'planning',
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT launch_batches_pkey PRIMARY KEY (id)
);

-- launch_batch_stores
CREATE TABLE ets.launch_batch_stores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  batch_id uuid NOT NULL,
  store_id uuid NOT NULL,
  status text DEFAULT 'pending',
  CONSTRAINT launch_batch_stores_pkey PRIMARY KEY (id),
  CONSTRAINT launch_batch_stores_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES ets.launch_batches(id) ON DELETE SET NULL,
  CONSTRAINT launch_batch_stores_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- china_batches
CREATE TABLE ets.china_batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  batch_name text NOT NULL,
  etd date,
  eta date,
  vessel_name text,
  bl_number text,
  route text,
  forwarder text,
  total_cbm numeric DEFAULT 0,
  total_weight_kg numeric DEFAULT 0,
  total_cartons integer DEFAULT 0,
  status text DEFAULT 'preparing',
  freight_cost_usd numeric DEFAULT 0,
  insurance_usd numeric DEFAULT 0,
  cha_charges_inr numeric DEFAULT 0,
  customs_duty_inr numeric DEFAULT 0,
  igst_inr numeric DEFAULT 0,
  total_india_cost_inr numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT china_batches_pkey PRIMARY KEY (id)
);

-- china_batch_items
CREATE TABLE ets.china_batch_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  batch_id uuid NOT NULL,
  order_id uuid,
  store_id uuid,
  cbm numeric DEFAULT 0,
  weight_kg numeric DEFAULT 0,
  carton_count integer DEFAULT 0,
  CONSTRAINT china_batch_items_pkey PRIMARY KEY (id),
  CONSTRAINT china_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES ets.china_batches(id) ON DELETE SET NULL,
  CONSTRAINT china_batch_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- document_templates
CREATE TABLE ets.document_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  "type" text NOT NULL,
  version text DEFAULT 'v1.0' NOT NULL,
  content text NOT NULL,
  requires_signature boolean DEFAULT true,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT document_templates_pkey PRIMARY KEY (id)
);

-- document_instances
CREATE TABLE ets.document_instances (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid NOT NULL,
  store_id uuid,
  client_id uuid,
  status text DEFAULT 'pending',
  signed_at timestamptz,
  signed_by_name text,
  signed_by_pan text,
  signed_ip text,
  pdf_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT document_instances_pkey PRIMARY KEY (id),
  CONSTRAINT document_instances_template_id_fkey FOREIGN KEY (template_id) REFERENCES ets.document_templates(id) ON DELETE SET NULL,
  CONSTRAINT document_instances_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT document_instances_client_id_fkey FOREIGN KEY (client_id) REFERENCES ets.clients(id) ON DELETE SET NULL
);

-- milestone_payments
CREATE TABLE ets.milestone_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid,
  client_id uuid,
  milestone_name text NOT NULL,
  amount numeric NOT NULL,
  due_date date,
  paid_date date,
  payment_ref text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT milestone_payments_pkey PRIMARY KEY (id),
  CONSTRAINT milestone_payments_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT milestone_payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES ets.clients(id) ON DELETE SET NULL
);

-- lead_activities
CREATE TABLE ets.lead_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  client_id uuid NOT NULL,
  activity_type text NOT NULL,
  notes text,
  next_action text,
  next_action_date date,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT lead_activities_pkey PRIMARY KEY (id),
  CONSTRAINT lead_activities_client_id_fkey FOREIGN KEY (client_id) REFERENCES ets.clients(id) ON DELETE SET NULL
);

-- customers
CREATE TABLE ets.customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  notes text,
  tags jsonb,
  total_visits integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_visit_at timestamptz,
  loyalty_points integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- cart_items
CREATE TABLE ets.cart_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  category text,
  partner_price numeric DEFAULT 0 NOT NULL,
  suggested_mrp numeric DEFAULT 0,
  delivery_speed text DEFAULT 'standard',
  min_order_qty integer DEFAULT 6,
  quantity integer DEFAULT 1 NOT NULL,
  image_url text,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- orders
CREATE TABLE ets.orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid,
  client_id uuid,
  order_number text,
  order_type text DEFAULT 'opening',
  source text DEFAULT 'china',
  status text DEFAULT 'pending',
  fulfillment_status text DEFAULT 'queued',
  payment_status text DEFAULT 'pending',
  payment_method text,
  total_items integer DEFAULT 0,
  total_units integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  advance_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  eta_days integer,
  expected_delivery date,
  notes text,
  is_flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES ets.clients(id) ON DELETE SET NULL
);

-- order_items
CREATE TABLE ets.order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  product_image_url text,
  category text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  status text DEFAULT 'ordered',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES ets.orders(id) ON DELETE SET NULL,
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- vendor_orders
CREATE TABLE ets.vendor_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendor_id uuid NOT NULL,
  order_id uuid,
  po_number text,
  status text DEFAULT 'draft',
  total_inr numeric DEFAULT 0,
  expected_delivery date,
  actual_delivery date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT vendor_orders_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES ets.vendors(id) ON DELETE SET NULL,
  CONSTRAINT vendor_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES ets.orders(id) ON DELETE SET NULL
);

-- vendor_order_items
CREATE TABLE ets.vendor_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendor_order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price_inr numeric NOT NULL,
  line_total numeric NOT NULL,
  CONSTRAINT vendor_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_order_items_vendor_order_id_fkey FOREIGN KEY (vendor_order_id) REFERENCES ets.vendor_orders(id) ON DELETE SET NULL,
  CONSTRAINT vendor_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- vendor_payouts
CREATE TABLE ets.vendor_payouts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendor_id uuid NOT NULL,
  amount numeric DEFAULT 0 NOT NULL,
  currency text DEFAULT 'INR',
  payment_method text,
  reference_number text,
  status text DEFAULT 'pending',
  notes text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT vendor_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES ets.vendors(id) ON DELETE SET NULL
);

-- payments
CREATE TABLE ets.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid,
  client_id uuid,
  order_id uuid,
  "type" text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  payment_method text,
  payment_ref text,
  "date" date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES ets.clients(id) ON DELETE SET NULL,
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES ets.orders(id) ON DELETE SET NULL
);

-- pos_register_sessions
CREATE TABLE ets.pos_register_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  cashier_id uuid,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  opening_cash numeric DEFAULT 0,
  closing_cash numeric,
  expected_cash numeric,
  cash_variance numeric,
  status text DEFAULT 'open',
  notes text,
  CONSTRAINT pos_register_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT pos_register_sessions_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- pos_inventory
CREATE TABLE ets.pos_inventory (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  current_stock integer DEFAULT 0,
  reorder_level integer DEFAULT 5,
  last_updated timestamptz DEFAULT now(),
  CONSTRAINT pos_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT pos_inventory_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT pos_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- pos_stock_receives
CREATE TABLE ets.pos_stock_receives (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  order_id uuid,
  reference_number text,
  received_date timestamptz DEFAULT now(),
  received_by uuid,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT pos_stock_receives_pkey PRIMARY KEY (id),
  CONSTRAINT pos_stock_receives_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT pos_stock_receives_order_id_fkey FOREIGN KEY (order_id) REFERENCES ets.orders(id) ON DELETE SET NULL
);

-- pos_stock_receive_items
CREATE TABLE ets.pos_stock_receive_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  receive_id uuid NOT NULL,
  product_id uuid NOT NULL,
  expected_qty integer NOT NULL,
  received_qty integer DEFAULT 0,
  rejected_qty integer DEFAULT 0,
  rejection_reason text,
  CONSTRAINT pos_stock_receive_items_pkey PRIMARY KEY (id),
  CONSTRAINT pos_stock_receive_items_receive_id_fkey FOREIGN KEY (receive_id) REFERENCES ets.pos_stock_receives(id) ON DELETE SET NULL,
  CONSTRAINT pos_stock_receive_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- pos_stock_movements
CREATE TABLE ets.pos_stock_movements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity_change integer NOT NULL,
  reference_id uuid,
  reference_type text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT pos_stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT pos_stock_movements_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT pos_stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- pos_sales
CREATE TABLE ets.pos_sales (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  register_session_id uuid,
  bill_number text NOT NULL,
  sale_date timestamptz DEFAULT now(),
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_method text DEFAULT 'cash',
  payment_ref text,
  cash_received numeric,
  change_given numeric,
  customer_name text,
  customer_phone text,
  cashier_id uuid,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  customer_id uuid,
  CONSTRAINT pos_sales_pkey PRIMARY KEY (id),
  CONSTRAINT pos_sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT pos_sales_register_session_id_fkey FOREIGN KEY (register_session_id) REFERENCES ets.pos_register_sessions(id) ON DELETE SET NULL,
  CONSTRAINT pos_sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES ets.customers(id) ON DELETE SET NULL
);

-- pos_sale_items
CREATE TABLE ets.pos_sale_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  sale_id uuid NOT NULL,
  product_id uuid,
  barcode text,
  product_name text NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric NOT NULL,
  discount_percent numeric DEFAULT 0,
  line_total numeric NOT NULL,
  CONSTRAINT pos_sale_items_pkey PRIMARY KEY (id),
  CONSTRAINT pos_sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES ets.pos_sales(id) ON DELETE SET NULL,
  CONSTRAINT pos_sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- pos_returns
CREATE TABLE ets.pos_returns (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  original_sale_id uuid,
  return_number text,
  return_date timestamptz DEFAULT now(),
  return_reason text,
  refund_method text,
  refund_amount numeric DEFAULT 0,
  processed_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT pos_returns_pkey PRIMARY KEY (id),
  CONSTRAINT pos_returns_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL,
  CONSTRAINT pos_returns_original_sale_id_fkey FOREIGN KEY (original_sale_id) REFERENCES ets.pos_sales(id) ON DELETE SET NULL
);

-- pos_return_items
CREATE TABLE ets.pos_return_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  return_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric NOT NULL,
  condition text DEFAULT 'resellable',
  CONSTRAINT pos_return_items_pkey PRIMARY KEY (id),
  CONSTRAINT pos_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES ets.pos_returns(id) ON DELETE SET NULL,
  CONSTRAINT pos_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES ets.products(id) ON DELETE SET NULL
);

-- pos_held_bills
CREATE TABLE ets.pos_held_bills (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid NOT NULL,
  held_at timestamptz DEFAULT now(),
  held_by uuid,
  bill_data jsonb NOT NULL,
  label text,
  expires_at timestamptz DEFAULT (now() + '02:00:00'::interval),
  CONSTRAINT pos_held_bills_pkey PRIMARY KEY (id),
  CONSTRAINT pos_held_bills_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- fulfillment_queue
CREATE TABLE ets.fulfillment_queue (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  priority integer DEFAULT 5,
  assigned_to uuid,
  source text DEFAULT 'china',
  status text DEFAULT 'queued',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fulfillment_queue_pkey PRIMARY KEY (id),
  CONSTRAINT fulfillment_queue_order_id_fkey FOREIGN KEY (order_id) REFERENCES ets.orders(id) ON DELETE SET NULL
);

-- qc_records
CREATE TABLE ets.qc_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid,
  store_id uuid,
  inspected_by uuid,
  inspection_date timestamptz DEFAULT now(),
  total_items integer DEFAULT 0,
  passed_items integer DEFAULT 0,
  failed_items integer DEFAULT 0,
  notes text,
  photos jsonb,
  status text DEFAULT 'pending',
  resolution text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT qc_records_pkey PRIMARY KEY (id),
  CONSTRAINT qc_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES ets.orders(id) ON DELETE SET NULL,
  CONSTRAINT qc_records_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- tickets
CREATE TABLE ets.tickets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  store_id uuid,
  raised_by uuid,
  assigned_to uuid,
  "type" text NOT NULL,
  priority text DEFAULT 'normal',
  status text DEFAULT 'open',
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_store_id_fkey FOREIGN KEY (store_id) REFERENCES ets.stores(id) ON DELETE SET NULL
);

-- ticket_comments
CREATE TABLE ets.ticket_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ticket_id uuid NOT NULL,
  author_id uuid,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ticket_comments_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES ets.tickets(id) ON DELETE SET NULL
);

-- dev_tasks
CREATE TABLE ets.dev_tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  category text DEFAULT 'general',
  assigned_to text,
  created_by text DEFAULT 'user',
  due_date date,
  completed_at timestamptz,
  tags jsonb,
  notes text,
  parent_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  stage text DEFAULT 'backlog',
  module text,
  page_url text,
  checks jsonb,
  progress integer DEFAULT 0,
  reviewer text,
  blocked_reason text,
  effort text DEFAULT 'medium',
  CONSTRAINT dev_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT dev_tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ets.dev_tasks(id) ON DELETE SET NULL
);

-- dev_task_comments
CREATE TABLE ets.dev_task_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  author text DEFAULT 'user' NOT NULL,
  role text DEFAULT 'user',
  content text NOT NULL,
  comment_type text DEFAULT 'comment',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT dev_task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT dev_task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES ets.dev_tasks(id) ON DELETE SET NULL
);

-- price_settings
CREATE TABLE ets.price_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  value numeric NOT NULL,
  label text NOT NULL,
  unit text,
  updated_at timestamptz DEFAULT now(),
  updated_by text,
  CONSTRAINT price_settings_pkey PRIMARY KEY (id)
);

-- prompt_library
CREATE TABLE ets.prompt_library (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  prompt_text text NOT NULL,
  plan_text text,
  outcome text,
  tags jsonb,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT prompt_library_pkey PRIMARY KEY (id)
);

-- Grants
GRANT USAGE ON SCHEMA ets TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ets TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA ets TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ets TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ets GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ets GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ets GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- RLS
ALTER TABLE ets.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.stores FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.users FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.clients FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.vendors FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.categories FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.collections FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.products FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.store_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.store_staff FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.store_boq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.store_boq FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.setup_kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.setup_kit_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.collection_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.vendor_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.vendor_products FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.launch_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.launch_batches FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.launch_batch_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.launch_batch_stores FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.china_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.china_batches FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.china_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.china_batch_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.document_templates FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.document_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.document_instances FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.milestone_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.milestone_payments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.lead_activities FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.customers FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.cart_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.orders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.order_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.vendor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.vendor_orders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.vendor_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.vendor_order_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.vendor_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.vendor_payouts FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.payments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_register_sessions FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_inventory FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_stock_receives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_stock_receives FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_stock_receive_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_stock_receive_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_stock_movements FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_sales FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_sale_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_returns FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_return_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.pos_held_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.pos_held_bills FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.fulfillment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.fulfillment_queue FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.qc_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.qc_records FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.tickets FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.ticket_comments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.dev_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.dev_tasks FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.dev_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.dev_task_comments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.price_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.price_settings FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ets.prompt_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ets.prompt_library FOR ALL USING (true) WITH CHECK (true);
