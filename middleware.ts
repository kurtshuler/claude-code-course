import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";
const SECURE_SESSION_COOKIE = "__Secure-better-auth.session_token";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get(SESSION_COOKIE) ??
    request.cookies.get(SECURE_SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  if (sessionCookie && pathname === "/authenticate") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    !sessionCookie &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/notes/"))
  ) {
    return NextResponse.redirect(new URL("/authenticate", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/notes/:path*", "/authenticate"],
};
