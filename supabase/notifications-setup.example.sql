-- Run 003_discord_notifications.sql FIRST.
-- Replace the secret with the exact same random 32+ character secret you set
-- in Vercel as QUEUE_UP_NOTIFICATION_SECRET. Never commit the filled-in query.
-- Run this setup once, AFTER deploying the notification branch to production.
select vault.create_secret('REPLACE_WITH_RANDOM_SECRET', 'queue_up_notification_secret');
select vault.create_secret('https://gaming-scheduler-sage.vercel.app', 'queue_up_notification_origin');

-- Poll locally every minute; the dispatcher calls Vercel only when needed.
select cron.schedule(
  'queue-up-discord-notifications',
  '* * * * *',
  $$select public.queue_up_dispatch_notifications();$$
);

-- To stop notifications immediately:
-- select cron.unschedule('queue-up-discord-notifications');

-- To inspect today's status (no webhook or credentials):
-- select game_date, pending, delivery_status, updated_at
-- from public.queue_up_notification_state order by game_date desc limit 7;
