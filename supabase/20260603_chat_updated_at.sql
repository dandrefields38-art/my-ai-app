-- Persistent chat activity timestamps.
-- Idempotent and does not modify RLS policies.

alter table public.chats
  add column if not exists updated_at timestamptz default now();

update public.chats
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.chats
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_chat_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chats_set_updated_at on public.chats;

create trigger chats_set_updated_at
before update on public.chats
for each row
execute function public.set_chat_updated_at();
