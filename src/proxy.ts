import { NextResponse, type NextRequest } from "next/server";

/** Optimistic redirect only. Real authorization happens on the server next to the data. */
export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("qu_mock_user") || request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/calendar/:path*", "/schedule/:path*", "/stats/:path*"],
};
