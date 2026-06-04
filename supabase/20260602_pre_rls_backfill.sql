-- Pre-RLS ownership backfill for Inquire.
-- Run this before 20260602_corrected_user_rls.sql.
-- This migration does NOT enable RLS and does NOT create RLS policies.
--
-- Live inspection on 2026-06-02 found:
-- auth.users: 1
-- public.users: 0
-- profiles: 1
-- leads: 0, no user_id column
-- saved_jobs: 0, no user_id column
-- chats: 8 total, 7 missing user_id
-- messages: 354 total, 114 missing user_id
-- memories: 3 total, 0 missing user_id
-- usage_limits: 1 total, 0 missing user_id

begin;

alter table public.saved_jobs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.leads
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create temp table inquire_backfill_report (
  table_name text not null,
  action text not null,
  row_count bigint not null,
  note text
) on commit drop;

create temp table inquire_backfill_owner on commit drop as
select
  (
    select au.id
    from auth.users au
    limit 1
  ) as user_id,
  auth_user_count
from (
  select count(*) as auth_user_count
  from auth.users
) counts
where auth_user_count = 1
union all
select
  null::uuid as user_id,
  auth_user_count
from (
  select count(*) as auth_user_count
  from auth.users
) counts
where auth_user_count <> 1;

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'auth.users',
  'candidate_owner_count',
  auth_user_count,
  case
    when user_id is not null then 'Exactly one Supabase Auth user exists; orphan rows can be assigned conservatively.'
    else 'No single Auth user exists; orphan rows without relationship-based ownership will remain unassigned.'
  end
from inquire_backfill_owner;

with inserted as (
  insert into public.users (id, email, created_at)
  select id, email, created_at::timestamp
  from auth.users
  on conflict (id) do nothing
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'users',
  'insert_missing_public_user_rows',
  count(*),
  'Created missing public.users rows from auth.users so plan/subscription lookups have an owner row.'
from inserted;

with inferred as (
  select
    c.id as chat_id,
    (array_agg(distinct m.user_id))[1] as user_id
  from public.chats c
  join public.messages m on m.chat_id = c.id
  where c.user_id is null
    and m.user_id is not null
  group by c.id
  having count(distinct m.user_id) = 1
),
updated as (
  update public.chats c
  set user_id = inferred.user_id
  from inferred
  where c.id = inferred.chat_id
    and c.user_id is null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'chats',
  'backfill_from_owned_messages',
  count(*),
  'Assigned chats when every owned message in the chat pointed to the same user.'
from updated;

with updated as (
  update public.messages m
  set user_id = c.user_id
  from public.chats c
  where m.chat_id = c.id
    and m.user_id is null
    and c.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'messages',
  'backfill_from_owned_chat',
  count(*),
  'Assigned messages from their parent chat owner.'
from updated;

with updated as (
  update public.chats c
  set user_id = o.user_id
  from inquire_backfill_owner o
  where c.user_id is null
    and o.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'chats',
  'backfill_from_single_auth_user',
  count(*),
  'Assigned remaining orphan chats because the project currently has exactly one Supabase Auth user.'
from updated;

with updated as (
  update public.messages m
  set user_id = c.user_id
  from public.chats c
  where m.chat_id = c.id
    and m.user_id is null
    and c.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'messages',
  'backfill_from_backfilled_chat',
  count(*),
  'Assigned messages after their parent chats were assigned.'
from updated;

with updated as (
  update public.messages m
  set user_id = o.user_id
  from inquire_backfill_owner o
  where m.user_id is null
    and o.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'messages',
  'backfill_from_single_auth_user',
  count(*),
  'Assigned remaining orphan messages, including messages whose chat rows are missing, because there is exactly one Auth user.'
from updated;

with updated as (
  update public.leads l
  set user_id = o.user_id
  from inquire_backfill_owner o
  where l.user_id is null
    and o.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'leads',
  'backfill_from_single_auth_user',
  count(*),
  'Assigned orphan leads only when a single Auth user exists.'
from updated;

with updated as (
  update public.saved_jobs s
  set user_id = o.user_id
  from inquire_backfill_owner o
  where s.user_id is null
    and o.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'saved_jobs',
  'backfill_from_single_auth_user',
  count(*),
  'Assigned orphan saved jobs only when a single Auth user exists.'
from updated;

with updated as (
  update public.memories m
  set user_id = o.user_id
  from inquire_backfill_owner o
  where m.user_id is null
    and o.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'memories',
  'backfill_from_single_auth_user',
  count(*),
  'Assigned orphan memories only when a single Auth user exists.'
from updated;

with updated as (
  update public.usage_limits u
  set user_id = o.user_id::text
  from inquire_backfill_owner o
  where (u.user_id is null or u.user_id = '')
    and o.user_id is not null
  returning 1
)
insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'usage_limits',
  'backfill_from_single_auth_user',
  count(*),
  'Assigned orphan usage limit rows only when a single Auth user exists. usage_limits.user_id is text in the live schema.'
from updated;

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'leads',
  'cannot_assign',
  count(*),
  'Rows still missing user_id; these will be hidden after RLS.'
from public.leads
where user_id is null;

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'saved_jobs',
  'cannot_assign',
  count(*),
  'Rows still missing user_id; these will be hidden after RLS.'
from public.saved_jobs
where user_id is null;

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'chats',
  'cannot_assign',
  count(*),
  'Rows still missing user_id; these will be hidden after RLS.'
from public.chats
where user_id is null;

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'messages',
  'cannot_assign',
  count(*),
  'Rows still missing user_id; these will be hidden after RLS.'
from public.messages
where user_id is null;

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'memories',
  'cannot_assign',
  count(*),
  'Rows still missing user_id; these will be hidden after RLS.'
from public.memories
where user_id is null;

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'usage_limits',
  'cannot_assign',
  count(*),
  'Rows still missing user_id; these will be hidden after RLS.'
from public.usage_limits
where user_id is null or user_id = '';

insert into inquire_backfill_report (table_name, action, row_count, note)
select
  'profiles',
  'cannot_safely_backfill',
  count(*),
  'Existing profiles use a Clerk-style clerk_user_id and a different id from the Supabase Auth user. Not modified by this backfill.'
from public.profiles p
where not exists (
  select 1
  from auth.users au
  where au.id = p.id
     or au.id::text = p.clerk_user_id
);

select *
from inquire_backfill_report
order by table_name, action;

commit;
