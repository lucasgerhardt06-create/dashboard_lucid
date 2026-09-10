import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifyEdgeSession } from "@/lib/auth-edge";

export async function middleware(request: NextRequest) {
  const validSession = await verifyEdgeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (request.nextUrl.pathname.startsWith("/dashboard") && !validSession) return NextResponse.redirect(new URL("/login", request.url));
  if (request.nextUrl.pathname === "/login" && validSession) return NextResponse.redirect(new URL("/dashboard", request.url));
  if (request.nextUrl.pathname === "/") return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/dashboard/:path*", "/login"] };
