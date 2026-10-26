-- Run after supabase-editor.sql. Reuses the existing owner account and permissions.
begin;
create table if not exists public.note_categories (
  id boolean primary key default true check (id),
  categories jsonb default null,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  check (categories is null or (jsonb_typeof(categories) = 'array' and jsonb_array_length(categories) <= 60))
);
insert into public.note_categories(id) values (true) on conflict do nothing;
alter table public.note_categories enable row level security;
revoke all on public.note_categories from public, anon, authenticated;
grant select on public.note_categories to anon, authenticated, service_role;
drop policy if exists public_category_read on public.note_categories;
create policy public_category_read on public.note_categories for select to anon, authenticated using (true);

create or replace function public.save_note_categories(expected_version integer, category_list jsonb)
returns public.note_categories language plpgsql security definer set search_path = '' as $$
declare current_row public.note_categories;
begin
  if not public.is_site_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if category_list is null or jsonb_typeof(category_list) <> 'array' then raise exception 'Invalid categories'; end if;
  if jsonb_array_length(category_list) > 60 then raise exception 'Too many categories'; end if;
  select * into current_row from public.note_categories where id = true for update;
  if not found then raise exception 'Not initialized'; end if;
  if expected_version is null or current_row.version <> expected_version then raise exception 'Version conflict' using errcode = '40001'; end if;
  update public.note_categories set categories = category_list, version = version + 1, updated_at = now()
    where id = true returning * into current_row;
  return current_row;
end;
$$;
revoke all on function public.save_note_categories(integer,jsonb) from public, anon;
grant execute on function public.save_note_categories(integer,jsonb) to authenticated;
commit;
