import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseClient } from "@/lib/auth/supabase";
import { isMockMode } from "@/lib/env";

export async function GET(request: NextRequest) {
  const origin = process.env.APP_ORIGIN || request.nextUrl.origin;
  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin));
  if (isMockMode()) return redirect("/login");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirect("/login?error=oauth");
  const db = await createSupabaseClient();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) return redirect("/login?error=oauth");
  const result = await db.rpc("current_discord_id");
  if (result.error || !result.data) {
    await db.auth.signOut({ scope: "local" });
    return redirect("/access-denied");
  }
  await db.rpc("refresh_my_profile");
  return redirect("/calendar");
}
