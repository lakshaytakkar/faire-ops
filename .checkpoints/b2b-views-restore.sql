-- Restore script for public.* compatibility views over b2b.* base tables
-- Captured 2026-04-10 before dropping the views as part of the b2b refactor.
-- Re-run this entire file to recreate every view exactly as it was.

CREATE OR REPLACE VIEW public.collections AS
 SELECT id, name, description, store_id, collection_type, filter_rules,
        thumbnail_url, product_count, is_active, sort_order, created_at, updated_at
   FROM b2b.collections;

CREATE OR REPLACE VIEW public.faire_application_followups AS
 SELECT id, application_id, followup_date, followup_type, note, created_at
   FROM b2b.faire_application_followups;

CREATE OR REPLACE VIEW public.faire_application_links AS
 SELECT id, application_id, label, url, link_type, created_at
   FROM b2b.faire_application_links;

CREATE OR REPLACE VIEW public.faire_bank_transactions AS
 SELECT id, transaction_date, description, amount_cents, transaction_type,
        reference, is_reconciled, ledger_entry_id, store_id, notes, created_at
   FROM b2b.faire_bank_transactions;

CREATE OR REPLACE VIEW public.faire_ledger_entries AS
 SELECT id, entry_date, entry_type, description, amount_cents, currency,
        vendor_id, store_id, order_id, status, notes, created_at
   FROM b2b.faire_ledger_entries;

CREATE OR REPLACE VIEW public.faire_orders AS
 SELECT id, faire_order_id, store_id, display_id, retailer_id, state, source,
        raw_data, total_cents, item_count, shipping_address, payout_costs, notes,
        faire_created_at, faire_updated_at, synced_at, assigned_vendor_id, quote_status
   FROM b2b.faire_orders;

CREATE OR REPLACE VIEW public.faire_products AS
 SELECT id, faire_product_id, store_id, name, description, category,
        lifecycle_state, sale_state, raw_data, variant_count, total_inventory,
        wholesale_price_cents, retail_price_cents, minimum_order_quantity,
        made_in_country, tags, faire_created_at, faire_updated_at, synced_at,
        primary_image_url
   FROM b2b.faire_products;

CREATE OR REPLACE VIEW public.faire_retailers AS
 SELECT id, faire_retailer_id, name, company_name, city, state, country,
        postal_code, phone, raw_data, total_orders, total_spent_cents,
        first_order_at, last_order_at, store_ids, synced_at
   FROM b2b.faire_retailers;

CREATE OR REPLACE VIEW public.faire_seller_applications AS
 SELECT id, brand_name, category, brand_story, logo_url, email_id, email_type,
        application_date, status, marketplace_strategy, domain_name, website_url,
        etsy_store_url, reference_store_url, num_products_listed, listing_method,
        faire_reg_url, notes, linked_store_id, created_at, updated_at
   FROM b2b.faire_seller_applications;

CREATE OR REPLACE VIEW public.faire_stores AS
 SELECT id, faire_store_id, name, oauth_token, app_credentials, last_synced_at,
        total_orders, total_products, color, short, category, active, created_at,
        logo_url, description, faire_url, website_url, instagram, contact_email,
        contact_phone, return_policy, min_order_amount_cents, lead_time_days,
        ships_from, brand_primary_color, brand_accent_color, brand_font,
        brand_style, brand_tagline, brand_guidelines, banner_url
   FROM b2b.faire_stores;

CREATE OR REPLACE VIEW public.faire_vendors AS
 SELECT id, name, contact_name, email, phone, whatsapp, country, specialties,
        notes, is_default, rating, avg_lead_days, completed_orders, created_at, updated_at
   FROM b2b.faire_vendors;

CREATE OR REPLACE VIEW public.marketing_budgets AS
 SELECT id, month, channel, planned_cents, spent_cents, revenue_cents, notes, created_at
   FROM b2b.marketing_budgets;

CREATE OR REPLACE VIEW public.marketing_events AS
 SELECT id, name, start_date, end_date, event_type, marketing_window_start,
        marketing_window_end, description, status, store_ids, budget_cents, notes, created_at
   FROM b2b.marketing_events;

