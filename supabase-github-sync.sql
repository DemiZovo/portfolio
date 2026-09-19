-- Run after supabase-editor.sql. Durable public snapshots, including deletion tombstones.
begin;
create table if not exists public.article_github_queue (
  kind text not null, slug text not null, document jsonb,
  revision bigint not null default 1, pending boolean not null default true,
  primary key(kind, slug)
);
alter table public.article_github_queue enable row level security;
revoke all on public.article_github_queue from public, anon, authenticated;
create table if not exists public.article_github_lock (
  id boolean primary key default true check(id), lease uuid, expires timestamptz
);
insert into public.article_github_lock(id) values(true) on conflict do nothing;
alter table public.article_github_lock enable row level security;
revoke all on public.article_github_lock from public, anon, authenticated;

create or replace function public.enqueue_article_github() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.published is not distinct from old.published
    and new.deleted_at is not distinct from old.deleted_at then return new; end if;
  if TG_OP = 'INSERT' and new.published is null then return new; end if;
  if TG_OP = 'DELETE' then
    insert into public.article_github_queue(kind,slug,document) values(old.kind,old.slug,null)
    on conflict(kind,slug) do update set document=null, pending=true, revision=article_github_queue.revision+1;
    return old;
  end if;
  insert into public.article_github_queue(kind,slug,document)
    values(new.kind,new.slug,case when new.deleted_at is null then new.published else null end)
  on conflict(kind,slug) do update set document=excluded.document, pending=true, revision=article_github_queue.revision+1;
  return new;
end; $$;
revoke all on function public.enqueue_article_github() from public, anon, authenticated;
drop trigger if exists article_github_outbox on public.editor_articles;
create trigger article_github_outbox after insert or update or delete on public.editor_articles
for each row execute function public.enqueue_article_github();

create or replace function public.article_github_batch(operation text, lease_id uuid, job_kind text default null,
  job_slug text default null, job_revision bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare lock_row public.article_github_lock; jobs jsonb;
begin
  if not public.is_site_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into lock_row from public.article_github_lock where id=true for update;
  if operation = 'claim' then
    if lock_row.lease is not null and lock_row.expires > now() then return null; end if;
    update public.article_github_lock set lease=lease_id, expires=now()+interval '2 minutes' where id=true;
    select coalesce(jsonb_agg(j), '[]'::jsonb) into jobs from
      (select * from public.article_github_queue where pending order by kind,slug limit 5) j;
    return jobs;
  end if;
  if lock_row.lease is distinct from lease_id or lock_row.expires <= now() then raise exception 'Lease expired'; end if;
  if operation = 'ack' then
    update public.article_github_queue set pending=false where kind=job_kind and slug=job_slug and revision=job_revision;
  elsif operation = 'release' then
    update public.article_github_lock set lease=null, expires=null where id=true;
  else raise exception 'Unknown operation'; end if;
  return to_jsonb((select count(*) from public.article_github_queue where pending));
end; $$;
revoke all on function public.article_github_batch(text,uuid,text,text,bigint) from public, anon;
grant execute on function public.article_github_batch(text,uuid,text,text,bigint) to authenticated;
-- Seed existing public articles once; rerunning never replaces newer queue state.
insert into public.article_github_queue(kind,slug,document)
select kind,slug,published from public.editor_articles where published is not null and deleted_at is null
on conflict do nothing;
commit;
