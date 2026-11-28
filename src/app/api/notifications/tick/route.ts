import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { SquadData } from "@/lib/domain/types";
import { buildDiscordMessage, lineupForToday, planNotification, type NotificationState } from "@/lib/notifications/lineup";

type Claim = {
  date: string;
  now: string;
  token: string;
  hash: string;
  data: SquadData;
  state: NotificationState;
};

const reply = (status: number, result: string) => NextResponse.json(
  { result }, { status, headers: { "Cache-Control": "no-store" } },
);

function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from("Bearer " + secret);
  const supplied = Buffer.from(header ?? "");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  const secret = process.env.QUEUE_UP_NOTIFICATION_SECRET;
  if (!secret || secret.length < 32 || !authorized(request.headers.get("authorization"), secret)) {
    return reply(401, "unauthorized");
  }
  // Never send real pings from local or preview deployments.
  if (process.env.VERCEL_ENV !== "production" || process.env.QUEUE_UP_DATA_SOURCE !== "supabase") {
    return reply(503, "disabled");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  const origin = process.env.APP_ORIGIN;
  if (!url || !key || !webhook || !origin ||
      !/^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(webhook) ||
      !/^https:\/\/[A-Za-z0-9.-]+\/?$/.test(origin)) {
    return reply(503, "configuration_missing_or_invalid");
  }

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
    const { data, error } = await db.rpc("queue_up_claim_notifications", { p_secret: secret });
    if (error) return reply(503, "claim_failed");
    if (!data) return reply(200, "nothing_to_do");

    const claim = data as Claim;
    const current = lineupForToday(claim.data, claim.date);
    if (!current) return reply(200, "attendance_recorded");
    const plan = planNotification(claim.state, current, claim.now);
    const message = plan.send
      ? buildDiscordMessage(current, claim.state.announced, claim.date, claim.data, origin)
      : null;
    if (message && message.content.length > 2000) return reply(503, "message_too_long");

    const { data: saved, error: saveError } = await db.rpc("queue_up_save_notification_plan", {
      p_secret: secret,
      p_date: claim.date,
      p_token: claim.token,
      p_hash: claim.hash,
      p_candidate: plan.candidate,
      p_since: plan.candidateSince,
      p_pending: plan.pending,
      p_send: plan.send,
    });
    if (saveError) return reply(503, "save_failed");
    if (!saved) return reply(200, "stale_claim");
    if (!message) return reply(200, plan.pending ? "debouncing" : "unchanged");

    let status: "delivered" | "rate_limited" | "rejected" | "uncertain" = "uncertain";
    try {
      const response = await fetch(webhook + "?wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      status = response.ok ? "delivered" : response.status === 429 ? "rate_limited"
        : response.status >= 400 && response.status < 500 ? "rejected" : "uncertain";
    } catch {
      // A timeout may have happened after delivery. Do not blindly retry.
    }
    const { data: finished, error: finishError } = await db.rpc("queue_up_finish_notification", {
      p_secret: secret, p_date: claim.date, p_token: claim.token,
      p_status: status, p_previous: claim.state.announced,
    });
    if (finishError || !finished) return reply(503, "finish_failed");
    return reply(status === "delivered" ? 200 : 503, status);
  } catch {
    // Never log request headers, webhook URLs, roster data, or credentials.
    return reply(503, "notification_failed");
  }
}