CREATE OR REPLACE VIEW public.meta_ad_accounts AS
 SELECT id, account_id, account_name, currency, timezone, access_token, status,
        last_synced_at, created_at
   FROM b2b.meta_ad_accounts;

CREATE OR REPLACE VIEW public.meta_ad_creatives AS
 SELECT id, name, type, status, image_url, video_url, thumbnail_url, headline,
        primary_text, description, cta_type, destination_url, carousel_cards,
        ai_generated, ai_prompt, tags, notes, performance_score, created_at, updated_at
   FROM b2b.meta_ad_creatives;

CREATE OR REPLACE VIEW public.meta_ad_reports AS
 SELECT id, entity_type, entity_id, report_date, spend_cents, impressions, reach,
        clicks, link_clicks, conversions, revenue_cents, ctr, cpc_cents, cpm_cents,
        roas, frequency, video_views, video_watches_25, video_watches_50,
        video_watches_75, video_watches_100, created_at
   FROM b2b.meta_ad_reports;

CREATE OR REPLACE VIEW public.meta_ad_sets AS
 SELECT id, campaign_id, meta_ad_set_id, name, status, budget_type, budget_cents,
        spend_cents, impressions, clicks, conversions, ctr, cpc_cents, targeting,
        placements, optimization_goal, bid_strategy, schedule, created_at, updated_at
   FROM b2b.meta_ad_sets;

CREATE OR REPLACE VIEW public.meta_ads AS
 SELECT id, ad_set_id, meta_ad_id, name, status, creative_id, headline, primary_text,
        description, cta_type, destination_url, image_url, video_url, spend_cents,
        impressions, clicks, conversions, ctr, cpc_cents, roas, created_at, updated_at
   FROM b2b.meta_ads;

CREATE OR REPLACE VIEW public.meta_campaigns AS
 SELECT id, account_id, meta_campaign_id, name, objective, status, buying_type,
        budget_type, budget_cents, spend_cents, impressions, clicks, conversions,
        revenue_cents, ctr, cpc_cents, roas, start_date, end_date, notes, tags,
        created_at, updated_at
   FROM b2b.meta_campaigns;

CREATE OR REPLACE VIEW public.price_changes AS
 SELECT id, product_id, field_name, old_value_cents, new_value_cents, reason,
        changed_by, created_at
   FROM b2b.price_changes;

CREATE OR REPLACE VIEW public.product_images AS
 SELECT id, faire_product_id, store_id, storage_path, public_url, image_type,
        description, file_name, file_size_bytes, width, height, ai_analyzed,
        ai_description, created_at
   FROM b2b.product_images;

CREATE OR REPLACE VIEW public.scraped_products AS
 SELECT id, source, source_url, name, image_url, price_cents, category, trend_score,
        status, notes, queued_to_pipeline, scraped_at, reviewed_by, reviewed_at
   FROM b2b.scraped_products;

CREATE OR REPLACE VIEW public.shipment_tracking AS
 SELECT id, order_id, tracking_code, carrier, carrier_code, status, origin_country,
        destination_country, shipped_at, delivered_at, estimated_delivery, transit_days,
        is_delayed, last_event, last_event_time, last_checked_at,
        delivery_notification_sent, raw_tracking, created_at
   FROM b2b.shipment_tracking;

CREATE OR REPLACE VIEW public.stock_adjustments AS
 SELECT id, product_id, change_amount, reason, notes, adjusted_by, created_at
   FROM b2b.stock_adjustments;

CREATE OR REPLACE VIEW public.store_assets AS
 SELECT id, store_id, asset_type, storage_path, public_url, file_name, description, created_at
   FROM b2b.store_assets;

CREATE OR REPLACE VIEW public.store_daily_views AS
 SELECT id, store_id, view_date, view_count, created_at
   FROM b2b.store_daily_views;

CREATE OR REPLACE VIEW public.sync_log AS
 SELECT id, store_id, sync_type, status, items_synced, error_message,
        started_at, completed_at
   FROM b2b.sync_log;

CREATE OR REPLACE VIEW public.vendor_quotes AS
 SELECT id, order_id, vendor_id, status, items, shipping_cost_cents, total_cost_cents,
        notes, tracking_code, carrier, shipped_at, created_at, updated_at
   FROM b2b.vendor_quotes;
