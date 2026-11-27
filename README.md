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
