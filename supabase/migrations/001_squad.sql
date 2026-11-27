begin;
create table public.allowed_discord_users (
 discord_id text primary key check (discord_id ~ '^[0-9]{17,20}$'),
 display_name text not null,
 avatar_url text not null default '',
 timezone text not null default 'America/Los_Angeles',
 availability_updated_at timestamptz
);
alter table public.allowed_discord_users enable row level security;
create function public.current_discord_id() returns text language sql stable security definer set search_path = '' as $$
 select i.provider_id from auth.identities i join public.allowed_discord_users a on a.discord_id=i.provider_id
 where i.user_id=auth.uid() and i.provider='discord' limit 1
$$;
revoke all on function public.current_discord_id() from public;
grant execute on function public.current_discord_id() to authenticated;
create policy roster_read on public.allowed_discord_users for select to authenticated using (public.current_discord_id() is not null);
revoke all on public.allowed_discord_users from anon, authenticated;
grant select on public.allowed_discord_users to authenticated;
grant update(timezone, availability_updated_at) on public.allowed_discord_users to authenticated;
create policy roster_update on public.allowed_discord_users for update to authenticated using (discord_id=public.current_discord_id()) with check (discord_id=public.current_discord_id());
alter table public.allowed_discord_users add constraint valid_timezone check (timezone in ('America/Los_Angeles','America/Denver','America/New_York'));
create table public.availability (
 discord_id text references public.allowed_discord_users on delete cascade,
 date date not null,
 primary key(discord_id,date)
);
alter table public.availability enable row level security;
revoke all on public.availability from anon, authenticated;
grant select,insert,delete on public.availability to authenticated;
create policy availability_read on public.availability for select to authenticated using (public.current_discord_id() is not null);
create policy availability_insert on public.availability for insert to authenticated with check (discord_id=public.current_discord_id());
create policy availability_delete on public.availability for delete to authenticated using (discord_id=public.current_discord_id());
create table public.game_nights (
 date date primary key,
 status text not null check (status in ('played','no_game')),
 available_user_ids text[] not null,
 attendance jsonb not null check (jsonb_typeof(attendance)='object'),
 recorded_by text not null,
 recorded_at timestamptz not null default now()
);
alter table public.game_nights enable row level security;
revoke all on public.game_nights from anon, authenticated;
grant select,insert,update,delete on public.game_nights to authenticated;
create policy nights_read on public.game_nights for select to authenticated using (public.current_discord_id() is not null);
create policy nights_insert on public.game_nights for insert to authenticated with check (recorded_by=public.current_discord_id());
create policy nights_update on public.game_nights for update to authenticated using (public.current_discord_id() is not null) with check (recorded_by=public.current_discord_id());
create policy nights_delete on public.game_nights for delete to authenticated using (public.current_discord_id() is not null);
commit;
