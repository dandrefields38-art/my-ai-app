-- Lead Engine Pro billing columns.
-- Run after the user RLS migration.
-- This does not drop tables or delete data.

alter table public.users
  add column if not exists pro_ai_subscription_status text default 'free',
  add column if not exists pro_ai_stripe_customer_id text,
  add column if not exists pro_ai_stripe_subscription_id text,
  add column if not exists lead_engine_plan text default 'free',
  add column if not exists lead_engine_subscription_status text default 'free',
  add column if not exists lead_engine_stripe_customer_id text,
  add column if not exists lead_engine_stripe_subscription_id text,
  add column if not exists lead_engine_trial_ends_at timestamptz;

create index if not exists users_lead_engine_plan_idx
  on public.users (lead_engine_plan);

create index if not exists users_lead_engine_subscription_idx
  on public.users (lead_engine_stripe_subscription_id)
  where lead_engine_stripe_subscription_id is not null;

update public.users
set pro_ai_subscription_status = 'active'
where plan = 'pro'
  and (
    pro_ai_subscription_status is null
    or pro_ai_subscription_status = 'free'
  );
