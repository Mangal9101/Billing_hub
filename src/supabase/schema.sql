-- Sawariya Business production schema
create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id text primary key,
  name text not null,
  logo_url text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sheet_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id text not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);

create table if not exists public.business_data (
  business_id text primary key references public.businesses(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.business_backups (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  payload jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  summary text,
  before_payload jsonb,
  after_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  verified_at timestamptz not null default now(),
  unique(user_id,device_hash)
);

create table if not exists public.staff_profiles (
  id text primary key,
  user_id uuid unique not null references auth.users(id) on delete cascade,
  business_id text not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  role text not null,
  salary numeric not null default 0,
  join_date text,
  status text not null default 'Active',
  login_id text not null,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(business_id,login_id)
);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_data enable row level security;
alter table public.business_backups enable row level security;
alter table public.audit_logs enable row level security;
alter table public.trusted_devices enable row level security;
alter table public.staff_profiles enable row level security;

-- Client-side reads are restricted to the signed-in user's memberships.
drop policy if exists businesses_member_read on public.businesses;
create policy businesses_member_read on public.businesses for select to authenticated using (
  exists (select 1 from public.business_members m where m.business_id=id and m.user_id=auth.uid())
);

drop policy if exists members_self_read on public.business_members;
create policy members_self_read on public.business_members for select to authenticated using (user_id=auth.uid());

drop policy if exists business_data_member_read on public.business_data;
create policy business_data_member_read on public.business_data for select to authenticated using (
  exists (select 1 from public.business_members m where m.business_id=business_data.business_id and m.user_id=auth.uid())
);

drop policy if exists trusted_device_self_read on public.trusted_devices;
create policy trusted_device_self_read on public.trusted_devices for select to authenticated using (user_id=auth.uid());

drop policy if exists staff_self_read on public.staff_profiles;
create policy staff_self_read on public.staff_profiles for select to authenticated using (user_id=auth.uid());

-- All privileged writes are performed by the server routes using the service-role key.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to the browser.
