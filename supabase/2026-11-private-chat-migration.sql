-- Haroon Ibn Rasheed Online Quran Academy
-- SAFE ADDITIVE PRIVATE CHAT MIGRATION for the existing Supabase project.
-- Run in Supabase SQL Editor after taking a database backup.
-- Does not delete or rewrite existing academy records or legacy conversations/messages.

create extension if not exists pgcrypto;

-- Check that the existing base schema is present before proceeding.
do $$ begin
  if to_regclass('public.profiles') is null then raise exception 'Missing public.profiles; apply the existing Supabase schema first.'; end if;
  if to_regclass('public.student_enrollments') is null then raise exception 'Missing public.student_enrollments; apply the existing Supabase schema first.'; end if;
end $$;

create table if not exists public.private_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_one uuid not null references public.profiles(id) on delete cascade,
  participant_two uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint private_conversations_distinct_users check (participant_one <> participant_two),
  constraint private_conversations_ordered_users check (participant_one < participant_two),
  unique(participant_one, participant_two)
);

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.private_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Attachment metadata is private and points to objects in the private Storage bucket.
create table if not exists public.private_message_files (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.private_messages(id) on delete cascade,
  conversation_id uuid not null references public.private_conversations(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now()
);

create index if not exists private_messages_conversation_created_idx on public.private_messages(conversation_id, created_at);
create index if not exists private_messages_unread_idx on public.private_messages(conversation_id, read_at) where read_at is null;
create index if not exists private_files_conversation_idx on public.private_message_files(conversation_id, created_at);

-- Read access remains available to the original participants, preserving old history
-- after an assignment changes. Sending is separately re-authorized against the current assignment.
create or replace function public.private_chat_can_read(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_admin() or exists (
    select 1 from public.private_conversations c
    where c.id=p_conversation_id and auth.uid() in (c.participant_one,c.participant_two)
  );
$$;

create or replace function public.private_chat_pair_allowed(p_user_one uuid,p_user_two uuid)
returns boolean language plpgsql stable security definer set search_path=public
as $$
declare r1 text; r2 text; student_uid uuid; teacher_uid uuid;
begin
  if auth.uid() is null then return false; end if;
  if public.is_admin() then return true; end if;
  select lower(role) into r1 from public.profiles where id=p_user_one;
  select lower(role) into r2 from public.profiles where id=p_user_two;
  if r1 is null or r2 is null then return false; end if;
  if (r1='admin' and p_user_two=auth.uid()) or (r2='admin' and p_user_one=auth.uid()) then
    return auth.uid() in (p_user_one,p_user_two);
  end if;
  if r1='student' and r2='teacher' then student_uid:=p_user_one; teacher_uid:=p_user_two;
  elsif r2='student' and r1='teacher' then student_uid:=p_user_two; teacher_uid:=p_user_one;
  else return false;
  end if;
  if auth.uid() not in (student_uid,teacher_uid) then return false; end if;
  return exists (
    select 1 from public.student_enrollments e
    where e.student_id=student_uid and e.teacher_id=teacher_uid and e.status='active'
  ) or exists (
    select 1 from public.class_schedule s
    where s.student_id=student_uid and s.teacher_id=teacher_uid and s.status in ('scheduled','active')
  );
end;
$$;

create or replace function public.private_chat_can_send(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.private_conversations c
    where c.id=p_conversation_id
      and auth.uid() in (c.participant_one,c.participant_two)
      and public.private_chat_pair_allowed(c.participant_one,c.participant_two)
  );
$$;

create or replace function public.mark_private_messages_read(p_conversation_id uuid)
returns integer language plpgsql security definer set search_path=public
as $$
declare changed integer;
begin
  if not public.private_chat_can_read(p_conversation_id) then raise exception 'Conversation access denied'; end if;
  update public.private_messages set read_at=coalesce(read_at,now()), delivered_at=coalesce(delivered_at,now())
  where conversation_id=p_conversation_id and sender_id <> auth.uid() and read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;
grant execute on function public.mark_private_messages_read(uuid) to authenticated;

create or replace function public.open_private_conversation(p_other_user uuid)
returns uuid language plpgsql security definer set search_path=public
as $$
declare a uuid; b uuid; result_id uuid;
begin
  if auth.uid() is null or p_other_user is null or p_other_user=auth.uid() then raise exception 'Invalid conversation participant'; end if;
  if not public.private_chat_pair_allowed(auth.uid(),p_other_user) then raise exception 'You are not allowed to message this user'; end if;
  if auth.uid() < p_other_user then a:=auth.uid(); b:=p_other_user; else a:=p_other_user; b:=auth.uid(); end if;
  insert into public.private_conversations(participant_one,participant_two,created_by)
  values(a,b,auth.uid()) on conflict(participant_one,participant_two) do update set participant_one=excluded.participant_one
  returning id into result_id;
  return result_id;
end;
$$;
grant execute on function public.open_private_conversation(uuid) to authenticated;

alter table public.private_conversations enable row level security;
alter table public.private_messages enable row level security;
alter table public.private_message_files enable row level security;

drop policy if exists private_conversations_read on public.private_conversations;
create policy private_conversations_read on public.private_conversations for select to authenticated
using (public.is_admin() or auth.uid() in (participant_one,participant_two));
drop policy if exists private_conversations_insert on public.private_conversations;
create policy private_conversations_insert on public.private_conversations for insert to authenticated
with check (created_by=auth.uid() and public.private_chat_pair_allowed(participant_one,participant_two));
drop policy if exists private_conversations_admin_update on public.private_conversations;
create policy private_conversations_admin_update on public.private_conversations for update to authenticated
using(public.is_admin()) with check(public.is_admin());

drop policy if exists private_messages_read on public.private_messages;
create policy private_messages_read on public.private_messages for select to authenticated
using(public.private_chat_can_read(conversation_id));
drop policy if exists private_messages_insert on public.private_messages;
create policy private_messages_insert on public.private_messages for insert to authenticated
with check (sender_id=auth.uid() and public.private_chat_can_send(conversation_id));
-- Read receipts are updated only through mark_private_messages_read(), not arbitrary row updates.

drop policy if exists private_message_files_read on public.private_message_files;
create policy private_message_files_read on public.private_message_files for select to authenticated
using(public.private_chat_can_read(conversation_id));
drop policy if exists private_message_files_insert on public.private_message_files;
create policy private_message_files_insert on public.private_message_files for insert to authenticated
with check(uploaded_by=auth.uid() and public.private_chat_can_send(conversation_id));

-- Create a private bucket. 25 MiB maximum per file; adjust only if your plan/policy allows it.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-private-chat','academy-private-chat',false,26214400,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav'])
on conflict(id) do update set public=false, file_size_limit=26214400, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists academy_chat_storage_read on storage.objects;
create policy academy_chat_storage_read on storage.objects for select to authenticated
using(bucket_id='academy-private-chat' and public.private_chat_can_read((storage.foldername(name))[1]::uuid));
drop policy if exists academy_chat_storage_insert on storage.objects;
create policy academy_chat_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='academy-private-chat' and public.private_chat_can_send((storage.foldername(name))[1]::uuid));
drop policy if exists academy_chat_storage_delete on storage.objects;
create policy academy_chat_storage_delete on storage.objects for delete to authenticated
using(bucket_id='academy-private-chat' and (owner_id=auth.uid()::text or public.is_admin()));

-- Realtime publication for instant message updates (safe if already added).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='private_messages') then
    alter publication supabase_realtime add table public.private_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='private_conversations') then
    alter publication supabase_realtime add table public.private_conversations;
  end if;
end $$;

-- IMPORTANT:
-- 1) Existing legacy conversations/messages are intentionally untouched.
-- 2) A student's current teacher must have an active row in student_enrollments,
--    or an active/scheduled class_schedule row, to start/send teacher chat.
-- 3) Storage object paths must begin with the private conversation UUID: <conversation-uuid>/<random-file-name>.
-- 4) This migration creates the secure database/storage foundation only; a matching chat UI,
--    audio recorder, download/cache workflow, push notifications and end-to-end tests are still required.
