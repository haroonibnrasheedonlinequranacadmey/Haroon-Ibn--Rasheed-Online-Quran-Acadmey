-- Haroon Ibn Rasheed Online Quran Academy
-- PROFESSIONAL TEACHER MESSAGING SETUP
-- Run this file once in Supabase SQL Editor.

-- 1) Conversation routing columns
alter table public.conversations add column if not exists conversation_type text not null default 'public';
alter table public.conversations add column if not exists teacher_id uuid references public.profiles(id) on delete cascade;
alter table public.conversations add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.conversations add column if not exists teacher_read_at timestamptz;
alter table public.conversations add column if not exists admin_read_at timestamptz;

alter table public.conversations drop constraint if exists conversations_type_check;
alter table public.conversations add constraint conversations_type_check check(conversation_type in ('public','teacher','student'));

create index if not exists conversations_teacher_idx on public.conversations(teacher_id,updated_at desc);
create index if not exists conversations_type_idx on public.conversations(conversation_type,updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at desc);

-- 2) Teacher security: teacher sees only conversations addressed to that teacher
drop policy if exists conversations_teacher_read on public.conversations;
create policy conversations_teacher_read on public.conversations for select to authenticated
using (conversation_type='teacher' and teacher_id=auth.uid());

drop policy if exists conversations_teacher_update on public.conversations;
create policy conversations_teacher_update on public.conversations for update to authenticated
using (conversation_type='teacher' and teacher_id=auth.uid())
with check (conversation_type='teacher' and teacher_id=auth.uid());

drop policy if exists messages_teacher_read on public.messages;
create policy messages_teacher_read on public.messages for select to authenticated
using (exists(select 1 from public.conversations c where c.id=messages.conversation_id and c.conversation_type='teacher' and c.teacher_id=auth.uid()));

drop policy if exists messages_teacher_insert on public.messages;
create policy messages_teacher_insert on public.messages for insert to authenticated
with check (sender_type='teacher' and sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=messages.conversation_id and c.conversation_type='teacher' and c.teacher_id=auth.uid()));

-- Admin retains full messaging access
drop policy if exists conversations_admin_all on public.conversations;
create policy conversations_admin_all on public.conversations for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists messages_admin_all on public.messages;
create policy messages_admin_all on public.messages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) Teacher creates a private thread addressed ONLY to that teacher
create or replace function public.create_teacher_conversation(p_name text,p_email text,p_subject text,p_message text)
returns json language plpgsql security definer set search_path=public
as $$
declare c public.conversations; uid uuid;
begin
  uid:=auth.uid();
  if uid is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=uid and lower(role)='teacher') then raise exception 'Teacher access required'; end if;
  insert into public.conversations(name,email,subject,conversation_type,teacher_id,status,updated_at)
  values(trim(p_name),nullif(trim(p_email),''),coalesce(nullif(trim(p_subject),''),'Teacher Message'),'teacher',uid,'open',now())
  returning * into c;
  insert into public.messages(conversation_id,sender_type,sender_id,body) values(c.id,'teacher',uid,trim(p_message));
  return json_build_object('id',c.id,'token',c.public_token);
end $$;

grant execute on function public.create_teacher_conversation(text,text,text,text) to authenticated;

-- 4) Teacher replies only inside their own conversation
create or replace function public.add_teacher_message(p_thread_id uuid,p_message text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare uid uuid;
begin
  uid:=auth.uid();
  if uid is null then return false; end if;
  if not exists(select 1 from public.conversations where id=p_thread_id and conversation_type='teacher' and teacher_id=uid) then return false; end if;
  insert into public.messages(conversation_id,sender_type,sender_id,body) values(p_thread_id,'teacher',uid,trim(p_message));
  update public.conversations set status='replied',updated_at=now() where id=p_thread_id and teacher_id=uid;
  return true;
end $$;

grant execute on function public.add_teacher_message(uuid,text) to authenticated;

-- 5) Teacher message history
create or replace function public.get_teacher_messages(p_thread_id uuid)
returns table(id uuid,sender_type text,body text,created_at timestamptz)
language sql security definer set search_path=public
as $$
  select m.id,m.sender_type,m.body,m.created_at
  from public.messages m
  where m.conversation_id=p_thread_id
    and exists(select 1 from public.conversations c where c.id=p_thread_id and c.conversation_type='teacher' and c.teacher_id=auth.uid())
  order by m.created_at asc
$$;

grant execute on function public.get_teacher_messages(uuid) to authenticated;

-- 6) Public website conversations remain separate
create or replace function public.create_public_conversation(p_name text,p_email text,p_subject text,p_message text)
returns json language plpgsql security definer set search_path=public
as $$
declare c public.conversations;
begin
  insert into public.conversations(name,email,subject,conversation_type,status,updated_at)
  values(trim(p_name),nullif(trim(p_email),''),coalesce(nullif(trim(p_subject),''),'General Inquiry'),'public','open',now())
  returning * into c;
  insert into public.messages(conversation_id,sender_type,body) values(c.id,'visitor',trim(p_message));
  return json_build_object('id',c.id,'token',c.public_token);
end $$;

grant execute on function public.create_public_conversation(text,text,text,text) to anon,authenticated;

create or replace function public.add_public_message(p_thread_id uuid,p_token uuid,p_message text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.conversations where id=p_thread_id and public_token=p_token and conversation_type='public') then return false; end if;
  insert into public.messages(conversation_id,sender_type,body) values(p_thread_id,'visitor',trim(p_message));
  update public.conversations set status='open',updated_at=now() where id=p_thread_id;
  return true;
end $$;

grant execute on function public.add_public_message(uuid,uuid,text) to anon,authenticated;

-- Done. Admin can now route teacher messages by teacher_id, while public messages stay separate.
