import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorUserId } from "@/lib/project-permissions";
import { updateProfileSchema } from "@/types/profile.schema";
import { ZodError } from "zod";

const mapZodError = (zodError: ZodError) => {
  const fields: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
};

export async function GET(request: Request) {
  try {
    const actorUserId = getActorUserId(request);

    if (!actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: actorUserId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch profile",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actorUserId = getActorUserId(request);

    if (!actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          fields: mapZodError(parsed.error),
        },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: actorUserId },
      data: {
        code: parsed.data.code ?? null,
        name: parsed.data.name,
        dateOfBirth: parsed.data.dateOfBirth ?? null,
        gender: parsed.data.gender ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        department: parsed.data.department ?? null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update profile",
      },
      { status: 500 }
    );
  }
}
