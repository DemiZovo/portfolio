begin;

create table if not exists public.site_likes (
  target text primary key,
  like_count bigint not null default 0 check (like_count >= 0),
  constraint site_likes_home_target check (target = 'home')
);

alter table public.site_likes enable row level security;
revoke all on table public.site_likes from anon, authenticated;

insert into public.site_likes (target, like_count)
values ('home', 0)
on conflict (target) do nothing;

create or replace function public.get_home_like_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select like_count
  from public.site_likes
  where target = 'home';
$$;

create or replace function public.increment_home_like_count()
returns bigint
language sql
volatile
security definer
set search_path = ''
as $$
  update public.site_likes
  set like_count = like_count + 1
  where target = 'home'
  returning like_count;
$$;

revoke execute on function public.get_home_like_count() from public, anon, authenticated;
revoke execute on function public.increment_home_like_count() from public, anon, authenticated;
grant execute on function public.get_home_like_count() to anon;
grant execute on function public.increment_home_like_count() to anon;

commit;
