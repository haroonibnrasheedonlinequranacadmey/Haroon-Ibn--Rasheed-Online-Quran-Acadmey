-- Haroon Ibn Rasheed Online Quran Academy
-- Run this whole file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin','teacher','student')),
  created_at timestamptz not null default now()
);

create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  father_name text not null,
  age integer,
  phone text not null,
  email text,
  course text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','trial','enrolled','rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  father_name text,
  phone text,
  email text,
  course text,
  teacher text,
  status text default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  link_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text,
  bio text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  course text,
  amount text,
  currency text,
  period text default 'monthly',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text unique not null,
  content_value text,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text unique not null,
  setting_value text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.admissions enable row level security;
alter table public.students enable row level security;
alter table public.courses enable row level security;
alter table public.teachers enable row level security;
alter table public.fees enable row level security;
alter table public.faqs enable row level security;
alter table public.site_content enable row level security;
alter table public.site_settings enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

-- Profiles: only an authenticated user can read their own profile; admins can read all.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());

-- Admissions: anonymous/public visitors may submit a lead, but cannot read it. Admins can manage all leads.
drop policy if exists admissions_public_insert on public.admissions;
create policy admissions_public_insert on public.admissions for insert to anon,authenticated with check (true);
drop policy if exists admissions_admin_select on public.admissions;
create policy admissions_admin_select on public.admissions for select to authenticated using (public.is_admin());
drop policy if exists admissions_admin_update on public.admissions;
create policy admissions_admin_update on public.admissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists admissions_admin_delete on public.admissions;
create policy admissions_admin_delete on public.admissions for delete to authenticated using (public.is_admin());

-- Admin CRUD tables.
DO $$ declare t text; begin
  foreach t in array ARRAY['students','courses','teachers','fees','faqs','site_content','site_settings'] loop
    execute format('drop policy if exists %I_admin_all on public.%I',t,t);
    execute format('create policy %I_admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t,t);
  end loop;
end $$;

-- Public website may read only active public content.
drop policy if exists courses_public_read on public.courses;
create policy courses_public_read on public.courses for select to anon,authenticated using (active=true);
drop policy if exists teachers_public_read on public.teachers;
create policy teachers_public_read on public.teachers for select to anon,authenticated using (active=true);
drop policy if exists fees_public_read on public.fees;
create policy fees_public_read on public.fees for select to anon,authenticated using (active=true);
drop policy if exists faqs_public_read on public.faqs;
create policy faqs_public_read on public.faqs for select to anon,authenticated using (active=true);
drop policy if exists content_public_read on public.site_content;
create policy content_public_read on public.site_content for select to anon,authenticated using (true);
drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings for select to anon,authenticated using (true);

-- Attach the existing Supabase Auth user to the Admin role.
-- The Auth user must already exist with this exact email.
insert into public.profiles (id, full_name, role)
select id, 'Haroon Ibn Rasheed', 'admin'
from auth.users
where email = 'easyquranlearning10@gmail.com'
on conflict (id) do update
set full_name = 'Haroon Ibn Rasheed',
    role = 'admin';
