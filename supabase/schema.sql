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


-- ============================================================
-- COMPLETE ACADEMY EXTENSIONS: MESSAGING, PAYMENTS, PORTALS
-- Safe to run after the original schema. Does not remove existing tables.
-- ============================================================

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_name text,
  account_number text,
  instructions text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  name text not null,
  email text,
  subject text default 'General Inquiry',
  status text not null default 'new' check(status in ('new','open','replied','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check(sender_type in ('visitor','student','admin','teacher')),
  sender_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check(status in ('pending','active','completed','cancelled')),
  progress integer not null default 0 check(progress between 0 and 100),
  enrolled_at timestamptz not null default now()
);

create table if not exists public.class_schedule (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  class_date date not null,
  start_time time,
  end_time time,
  meeting_link text,
  status text not null default 'scheduled' check(status in ('scheduled','active','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.class_schedule(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  status text not null check(status in ('present','absent','late')),
  notes text,
  created_at timestamptz not null default now(),
  unique(schedule_id,student_id)
);

create table if not exists public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2),
  currency text,
  method text,
  reference text,
  status text not null default 'pending' check(status in ('pending','paid','rejected')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  certificate_no text unique,
  issued_at date default current_date,
  file_url text
);

alter table public.payment_methods enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.class_schedule enable row level security;
alter table public.attendance enable row level security;
alter table public.student_payments enable row level security;
alter table public.certificates enable row level security;

-- Admin access.
do $$ declare t text; begin
  foreach t in array ARRAY['payment_methods','conversations','messages'] loop
    execute format('drop policy if exists %I_admin_all on public.%I',t,t);
    execute format('create policy %I_admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t,t);
  end loop;
end $$;

-- Public may only see enabled payment methods.
drop policy if exists payment_methods_public_read on public.payment_methods;
create policy payment_methods_public_read on public.payment_methods for select to anon,authenticated using (enabled=true);

-- Student can read their own portal records.
drop policy if exists enrollments_student_read on public.student_enrollments;
create policy enrollments_student_read on public.student_enrollments for select to authenticated using (student_id=auth.uid() or public.is_admin());

drop policy if exists schedule_student_read on public.class_schedule;
create policy schedule_student_read on public.class_schedule for select to authenticated using (student_id=auth.uid() or teacher_id=auth.uid() or public.is_admin());

drop policy if exists attendance_student_read on public.attendance;
create policy attendance_student_read on public.attendance for select to authenticated using (student_id=auth.uid() or teacher_id=auth.uid() or public.is_admin());

drop policy if exists payments_student_read on public.student_payments;
create policy payments_student_read on public.student_payments for select to authenticated using (student_id=auth.uid() or public.is_admin());

drop policy if exists certificates_student_read on public.certificates;
create policy certificates_student_read on public.certificates for select to authenticated using (student_id=auth.uid() or public.is_admin());

-- Teachers may manage classes/attendance assigned to them.
drop policy if exists schedule_teacher_manage on public.class_schedule;
create policy schedule_teacher_manage on public.class_schedule for all to authenticated
using (teacher_id=auth.uid() or public.is_admin())
with check (teacher_id=auth.uid() or public.is_admin());

drop policy if exists attendance_teacher_manage on public.attendance;
create policy attendance_teacher_manage on public.attendance for all to authenticated
using (teacher_id=auth.uid() or public.is_admin())
with check (teacher_id=auth.uid() or public.is_admin());

-- New Auth users become students by default; admin/teacher roles can be promoted by an admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),'student')
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Two-way public messaging. The public never receives direct table SELECT access;
-- these security-definer RPCs expose only the thread identified by its private token.
create or replace function public.create_public_conversation(p_name text,p_email text,p_subject text,p_message text)
returns json language plpgsql security definer set search_path=public
as $$
declare c public.conversations;
begin
  insert into public.conversations(name,email,subject) values(trim(p_name),nullif(trim(p_email),''),coalesce(nullif(trim(p_subject),''),'General Inquiry')) returning * into c;
  insert into public.messages(conversation_id,sender_type,body) values(c.id,'visitor',trim(p_message));
  return json_build_object('id',c.id,'token',c.public_token);
end $$;

create or replace function public.add_public_message(p_thread_id uuid,p_token uuid,p_message text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.conversations where id=p_thread_id and public_token=p_token) then return false; end if;
  insert into public.messages(conversation_id,sender_type,body) values(p_thread_id,'visitor',trim(p_message));
  update public.conversations set status='open',updated_at=now() where id=p_thread_id;
  return true;
end $$;

create or replace function public.get_public_messages(p_thread_id uuid,p_token uuid)
returns table(id uuid,sender_type text,body text,created_at timestamptz)
language sql security definer set search_path=public
as $$
  select m.id,m.sender_type,m.body,m.created_at
  from public.messages m join public.conversations c on c.id=m.conversation_id
  where c.id=p_thread_id and c.public_token=p_token
  order by m.created_at asc
$$;

grant execute on function public.create_public_conversation(text,text,text,text) to anon,authenticated;
grant execute on function public.add_public_message(uuid,uuid,text) to anon,authenticated;
grant execute on function public.get_public_messages(uuid,uuid) to anon,authenticated;


drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
using (id=auth.uid()) with check (id=auth.uid() and role in ('student','teacher'));

-- Admin may manage the portal's operational data.
do $$ declare t text; begin
  foreach t in array ARRAY['student_enrollments','student_payments','certificates'] loop
    execute format('drop policy if exists %I_admin_all on public.%I',t,t);
    execute format('create policy %I_admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t,t);
  end loop;
end $$;

drop policy if exists profiles_teacher_students on public.profiles;
create policy profiles_teacher_students on public.profiles for select to authenticated
using (
  id=auth.uid() or public.is_admin()
  or exists(select 1 from public.class_schedule s where s.teacher_id=auth.uid() and s.student_id=profiles.id)
);

create table if not exists public.testimonials (
 id uuid primary key default gen_random_uuid(),
 student_name text not null,
 review text not null,
 rating integer not null default 5 check(rating between 1 and 5),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.articles (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 excerpt text,
 body text,
 image_url text,
 published boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id) on delete cascade,
 title text not null,
 body text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
alter table public.articles enable row level security;
alter table public.notifications enable row level security;
drop policy if exists testimonials_public_read on public.testimonials; create policy testimonials_public_read on public.testimonials for select to anon,authenticated using (active=true);
drop policy if exists articles_public_read on public.articles; create policy articles_public_read on public.articles for select to anon,authenticated using (published=true);
drop policy if exists notifications_self_read on public.notifications; create policy notifications_self_read on public.notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists notifications_self_update on public.notifications; create policy notifications_self_update on public.notifications for update to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists testimonials_admin_all on public.testimonials; create policy testimonials_admin_all on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists articles_admin_all on public.articles; create policy articles_admin_all on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists notifications_admin_all on public.notifications; create policy notifications_admin_all on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- FINAL PORTAL COMPLETION PATCH
-- Adds the operational tables/relationships used by the Admin,
-- Teacher and Student portals. Safe to run after this file already exists.
-- ============================================================

alter table public.students add column if not exists account_id uuid references public.profiles(id) on delete set null;
alter table public.teachers add column if not exists account_id uuid references public.profiles(id) on delete set null;
create unique index if not exists students_account_id_uq on public.students(account_id) where account_id is not null;
create unique index if not exists teachers_account_id_uq on public.teachers(account_id) where account_id is not null;

create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check(role in ('teacher','student')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(end_date >= start_date)
);

create table if not exists public.teacher_salaries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  salary_month date not null,
  amount numeric(12,2) not null check(amount >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check(status in ('pending','paid','partial','cancelled')),
  paid_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(teacher_id,salary_month)
);

-- The UI supports partial/refunded payment records as well as pending/paid.
alter table public.student_payments drop constraint if exists student_payments_status_check;
alter table public.student_payments add constraint student_payments_status_check check(status in ('pending','paid','partial','rejected','refunded'));

alter table public.leaves enable row level security;
alter table public.teacher_salaries enable row level security;

-- Admin has complete control.
drop policy if exists leaves_admin_all on public.leaves;
create policy leaves_admin_all on public.leaves for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists salaries_admin_all on public.teacher_salaries;
create policy salaries_admin_all on public.teacher_salaries for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Teachers/students can only see and create their own leave requests.
drop policy if exists leaves_self_select on public.leaves;
create policy leaves_self_select on public.leaves for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists leaves_self_insert on public.leaves;
create policy leaves_self_insert on public.leaves for insert to authenticated with check(user_id=auth.uid() and role=(select role from public.profiles where id=auth.uid()) and role in ('teacher','student'));
drop policy if exists leaves_self_update on public.leaves;
create policy leaves_self_update on public.leaves for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and role in ('teacher','student'));

-- Teachers can see only their salary records; admin can manage all.
drop policy if exists salaries_teacher_read on public.teacher_salaries;
create policy salaries_teacher_read on public.teacher_salaries for select to authenticated using(teacher_id=auth.uid() or public.is_admin());

-- Teacher/student account records are private; admin manages them.
drop policy if exists students_self_read on public.students;
create policy students_self_read on public.students for select to authenticated using(account_id=auth.uid() or public.is_admin());
drop policy if exists teachers_self_read on public.teachers;
create policy teachers_self_read on public.teachers for select to authenticated using(account_id=auth.uid() or public.is_admin());

-- Teachers may read their own enrollments and assigned enrollments.
drop policy if exists enrollments_teacher_read on public.student_enrollments;
create policy enrollments_teacher_read on public.student_enrollments for select to authenticated using(teacher_id=auth.uid() or student_id=auth.uid() or public.is_admin());

-- Students may read their own class schedule; teachers may read/manage their assigned schedule.
-- (The existing schedule_teacher_manage policy remains in force.)

-- Make attendance notes visible only to the student, assigned teacher or admin.
drop policy if exists attendance_student_read on public.attendance;
create policy attendance_student_read on public.attendance for select to authenticated using(student_id=auth.uid() or teacher_id=auth.uid() or public.is_admin());

-- Payment rows are private to the student/admin.
drop policy if exists payments_student_read on public.student_payments;
create policy payments_student_read on public.student_payments for select to authenticated using(student_id=auth.uid() or public.is_admin());

-- Portal-friendly indexes.
create index if not exists class_schedule_teacher_date_idx on public.class_schedule(teacher_id,class_date,start_time);
create index if not exists class_schedule_student_date_idx on public.class_schedule(student_id,class_date,start_time);
create index if not exists attendance_student_idx on public.attendance(student_id,created_at desc);
create index if not exists attendance_teacher_idx on public.attendance(teacher_id,created_at desc);
create index if not exists leaves_user_idx on public.leaves(user_id,created_at desc);
create index if not exists salaries_teacher_month_idx on public.teacher_salaries(teacher_id,salary_month desc);
create index if not exists payments_student_idx on public.student_payments(student_id,created_at desc);

-- Keep profile role changes safe: users can edit their name but cannot self-promote.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),'student')
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Optional helper for admins to link a portal account to the academy's teacher/student record.
create or replace function public.link_academy_account(p_profile_id uuid,p_role text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_role not in ('teacher','student') then raise exception 'Role must be teacher or student'; end if;
  update public.profiles set role=p_role where id=p_profile_id;
  return found;
end $$;
grant execute on function public.link_academy_account(uuid,text) to authenticated;

-- Updated timestamps.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists leaves_touch_updated_at on public.leaves;
create trigger leaves_touch_updated_at before update on public.leaves for each row execute procedure public.touch_updated_at();
drop trigger if exists salaries_touch_updated_at on public.teacher_salaries;
create trigger salaries_touch_updated_at before update on public.teacher_salaries for each row execute procedure public.touch_updated_at();

-- Secure profile editing: users may change only their display name, never their role.
drop policy if exists profiles_self_update on public.profiles;
create or replace function public.update_my_profile(p_full_name text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  update public.profiles set full_name=trim(p_full_name) where id=auth.uid();
  return found;
end $$;
grant execute on function public.update_my_profile(text) to authenticated;

-- Teacher account UUIDs are private; public visitors should not receive the linked auth UUID.
drop policy if exists teachers_public_read on public.teachers;
