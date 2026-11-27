begin;
-- Only RPCs may write availability and game-night records.
revoke insert,delete on public.availability from authenticated;
revoke insert,update on public.game_nights from authenticated;
revoke update(availability_updated_at) on public.allowed_discord_users from authenticated;

create function public.set_my_availability(p_dates date[], p_available boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  member_id text := public.current_discord_id();
  local_today date;
begin
  if member_id is null then raise exception 'Access denied'; end if;
  select (now() at time zone a.timezone)::date into local_today
    from public.allowed_discord_users a where a.discord_id=member_id for update;
  if p_dates is null or cardinality(p_dates) not between 1 and 62 or p_available is null
     or exists (select 1 from unnest(p_dates) d where d is null or d < local_today)
  then raise exception 'Invalid availability dates'; end if;
  if p_available then
    insert into public.availability(discord_id,date)
      select member_id,d from unnest(p_dates) d on conflict do nothing;
  else
    delete from public.availability where discord_id=member_id and date=any(p_dates);
  end if;
  update public.allowed_discord_users set availability_updated_at=now() where discord_id=member_id;
end;
$$;
revoke all on function public.set_my_availability(date[],boolean) from public;
grant execute on function public.set_my_availability(date[],boolean) to authenticated;

create function public.save_game_night(p_date date,p_status text,p_attendance jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  member_id text := public.current_discord_id();
  local_today date;
begin
  if member_id is null then raise exception 'Access denied'; end if;
  select (now() at time zone a.timezone)::date into local_today
    from public.allowed_discord_users a where a.discord_id=member_id;
  if p_date is null or p_date > local_today or p_status is null or p_status not in ('played','no_game')
    or p_attendance is null or jsonb_typeof(p_attendance) <> 'object'
  then raise exception 'Invalid game night'; end if;
  if p_status='no_game' then
    p_attendance := '{}'::jsonb;
  else
    if exists (select 1 from jsonb_each_text(p_attendance) e
        where e.value is null or e.value not in ('played','rotated_out','did_not_join')
        or not exists(select 1 from public.allowed_discord_users a where a.discord_id=e.key))
       or not exists(select 1 from jsonb_each_text(p_attendance) e where e.value='played')
    then raise exception 'Invalid attendance'; end if;
  end if;
  insert into public.game_nights(date,status,available_user_ids,attendance,recorded_by,recorded_at)
  values(p_date,p_status,array(select a.discord_id from public.availability a where a.date=p_date order by a.discord_id),p_attendance,member_id,now())
  on conflict(date) do update set status=excluded.status,attendance=excluded.attendance,
    recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at;
end;
$$;
revoke all on function public.save_game_night(date,text,jsonb) from public;
grant execute on function public.save_game_night(date,text,jsonb) to authenticated;

create function public.refresh_my_profile()
returns void language plpgsql security definer set search_path = '' as $$
declare
  member_id text := public.current_discord_id();
  profile jsonb;
begin
  if member_id is null then raise exception 'Access denied'; end if;
  select i.identity_data into profile from auth.identities i
   where i.user_id=auth.uid() and i.provider='discord' and i.provider_id=member_id;
  update public.allowed_discord_users
    set avatar_url=case when profile->>'avatar_url' like 'https://cdn.discordapp.com/%'
                         then profile->>'avatar_url' else avatar_url end
    where discord_id=member_id;
end;
$$;
revoke all on function public.refresh_my_profile() from public;
grant execute on function public.refresh_my_profile() to authenticated;
commit;
