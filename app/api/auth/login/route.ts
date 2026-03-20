import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signAuthToken, AUTH_COOKIE_NAME, isSameOrigin } from "@/lib/auth";
import { loginInputSchema } from "@/types/auth.schema";

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

    const body: unknown = await request.json();
    const parsed = loginInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid login payload.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    let user = parsed.data.userId
      ? await prisma.user.findUnique({ where: { id: parsed.data.userId } })
      : await prisma.user.findFirst({ where: { role: parsed.data.role }, orderBy: { createdAt: "asc" } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: `${parsed.data.role} User`,
          email: `${parsed.data.role.toLowerCase()}-${Date.now()}@urms.local`,
          role: parsed.data.role,
        },
      });
    }

    const token = await signAuthToken({ userId: user.id, role: user.role });

    const response = NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      },
      { status: 500 }
    );
  }
}
