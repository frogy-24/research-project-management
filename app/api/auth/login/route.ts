import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signAuthToken, AUTH_COOKIE_NAME, isSameOrigin } from "@/lib/auth";
import { loginInputSchema, loginWithCredentialsSchema } from "@/types/auth.schema";

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
    
    // Try to parse as credential-based login first
    const credentialsParsed = loginWithCredentialsSchema.safeParse(body);
    
    if (credentialsParsed.success) {
      // Handle email/password login
      const { email, password } = credentialsParsed.data;
      
      const user = await prisma.user.findUnique({ 
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
        }
      });

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: "Email hoặc mật khẩu không đúng",
          },
          { status: 401 }
        );
      }

      // Simple password comparison (in production, use bcrypt)
      if (user.password !== password) {
        return NextResponse.json(
          {
            success: false,
            error: "Email hoặc mật khẩu không đúng",
          },
          { status: 401 }
        );
      }

      const token = await signAuthToken({ userId: user.id, role: user.role });

      const response = NextResponse.json({
        success: true,
        data: {
          userId: user.id,
          role: user.role,
          name: user.name,
          email: user.email,
        },
      });

      const forwardedProto = request.headers.get("x-forwarded-proto");
      const requestProto = new URL(request.url).protocol.replace(":", "");
      const isHttps = (forwardedProto ?? requestProto) === "https";

      response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Fallback to role-based login (backward compatible)
    const roleParsed = loginInputSchema.safeParse(body);
    
    if (!roleParsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid login payload.",
          fields: credentialsParsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    let user = roleParsed.data.userId
      ? await prisma.user.findUnique({ where: { id: roleParsed.data.userId } })
      : await prisma.user.findFirst({ where: { role: roleParsed.data.role }, orderBy: { createdAt: "asc" } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: `${roleParsed.data.role} User`,
          email: `${roleParsed.data.role.toLowerCase()}-${Date.now()}@urms.local`,
          role: roleParsed.data.role,
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

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const requestProto = new URL(request.url).protocol.replace(":", "");
    const isHttps = (forwardedProto ?? requestProto) === "https";

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
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
