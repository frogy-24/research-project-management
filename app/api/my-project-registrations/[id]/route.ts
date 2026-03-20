import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import { cancelProjectRegistrationSchema } from "@/types/project-registration.schema";
import { ZodError } from "zod";

type Params = {
  params: Promise<{ id: string }>;
};

const mapZodError = (zodError: ZodError) => {
  const fields: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
};

const canManageOwnRegistrations = (role: string) => role === "STUDENT" || role === "LECTURER";

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actorUserId = getActorUserId(request);
    const actorRole = getActorRole(request);

    if (!actorUserId || !actorRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!canManageOwnRegistrations(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền hủy đăng ký đề tài.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const registration = await prisma.projectRegistration.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration not found",
        },
        { status: 404 }
      );
    }

    if (registration.userId !== actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn chỉ được hủy đăng ký của chính mình.",
        },
        { status: 403 }
      );
    }

    if (registration.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ được hủy đăng ký ở trạng thái PENDING.",
        },
        { status: 409 }
      );
    }

    const body: unknown = await request.json();
    const parsed = cancelProjectRegistrationSchema.safeParse(body);

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

    const updated = await prisma.projectRegistration.update({
      where: { id },
      data: {
        status: "CANCELED",
        cancelReason: parsed.data.cancelReason,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel registration",
      },
      { status: 500 }
    );
  }
}
