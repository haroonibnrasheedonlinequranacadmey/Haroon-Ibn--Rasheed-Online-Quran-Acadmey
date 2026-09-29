-- HAROON IBN RASHEED ONLINE QURAN ACADEMY
-- FINAL SUPABASE SCHEMA + RLS
-- Run this complete script in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 role text not null default 'student' check(role in('admin','teacher','student')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.admissions(
 id uuid primary key default gen_random_uuid(), student_name text not null, father_name text,
 age integer, phone text not null, email text, course text, message text,
 status text not null default 'new' check(status in('new','contacted','trial','enrolled','rejected')),
 admin_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.courses(
 id uuid primary key default gen_random_uuid(), title text not null, description text, image_url text, link_url text,
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.teachers(
 id uuid primary key default gen_random_uuid(), name text not null, gender text, bio text, image_url text,
 user_id uuid unique references public.profiles(id) on delete set null, active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.students(
 id uuid primary key default gen_random_uuid(), full_name text not null, father_name text, phone text, email text,
 course text, teacher text, user_id uuid unique references public.profiles(id) on delete set null,
 teacher_id uuid references public.teachers(id) on delete set null, course_id uuid references public.courses(id) on delete set null,
 status text default 'active', created_at timestamptz not null default now()
);
create table if not exists public.fees(
 id uuid primary key default gen_random_uuid(), country text not null, course text, amount text, currency text,
 period text default 'monthly', active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.faqs(
 id uuid primary key default gen_random_uuid(), question text not null, answer text not null,
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.site_content(
 id uuid primary key default gen_random_uuid(), content_key text unique not null, content_value text,
 updated_at timestamptz not null default now()
);
create table if not exists public.site_settings(
 id uuid primary key default gen_random_uuid(), setting_key text unique not null, setting_value text,
 updated_at timestamptz not null default now()
);
create table if not exists public.schedules(
 id uuid primary key default gen_random_uuid(), teacher_id uuid references public.teachers(id) on delete cascade,
 student_id uuid references public.students(id) on delete cascade, course_id uuid references public.courses(id) on delete set null,
 class_date date not null, start_time time not null, end_time time not null,
 meeting_url text, status text not null default 'scheduled' check(status in('scheduled','active','completed','cancelled')),
 notes text, created_at timestamptz not null default now(),
 check(end_time>start_time)
);
create table if not exists public.classes(
 id uuid primary key default gen_random_uuid(), schedule_id uuid references public.schedules(id) on delete set null,
 teacher_id uuid references public.teachers(id) on delete cascade, student_id uuid references public.students(id) on delete cascade,
 course_id uuid references public.courses(id) on delete set null, class_date date not null default current_date,
 started_at timestamptz, ended_at timestamptz, status text not null default 'scheduled' check(status in('scheduled','active','completed','cancelled')),
 meeting_url text, lesson_notes text, created_at timestamptz not null default now()
);
create table if not exists public.attendance(
 id uuid primary key default gen_random_uuid(), class_id uuid references public.classes(id) on delete cascade,
 student_id uuid references public.students(id) on delete cascade, teacher_id uuid references public.teachers(id) on delete cascade,
 attendance_date date not null default current_date, status text not null check(status in('present','absent','late')),
 notes text, created_at timestamptz not null default now(), unique(class_id,student_id)
);
create table if not exists public.leaves(
 id uuid primary key default gen_random_uuid(), requester_profile_id uuid references public.profiles(id) on delete cascade,
 teacher_id uuid references public.teachers(id) on delete set null, student_id uuid references public.students(id) on delete set null,
 start_date date not null, end_date date not null, reason text not null,
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 admin_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(end_date>=start_date)
);
create table if not exists public.teacher_salaries(
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teachers(id) on delete cascade,
 salary_month date not null, amount numeric(12,2) not null check(amount>=0), currency text default 'USD',
 status text not null default 'pending' check(status in('pending','paid','partial')),
 paid_at timestamptz, notes text, created_at timestamptz not null default now(), unique(teacher_id,salary_month)
);
create table if not exists public.student_payments(
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 payment_month date not null, amount numeric(12,2) not null check(amount>=0), currency text default 'USD',
 method text, reference text, status text not null default 'paid' check(status in('pending','paid','partial','refunded')),
 paid_at timestamptz, notes text, created_at timestamptz not null default now()
);
create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete cascade,
 title text not null, message text not null, read boolean not null default false,
 created_at timestamptz not null default now()
);

alter table public.teachers add column if not exists user_id uuid unique references public.profiles(id) on delete set null;
alter table public.students add column if not exists user_id uuid unique references public.profiles(id) on delete set null;
alter table public.students add column if not exists teacher_id uuid references public.teachers(id) on delete set null;
alter table public.students add column if not exists course_id uuid references public.courses(id) on delete set null;

create or replace function public.current_role() returns text
language sql stable security definer set search_path=public
as $$select role from public.profiles where id=auth.uid() limit 1$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public
as $$select public.current_role()='admin'$$;

create or replace function public.my_teacher_id() returns uuid
language sql stable security definer set search_path=public
as $$select id from public.teachers where user_id=auth.uid() limit 1$$;

create or replace function public.my_student_id() returns uuid
language sql stable security definer set search_path=public
as $$select id from public.students where user_id=auth.uid() limit 1$$;

create or replace function public.is_my_student(p_student uuid) returns boolean
language sql stable security definer set search_path=public
as $$select exists(select 1 from public.students where id=p_student and teacher_id=public.my_teacher_id())$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
 insert into public.profiles(id,full_name,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1)),'student')
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.sync_role_record() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
 if new.role='teacher' then
   insert into public.teachers(name,user_id,active) values(coalesce(new.full_name,'Teacher'),new.id,true)
   on conflict(user_id) do update set name=excluded.name;
 elsif new.role='student' then
   insert into public.students(full_name,email,user_id,status)
   select coalesce(new.full_name,'Student'),u.email,new.id,'active' from auth.users u where u.id=new.id
   on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email;
 end if;
 return new;
end $$;
drop trigger if exists profile_role_sync on public.profiles;
create trigger profile_role_sync after insert or update of role,full_name on public.profiles
for each row execute procedure public.sync_role_record();

do $$ declare t text; begin
 foreach t in array ARRAY['profiles','admissions','courses','teachers','students','fees','faqs','site_content','site_settings','schedules','classes','attendance','leaves','teacher_salaries','student_payments','notifications']
 loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

do $$ declare r record; begin
 for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' loop
   execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename);
 end loop;
end $$;

-- Profiles
create policy profiles_self_select on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_admin_all on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
using(id=auth.uid()) with check(id=auth.uid() and role=public.current_role());

-- Admissions
create policy admissions_public_insert on public.admissions for insert to anon,authenticated
with check(status='new' and admin_notes is null);
create policy admissions_admin_all on public.admissions for all to authenticated
using(public.is_admin()) with check(public.is_admin());

-- Safe public master data
create policy courses_public_read on public.courses for select to anon,authenticated using(active=true);
create policy fees_public_read on public.fees for select to anon,authenticated using(active=true);
create policy faqs_public_read on public.faqs for select to anon,authenticated using(active=true);
create policy content_public_read on public.site_content for select to anon,authenticated using(true);

-- Admin master CRUD
create policy courses_admin_all on public.courses for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy teachers_admin_all on public.teachers for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy students_admin_all on public.students for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy fees_admin_all on public.fees for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy faqs_admin_all on public.faqs for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy content_admin_all on public.site_content for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy settings_admin_all on public.site_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Teacher
create policy teachers_self_select on public.teachers for select to authenticated using(user_id=auth.uid());
create policy teacher_students_select on public.students for select to authenticated using(teacher_id=public.my_teacher_id() or user_id=auth.uid());
create policy teacher_schedules_select on public.schedules for select to authenticated using(teacher_id=public.my_teacher_id());
create policy teacher_classes_select on public.classes for select to authenticated using(teacher_id=public.my_teacher_id());
create policy teacher_classes_insert on public.classes for insert to authenticated
with check(teacher_id=public.my_teacher_id() and public.is_my_student(student_id));
create policy teacher_classes_update on public.classes for update to authenticated
using(teacher_id=public.my_teacher_id()) with check(teacher_id=public.my_teacher_id() and public.is_my_student(student_id));
create policy teacher_attendance_select on public.attendance for select to authenticated using(teacher_id=public.my_teacher_id());
create policy teacher_attendance_insert on public.attendance for insert to authenticated
with check(teacher_id=public.my_teacher_id() and public.is_my_student(student_id));
create policy teacher_attendance_update on public.attendance for update to authenticated
using(teacher_id=public.my_teacher_id()) with check(teacher_id=public.my_teacher_id() and public.is_my_student(student_id));
create policy teacher_leaves_select on public.leaves for select to authenticated using(teacher_id=public.my_teacher_id() or requester_profile_id=auth.uid());
create policy teacher_leaves_insert on public.leaves for insert to authenticated
with check(requester_profile_id=auth.uid() and teacher_id=public.my_teacher_id());
create policy teacher_salary_select on public.teacher_salaries for select to authenticated using(teacher_id=public.my_teacher_id());
create policy teacher_courses_select on public.courses for select to authenticated using(active=true);

-- Student
create policy student_self_select on public.students for select to authenticated using(user_id=auth.uid());
create policy student_schedule_select on public.schedules for select to authenticated using(student_id=public.my_student_id());
create policy student_classes_select on public.classes for select to authenticated using(student_id=public.my_student_id());
create policy student_attendance_select on public.attendance for select to authenticated using(student_id=public.my_student_id());
create policy student_leave_select on public.leaves for select to authenticated using(student_id=public.my_student_id() and requester_profile_id=auth.uid());
create policy student_leave_insert on public.leaves for insert to authenticated
with check(requester_profile_id=auth.uid() and student_id=public.my_student_id());
create policy student_payments_select on public.student_payments for select to authenticated using(student_id=public.my_student_id());
create policy student_courses_select on public.courses for select to authenticated using(active=true);
create policy student_teacher_select on public.teachers for select to authenticated
using(id=(select teacher_id from public.students where user_id=auth.uid() limit 1));

-- Notifications
create policy notification_self_select on public.notifications for select to authenticated using(profile_id=auth.uid());
create policy notification_self_update on public.notifications for update to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy notification_admin_all on public.notifications for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Admin operational CRUD
do $$ declare t text; begin
 foreach t in array ARRAY['schedules','classes','attendance','leaves','teacher_salaries','student_payments']
 loop execute format('create policy %I_admin_all on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t,t); end loop;
end $$;

-- Helpful indexes
create index if not exists idx_students_teacher on public.students(teacher_id);
create index if not exists idx_students_user on public.students(user_id);
create index if not exists idx_teachers_user on public.teachers(user_id);
create index if not exists idx_schedule_teacher_date on public.schedules(teacher_id,class_date);
create index if not exists idx_schedule_student_date on public.schedules(student_id,class_date);
create index if not exists idx_classes_teacher_date on public.classes(teacher_id,class_date);
create index if not exists idx_classes_student_date on public.classes(student_id,class_date);
create index if not exists idx_attendance_student_date on public.attendance(student_id,attendance_date);
create index if not exists idx_payments_student_month on public.student_payments(student_id,payment_month);
create index if not exists idx_salary_teacher_month on public.teacher_salaries(teacher_id,salary_month);

-- Existing admin account, if present
insert into public.profiles(id,full_name,role)
select id,'Haroon Ibn Rasheed','admin' from auth.users where email='easyquranlearning10@gmail.com'
on conflict(id) do update set full_name='Haroon Ibn Rasheed',role='admin',updated_at=now();

insert into public.site_settings(setting_key,setting_value) values
('academy_name','Haroon Ibn Rasheed Online Quran Academy'),
('whatsapp_1','+923478140162'),('whatsapp_2','+923189842581'),
('email','easyquranlearning10@gmail.com')
on conflict(setting_key) do nothing;
