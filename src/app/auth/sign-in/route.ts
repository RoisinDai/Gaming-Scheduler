import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseClient } from "@/lib/auth/supabase";
import { isMockMode } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (isMockMode()) return NextResponse.redirect(new URL("/login", request.url), 303);
  const origin = process.env.APP_ORIGIN || request.nextUrl.origin;
  if (request.headers.get("origin") !== origin) return new NextResponse("Forbidden", { status: 403 });
  const db = await createSupabaseClient();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: new URL("/auth/callback", origin).toString() },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/login?error=oauth", origin), 303);
  return NextResponse.redirect(data.url, 303);
}
