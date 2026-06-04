-- Message-level timestamps.
-- Idempotent and does not modify RLS policies.

alter table public.messages
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.messages
set created_at = coalesce(created_at, now())
where created_at is null;

update public.messages
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.messages
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_message_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists messages_set_updated_at on public.messages;

create trigger messages_set_updated_at
before update on public.messages
for each row
execute function public.set_message_updated_at();
