import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const token = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ success: true, data: null });
    }

    const session = await verifyAuthToken(decodeURIComponent(token));
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get session",
      },
      { status: 500 }
    );
  }
}
