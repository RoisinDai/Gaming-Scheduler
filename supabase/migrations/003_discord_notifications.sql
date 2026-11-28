-- Private notification state and a narrowly scoped secret-authenticated scheduler.
-- Does not enable any scheduled job or send Discord messages by itself.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table public.queue_up_notification_state (
  game_date date primary key,
  checked_hash text,
  candidate jsonb,
  candidate_since timestamptz,
  announced jsonb,
  pending boolean not null default false,
  lease_id uuid,
  lease_until timestamptz,
  delivery_status text,
  updated_at timestamptz not null default now()
);
alter table public.queue_up_notification_state enable row level security;
revoke all on public.queue_up_notification_state from public, anon, authenticated;

-- Only the internal scheduler reads the roster and history without a player session.
create function public.queue_up_notification_snapshot(p_date date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.discord_id, 'displayName', a.display_name,
        'avatarUrl', '', 'timezone', a.timezone, 'availabilityUpdatedAt', null
      ) order by a.display_name, a.discord_id)
      from public.allowed_discord_users a
    ), '[]'::jsonb),
    'availability', coalesce((
      select jsonb_object_agg(d.discord_id, d.dates)
      from (
        select a.discord_id, jsonb_agg(a.date order by a.date) as dates
        from public.availability a
        where a.date between p_date and (date_trunc('week', p_date::timestamp)::date + 6)
        group by a.discord_id
      ) d
    ), '{}'::jsonb),
    'gameNights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', n.date, 'status', n.status, 'availableUserIds', n.available_user_ids,
        'attendance', n.attendance, 'recordedBy', n.recorded_by, 'recordedAt', n.recorded_at
      ) order by n.date)
      from public.game_nights n
      where n.date <= p_date
    ), '[]'::jsonb)
  )
$$;
revoke all on function public.queue_up_notification_snapshot(date) from public, anon, authenticated;

