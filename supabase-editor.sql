-- Run once in Supabase SQL Editor. This does not modify the guestbook tables.
begin;
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create or replace function public.is_site_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.site_admins where user_id = auth.uid());
$$;
revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

-- A working copy and a public snapshot: saving never changes the live article.
create table if not exists public.editor_articles (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('blog', 'life')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  working jsonb not null,
  published jsonb,
  version integer not null default 1,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(kind, slug)
);
alter table public.editor_articles enable row level security;
revoke all on public.editor_articles from anon, authenticated;
grant select on public.editor_articles to authenticated;
grant select on public.editor_articles to service_role;
drop policy if exists owner_read on public.editor_articles;
create policy owner_read on public.editor_articles for select to authenticated
  using (public.is_site_admin());

-- Row lock and version check make every state transition atomic.
create or replace function public.edit_article(
  action text, article_id uuid default null, expected_version integer default null,
  article_kind text default null, article_slug text default null, document jsonb default null
) returns public.editor_articles
language plpgsql security definer set search_path = '' as $$
declare current_row public.editor_articles;
begin
  if not public.is_site_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if action = 'create' then
    if document is null then raise exception 'Missing document'; end if;
    insert into public.editor_articles(kind, slug, working)
      values (article_kind, article_slug, document) returning * into current_row;
    return current_row;
  end if;
  select * into current_row from public.editor_articles where id = article_id for update;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  if expected_version is null or current_row.version <> expected_version then
    raise exception 'Version conflict' using errcode = '40001';
  end if;
  if action = 'purge' then
    if current_row.deleted_at is null then raise exception 'Trash first'; end if;
    delete from public.editor_articles where id = article_id;
    return current_row;
  end if;
  if action = 'restore' then
    current_row.deleted_at := null;
    -- Restore to a private draft, never republish implicitly.
    current_row.published := null;
  elsif action = 'trash' then
    current_row.deleted_at := now();
    current_row.published := null;
  elsif current_row.deleted_at is not null then
    raise exception 'Restore first';
  elsif action = 'save' then
    if document is null then raise exception 'Missing document'; end if;
    current_row.working := document;
  elsif action = 'publish' then
    if document is null then raise exception 'Missing document'; end if;
    current_row.working := document;
    current_row.published := document;
  elsif action = 'unpublish' then
    current_row.published := null;
  else
    raise exception 'Unknown action';
  end if;
  update public.editor_articles set working = current_row.working,
    published = current_row.published, deleted_at = current_row.deleted_at,
    updated_at = now(), version = version + 1
    where id = article_id returning * into current_row;
  return current_row;
end;
$$;
revoke all on function public.edit_article(text,uuid,integer,text,text,jsonb) from public, anon;
grant execute on function public.edit_article(text,uuid,integer,text,text,jsonb) to authenticated;
commit;

-- Create the owner in Supabase Auth, then insert their UUID manually:
-- insert into public.site_admins(user_id) values ('OWNER_USER_UUID');
