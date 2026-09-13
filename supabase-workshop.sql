-- Run after supabase-editor.sql. Reuses the existing owner account and permissions.
begin;
create table if not exists public.workshop_projects (
  id boolean primary key default true check (id),
  projects jsonb default null,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  check (projects is null or (jsonb_typeof(projects) = 'array' and jsonb_array_length(projects) <= 60))
);
insert into public.workshop_projects(id) values (true) on conflict do nothing;
alter table public.workshop_projects enable row level security;
revoke all on public.workshop_projects from public, anon, authenticated;
grant select on public.workshop_projects to anon, authenticated, service_role;
drop policy if exists public_project_read on public.workshop_projects;
create policy public_project_read on public.workshop_projects for select to anon, authenticated using (true);

create or replace function public.save_workshop_projects(expected_version integer, project_list jsonb)
returns public.workshop_projects language plpgsql security definer set search_path = '' as $$
declare current_row public.workshop_projects;
begin
  if not public.is_site_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if project_list is null or jsonb_typeof(project_list) <> 'array' then raise exception 'Invalid projects'; end if;
  if jsonb_array_length(project_list) > 60 then raise exception 'Too many projects'; end if;
  select * into current_row from public.workshop_projects where id = true for update;
  if not found then raise exception 'Not initialized'; end if;
  if expected_version is null or current_row.version <> expected_version then raise exception 'Version conflict' using errcode = '40001'; end if;
  update public.workshop_projects set projects = project_list, version = version + 1, updated_at = now()
    where id = true returning * into current_row;
  return current_row;
end;
$$;
revoke all on function public.save_workshop_projects(integer,jsonb) from public, anon;
grant execute on function public.save_workshop_projects(integer,jsonb) to authenticated;
commit;
