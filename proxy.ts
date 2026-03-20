import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getDashboardRoute, getExpectedRoleByPathname } from "@/lib/role-routes";

const isApiAuthRoute = (pathname: string) => pathname.startsWith("/api/auth");

export async function proxy (request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiAuthRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyAuthToken(token) : null;

  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-auth-role", session.role);
    requestHeaders.set("x-auth-user-id", session.userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(getDashboardRoute(session.role), request.url));
  }

  const expectedRole = getExpectedRoleByPathname(pathname);

  if (expectedRole) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session.role !== expectedRole) {
      return NextResponse.redirect(new URL(getDashboardRoute(session.role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/login",
    "/student/:path*",
    "/admin/:path*",
    "/lecturer/:path*",
    "/dean/:path*",
    "/council/:path*",
    "/leader/:path*",
  ],
};
