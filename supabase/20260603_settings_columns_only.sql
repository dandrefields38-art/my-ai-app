-- Settings profile and notification columns.
-- Safe to run more than once.
-- Does not modify RLS policies, storage policies, billing, chat, leads, or subscriptions.

alter table public.users
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists notification_preferences jsonb not null default '{
    "product_updates": true,
    "billing_emails": true,
    "lead_alerts": true,
    "usage_limit_alerts": true
  }'::jsonb;

update public.users
set notification_preferences = '{
  "product_updates": true,
  "billing_emails": true,
  "lead_alerts": true,
  "usage_limit_alerts": true
}'::jsonb
where notification_preferences is null;
