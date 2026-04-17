-- 2026-04-17_register_ai_tool_fal_kling.sql
-- APPLIED 2026-04-17 via mcp__supabase__execute_sql (idempotent INSERT).
-- Registers the FAL Kling video generator in the meta-infra ai_tools registry.

INSERT INTO public.ai_tools (key, name, provider, model_id, purpose, used_in_spaces, vault_ref, monthly_cost_usd, status)
VALUES (
  'fal-kling-video',
  'Kling Video (via FAL)',
  'FAL',
  'fal-ai/kling-video/v2.1/master/text-to-video',
  'Text-to-video generation for landing hero b-roll, ad creatives, and product demos. 5s or 10s clips in 16:9/9:16/1:1.',
  ARRAY['team-portal']::text[],
  'FAL_API_KEY',
  NULL,
  'active'
)
ON CONFLICT (key) DO UPDATE SET
  name           = EXCLUDED.name,
  provider       = EXCLUDED.provider,
  model_id       = EXCLUDED.model_id,
  purpose        = EXCLUDED.purpose,
  used_in_spaces = EXCLUDED.used_in_spaces,
  vault_ref      = EXCLUDED.vault_ref,
  status         = EXCLUDED.status;