create function public.queue_up_notification_authorized(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(length(p_secret) >= 32 and exists(
    select 1 from vault.decrypted_secrets v
    where v.name = 'queue_up_notification_secret' and v.decrypted_secret = p_secret
  ), false)
$$;
revoke all on function public.queue_up_notification_authorized(text) from public, anon, authenticated;

-- An atomic lease serializes concurrent invocations. No service-role key is needed.
create function public.queue_up_claim_notifications(p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  local_now timestamp := now() at time zone 'America/New_York';
  game_day date := local_now::date;
  snapshot jsonb;
  input_hash text;
  state public.queue_up_notification_state%rowtype;
  token uuid := gen_random_uuid();
begin
  if not public.queue_up_notification_authorized(p_secret) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if local_now::time < time '12:00' or exists(
    select 1 from public.game_nights n where n.date = game_day
  ) then return null; end if;
  insert into public.queue_up_notification_state(game_date) values(game_day) on conflict do nothing;
  select * into state from public.queue_up_notification_state s where s.game_date=game_day for update;
  if state.lease_until > now() then return null; end if;
  snapshot := public.queue_up_notification_snapshot(game_day);
  input_hash := md5(snapshot::text);
  if state.checked_hash = input_hash and not state.pending then return null; end if;
  update public.queue_up_notification_state
    set lease_id=token, lease_until=now()+interval '90 seconds', updated_at=now()
    where game_date=game_day;
  return jsonb_build_object(
    'date', game_day, 'now', now(), 'token', token, 'hash', input_hash, 'data', snapshot,
    'state', jsonb_build_object('candidate', state.candidate,
      'candidateSince', state.candidate_since, 'announced', state.announced)
  );
end;
$$;
revoke all on function public.queue_up_claim_notifications(text) from public, anon, authenticated;
grant execute on function public.queue_up_claim_notifications(text) to anon;

-- Reserve a notification BEFORE contacting Discord. This avoids retrying ambiguous
-- deliveries (e.g. Discord accepted a message but the process died before recording success).
-- Recheck data and attendance before reserving so stale calculations are not published.
create function public.queue_up_save_notification_plan(
  p_secret text, p_date date, p_token uuid, p_hash text,
  p_candidate jsonb, p_since timestamptz, p_pending boolean, p_send boolean
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_hash text;
  changed integer;
begin
  if not public.queue_up_notification_authorized(p_secret) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if p_date <> (now() at time zone 'America/New_York')::date or exists(
    select 1 from public.game_nights n where n.date=p_date
  ) then
    update public.queue_up_notification_state set lease_id=null, lease_until=null
      where game_date=p_date and lease_id=p_token;
    return false;
  end if;
  current_hash := md5(public.queue_up_notification_snapshot(p_date)::text);
  if current_hash is distinct from p_hash then
    update public.queue_up_notification_state set lease_id=null, lease_until=null
      where game_date=p_date and lease_id=p_token;
    return false;
  end if;
  update public.queue_up_notification_state set
    checked_hash=p_hash, candidate=p_candidate, candidate_since=p_since,
    pending=p_pending,
    announced=case when p_send then p_candidate else announced end,
    delivery_status=case when p_send then 'reserved' else delivery_status end,
    lease_id=case when p_send then lease_id else null end,
    lease_until=case when p_send then lease_until else null end,
    updated_at=now()
  where game_date=p_date and lease_id=p_token and lease_until > now();
  get diagnostics changed = row_count;
  return changed=1;
end;
$$;
revoke all on function public.queue_up_save_notification_plan(text,date,uuid,text,jsonb,timestamptz,boolean,boolean) from public, anon, authenticated;
grant execute on function public.queue_up_save_notification_plan(text,date,uuid,text,jsonb,timestamptz,boolean,boolean) to anon;

-- Retry explicit rate-limit responses only; uncertain delivery is not retried.
create function public.queue_up_finish_notification(
  p_secret text, p_date date, p_token uuid, p_status text, p_previous jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if not public.queue_up_notification_authorized(p_secret) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if p_status not in ('delivered','rate_limited','rejected','uncertain') then
    raise exception 'Invalid delivery status';
  end if;
  update public.queue_up_notification_state set
    delivery_status=p_status,
    announced=case when p_status in ('rate_limited','rejected') then p_previous else announced end,
    pending=(p_status='rate_limited'),
    -- Delay a rate-limit retry by at least two minutes.
    candidate_since=case when p_status='rate_limited' then now() else candidate_since end,
    lease_id=null, lease_until=null, updated_at=now()
  where game_date=p_date and lease_id=p_token and delivery_status='reserved';
  get diagnostics changed = row_count;
  return changed=1;
end;
$$;
revoke all on function public.queue_up_finish_notification(text,date,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.queue_up_finish_notification(text,date,uuid,text,jsonb) to anon;

-- Cheap local polling: only invoke Vercel for noon's first check, changed inputs,
-- or a pending debounce/retry. No HTTP calls before noon or after attendance.
create function public.queue_up_dispatch_notifications()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  local_now timestamp := now() at time zone 'America/New_York';
  game_day date := local_now::date;
  state public.queue_up_notification_state%rowtype;
  input_hash text;
  secret text;
  origin text;
begin
  if local_now::time < time '12:00' or exists(
    select 1 from public.game_nights n where n.date=game_day
  ) then return null; end if;
  select * into state from public.queue_up_notification_state s where s.game_date=game_day;
  if state.lease_until > now() then return null; end if;
  input_hash := md5(public.queue_up_notification_snapshot(game_day)::text);
  if state.checked_hash = input_hash and not state.pending then return null; end if;
  select v.decrypted_secret into secret from vault.decrypted_secrets v where v.name='queue_up_notification_secret';
  select v.decrypted_secret into origin from vault.decrypted_secrets v where v.name='queue_up_notification_origin';
  if secret is null or length(secret)<32 or origin is null or origin !~ '^https://[a-zA-Z0-9.-]+$' then
    return null;
  end if;
  return net.http_post(
    url := origin || '/api/notifications/tick',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke all on function public.queue_up_dispatch_notifications() from public, anon, authenticated;
commit;
