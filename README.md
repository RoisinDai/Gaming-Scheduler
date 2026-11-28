# Queue Up

Private six-player Valorant scheduler. Existing calendar, schedule and statistics use the same domain engine in both storage modes.

## Local setup

Use the Node version in .nvmrc, then run npm ci. Copy .env.example to .env.local (or update your existing file). Set QUEUE_UP_DATA_SOURCE=supabase, your project URL, publishable key and APP_ORIGIN=http://localhost:3000. Never commit .env.local. No service-role key or Discord secret belongs in this app.

In Discord Developer Portal, add https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback as the OAuth redirect. Enable Discord in Supabase Authentication providers and enter the Discord client ID and secret there. Set Supabase Authentication URL Configuration Site URL to http://localhost:3000 and add http://localhost:3000/auth/callback to redirect URLs.

In Supabase SQL Editor, run supabase/migrations/001_squad.sql then 002_squad_operations.sql once, in that order, on a fresh database. Then copy supabase/allowlist.example.sql into SQL Editor, replace all six IDs and names, and run it. These rows supply the roster before members first log in. Discord IDs are strings, not JavaScript numbers. Names are administrator-chosen labels; Discord avatars refresh on login when available. No mock availability is imported.

Run npm run dev and open http://localhost:3000. Sign in with Discord. An unapproved account must get Access Denied. To revoke access, remove its allowlist row (also removes its availability; historical game-night snapshots remain). No spectator mode.

## Mock mode

Set QUEUE_UP_DATA_SOURCE=mock in .env.local and restart npm run dev. Local JSON mock data is isolated from Supabase. Production refuses mock mode.

## Verification

Run npm run check and npm run build. Also manually test approved and unapproved Discord accounts, logout, refresh, availability persistence in another browser, shared attendance editing, unauthorized database writes, and allowlist revocation. These live checks require your Supabase project. SQL migrations are not automatically executed by the application.

## Vercel

Import the GitHub repository after local review. Set QUEUE_UP_DATA_SOURCE=supabase, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and APP_ORIGIN to your HTTPS production origin (without trailing slash). Add that origin's /auth/callback to Supabase redirect URLs and set Site URL to the production origin. Keep localhost redirect for local testing. Discord's redirect stays the Supabase callback. Deploy only after the database is configured.

If login fails, check the provider credentials, exact redirect URLs, configured origin, migration completion and Discord ID (not username). If the roster is missing, check the six allowlist rows. If changes do not persist, confirm Supabase mode rather than mock mode.


## Discord notifications (optional)

A private Discord channel webhook is the only Discord integration required. Notifications run at noon America/New_York (DST-aware) and after significant changes until midnight or attendance is recorded. The existing weekly recommendation engine is reused; no recommendations are saved as attendance. Five-stack and rotation announcements ping available members; subsequent changes ping affected members only. Below five, no initial announcement is made, but a previously announced stack falling short is reported. Changes must remain stable for two minutes, checked once a minute. No nightly or weekly reminders.

1. Run npm ci, npm run check and npm run build on this branch. Notifications are intentionally disabled in local and preview deployments. Unit tests use synthetic data, not the real webhook.
2. Run supabase/migrations/003_discord_notifications.sql in the existing Supabase SQL editor, once. It does not activate the job. Supabase Vault, pg_cron and pg_net must be available.
3. Generate a new random secret locally with openssl rand -hex 32. In Vercel Production environment variables set QUEUE_UP_NOTIFICATION_SECRET to that value, DISCORD_WEBHOOK_URL to the webhook URL, and confirm APP_ORIGIN is the actual production origin. Do not put these secrets in NEXT_PUBLIC_ variables, GitHub, or logs. No service-role key is needed.
4. Merge and deploy to production only after review. Then open supabase/notifications-setup.example.sql, replace the secret placeholder with the same secret, verify the production origin, and execute the setup once in the Supabase SQL editor. Do not commit the filled-in SQL. The schedule runs a lightweight database check every minute, but calls Vercel only for the first daily check, changed inputs, or pending debounce/retry. It uses Eastern calendar dates, not the individual viewer's timezone.
5. Inspect queue_up_notification_state for status after noon Eastern; if enabled after noon, the first check runs immediately for today. Verify delivery in a private test channel before switching to the squad channel if desired. Use the unschedule command in the setup file to disable notifications. No Vercel cron or paid add-on is required; verify project plan limits. Regular activity from this cron may keep the database active and consumes free-tier resources.

Delivery favors avoiding duplicate pings: an atomic database reservation precedes the webhook request. Explicit Discord rate limits are retried after debounce. Ambiguous network failures are not automatically retried, because the message may already have been delivered; rejected requests are recorded for inspection. This is not an exactly-once delivery guarantee. Check the state table if a notification is missing. To avoid exposing credentials, the endpoint returns only generic statuses. Do not manually reset state without checking the Discord channel first. Existing app and database functionality are independent of the notification job.
