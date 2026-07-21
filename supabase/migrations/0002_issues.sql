-- ============================================================================
-- Jobly — support issues
-- Users raise issues in-app; the admin reviews, replies, and resolves them
-- from the /admin panel (admin access uses the service role, so no admin
-- RLS policies are needed here).
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'issue_status') then
    create type public.issue_status as enum ('open', 'in_progress', 'resolved');
  end if;
end$$;

create table if not exists public.issues (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text not null,
  message     text not null,
  status      public.issue_status not null default 'open',
  admin_reply text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists issues_user_id_idx on public.issues(user_id);
create index if not exists issues_status_idx on public.issues(status);

alter table public.issues enable row level security;

-- Users can raise issues and read their own (including the admin's reply).
drop policy if exists "Issues: insert own" on public.issues;
create policy "Issues: insert own"
  on public.issues for insert
  with check (auth.uid() = user_id);

drop policy if exists "Issues: select own" on public.issues;
create policy "Issues: select own"
  on public.issues for select
  using (auth.uid() = user_id);
