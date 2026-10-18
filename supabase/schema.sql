-- Run once in the Supabase SQL editor for a dedicated tracker project.
-- Rerunning preserves existing task records and memberships.
create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120)
);
create or replace function public.is_tracker_member()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.members where user_id = auth.uid()); $$;
revoke all on function public.is_tracker_member() from public, anon;
grant execute on function public.is_tracker_member() to authenticated;
alter table public.members enable row level security;
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_tracker_member());
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;

create table if not exists public.task_state (
  id text primary key,
  status text not null default 'pending' check (status in ('pending','in-progress','completed')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  due_date date check (due_date is null or due_date between date '1000-01-01' and date '9999-12-31'),
  notes text not null default '' check (length(notes) <= 10000),
  assignee_id uuid references public.members(user_id) on delete set null,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.task_state enable row level security;
drop policy if exists task_read on public.task_state;
create policy task_read on public.task_state for select to authenticated using (public.is_tracker_member());
revoke all on public.task_state from anon, authenticated;
grant select on public.task_state to authenticated;
-- No client insert/update/delete grants: mutations must use checked functions.

create or replace function public.load_tracker()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_tracker_member() then raise exception 'Not a tracker member' using errcode='42501'; end if;
  return jsonb_build_object('tasks',(select coalesce(jsonb_agg(t order by t.id),'[]'::jsonb) from public.task_state t),
    'members',(select coalesce(jsonb_agg(m order by m.display_name),'[]'::jsonb) from public.members m));
end;
$$;

create or replace function public.save_task(p_id text, p_expected_version integer, p_fields jsonb)
returns setof public.task_state language plpgsql security definer set search_path = '' as $$
declare current_record public.task_state; member_id uuid;
begin
  -- Hold membership until this transaction ends; removal cannot race a write.
  select user_id into member_id from public.members where user_id=auth.uid() for key share;
  if member_id is null then raise exception 'Not a tracker member' using errcode='42501'; end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then raise exception 'Invalid fields' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_fields)) <> 5
     or not (p_fields ?& array['status','priority','dueDate','notes','assigneeId']) then
    raise exception 'Unexpected fields' using errcode='22023';
  end if;
  if jsonb_typeof(p_fields->'status') <> 'string' or p_fields->>'status' not in ('pending','in-progress','completed')
     or jsonb_typeof(p_fields->'priority') <> 'string' or p_fields->>'priority' not in ('low','normal','high')
     or jsonb_typeof(p_fields->'notes') <> 'string' or length(p_fields->>'notes') > 10000 then
    raise exception 'Invalid task values' using errcode='22023';
  end if;
  if p_fields->'dueDate' <> 'null'::jsonb and
     (jsonb_typeof(p_fields->'dueDate') <> 'string' or p_fields->>'dueDate' !~ '^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$') then
    raise exception 'Invalid date' using errcode='22023';
  end if;
  if p_fields->'assigneeId' <> 'null'::jsonb and
     (jsonb_typeof(p_fields->'assigneeId') <> 'string' or p_fields->>'assigneeId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'Invalid assignee' using errcode='22023';
  end if;
  select * into current_record from public.task_state where id=p_id for update;
  if not found then raise exception 'Unknown task' using errcode='22023'; end if;
  if p_expected_version is null or current_record.version <> p_expected_version then
    raise exception 'Task version conflict' using errcode='40001';
  end if;
  return query update public.task_state set status=p_fields->>'status', priority=p_fields->>'priority',
    due_date=(p_fields->>'dueDate')::date, notes=p_fields->>'notes', assignee_id=(p_fields->>'assigneeId')::uuid,
    version=current_record.version+1, updated_at=clock_timestamp(), updated_by=auth.uid()
    where id=p_id returning *;
end;
$$;

create or replace function public.restore_tasks(p_records jsonb)
returns setof public.task_state language plpgsql security definer set search_path = '' as $$
declare entry jsonb; result_record public.task_state;
begin
  if not public.is_tracker_member() then raise exception 'Not a tracker member' using errcode='42501'; end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' then raise exception 'Invalid backup' using errcode='22023'; end if;
  if jsonb_array_length(p_records) < 1 or jsonb_array_length(p_records) > 74 then raise exception 'Invalid backup size' using errcode='22023'; end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_records)) <> jsonb_array_length(p_records) then
    raise exception 'Duplicate or missing IDs' using errcode='22023';
  end if;
  -- Stable lock ordering prevents two overlapping restores from deadlocking.
  for entry in select value from jsonb_array_elements(p_records) order by value->>'id' loop
    if jsonb_typeof(entry) <> 'object' or jsonb_typeof(entry->'id') <> 'string'
       or jsonb_typeof(entry->'version') is distinct from 'number'
       or entry->>'version' !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid record' using errcode='22023';
    end if;
    -- save_task checks exact fields, dates, assignees, membership and version.
    -- Any failure aborts the entire RPC transaction, including earlier rows.
    for result_record in select * from public.save_task(entry->>'id',(entry->>'version')::integer,entry-'id'-'version') loop
      return next result_record;
    end loop;
  end loop;
end;
$$;
revoke all on function public.load_tracker() from public, anon;
revoke all on function public.save_task(text,integer,jsonb) from public, anon;
revoke all on function public.restore_tasks(jsonb) from public, anon;
grant execute on function public.load_tracker() to authenticated;
grant execute on function public.save_task(text,integer,jsonb) to authenticated;
grant execute on function public.restore_tasks(jsonb) to authenticated;

insert into public.task_state(id) values ('0-0'),('0-1'),('0-2'),('0-3'),('0-4'),('0-5'),('0-6'),('0-7'),('1-0'),('1-1'),('1-2'),('1-3'),('1-4'),('1-5'),('1-6'),('1-7'),('1-8'),('1-9'),('1-10'),('1-11'),('1-12'),('1-13'),('1-14'),('1-15'),('1-16'),('2-0'),('2-1'),('2-2'),('2-3'),('2-4'),('2-5'),('2-6'),('2-7'),('3-0'),('3-1'),('3-2'),('3-3'),('3-4'),('3-5'),('4-0'),('4-1'),('4-2'),('4-3'),('4-4'),('4-5'),('4-6'),('4-7'),('4-8'),('5-0'),('5-1'),('5-2'),('5-3'),('6-0'),('6-1'),('6-2'),('6-3'),('6-4'),('6-5'),('6-6'),('6-7'),('6-8'),('6-9'),('7-0'),('7-1'),('7-2'),('7-3'),('7-4'),('8-0'),('8-1'),('8-2'),('8-3'),('8-4'),('8-5'),('8-6') on conflict (id) do nothing;
