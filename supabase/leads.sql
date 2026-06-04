create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact_name text default '',
  industry text default 'Business',
  city text default '',
  state text default '',
  location text default '',
  address text default '',
  phone text default '',
  email text default '',
  website text default '',
  rating text default 'N/A',
  google_rating text default '',
  review_count integer,
  status text default 'New',
  notes text default '',
  lead_score integer default 60,
  score_reason text default '',
  created_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists contact_name text default '',
  add column if not exists industry text default 'Business',
  add column if not exists city text default '',
  add column if not exists state text default '',
  add column if not exists location text default '',
  add column if not exists address text default '',
  add column if not exists phone text default '',
  add column if not exists email text default '',
  add column if not exists website text default '',
  add column if not exists rating text default 'N/A',
  add column if not exists google_rating text default '',
  add column if not exists review_count integer,
  add column if not exists status text default 'New',
  add column if not exists notes text default '',
  add column if not exists lead_score integer default 60,
  add column if not exists score_reason text default '',
  add column if not exists created_at timestamptz not null default now();

create index if not exists leads_user_created_at_idx
  on public.leads (user_id, created_at desc);

create unique index if not exists leads_user_website_unique_idx
  on public.leads (user_id, lower(website))
  where website <> '';

create unique index if not exists leads_user_phone_unique_idx
  on public.leads (user_id, phone)
  where phone <> '';

alter table public.leads enable row level security;

drop policy if exists "Users can read their leads" on public.leads;
create policy "Users can read their leads"
  on public.leads
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their leads" on public.leads;
create policy "Users can insert their leads"
  on public.leads
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their leads" on public.leads;
create policy "Users can update their leads"
  on public.leads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their leads" on public.leads;
create policy "Users can delete their leads"
  on public.leads
  for delete
  using (auth.uid() = user_id);
