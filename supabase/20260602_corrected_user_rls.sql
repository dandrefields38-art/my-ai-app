-- Corrected user-scoped Row Level Security migration for Inquire.
-- Verified against live public schema metadata on 2026-06-02.
-- Do not apply the previous 20260602_enable_user_rls.sql migration.
--
-- Ownership columns found:
-- memories.user_id uuid
-- saved_jobs has no owner column; this migration adds saved_jobs.user_id uuid
-- leads has no owner column; this migration adds leads.user_id uuid
-- usage_limits.user_id text
-- profiles.id uuid and profiles.clerk_user_id text
-- users.id uuid
-- chats.user_id uuid
-- messages.user_id uuid
--
-- Existing saved_jobs/leads rows cannot be user-scoped until assigned a user_id.
-- They will be hidden from authenticated clients by RLS until backfilled.

begin;

alter table public.saved_jobs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.leads
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists contact_name text default '',
  add column if not exists city text default '',
  add column if not exists state text default '',
  add column if not exists google_rating text default '',
  add column if not exists review_count integer,
  add column if not exists score_reason text default '';

create index if not exists memories_user_created_at_idx
  on public.memories (user_id, created_at desc);

create index if not exists saved_jobs_user_created_at_idx
  on public.saved_jobs (user_id, created_at desc);

create index if not exists leads_user_created_at_idx
  on public.leads (user_id, created_at desc);

create index if not exists usage_limits_user_id_idx
  on public.usage_limits (user_id);

create index if not exists chats_user_created_at_idx
  on public.chats (user_id, created_at desc);

create index if not exists messages_user_chat_created_at_idx
  on public.messages (user_id, chat_id, created_at);

alter table public.memories enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.leads enable row level security;
alter table public.usage_limits enable row level security;
alter table public.profiles enable row level security;
alter table public.users enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

drop policy if exists "memories_select_own" on public.memories;
drop policy if exists "memories_insert_own" on public.memories;
drop policy if exists "memories_update_own" on public.memories;
drop policy if exists "memories_delete_own" on public.memories;

create policy "memories_select_own"
  on public.memories for select to authenticated
  using (auth.uid() = user_id);

create policy "memories_insert_own"
  on public.memories for insert to authenticated
  with check (auth.uid() = user_id);

create policy "memories_update_own"
  on public.memories for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "memories_delete_own"
  on public.memories for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_jobs_select_own" on public.saved_jobs;
drop policy if exists "saved_jobs_insert_own" on public.saved_jobs;
drop policy if exists "saved_jobs_update_own" on public.saved_jobs;
drop policy if exists "saved_jobs_delete_own" on public.saved_jobs;

create policy "saved_jobs_select_own"
  on public.saved_jobs for select to authenticated
  using (auth.uid() = user_id);

create policy "saved_jobs_insert_own"
  on public.saved_jobs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "saved_jobs_update_own"
  on public.saved_jobs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_jobs_delete_own"
  on public.saved_jobs for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their leads" on public.leads;
drop policy if exists "Users can insert their leads" on public.leads;
drop policy if exists "Users can update their leads" on public.leads;
drop policy if exists "Users can delete their leads" on public.leads;
drop policy if exists "leads_select_own" on public.leads;
drop policy if exists "leads_insert_own" on public.leads;
drop policy if exists "leads_update_own" on public.leads;
drop policy if exists "leads_delete_own" on public.leads;

create policy "leads_select_own"
  on public.leads for select to authenticated
  using (auth.uid() = user_id);

create policy "leads_insert_own"
  on public.leads for insert to authenticated
  with check (auth.uid() = user_id);

create policy "leads_update_own"
  on public.leads for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "leads_delete_own"
  on public.leads for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "usage_limits_select_own" on public.usage_limits;

create policy "usage_limits_select_own"
  on public.usage_limits for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (
    (auth.jwt() ->> 'sub') = id::text
    or (auth.jwt() ->> 'sub') = clerk_user_id
  );

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (
    (auth.jwt() ->> 'sub') = id::text
    or (auth.jwt() ->> 'sub') = clerk_user_id
  );

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (
    (auth.jwt() ->> 'sub') = id::text
    or (auth.jwt() ->> 'sub') = clerk_user_id
  )
  with check (
    (auth.jwt() ->> 'sub') = id::text
    or (auth.jwt() ->> 'sub') = clerk_user_id
  );

create policy "profiles_delete_own"
  on public.profiles for delete to authenticated
  using (
    (auth.jwt() ->> 'sub') = id::text
    or (auth.jwt() ->> 'sub') = clerk_user_id
  );

drop policy if exists "users_select_own" on public.users;

create policy "users_select_own"
  on public.users for select to authenticated
  using (auth.uid() = id);

drop policy if exists "chats_select_own" on public.chats;
drop policy if exists "chats_insert_own" on public.chats;
drop policy if exists "chats_update_own" on public.chats;
drop policy if exists "chats_delete_own" on public.chats;

create policy "chats_select_own"
  on public.chats for select to authenticated
  using (auth.uid() = user_id);

create policy "chats_insert_own"
  on public.chats for insert to authenticated
  with check (auth.uid() = user_id);

create policy "chats_update_own"
  on public.chats for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "chats_delete_own"
  on public.chats for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "messages_select_own" on public.messages;
drop policy if exists "messages_insert_own" on public.messages;
drop policy if exists "messages_update_own" on public.messages;
drop policy if exists "messages_delete_own" on public.messages;

create policy "messages_select_own"
  on public.messages for select to authenticated
  using (auth.uid() = user_id);

create policy "messages_insert_own"
  on public.messages for insert to authenticated
  with check (auth.uid() = user_id);

create policy "messages_update_own"
  on public.messages for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "messages_delete_own"
  on public.messages for delete to authenticated
  using (auth.uid() = user_id);

commit;
