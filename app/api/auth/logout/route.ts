import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isSameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid origin.",
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true });

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const requestProto = new URL(request.url).protocol.replace(":", "");
    const isHttps = (forwardedProto ?? requestProto) === "https";

    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
      },
      { status: 500 }
    );
  }
}
