import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMockMode } from "@/lib/env";

export async function proxy(request: NextRequest) {
  if (isMockMode()) {
    if (!request.cookies.has("qu_mock_user")) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
      },
    },
  });
  const { data: { user } } = await db.auth.getUser();
  const membership = user ? await db.rpc("current_discord_id") : null;
  if (user && membership?.error) throw new Error(membership.error.message);
  if (!user || !membership?.data) {
    if (user) await db.auth.signOut({ scope: "local" });
    const redirect = NextResponse.redirect(new URL(user ? "/access-denied" : "/login", request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/calendar/:path*", "/schedule/:path*", "/stats/:path*"],
};
